import { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PaperStep from './components/steps/PaperStep';
import LayoutStep from './components/steps/LayoutStep';
import DataStep from './components/steps/DataStep';
import PrintStep from './components/steps/PrintStep';
import {
  loadStore, saveStore, createTemplate, exportTemplate, parseTemplateFile,
  exportBundle, parseBundleFile, parseBundleJson, mergeTemplates,
  STORE_KEY_PUBLIC, SEED_VERSION_KEY, SEED_VERSION,
} from './lib/store';
import { importDocx, docxResultToTemplatePatch } from './lib/docxImport';
import type { CertField, CertTemplate, Calibration } from './types';
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
  // 首次開啟（完全未有範本庫）：成功載入種子包後直接取代空白預設範本
  const freshRef = useRef(!localStorage.getItem(STORE_KEY_PUBLIC));

  // 部署預載：網站內的 seed.cert-bundle.json 只在版本更新時自動載入一次
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}seed.cert-bundle.json`, {
          cache: 'no-cache',
        });
        if (res.ok) {
          const incoming = parseBundleJson(await res.text());
          if (incoming.length && !cancelled) {
            setStore((s) =>
              freshRef.current
                ? { ...s, templates: incoming, activeId: incoming[0].id }
                : { ...s, templates: mergeTemplates(s.templates, incoming) }
            );
            if (freshRef.current) setStep(3); // 開 App 即入「入資料」步驟
          }
        }
      } catch {
        // 沒有種子檔（預設情況）不報錯，維持空白範本
      } finally {
        if (!cancelled) localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    const t = store.templates.find((x) => x.id === id);
    setStore((s) => ({ ...s, activeId: id }));
    // 已完成一次性設定的範本（官方 Word 匯入／欄位套）→ 直接入資料；否則入第一步設定
    setStep(t?.setupDone ? 3 : 1);
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
      setStep(t.setupDone ? 3 : 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : '匯入失敗');
    }
  }

  /** 一次性設定：一次過選全部官方 Word（可多選），每份證書建成一個就緒範本 */
  async function importOfficialWord(files: File[]) {
    const docs = files.filter((f) => /\.docx$/i.test(f.name));
    if (docs.length === 0) {
      alert('請選擇 .docx 檔；舊式 .doc 請先用 Word／WPS 另存為 .docx');
      return;
    }
    const made: CertTemplate[] = [];
    const errors: string[] = [];
    for (const f of docs) {
      try {
        const r = await importDocx(f);
        made.push({ ...createTemplate(r.name), ...docxResultToTemplatePatch(r) } as CertTemplate);
      } catch (e) {
        errors.push(`${f.name}：${e instanceof Error ? e.message : '解析失敗'}`);
      }
    }
    if (made.length === 0) {
      alert('全部檔案都讀取失敗：\n' + errors.join('\n'));
      return;
    }
    setStore((s) => {
      // 同名範本視為更新（保留已做的印表機校準），否則新增
      const byName = new Map(s.templates.map((t) => [t.name, t]));
      const next = [...s.templates];
      let firstId = '';
      for (const m of made) {
        const old = byName.get(m.name);
        if (old) {
          const idx = next.findIndex((t) => t.id === old.id);
          next[idx] = { ...m, id: old.id, calibration: old.calibration, updatedAt: Date.now() };
          if (!firstId) firstId = old.id;
        } else {
          next.push(m);
          if (!firstId) firstId = m.id;
        }
      }
      return { ...s, templates: next, activeId: firstId };
    });
    setStep(3);
    if (errors.length) alert('部分檔案讀取失敗：\n' + errors.join('\n'));
  }

  /** 匯入範本包（其他電腦匯出的全部範本） */
  async function importBundle(file: File) {
    try {
      const incoming = await parseBundleFile(file);
      setStore((s) => {
        const byName = new Map(s.templates.map((t) => [t.name, t]));
        const next = [...s.templates];
        let firstId = '';
        for (const m of incoming) {
          const old = byName.get(m.name);
          if (old) {
            const idx = next.findIndex((t) => t.id === old.id);
            // 範本包帶來的是別部機的位置／底圖；校準保留本機現有值
            next[idx] = { ...m, id: old.id, calibration: old.calibration, updatedAt: Date.now() };
            if (!firstId) firstId = old.id;
          } else {
            next.push(m);
            if (!firstId) firstId = m.id;
          }
        }
        return { ...s, templates: next, activeId: firstId };
      });
      setStep(3);
    } catch (e) {
      alert(e instanceof Error ? e.message : '範本包匯入失敗');
    }
  }

  /** 同一部 printer：把目前校準值一鍵套用至全部範本 */
  function applyCalibrationToAll(cal: Calibration) {
    setStore((s) => ({
      ...s,
      templates: s.templates.map((t) => ({ ...t, calibration: cal, updatedAt: Date.now() })),
    }));
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
          onImportWord={importOfficialWord}
          onImportBundle={importBundle}
          onExportBundle={() => exportBundle(store.templates.filter((t) => t.setupDone))}
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
              {step === 1 && (
                <PaperStep
                  template={active}
                  update={mutate}
                  onNext={() => setStep(2)}
                  onBatchImport={importOfficialWord}
                />
              )}
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
                  onGoSetup={() => setStep(1)}
                />
              )}
              {step === 4 && (
                <PrintStep
                  template={active}
                  update={mutate}
                  onBack={() => setStep(3)}
                  onApplyCalToAll={applyCalibrationToAll}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
