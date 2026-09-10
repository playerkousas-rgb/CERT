import { useMemo, useState } from 'react';
import {
  Printer, ChevronLeft, ChevronRight, Crosshair, Info, FileDown,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, CheckCircle2,
} from 'lucide-react';
import type { CertTemplate, Calibration } from '../../types';
import { recordCount, resolveRecord } from '../../lib/store';
import { printCertificates, printCalibrationPage, computeCalibration, CAL_INSET } from '../../lib/print';
import { Panel, Label, NumInput, Btn, StepHeader, Toggle } from '../ui';
import CertificatePage from '../CertificatePage';
import ScaledPage from '../ScaledPage';

type RangeMode = 'all' | 'current' | 'custom';

export default function PrintStep({
  template,
  update,
  onBack,
}: {
  template: CertTemplate;
  update: (patch: Partial<CertTemplate>) => void;
  onBack: () => void;
}) {
  const total = recordCount(template);
  const [index, setIndex] = useState(0);
  const [showBg, setShowBg] = useState(true);
  const [applyCal, setApplyCal] = useState(true);
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(total);
  const [calOpen, setCalOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // 資料筆數可能因範本／檔案切換而改變，直接 derive 安全索引與範圍
  const currentIndex = Math.min(index, total - 1);
  const effectiveTo = Math.min(Math.max(to, 1), total);

  const values = useMemo(() => resolveRecord(template, currentIndex), [template, currentIndex]);
  const cal = template.calibration;
  const calActive = cal.offsetX !== 0 || cal.offsetY !== 0 || cal.scaleX !== 100 || cal.scaleY !== 100;

  async function doPrint() {
    let r: { from: number; to: number } | undefined;
    if (rangeMode === 'current') r = { from: currentIndex + 1, to: currentIndex + 1 };
    if (rangeMode === 'custom') {
      const f = Math.max(1, Math.min(total, from));
      const t = Math.max(f, effectiveTo);
      r = { from: f, to: t };
    }
    setPrinting(true);
    try {
      await printCertificates(template, r);
    } finally {
      setPrinting(false);
    }
  }

  function nudge(patch: Partial<Calibration>) {
    update({ calibration: { ...cal, ...patch } });
  }

  return (
    <div>
      <StepHeader title="第四步：核對、校準與列印" subtitle="先用測試列印對位，準確後才放預印紙正式印；同一視窗可直接「另存 PDF」" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* 預覽 */}
        <div className="rounded-xl border border-[#d4a853]/20 bg-[#081220] overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#d4a853]/10 bg-white/[0.02] flex items-center justify-between">
            <span className="text-[#d4a853] text-sm font-bold tracking-wider">
              第 {currentIndex + 1} / {total} 張
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowBg((v) => !v)} className="text-xs text-white/50 hover:text-white flex items-center gap-1">
                {showBg ? '隱藏' : '顯示'}底圖
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => setIndex((i) => Math.max(0, Math.min(i, total - 1) - 1))} disabled={currentIndex === 0}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/60 flex items-center justify-center hover:bg-white/10 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setIndex((i) => Math.min(total - 1, Math.min(i, total - 1) + 1))} disabled={currentIndex === total - 1}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/60 flex items-center justify-center hover:bg-white/10 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="h-[62vh] min-h-[380px] p-3">
            <ScaledPage widthMm={template.paperW} heightMm={template.paperH}>
              <CertificatePage
                template={template}
                values={values}
                showBg={showBg && !!template.bgImage}
                applyCalibration={applyCal}
              />
            </ScaledPage>
          </div>
        </div>

        {/* 控制面板 */}
        <div className="space-y-4">
          <Panel title="列印／存 PDF">
            <div className="space-y-3">
              <Btn variant="primary" className="w-full py-3.5 text-base" onClick={doPrint} disabled={printing}>
                <Printer className="w-5 h-5" />
                {printing ? '正在開啟列印視窗…' : '開啟列印（可選另存 PDF）'}
              </Btn>

              <div className="space-y-2 rounded-lg bg-white/[0.03] border border-white/10 p-3">
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input type="radio" name="range" checked={rangeMode === 'all'} onChange={() => setRangeMode('all')} className="accent-[#d4a853]" />
                  全部 {total} 張
                </label>
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input type="radio" name="range" checked={rangeMode === 'current'} onChange={() => setRangeMode('current')} className="accent-[#d4a853]" />
                  只印目前第 {currentIndex + 1} 張（測試對位用）
                </label>
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input type="radio" name="range" checked={rangeMode === 'custom'} onChange={() => setRangeMode('custom')} className="accent-[#d4a853]" />
                  指定範圍
                </label>
                {rangeMode === 'custom' && (
                  <div className="flex items-center gap-2 pl-6">
                    <NumInput value={from} onValue={setFrom} step={1} min={1} max={total} />
                    <span className="text-white/40 text-sm">至</span>
                    <NumInput value={to} onValue={setTo} step={1} min={1} max={total} />
                    <span className="text-white/40 text-sm">張</span>
                  </div>
                )}
              </div>

              {template.bgImage && (
                <Toggle
                  checked={template.printBg}
                  onChange={(v) => update({ printBg: v })}
                  label={<span className="text-xs">連掃描底圖一起印（白紙打樣；正式印預印紙請關閉）</span>}
                />
              )}
              <Toggle
                checked={applyCal}
                onChange={setApplyCal}
                label={<span className="text-xs">預覽時套用印表機校準修正</span>}
              />
            </div>
          </Panel>

          <Panel title="印表機對位校準" icon={<Crosshair className="w-4 h-4 text-[#d4a853]" />}>
            <div className="space-y-3">
              <div className={`text-xs rounded-lg p-2.5 flex items-start gap-2 ${calActive ? 'bg-emerald-500/10 text-emerald-200/80' : 'bg-white/[0.03] text-white/45'}`}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {calActive ? (
                  <span>
                    已套用修正：X {cal.offsetX > 0 ? '+' : ''}{cal.offsetX}mm，Y {cal.offsetY > 0 ? '+' : ''}{cal.offsetY}mm，
                    縮放 {cal.scaleX}% / {cal.scaleY}%
                  </span>
                ) : (
                  <span>尚未校準。若發覺整體偏移或縮放有偏差，先印校準頁再量度修正。</span>
                )}
              </div>

              {/* 快速微調 */}
              <div>
                <Label hint="每次 0.1mm">水平微調</Label>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" className="flex-1 py-2" onClick={() => nudge({ offsetX: Math.round((cal.offsetX - 0.1) * 100) / 100 })}>
                    <ArrowLeft className="w-4 h-4" /> 左
                  </Btn>
                  <span className="text-white/60 text-sm w-16 text-center tabular-nums">{cal.offsetX.toFixed(1)} mm</span>
                  <Btn variant="ghost" className="flex-1 py-2" onClick={() => nudge({ offsetX: Math.round((cal.offsetX + 0.1) * 100) / 100 })}>
                    右 <ArrowRight className="w-4 h-4" />
                  </Btn>
                </div>
              </div>
              <div>
                <Label>垂直微調（0.1mm）</Label>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" className="flex-1 py-2" onClick={() => nudge({ offsetY: Math.round((cal.offsetY - 0.1) * 100) / 100 })}>
                    <ArrowUp className="w-4 h-4" /> 上
                  </Btn>
                  <span className="text-white/60 text-sm w-16 text-center tabular-nums">{cal.offsetY.toFixed(1)} mm</span>
                  <Btn variant="ghost" className="flex-1 py-2" onClick={() => nudge({ offsetY: Math.round((cal.offsetY + 0.1) * 100) / 100 })}>
                    下 <ArrowDown className="w-4 h-4" />
                  </Btn>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Btn variant="outline" onClick={() => setCalOpen(true)}>
                  <Crosshair className="w-4 h-4" /> 校準精靈
                </Btn>
                <Btn variant="ghost" onClick={() => update({ calibration: { offsetX: 0, offsetY: 0, scaleX: 100, scaleY: 100 } })}>
                  <RotateCcw className="w-4 h-4" /> 重設
                </Btn>
              </div>
            </div>
          </Panel>

          <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 p-3 text-[11px] leading-relaxed text-white/55">
            <div className="flex items-center gap-1.5 text-blue-200/90 font-bold text-xs mb-1.5">
              <Info className="w-3.5 h-3.5" /> 列印對話框必須設定
            </div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>邊界／Margins：<b className="text-white/75">無（None）</b></li>
              <li>縮放／Scale：<b className="text-white/75">100%（實際大小，勿選「配合頁面」／Fit to page）</b></li>
              <li>頁首頁尾／Headers &amp; footers：<b className="text-white/75">關閉</b>；雙面列印：關閉</li>
              <li>紙張尺寸／方向依畫面所示（通常 A4 橫向）</li>
              <li>要存 PDF：目的地選「<b className="text-white/75">另存為 PDF／Save as PDF</b>」，文字為向量，清晰度不失真</li>
              <li>建議先用白紙印第 1 張，對光與預印紙重疊比對，微調準確後才正式印</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Btn variant="ghost" onClick={onBack}>← 上一步</Btn>
        <Btn variant="ghost" onClick={() => printCalibrationPage(template)}>
          <FileDown className="w-4 h-4" /> 直接列印校準頁
        </Btn>
      </div>

      {calOpen && (
        <CalibrationWizard
          template={template}
          onClose={() => setCalOpen(false)}
          onApply={(c) => {
            update({ calibration: c });
            setCalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CalibrationWizard({
  template,
  onClose,
  onApply,
}: {
  template: CertTemplate;
  onClose: () => void;
  onApply: (c: Calibration) => void;
}) {
  const [mL, setML] = useState(CAL_INSET);
  const [mT, setMT] = useState(CAL_INSET);
  const [mR, setMR] = useState(CAL_INSET);
  const [mB, setMB] = useState(CAL_INSET);

  const preview = computeCalibration(template, mL, mT, mR, mB);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0c1c33] border border-[#d4a853]/25 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[#d4a853]/15">
          <h3 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            <Crosshair className="w-5 h-5 text-[#d4a853]" />
            印表機校準精靈
          </h3>
          <p className="text-white/45 text-xs mt-1">每部印表機的可列印範圍不同，導致位移／縮放；做一次即可。</p>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="text-sm text-[#d4a853] font-bold mb-1">① 放一張白紙，列印校準頁</div>
            <p className="text-white/50 text-xs leading-relaxed mb-2">
              校準頁四角有 L 形標記（理論距離紙邊 {CAL_INSET}mm）及每 10mm 參考線。切記對話框設為「100%、邊界無」。
            </p>
            <Btn variant="outline" className="w-full" onClick={() => printCalibrationPage(template)}>
              <Printer className="w-4 h-4" /> 列印校準頁
            </Btn>
          </div>

          <div>
            <div className="text-sm text-[#d4a853] font-bold mb-1">② 用間尺量度四個角標距離紙邊（mm）</div>
            <p className="text-white/50 text-xs leading-relaxed mb-3">
              若標記被裁切，照實量度邊緣位置；若標記距離大過 {CAL_INSET}，代表內容被印入了。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label hint={`應為 ${CAL_INSET}`}>左上角標距左邊</Label>
                <NumInput value={mL} onValue={setML} suffix="mm" />
              </div>
              <div>
                <Label hint={`應為 ${CAL_INSET}`}>左上角標距頂邊</Label>
                <NumInput value={mT} onValue={setMT} suffix="mm" />
              </div>
              <div>
                <Label hint={`應為 ${CAL_INSET}`}>右上角標距右邊</Label>
                <NumInput value={mR} onValue={setMR} suffix="mm" />
              </div>
              <div>
                <Label hint={`應為 ${CAL_INSET}`}>左下角標距底邊</Label>
                <NumInput value={mB} onValue={setMB} suffix="mm" />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-xs text-white/60 space-y-1">
            <div className="text-white/45 mb-1">計算結果（修正值）：</div>
            <div>水平平移：<span className="text-[#d4a853] tabular-nums">{preview.offsetX > 0 ? '+' : ''}{preview.offsetX} mm</span></div>
            <div>垂直平移：<span className="text-[#d4a853] tabular-nums">{preview.offsetY > 0 ? '+' : ''}{preview.offsetY} mm</span></div>
            <div>水平縮放：<span className="text-[#d4a853] tabular-nums">{preview.scaleX}%</span> · 垂直：<span className="text-[#d4a853] tabular-nums">{preview.scaleY}%</span></div>
            <div className="text-white/35 pt-1">套用後建議再印一張測試，殘餘偏差可用「微調」按鈕修正至完全對位。</div>
          </div>
        </div>
        <div className="p-5 border-t border-[#d4a853]/15 flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>取消</Btn>
          <Btn variant="primary" onClick={() => onApply(preview)}>套用修正</Btn>
        </div>
      </div>
    </div>
  );
}
