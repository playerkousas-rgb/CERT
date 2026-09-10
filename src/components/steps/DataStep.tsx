import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, PenLine, Link2, Table2, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { CertTemplate, CertField, DataMode } from '../../types';
import { parseExcel, autoMapColumns } from '../../lib/excel';
import { resolveRecord } from '../../lib/store';
import { Panel, Label, Select, Btn, StepHeader } from '../ui';
import CertificatePage from '../CertificatePage';
import ScaledPage from '../ScaledPage';

export default function DataStep({
  template,
  update,
  patchField,
  onNext,
  onBack,
}: {
  template: CertTemplate;
  update: (patch: Partial<CertTemplate>) => void;
  patchField: (id: string, patch: Partial<CertField>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mode: DataMode = template.dataMode;

  async function handleExcel(file: File) {
    setLoading(true);
    setError('');
    try {
      const { sheets, fileName } = await parseExcel(file);
      if (sheets.length === 0) {
        setError('試算表內找不到資料，請確認第一列為欄位名稱');
        return;
      }
      const active = sheets[0];
      const mapping = autoMapColumns(template.fields, active.columns);
      const fields = template.fields.map((f) =>
        mapping[f.id] && !f.sourceColumns ? { ...f, sourceColumn: mapping[f.id] } : f
      );
      update({
        dataMode: 'excel',
        excelFileName: fileName,
        excelSheets: sheets,
        excelSheet: active.name,
        excelColumns: active.columns,
        excelRows: active.rows,
        fields,
      });
    } catch (e) {
      console.error(e);
      setError('無法解析檔案，請使用 .xlsx / .xls / .csv，並確認第一列為欄位名稱');
    } finally {
      setLoading(false);
    }
  }

  function switchSheet(name: string) {
    const sheet = template.excelSheets?.find((s) => s.name === name);
    if (!sheet) return;
    const mapping = autoMapColumns(template.fields, sheet.columns);
    const fields = template.fields.map((f) =>
      mapping[f.id] && !f.sourceColumns ? { ...f, sourceColumn: mapping[f.id] } : f
    );
    update({
      excelSheet: name,
      excelColumns: sheet.columns,
      excelRows: sheet.rows,
      fields,
    });
  }

  function setMode(m: DataMode) {
    update({ dataMode: m });
  }

  function setManualCell(row: number, fieldId: string, value: string) {
    const manualRows = template.manualRows.map((r) => ({ ...r }));
    manualRows[row] = { ...manualRows[row], [fieldId]: value };
    update({ manualRows });
  }
  function addRow() {
    update({ manualRows: [...template.manualRows, {}] });
  }
  function removeRow(i: number) {
    const manualRows = template.manualRows.filter((_, idx) => idx !== i);
    update({ manualRows: manualRows.length ? manualRows : [{}] });
  }

  const textFields = template.fields.filter((f) => f.kind === 'text');
  const total = mode === 'excel' ? template.excelRows.length : template.manualRows.length;
  const previewValues = resolveRecord(template, 0);

  return (
    <div>
      <StepHeader title="第三步：匯入姓名與資料" subtitle="貼上 Excel 名單合併列印，或直接在表格輸入；每一列 = 一張證書" />

      {/* 分頁 */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
          <button
            onClick={() => setMode('excel')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'excel' ? 'bg-[#d4a853] text-[#0a192f]' : 'text-white/50 hover:text-white/80'}`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel 合併列印
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'manual' ? 'bg-[#d4a853] text-[#0a192f]' : 'text-white/50 hover:text-white/80'}`}
          >
            <PenLine className="w-4 h-4" /> 手動輸入
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div>
          {mode === 'excel' ? (
            template.excelRows.length === 0 ? (
              <div className="max-w-xl mx-auto">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.02] p-12 text-center hover:border-[#d4a853]/50 hover:bg-white/[0.04] transition-all"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleExcel(f);
                      e.target.value = '';
                    }}
                  />
                  {loading ? (
                    <span className="text-[#d4a853] text-sm">解析中…</span>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-[#d4a853]/50 mx-auto mb-3" />
                      <p className="text-white/75 font-medium">上傳 Excel 名單</p>
                      <p className="text-white/40 text-sm mt-1">.xlsx / .xls / .csv，第一列須為欄位名稱（如 姓名、日期、編號）</p>
                    </>
                  )}
                </button>
                {error && <p className="mt-3 text-red-300 text-sm text-center">{error}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                {template.excelSheets && template.excelSheets.length > 1 && (
                  <Panel title="選擇工作表（官方檔每款證書一個分頁）">
                    {template.fields.some(
                      (f) =>
                        f.sourceColumns &&
                        f.sourceColumns.some((s) => !template.excelColumns.includes(s.column))
                    ) && (
                      <p className="text-[11px] text-amber-200/80 bg-amber-500/10 rounded-lg p-2 mb-2">
                        ⚠ 目前分頁與匯入 Word 的欄位不完全相符，部分欄位會留空；請選擇對應該款證書的分頁。
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {template.excelSheets.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => switchSheet(s.name)}
                          className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            (template.excelSheet ?? template.excelSheets?.[0]?.name) === s.name
                              ? 'bg-[#d4a853] text-[#0a192f]'
                              : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {s.name}（{s.rows.length}）
                        </button>
                      ))}
                    </div>
                  </Panel>
                )}
                <Panel title="欄位對應" icon={<Link2 className="w-4 h-4 text-[#d4a853]" />}>
                  <p className="text-white/40 text-xs mb-3">
                    系統已自動對應常用欄位名稱；由官方 Word 匯入的欄位會自動組合中文／英文等多個試算表欄。
                  </p>
                  <div className="space-y-2.5">
                    {template.fields.map((f) => (
                      <div key={f.id} className="flex items-center gap-3">
                        <span className="w-28 flex-shrink-0 text-white/75 text-sm truncate" title={f.name}>{f.name}</span>
                        <span className="text-white/25">→</span>
                        {f.kind === 'image' ? (
                          <span className="text-white/40 text-xs">（圖片欄位，全部相同）</span>
                        ) : f.sourceColumns && f.sourceColumns.length > 1 ? (
                          <span className="flex-1 flex flex-wrap items-center gap-1 text-xs">
                            {f.sourceColumns.map((s, i) => (
                              <span key={s.column} className="flex items-center gap-1">
                                {i > 0 && (
                                  <span className="text-white/30">{s.sep === '\n' ? '⏎' : '␣'}</span>
                                )}
                                <span className="px-2 py-1 rounded-md bg-[#d4a853]/15 border border-[#d4a853]/30 text-[#f0d98f]">
                                  {s.column}
                                </span>
                              </span>
                            ))}
                          </span>
                        ) : (
                          <Select
                            value={f.sourceColumn}
                            onChange={(e) => patchField(f.id, { sourceColumn: e.target.value })}
                            className="flex-1"
                          >
                            <option value="" className="bg-[#0a192f]">固定內容／留空</option>
                            {template.excelColumns.map((c) => (
                              <option key={c} value={c} className="bg-[#0a192f]">{c}</option>
                            ))}
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title={`資料預覽（${template.excelRows.length} 列）`} icon={<Table2 className="w-4 h-4 text-[#d4a853]" />}>
                  <div className="overflow-x-auto -m-1 p-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-2 py-2 text-left text-white/30 text-xs w-8">#</th>
                          {template.excelColumns.map((c) => (
                            <th key={c} className="px-3 py-2 text-left text-white/55 text-xs whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {template.excelRows.slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0">
                            <td className="px-2 py-1.5 text-white/30 text-xs">{i + 1}</td>
                            {template.excelColumns.map((c) => (
                              <td key={c} className="px-3 py-1.5 text-white/70 text-xs whitespace-nowrap max-w-[220px] truncate">{row[c]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {template.excelRows.length > 8 && (
                    <p className="text-center text-white/30 text-xs pt-2">只顯示前 8 列，共 {template.excelRows.length} 列</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-emerald-300/80 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 將列印 {template.excelRows.length} 張證書
                    </span>
                    <button onClick={() => fileRef.current?.click()} className="text-xs text-[#d4a853]/80 hover:text-[#d4a853] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> 更換檔案
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleExcel(f);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </Panel>
              </div>
            )
          ) : (
            <Panel title={`手動輸入（${template.manualRows.length} 張）`}>
              <div className="overflow-x-auto -m-1 p-1">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-2 py-2 text-left text-white/30 text-xs w-10">#</th>
                      {template.fields.map((f) => (
                        <th key={f.id} className="px-2 py-2 text-left text-white/55 text-xs whitespace-nowrap min-w-[140px]">
                          {f.name}{f.kind === 'image' ? '（圖片）' : ''}
                        </th>
                      ))}
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {template.manualRows.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="px-2 py-1.5 text-white/30 text-xs">{i + 1}</td>
                        {template.fields.map((f) => (
                          <td key={f.id} className="px-1.5 py-1.5">
                            {f.kind === 'image' ? (
                              <span className="text-white/25 text-xs">同第二步設定</span>
                            ) : (
                              <input
                                value={row[f.id] ?? ''}
                                onChange={(e) => setManualCell(i, f.id, e.target.value)}
                                placeholder={f.content || ''}
                                className="w-full px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:border-[#d4a853]/60 focus:outline-none"
                              />
                            )}
                          </td>
                        ))}
                        <td>
                          <button
                            onClick={() => removeRow(i)}
                            className="p-1.5 text-white/30 hover:text-red-300 transition-colors"
                            title="刪除這張"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addRow}
                className="mt-3 w-full py-2.5 rounded-lg border-2 border-dashed border-white/10 text-white/40 text-sm hover:border-[#d4a853]/40 hover:text-[#d4a853]/80 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> 新增一張證書
              </button>
            </Panel>
          )}
        </div>

        {/* 即時預覽第一張 */}
        <div>
          <Panel title="第一張即時預覽">
            <div className="bg-[#070f1b] rounded-lg p-2 h-[46vh] min-h-[300px]">
              <ScaledPage widthMm={template.paperW} heightMm={template.paperH}>
                <CertificatePage template={template} values={previewValues} showBg />
              </ScaledPage>
            </div>
            <div className="mt-3 space-y-1 text-xs text-white/40">
              {textFields.map((f) => (
                <div key={f.id} className="flex justify-between gap-2">
                  <span className="truncate">{f.name}</span>
                  <span className="text-white/65 truncate max-w-[60%]">
                    {mode === 'excel'
                      ? f.sourceColumns && f.sourceColumns.length > 1
                        ? `← ${f.sourceColumns.map((s) => s.column).join(' / ')}`
                        : f.sourceColumn
                          ? `← ${f.sourceColumn}`
                          : f.content || '（留空）'
                      : previewValues[f.id] || f.content || '（留空）'}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Btn variant="ghost" onClick={onBack}>← 上一步</Btn>
        <Label>共 {total} 張</Label>
        <Btn variant="primary" onClick={onNext} className="px-8">第四步：預覽與列印 →</Btn>
      </div>
    </div>
  );
}
