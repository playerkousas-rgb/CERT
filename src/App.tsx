import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PaperStep from './components/steps/PaperStep';
import LayoutStep from './components/steps/LayoutStep';
import DataStep from './components/steps/DataStep';
import PrintStep from './components/steps/PrintStep';
import {
  loadStore, saveStore, createTemplate, exportTemplate, parseTemplateFile,
} from './lib/store';
import type { CertField, CertTemplate } from './types';
import { FileText, MousePointer2, Database, Printer, AlertTriangle } from 'lucide-react';

const STEPS = [
  { n: 1, label: '紙張底圖', Icon: FileText },
  { n: 2, label: '欄位對位', Icon: MousePointer2 },
  { n: 3, label: '匯入資料', Icon: Database },
  { n: 4, label: '列印輸出', Icon: Printer },
];

export default function App() {
  const [store, setStore] = useState(loadStore);
  const [step, setStep] = useState(1);
  const [saveError, setSaveError] = useState('');
  const saveTimer = useRef<number | null>(null);

  // 自動儲存（debounce，避免拖曳時頻繁寫入含大圖的 localStorage）
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const r = saveStore(store);
      if (!r.ok) setSaveError('自動儲存失敗：' + (r.error ?? '瀏覽器空間不足，可先匯出範本備份'));
      else setSaveError('');
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [store]);

  const active = useMemo(
    () => store.templates.find((t) => t.id === store.activeId) ?? store.templates[0],
    [store]
  );

  function mutate(patch: Partial<CertTemplate>) {
    setStore((s) => ({
      ...s,
      templates: s.templates.map((t) =>
        t.id === s.activeId ? { ...t, ...patch, updatedAt: Date.now() } : t
      ),
    }));
  }

  function patchField(fieldId: string, patch: Partial<CertField>) {
    setStore((s) => ({
      ...s,
      templates: s.templates.map((t) =>
        t.id === s.activeId
          ? { ...t, updatedAt: Date.now(), fields: t.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }
          : t
      ),
    }));
  }

  function selectTemplate(id: string) {
    setStore((s) => ({ ...s, activeId: id }));
    setStep(1);
  }

  function newTemplate() {
    const t = createTemplate(`新證書範本 ${store.templates.length + 1}`);
    setStore((s) => ({ ...s, templates: [...s.templates, t], activeId: t.id }));
    setStep(1);
  }
  function duplicateTemplate() {
    if (!active) return;
    const copy: CertTemplate = {
      ...structuredClone(active),
      id: createTemplate().id,
      name: `${active.name}（副本）`,
      updatedAt: Date.now(),
    };
    setStore((s) => ({ ...s, templates: [...s.templates, copy], activeId: copy.id }));
    setStep(1);
  }
  function deleteTemplate() {
    if (!active || store.templates.length <= 1) return;
    if (!confirm(`確定刪除範本「${active.name}」？此動作無法還原。`)) return;
    setStore((s) => {
      const templates = s.templates.filter((t) => t.id !== s.activeId);
      return { templates, activeId: templates[0].id };
    });
    setStep(1);
  }
  async function importTemplate(file: File) {
    try {
      const t = await parseTemplateFile(file);
      setStore((s) => ({ ...s, templates: [...s.templates, t], activeId: t.id }));
      setStep(1);
    } catch (e) {
      alert(e instanceof Error ? e.message : '匯入失敗');
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-[1600px] mx-auto flex">
        <Sidebar
          templates={store.templates}
          activeId={active?.id ?? null}
          onSelect={selectTemplate}
          onNew={newTemplate}
          onDuplicate={duplicateTemplate}
          onDelete={deleteTemplate}
          onImport={importTemplate}
          onExport={() => active && exportTemplate(active)}
        />

        <main className="flex-1 min-w-0 px-4 sm:px-6 py-5">
          {/* 步驟列 */}
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
            {STEPS.map(({ n, label, Icon }, i) => (
              <div key={n} className="flex items-center">
                <button
                  onClick={() => setStep(n)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    step === n
                      ? 'bg-[#d4a853] text-[#0a192f] shadow-md shadow-[#d4a853]/20'
                      : step > n
                        ? 'text-[#d4a853]/80 hover:bg-white/5'
                        : 'text-white/40 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="text-white/15 mx-0.5">—</span>}
              </div>
            ))}
          </div>

          {saveError && (
            <div className="max-w-2xl mx-auto mb-4 rounded-lg bg-red-500/10 border border-red-500/25 text-red-200 text-xs p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {saveError}
            </div>
          )}

          {active && (
            <>
              {step === 1 && <PaperStep template={active} update={mutate} onNext={() => setStep(2)} />}
              {step === 2 && (
                <LayoutStep
                  template={active}
                  update={mutate}
                  patchField={patchField}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && (
                <DataStep
                  template={active}
                  update={mutate}
                  patchField={patchField}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                />
              )}
              {step === 4 && <PrintStep template={active} update={mutate} onBack={() => setStep(3)} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
