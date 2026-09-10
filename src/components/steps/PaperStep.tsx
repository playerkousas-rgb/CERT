import { useRef, useState } from 'react';
import { ScanLine, ImagePlus, Trash2, RotateCw, FileImage, AlertCircle, Layers, BookOpen, FileUp } from 'lucide-react';
import type { CertTemplate } from '../../types';
import { PAPER_PRESETS } from '../../lib/store';
import { scaledDataURL } from '../../lib/io';
import { renderPdfFirstPage } from '../../lib/pdf';
import { Panel, Label, TextInput, Select, NumInput, Btn, StepHeader, Toggle } from '../ui';
import CertificatePage from '../CertificatePage';
import ScaledPage from '../ScaledPage';
import { CERT_PRESETS, getPreset, applyPreset } from '../../lib/certPresets';
import { importDocx, docxResultToTemplatePatch } from '../../lib/docxImport';
import OfficialLinks from '../OfficialLinks';

function matchPreset(w: number, h: number): string {
  const hit = PAPER_PRESETS.find(
    (p) => p.key !== 'custom' && Math.abs(p.w - w) < 1 && Math.abs(p.h - h) < 1
  );
  return hit ? hit.key : 'custom';
}

export default function PaperStep({
  template,
  update,
  onNext,
  onBatchImport,
}: {
  template: CertTemplate;
  update: (patch: Partial<CertTemplate>) => void;
  onNext: () => void;
  /** 一次過選多個官方 Word 時，交給 App 每個建成獨立範本 */
  onBatchImport: (files: File[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const docxRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [presetKey, setPresetKey] = useState('');
  const [docxMsg, setDocxMsg] = useState('');

  async function handleDocx(file: File) {
    if (!/\.docx$/i.test(file.name)) {
      setDocxMsg('請使用 .docx 檔；舊式 .doc 請先用 Word／WPS「另存為 .docx」');
      return;
    }
    setBusy(true);
    setDocxMsg('正在讀取官方 Word 文字方塊位置…');
    try {
      const r = await importDocx(file);
      update(docxResultToTemplatePatch(r));
      setPresetKey('');
      setDocxMsg(
        r.warnings[0] ??
        `✓ 已匯入 ${r.fields.length} 個合併欄位（位置、字級依 Word 原檔），紙張 ${Math.round(r.paperW)}×${Math.round(r.paperH)}mm。` +
          `請於第三步上傳官方 Excel 資料表；如原檔含底圖${r.bgImage ? '（已一併匯入）' : '（無）'}。`
      );
    } catch (e) {
      console.error(e);
      setDocxMsg('讀取失敗：' + (e instanceof Error ? e.message : '檔案可能不是有效 .docx'));
    } finally {
      setBusy(false);
    }
  }

  function choosePreset(key: string) {
    if (!key) return;
    const p = getPreset(key);
    if (
      template.fields.length > 0 &&
      !confirm(`套用「${p.label}」欄位套？\n\n會依官方式樣建立所有欄位（姓名、旅名、日期、編號、印章及簽名位），並取代現有欄位；掃描底圖會保留。`)
    ) {
      setPresetKey('');
      return;
    }
    setPresetKey(key);
    update(applyPreset(p));
  }

  const presetNote = presetKey ? getPreset(presetKey).note : '';
  const grouped = Array.from(new Set(CERT_PRESETS.map((p) => p.section)));
  const landscape = template.paperW >= template.paperH;
  const paperPresetKey = matchPreset(template.paperW, template.paperH);

  async function handleFile(file: File) {
    setBusy(true);
    setError('');
    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const { url } = await renderPdfFirstPage(file);
        update({ bgImage: url, bgName: file.name, setupDone: true });
      } else {
        const { url } = await scaledDataURL(file, 2000);
        update({ bgImage: url, bgName: file.name, setupDone: true });
      }
    } catch (e) {
      console.error(e);
      setError('圖檔讀取失敗，請改用 JPG／PNG／PDF 檔案');
    } finally {
      setBusy(false);
    }
  }

  function setPaper(w: number, h: number) {
    const fields = template.fields.map((f) => ({
      ...f,
      xMm: Math.min(f.xMm, w),
      yMm: Math.min(f.yMm, h),
    }));
    update({ paperW: w, paperH: h, fields });
  }

  function applyPaperPreset(key: string) {
    const p = PAPER_PRESETS.find((x) => x.key === key);
    if (!p || key === 'custom') return;
    if (landscape) setPaper(Math.max(p.w, p.h), Math.min(p.w, p.h));
    else setPaper(Math.min(p.w, p.h), Math.max(p.w, p.h));
  }

  function rotate() {
    const newW = template.paperH;
    const newH = template.paperW;
    // 旋轉後把欄位夾返入新紙張範圍
    const fields = template.fields.map((f) => ({
      ...f,
      xMm: Math.min(f.xMm, newW),
      yMm: Math.min(f.yMm, newH),
    }));
    update({ paperW: newW, paperH: newH, fields });
  }

  return (
    <div>
      <StepHeader title="第一步：紙張與對位底圖" subtitle="先選紙張尺寸，再上傳預印證書紙的掃描本作為對位參考" />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <Panel title="證書類型（官方欄位套）" icon={<Layers className="w-4 h-4 text-[#d4a853]" />}>
            <div className="space-y-2">
              <input
                ref={docxRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                className="hidden"
                onChange={(e) => {
                  const fs = Array.from(e.target.files ?? []);
                  if (fs.length > 1) {
                    onBatchImport(fs);
                  } else if (fs.length === 1) {
                    handleDocx(fs[0]);
                  }
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => docxRef.current?.click()}
                disabled={busy}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] text-xs font-bold hover:shadow-md hover:shadow-[#d4a853]/20 transition-all flex items-center justify-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                {busy ? '讀取中…' : '一鍵匯入官方 Word（.docx，可多選）'}
              </button>
              {docxMsg && (
                <p className={`text-[11px] leading-relaxed rounded-lg p-2.5 ${docxMsg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-200/80' : docxMsg.includes('失敗') || docxMsg.includes('請使用') || docxMsg.includes('找不到') ? 'bg-red-500/10 text-red-200/90' : 'bg-[#d4a853]/5 text-white/50'}`}>
                  {docxMsg}
                </p>
              )}
              <div className="flex items-center gap-2">
                <span className="text-white/30 text-xs flex-shrink-0">或選欄位套</span>
                <Select value={presetKey} onChange={(e) => choosePreset(e.target.value)} className="flex-1">
                <option value="" className="bg-[#0a192f]">— 選擇證書類型，自動建立欄位 —</option>
                {grouped.map((sec) => (
                  <optgroup key={sec} label={sec} className="bg-[#0a192f]">
                    {CERT_PRESETS.filter((p) => p.section === sec).map((p) => (
                      <option key={p.key} value={p.key} className="bg-[#0a192f]">
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
                </Select>
              </div>
              {presetNote ? (
                <p className="text-[11px] leading-relaxed text-white/45 bg-[#d4a853]/5 rounded-lg p-2.5">
                  {presetNote}
                </p>
              ) : (
                <p className="text-[11px] leading-relaxed text-white/40">
                  總會官方 Word 合併列印檔只涵蓋幼童軍部分證書（
                  <a
                    href="https://drive.google.com/open?id=1BiZP96vso5KOz7LoLVv8SWerz7jIX6Fy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#d4a853]/80 underline hover:text-[#d4a853]"
                  >
                    05/2019 官方檔
                  </a>
                  ）；其餘支部證書可在這裡選相近類型，再於第二步微調。欄位會先放常用位置，對準掃描底圖即可。
                </p>
              )}
            </div>
          </Panel>

          <Panel title="範本資料">
            <div className="space-y-4">
              <div>
                <Label>範本名稱</Label>
                <TextInput
                  value={template.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="例如：小童軍參與證書（橫 A4）"
                />
              </div>
            </div>
          </Panel>

          <Panel title="官方檔案下載位置" icon={<BookOpen className="w-4 h-4 text-[#d4a853]" />}>
            <OfficialLinks />
          </Panel>

          <Panel title="紙張尺寸">
            <div className="space-y-4">
              <div>
                <Label>標準尺寸</Label>
                <Select value={paperPresetKey} onChange={(e) => applyPaperPreset(e.target.value)}>
                  {PAPER_PRESETS.map((p) => (
                    <option key={p.key} value={p.key} className="bg-[#0a192f]">
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>闊度</Label>
                  <NumInput
                    value={template.paperW}
                    step={1}
                    min={20}
                    max={1200}
                    suffix="mm"
                    onValue={(v) => setPaper(Math.round(v * 10) / 10, template.paperH)}
                  />
                </div>
                <div>
                  <Label>高度</Label>
                  <NumInput
                    value={template.paperH}
                    step={1}
                    min={20}
                    max={1200}
                    suffix="mm"
                    onValue={(v) => setPaper(template.paperW, Math.round(v * 10) / 10)}
                  />
                </div>
              </div>

              <Btn variant="ghost" className="w-full" onClick={rotate}>
                <RotateCw className="w-4 h-4" />
                轉換{landscape ? '直向' : '橫向'}（旋轉 90°）
              </Btn>
            </div>
          </Panel>

          <Panel title="預印紙掃描本（對位底圖）" icon={<ScanLine className="w-4 h-4 text-[#d4a853]" />}>
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              {template.bgImage ? (
                <div className="rounded-lg border border-[#d4a853]/25 overflow-hidden group">
                  <div className="relative bg-[#0a192f]">
                    <img src={template.bgImage} alt="scan" className="w-full max-h-64 object-contain" />
                    <button
                      onClick={() => update({ bgImage: null, bgName: '' })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/85 hover:bg-red-500 text-white flex items-center justify-center"
                      title="移除底圖"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2.5 text-xs text-white/60 flex items-center gap-2 bg-white/[0.03]">
                    <FileImage className="w-3.5 h-3.5 text-[#d4a853]/70 flex-shrink-0" />
                    <span className="truncate">{template.bgName}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="w-full rounded-xl border-2 border-dashed border-white/15 hover:border-[#d4a853]/50 bg-white/[0.02] p-7 text-center transition-all"
                >
                  {busy ? (
                    <span className="text-[#d4a853] text-sm">處理中…</span>
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-[#d4a853]/50 mx-auto mb-2" />
                      <p className="text-white/70 text-sm">上傳掃描本或清楚相片</p>
                      <p className="text-white/35 text-xs mt-1">JPG / PNG / PDF，建議用掃描器 150–200 dpi</p>
                    </>
                  )}
                </button>
              )}
              {template.bgImage && (
                <Btn variant="ghost" className="w-full" onClick={() => fileRef.current?.click()}>
                  重新上傳底圖
                </Btn>
              )}
              {error && <p className="text-red-300 text-xs">{error}</p>}
              <div className="flex gap-2 text-[11px] text-white/40 leading-relaxed bg-[#d4a853]/5 rounded-lg p-2.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#d4a853]/70" />
                <span>
                  底圖只在螢幕上協助對位，<b className="text-white/60">預設不會被印出</b>，正式列印時只會印文字到預印紙上。
                  若要在普通白紙打樣，可於第四步開啟「連底圖一起列印」。
                </span>
              </div>
            </div>
          </Panel>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Toggle
              checked={template.printBg}
              onChange={(v) => update({ printBg: v })}
              label={<span className="text-xs">列印時連底圖一起印（白紙打樣用）</span>}
            />
          </div>
        </div>

        {/* 預覽 */}
        <div className="rounded-xl border border-[#d4a853]/20 bg-[#081220] p-3">
          <div className="h-[60vh] min-h-[380px]">
            <ScaledPage widthMm={template.paperW} heightMm={template.paperH}>
              <CertificatePage template={template} values={{}} showBg />
            </ScaledPage>
          </div>
          <p className="text-center text-white/30 text-xs mt-3">
            紙張實際尺寸 {Math.round(template.paperW)} × {Math.round(template.paperH)} mm（{landscape ? '橫向' : '直向'}）
          </p>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Btn variant="primary" onClick={onNext} className="px-8">
          第二步：擺放文字欄位 →
        </Btn>
      </div>
    </div>
  );
}
