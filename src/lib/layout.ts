import type { CertField } from '../types';

/** mm → CSS px（屏幕顯示用，96dpi） */
export const MM_TO_PX = 96 / 25.4;
export const mmPx = (mm: number): number => mm * MM_TO_PX;

const mm = (v: number): string => `${v.toFixed(2)}mm`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 欄位 CSS（React 用 camelCase 物件，列印視窗經 fieldStyleCss 轉成字串），兩者絕對一致 */
export function fieldStyle(f: CertField): Record<string, string> {
  const base: Record<string, string> = {
    position: 'absolute',
    left: mm(f.xMm),
    top: mm(f.yMm),
    transform: 'translate(-50%, -50%)',
  };
  if (f.kind === 'image') {
    base.width = mm(f.widthMm || 40);
    return base;
  }
  return {
    ...base,
    width: f.widthMm > 0 ? mm(f.widthMm) : 'auto',
    maxWidth: '96%',
    margin: '0',
    padding: '0',
    fontFamily: f.fontFamily,
    fontSize: `${f.fontPt}pt`,
    fontStyle: f.italic ? 'italic' : 'normal',
    fontWeight: f.bold ? '700' : '400',
    color: f.fontColor,
    textAlign: f.align,
    lineHeight: String(f.lineHeight),
    whiteSpace: 'pre-wrap',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
  };
}

export function fieldStyleCss(f: CertField): string {
  return Object.entries(fieldStyle(f))
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`)
    .join(';');
}

/** 列印視窗用：單一欄位 HTML */
export function fieldHtml(f: CertField, value: string): string {
  const style = fieldStyleCss(f);
  if (f.kind === 'image') {
    if (!value) return '';
    return `<div style="${style};text-align:${f.align}"><img src="${value}" style="width:100%;height:auto;display:block" /></div>`;
  }
  return `<div style="${style}">${escapeHtml(value)}</div>`;
}
