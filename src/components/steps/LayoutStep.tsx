import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Type, ImagePlus, Trash2, Copy, Plus, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut, Maximize, Eye, EyeOff,
} from 'lucide-react';
import type { CertTemplate, CertField } from '../../types';
import { createField, FONTS, recordCount, resolveRecord } from '../../lib/store';
import { mmPx } from '../../lib/layout';
import { scaledDataURL } from '../../lib/io';
import { Panel, Label, TextInput, Select, NumInput, Btn, StepHeader, Toggle } from '../ui';
import CertificatePage from '../CertificatePage';
import { CERT_PRESETS, getPreset } from '../../lib/certPresets';

const RULER = 8; // mm

function Ruler({ orientation, lengthMm }: { orientation: 'h' | 'v'; lengthMm: number }) {
  const ticks: React.ReactNode[] = [];
  const max = lengthMm;
  for (let v = 0; v <= max; v += 5) {
    const major = v % 50 === 0;
    const mid = v % 10 === 0;
    if (orientation === 'h') {
      ticks.push(
        <div key={v} style={{ position: 'absolute', left: `${v}mm`, top: 0, height: major ? '3.2mm' : mid ? '2.2mm' : '1.2mm', width: major ? 0.3 : 0.15, background: '#5a6b80' }} />
      );
      if (major) {
        ticks.push(
          <div key={`l${v}`} style={{ position: 'absolute', left: `${v}mm`, top: '3.4mm', fontSize: '2.6mm', color: '#7d8da1', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{v}</div>
        );
      }
    } else {
      ticks.push(
        <div key={v} style={{ position: 'absolute', top: `${v}mm`, left: 0, width: major ? '3.2mm' : mid ? '2.2mm' : '1.2mm', height: major ? 0.3 : 0.15, background: '#5a6b80' }} />
      );
      if (major) {
        ticks.push(
          <div key={`l${v}`} style={{ position: 'absolute', top: `${v}mm`, left: '3.6mm', fontSize: '2.6mm', color: '#7d8da1', transform: 'translateY(-50%)', whiteSpace: 'nowrap' }}>{v}</div>
        );
      }
    }
  }
  if (orientation === 'h') {
    return <div style={{ position: 'absolute', left: `${RULER}mm`, top: 0, width: `${lengthMm}mm`, height: `${RULER}mm`, background: '#0e1d31', borderBottom: '0.2mm solid #23364d', overflow: 'hidden' }}>{ticks}</div>;
  }
  return <div style={{ position: 'absolute', left: 0, top: `${RULER}mm`, width: `${RULER}mm`, height: `${lengthMm}mm`, background: '#0e1d31', borderRight: '0.2mm solid #23364d', overflow: 'hidden' }}>{ticks}</div>;
}

export default function LayoutStep({
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
  const [selectedId, setSelectedId] = useState<string | null>(template.fields[0]?.id ?? null);
  const [showBg, setShowBg] = useState(true);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [fitScale, setFitScale] = useState(0.7);
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const selected = template.fields.find((f) => f.id === selectedId) ?? null;
  const scale = zoom === 'fit' ? fitScale : zoom;
  const values = resolveRecord(template, 0);

  // 自動適應視窗
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const compute = () => {
      const s = Math.min(
        (el.clientWidth - 60) / mmPx(template.paperW + RULER),
        (el.clientHeight - 60) / mmPx(template.paperH + RULER)
      );
      setFitScale(Math.min(1.25, Math.max(0.15, s)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [template.paperW, template.paperH]);

  const addField = useCallback(
    (kind: 'text' | 'image', x?: number, y?: number) => {
      const f = createField({
        kind,
        name: kind === 'image' ? '簽名／印章' : `欄位 ${template.fields.length + 1}`,
        xMm: x ?? template.paperW / 2,
        yMm: y ?? template.paperH / 2,
        widthMm: kind === 'image' ? 35 : 0,
        fontPt: kind === 'image' ? 12 : 18,
        content: kind === 'image' ? '' : '',
      });
      update({ fields: [...template.fields, f] });
      setSelectedId(f.id);
    },
    [template.fields, template.paperW, template.paperH, update]
  );

  function loadPreset(key: string) {
    if (!key) return;
    const p = getPreset(key);
    if (!confirm(`載入「${p.label}」欄位套？將會取代目前所有欄位（資料及底圖保留）。`)) return;
    const fields = p.fields.map((f) => createField(f));
    update({ fields, paperW: p.paperW, paperH: p.paperH });
    setSelectedId(fields[0]?.id ?? null);
  }

  const deleteField = (id: string) => {
    update({ fields: template.fields.filter((f) => f.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateField = (f: CertField) => {
    const copy = { ...f, id: createField().id, yMm: Math.min(template.paperH - 5, f.yMm + 8), name: `${f.name} 副本` };
    update({ fields: [...template.fields, copy] });
    setSelectedId(copy.id);
  };

  // 拖曳
  const onFieldPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault();
    const f = template.fields.find((x) => x.id === id);
    if (!f || !pageRef.current) return;
    setSelectedId(id);
    drag.current = { id, startX: e.clientX, startY: e.clientY, origX: f.xMm, origY: f.yMm };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();
      const dx = ((ev.clientX - d.startX) / rect.width) * template.paperW;
      const dy = ((ev.clientY - d.startY) / rect.height) * template.paperH;
      patchField(d.id, {
        xMm: Math.round(Math.min(template.paperW, Math.max(0, d.origX + dx)) * 100) / 100,
        yMm: Math.round(Math.min(template.paperH, Math.max(0, d.origY + dy)) * 100) / 100,
      });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // 鍵盤微調
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const dirs: Record<string, [string, number]> = {
        ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['y', -1], ArrowDown: ['y', 1],
      };
      const d = dirs[e.key];
      if (!d) return;
      e.preventDefault();
      const step = e.altKey ? 0.1 : e.shiftKey ? 10 : 1;
      const f = template.fields.find((x) => x.id === selectedId);
      if (!f) return;
      const [axis, dir2] = d;
      const key = axis === 'x' ? 'xMm' : 'yMm';
      const max = axis === 'x' ? template.paperW : template.paperH;
      patchField(selectedId, { [key]: Math.round(Math.min(max, Math.max(0, f[key] + dir2 * step)) * 100) / 100 } as Partial<CertField>);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, template.fields, template.paperW, template.paperH, patchField]);

  async function handleImage(file: File) {
    if (!selected) return;
    const { url } = await scaledDataURL(file, 1200, { keepPng: true });
    patchField(selected.id, { content: url });
  }

  const innerWMm = template.paperW + RULER;
  const innerHMm = template.paperH + RULER;
  const count = recordCount(template);

  return (
    <div>
      <StepHeader title="第二步：擺放並對準欄位" subtitle="直接拖曳姓名、日期等欄位到掃描本的正確位置；雙擊空白處可快速新增" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-5 items-start">
        {/* 編輯舞台 */}
        <div className="rounded-xl border border-[#d4a853]/20 bg-[#081220] overflow-hidden">
          {/* 工具列 */}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[#d4a853]/10 bg-white/[0.02]">
            <Btn onClick={() => addField('text')} className="px-3 py-2 text-xs">
              <Plus className="w-3.5 h-3.5" /> 文字欄位
            </Btn>
            <Btn onClick={() => addField('image')} className="px-3 py-2 text-xs">
              <ImagePlus className="w-3.5 h-3.5" /> 簽名／印章
            </Btn>
            <select
              value=""
              onChange={(e) => loadPreset(e.target.value)}
              className="px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs hover:bg-white/10 focus:outline-none max-w-[210px]"
              title="套用官方證書欄位套"
            >
              <option value="" className="bg-[#0a192f]">📋 載入官方欄位套…</option>
              {Array.from(new Set(CERT_PRESETS.map((p) => p.section))).map((sec) => (
                <optgroup key={sec} label={sec} className="bg-[#0a192f]">
                  {CERT_PRESETS.filter((p) => p.section === sec).map((p) => (
                    <option key={p.key} value={p.key} className="bg-[#0a192f]">
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={() => setShowBg((v) => !v)}
              className="px-2.5 py-2 rounded-lg border border-white/10 text-white/55 hover:text-white hover:bg-white/5 text-xs flex items-center gap-1.5"
              title="顯示／隱藏掃描底圖"
            >
              {showBg ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              底圖
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={() => setZoom(Math.max(0.2, Math.round((zoom === 'fit' ? fitScale : zoom) * 100) / 100 - 0.1))}
              className="p-2 rounded-lg text-white/55 hover:bg-white/5 hover:text-white"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-white/45 text-xs w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2.5, Math.round((zoom === 'fit' ? fitScale : zoom) * 100) / 100 + 0.1))}
              className="p-2 rounded-lg text-white/55 hover:bg-white/5 hover:text-white"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom('fit')} className="p-2 rounded-lg text-white/55 hover:bg-white/5 hover:text-white" title="配合視窗">
              <Maximize className="w-4 h-4" />
            </button>
            <span className="ml-auto text-[11px] text-white/30 hidden xl:block">
              拖曳移動 · 方向鍵移 1mm（Shift=10mm，Alt=0.1mm）· 雙擊空白處新增欄位
            </span>
          </div>

          <div ref={stageRef} className="h-[68vh] min-h-[420px] overflow-auto bg-[#070f1b] relative flex">
            <div style={{ width: mmPx(innerWMm) * scale, height: mmPx(innerHMm) * scale }} className="relative flex-shrink-0 m-auto">
              <div style={{ width: mmPx(innerWMm), height: mmPx(innerHMm), transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <Ruler orientation="h" lengthMm={template.paperW} />
                <Ruler orientation="v" lengthMm={template.paperH} />
                <div style={{ position: 'absolute', left: `${RULER}mm`, top: `${RULER}mm` }}>
                  <CertificatePage
                    template={template}
                    values={values}
                    showBg={showBg}
                    interactive
                    selectedId={selectedId}
                    onFieldPointerDown={onFieldPointerDown}
                    pageRef={pageRef}
                    onPageDoubleClick={(_e, x, y) => addField('text', x, y)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 屬性面板 */}
        <div className="space-y-4">
          <Panel title="欄位設定" icon={<Type className="w-4 h-4 text-[#d4a853]" />}>
            {selected ? (
              <div className="space-y-3.5">
                <div>
                  <Label>欄位名稱</Label>
                  <TextInput value={selected.name} onChange={(e) => patchField(selected.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label>欄位類型</Label>
                  <Select
                    value={selected.kind}
                    onChange={(e) => patchField(selected.id, { kind: e.target.value as CertField['kind'] })}
                  >
                    <option value="text" className="bg-[#0a192f]">文字</option>
                    <option value="image" className="bg-[#0a192f]">簽名／印章圖片</option>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>X</Label>
                    <NumInput value={selected.xMm} min={0} max={template.paperW} suffix="mm" onValue={(v) => patchField(selected.id, { xMm: v })} />
                  </div>
                  <div>
                    <Label>Y</Label>
                    <NumInput value={selected.yMm} min={0} max={template.paperH} suffix="mm" onValue={(v) => patchField(selected.id, { yMm: v })} />
                  </div>
                  <div>
                    <Label>闊度</Label>
                    <NumInput value={selected.widthMm} min={0} suffix="mm" onValue={(v) => patchField(selected.id, { widthMm: Math.max(0, v) })} />
                  </div>
                </div>

                {selected.kind === 'text' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>字級</Label>
                        <Select value={selected.fontPt} onChange={(e) => patchField(selected.id, { fontPt: parseFloat(e.target.value) })}>
                          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48].map((s) => (
                            <option key={s} value={s} className="bg-[#0a192f]">{s} pt</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>行距</Label>
                        <Select value={selected.lineHeight} onChange={(e) => patchField(selected.id, { lineHeight: parseFloat(e.target.value) })}>
                          {[1, 1.15, 1.3, 1.5, 1.75, 2].map((s) => (
                            <option key={s} value={s} className="bg-[#0a192f]">{s}×</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>字型</Label>
                      <Select value={selected.fontFamily} onChange={(e) => patchField(selected.id, { fontFamily: e.target.value })}>
                        {FONTS.map((f) => (
                          <option key={f.label} value={f.value} className="bg-[#0a192f]">{f.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label>顏色</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={selected.fontColor} onChange={(e) => patchField(selected.id, { fontColor: e.target.value })} />
                          <span className="text-white/50 text-xs font-mono">{selected.fontColor}</span>
                        </div>
                      </div>
                      <button onClick={() => patchField(selected.id, { bold: !selected.bold })} className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected.bold ? 'bg-[#d4a853] text-[#0a192f]' : 'bg-white/5 border border-white/10 text-white/55'}`} title="粗體">
                        <Bold className="w-4 h-4" />
                      </button>
                      <button onClick={() => patchField(selected.id, { italic: !selected.italic })} className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected.italic ? 'bg-[#d4a853] text-[#0a192f]' : 'bg-white/5 border border-white/10 text-white/55'}`} title="斜體">
                        <Italic className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <Label>對齊</Label>
                      <div className="flex gap-2">
                        {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([v, Icon]) => (
                          <button key={v} onClick={() => patchField(selected.id, { align: v })} className={`flex-1 h-9 rounded-lg flex items-center justify-center ${selected.align === v ? 'bg-[#d4a853] text-[#0a192f]' : 'bg-white/5 border border-white/10 text-white/55'}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label hint="Excel 無對應欄時使用">固定內容／預設值</Label>
                      <textarea
                        value={selected.content}
                        onChange={(e) => patchField(selected.id, { content: e.target.value })}
                        rows={2}
                        placeholder={`例如全批次相同的活動名稱；留空則由第三步資料填入`}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:border-[#d4a853]/60 focus:outline-none resize-y"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label>簽名／印章圖片（建議透明背景 PNG）</Label>
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImage(f);
                        e.target.value = '';
                      }}
                    />
                    {selected.content ? (
                      <div className="rounded-lg overflow-hidden border border-white/10">
                        <div className="bg-[repeating-conic-gradient(#1b2a40_0%_25%,#162234_0%_50%)] bg-[length:16px_16px] p-3 flex items-center justify-center max-h-32">
                          <img src={selected.content} alt="signature" className="max-h-24 object-contain" />
                        </div>
                        <button onClick={() => patchField(selected.id, { content: '' })} className="w-full py-1.5 text-xs text-red-300 hover:bg-red-500/10 border-t border-white/10">
                          移除圖片
                        </button>
                      </div>
                    ) : (
                      <Btn variant="ghost" className="w-full" onClick={() => imgInputRef.current?.click()}>
                        <ImagePlus className="w-4 h-4" /> 上傳圖片
                      </Btn>
                    )}
                    <p className="text-[11px] text-white/35 mt-1.5">圖片會以相同內容印在每張證書；寬度欄控制大小。</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Btn variant="ghost" onClick={() => duplicateField(selected)}>
                    <Copy className="w-3.5 h-3.5" /> 複製
                  </Btn>
                  <Btn variant="danger" onClick={() => deleteField(selected.id)}>
                    <Trash2 className="w-3.5 h-3.5" /> 刪除
                  </Btn>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-white/35 text-sm">
                <Type className="w-9 h-9 mx-auto mb-2 opacity-30" />
                點擊證書上的欄位以編輯
                <br />或雙擊空白處新增
              </div>
            )}
          </Panel>

          <Panel title={`所有欄位（${template.fields.length}）`}>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {template.fields.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${f.id === selectedId ? 'bg-[#d4a853]/15 text-[#f0d98f] border border-[#d4a853]/30' : 'text-white/55 hover:bg-white/5 border border-transparent'}`}
                >
                  {f.kind === 'image' ? <ImagePlus className="w-3.5 h-3.5 flex-shrink-0" /> : <Type className="w-3.5 h-3.5 flex-shrink-0" />}
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-white/30 tabular-nums">{f.xMm.toFixed(0)},{f.yMm.toFixed(0)}</span>
                </button>
              ))}
              {template.fields.length === 0 && <p className="text-white/30 text-xs text-center py-3">尚未新增欄位</p>}
            </div>
            <div className="mt-3">
              <Toggle checked={showBg} onChange={setShowBg} label={<span className="text-xs">顯示掃描底圖對位</span>} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <Btn variant="ghost" onClick={onBack}>← 上一步</Btn>
        <span className="text-white/30 text-xs">目前資料共 {count} 張證書</span>
        <Btn variant="primary" onClick={onNext} className="px-8">第三步：匯入資料 →</Btn>
      </div>
    </div>
  );
}
