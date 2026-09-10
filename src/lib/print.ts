import type { CertTemplate } from '../types';
import { fieldHtml } from './layout';
import { recordCount, resolveRecord } from './store';

// ─────────────────────────────────────────────────────────────
// 校準頁常數（L 形角標距紙邊 INSET mm）
// ─────────────────────────────────────────────────────────────
export const CAL_INSET = 12;

const FONT_LINKS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@400;500;700&display=swap" rel="stylesheet">';

function baseCss(w: number, h: number, extra = ''): string {
  return `
  @page { size: ${w}mm ${h}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    width: ${w}mm; height: ${h}mm;
    position: relative; overflow: hidden;
    page-break-after: always; break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .cal {
    position: absolute; left: 0; top: 0;
    width: ${w}mm; height: ${h}mm;
    transform-origin: 0 0;
  }
  .bg { position: absolute; left: 0; top: 0; width: ${w}mm; height: ${h}mm; }
  .bg img { width: 100%; height: 100%; display: block; }
  ${extra}`;
}

function openPrintWindow(title: string, body: string, css: string): Window | null {
  const w = window.open('', '_blank');
  if (!w) {
    alert('瀏覽器封鎖了彈出視窗，請允許此網站開啟彈出視窗後再試。');
    return null;
  }
  w.document.write(
    `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
     <title>${title}</title>${FONT_LINKS}<style>${css}</style></head>
     <body>${body}</body></html>`
  );
  w.document.close();
  return w;
}

async function waitThenPrint(w: Window): Promise<void> {
  // 等待所有圖片載入
  const imgs = Array.from(w.document.images);
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
  // 等待網頁字型（最多 4 秒，離線亦不阻塞）
  try {
    const fonts = (w.document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts) {
      const loaded = Promise.all([
        fonts.load('12pt "Noto Serif TC"'),
        fonts.load('700 20pt "Noto Serif TC"'),
        fonts.load('12pt "Noto Sans TC"'),
      ])
        .then(() => fonts.ready)
        .catch(() => undefined);
      await Promise.race([loaded, new Promise((r) => setTimeout(r, 4000))]);
    }
  } catch {
    /* ignore */
  }
  await new Promise((r) => setTimeout(r, 150));
  w.focus();
  w.print();
  // 部分瀏覽器於列印後關閉
  const close = () => setTimeout(() => w.close(), 300);
  try {
    w.addEventListener('afterprint', close, { once: true });
  } catch {
    /* 部分瀏覽器不支援則保留視窗 */
  }
}

function calTransform(t: CertTemplate): string {
  const c = t.calibration;
  const identity =
    c.offsetX === 0 && c.offsetY === 0 && c.scaleX === 100 && c.scaleY === 100;
  if (identity) return '';
  return `transform: translate(${c.offsetX.toFixed(3)}mm, ${c.offsetY.toFixed(
    3
  )}mm) scale(${(c.scaleX / 100).toFixed(5)}, ${(c.scaleY / 100).toFixed(5)});`;
}

/** 列印證書 */
export async function printCertificates(
  t: CertTemplate,
  range?: { from: number; to: number }
): Promise<void> {
  const total = recordCount(t);
  const from = Math.max(0, (range?.from ?? 1) - 1);
  const to = Math.min(total, range?.to ?? total);
  const pages: string[] = [];
  for (let i = from; i < to; i++) {
    const values = resolveRecord(t, i);
    const fields = t.fields.map((f) => fieldHtml(f, values[f.id] ?? '')).join('\n');
    const bg =
      t.printBg && t.bgImage
        ? `<div class="bg"><img src="${t.bgImage}" alt="" /></div>`
        : '';
    pages.push(
      `<div class="page"><div class="cal" style="${calTransform(t)}">${bg}${fields}</div></div>`
    );
  }
  const w = openPrintWindow(`列印證書（${to - from} 張）`, pages.join('\n'), baseCss(t.paperW, t.paperH));
  if (w) await waitThenPrint(w);
}

// ─────────────────────────────────────────────────────────────
// 校準頁
// ─────────────────────────────────────────────────────────────
function lMark(x: number, y: number, rot: number): string {
  // L 形標記（兩邊 10mm、粗 0.5mm），rot = 0 為左上角，順時針 90/180/270
  return (
    `<div style="position:absolute;left:${x}mm;top:${y}mm;transform:rotate(${rot}deg);transform-origin:0 0;">` +
    `<div style="position:absolute;left:0;top:0;width:10mm;height:0.5mm;background:#000"></div>` +
    `<div style="position:absolute;left:0;top:0;width:0.5mm;height:10mm;background:#000"></div>` +
    `</div>`
  );
}

function tickLines(w: number, h: number): string {
  let s = '';
  // 垂直厘米線（由 20mm 起，每 10mm）
  for (let x = 20; x <= w - 20; x += 10) {
    const major = x % 50 === 0;
    s += `<div style="position:absolute;left:${x}mm;top:${CAL_INSET}mm;height:${h - 2 * CAL_INSET}mm;width:${major ? 0.25 : 0.1}mm;background:${major ? 'rgba(200,0,0,0.55)' : 'rgba(0,0,0,0.25)'}"></div>`;
    s += `<div style="position:absolute;left:${x}mm;top:${CAL_INSET + 1.5}mm;font-size:7pt;color:#888;transform:translateX(-50%)">${x}</div>`;
  }
  for (let y = 20; y <= h - 20; y += 10) {
    const major = y % 50 === 0;
    s += `<div style="position:absolute;top:${y}mm;left:${CAL_INSET}mm;width:${w - 2 * CAL_INSET}mm;height:${major ? 0.25 : 0.1}mm;background:${major ? 'rgba(200,0,0,0.55)' : 'rgba(0,0,0,0.25)'}"></div>`;
    s += `<div style="position:absolute;top:${y}mm;left:${CAL_INSET + 1.5}mm;font-size:7pt;color:#888;transform:translateY(-50%)">${y}</div>`;
  }
  return s;
}

export function printCalibrationPage(t: CertTemplate): void {
  const { paperW: w, paperH: h } = t;
  const I = CAL_INSET;
  const body = `
  <div class="page">
    ${lMark(I, I, 0)}
    ${lMark(w - I, I, 90)}
    ${lMark(w - I, h - I, 180)}
    ${lMark(I, h - I, 270)}
    ${tickLines(w, h)}
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;font-family:'Noto Sans TC',sans-serif">
      <div style="font-size:14pt;font-weight:700">印表機校準頁</div>
      <div style="font-size:9pt;color:#444;margin-top:2mm">
        四個 L 形角標理論上距離紙邊 ${I} mm；每 10mm 一條參考線（紅線為 50mm 倍數）
      </div>
      <div style="font-size:9pt;color:#c00;margin-top:1.5mm">
        列印設定必須為：實際大小 100%（切勿「配合頁面」）、邊界：無、雙面列印：關
      </div>
      <div style="font-size:8pt;color:#888;margin-top:1.5mm">紙張 ${w} × ${h} mm</div>
    </div>
  </div>`;
  const win = openPrintWindow('印表機校準頁', body, baseCss(w, h));
  if (win) waitThenPrint(win);
}

/**
 * 依量度結果計算校準值
 * @param mL 左上角標距紙左邊緣（mm）
 * @param mT 左上角標距紙頂邊緣（mm）
 * @param mR 右上角標距紙右邊緣（mm）
 * @param mB 左下角標距紙底邊緣（mm）
 */
export function computeCalibration(
  t: CertTemplate,
  mL: number,
  mT: number,
  mR: number,
  mB: number
): { offsetX: number; offsetY: number; scaleX: number; scaleY: number } {
  const I = CAL_INSET;
  const { paperW: w, paperH: h } = t;
  // 硬體實測：實測位置 = a + k × 設計位置（k 為印表機實際縮放）
  const kx = (w - mL - mR) / (w - 2 * I);
  const ky = (h - mT - mB) / (h - 2 * I);
  // CSS 補償用倒數縮放 s = 1/k；平移令 a + k·offset = 0
  const sx = 1 / kx;
  const sy = 1 / ky;
  const offsetX = I - mL * sx;
  const offsetY = I - mT * sy;
  return {
    offsetX: Math.round(offsetX * 100) / 100,
    offsetY: Math.round(offsetY * 100) / 100,
    scaleX: Math.round(sx * 100_000) / 1000,
    scaleY: Math.round(sy * 100_000) / 1000,
  };
}
