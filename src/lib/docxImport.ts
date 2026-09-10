// ─────────────────────────────────────────────────────────────
// 官方 Word 合併列印檔（.docx）匯入
// 解析文字方塊（VML / DrawingML）的精確 mm 位置、MERGEFIELD 合併欄、
// 字型及紙張尺寸，直接建立範本；含全頁底圖時一併提取。
// .doc 請先用 Word／WPS 另存為 .docx。
// ─────────────────────────────────────────────────────────────
import JSZip from 'jszip';
import type { CertField, CertTemplate, SourceColumn, TextAlign } from '../types';
import { createField } from './store';

const EMU_PER_MM = 36000;
const TWIP_PER_MM = 1440 / 25.4;
const PT_PER_MM = 72 / 25.4;


const ln = (el: Element): string => el.localName || el.tagName.replace(/^.*:/, '');

function all(el: Element | Document, name: string): Element[] {
  const out: Element[] = [];
  el.querySelectorAll('*').forEach((n) => {
    if (ln(n as Element) === name) out.push(n as Element);
  });
  return out;
}

function first(el: Element | Document, name: string): Element | null {
  const list = all(el, name);
  return list[0] ?? null;
}

function attrNs(el: Element, local: string): string | null {
  for (const a of Array.from(el.attributes)) {
    if ((a.localName || a.name.replace(/^.*:/, '')) === local) return a.value;
  }
  return null;
}

/** 解析 VML style，例：position:absolute;margin-left:120pt;margin-top:40pt;width:200pt; */
function parseVmlStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function lenToMm(v: string): number {
  const m = /^(-?[0-9.]+)(mm|cm|pt|px|in|pc)?$/.exec(v.trim());
  if (!m) return 0;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case 'mm': return n;
    case 'cm': return n * 10;
    case 'in': return n * 25.4;
    case 'px': return n / 96 * 25.4;
    case 'pc': return n * 12 / PT_PER_MM;
    case 'pt':
    default: return n / PT_PER_MM;
  }
}

function styleLen(s: Record<string, string>, ...keys: string[]): number {
  for (const k of keys) {
    if (s[k]) return lenToMm(s[k]);
  }
  return 0;
}

interface BoxText {
  /** ' ' 同行空格、'\n' 換行 */
  segments: Array<{ kind: 'field' | 'text'; value: string }>;
  /** 每個欄位前的分隔字元，長度 = field 數目（首個為 ''） */
  fieldSeps: string[];
  fields: string[];
  fontPt: number;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  fontFamily: string;
}

function parseMergeName(instr: string): string | null {
  const m = /MERGEFIELD\s+("([^"]+)"|([^\s\\]+))/i.exec(instr);
  if (!m) return null;
  return (m[2] ?? m[3] ?? '').trim();
}

/** 由文字方塊內容取出合併欄位與樣式（按文件順序走訪） */
function extractText(txbx: Element): BoxText {
  const segments: BoxText['segments'] = [];
  const fields: string[] = [];
  const fieldSeps: string[] = [];
  let fontPt = 12;
  let bold = false;
  let italic = false;
  let fontFamily = '';
  let align: TextAlign = 'center';

  let pendingBreak = false; // 與上一個內容之間有換行
  let pendingSpace = false; // 與上一個內容之間有空格
  let fieldDepth = 0; // 在 fldChar begin…end 之間
  let instrBuf = '';

  const pushField = (name: string) => {
    if (fields.includes(name)) return;
    fields.push(name);
    const sep = fields.length === 1 ? '' : pendingBreak ? '\n' : pendingSpace ? ' ' : ' ';
    fieldSeps.push(sep);
    segments.push({ kind: 'field', value: name });
    pendingBreak = false;
    pendingSpace = false;
  };

  const paras = all(txbx, 'p');
  paras.forEach((p, pi) => {
    if (pi > 0) pendingBreak = true;

    const walk = (el: Element) => {
      const cl = ln(el);
      if (cl === 'fldSimple') {
        const name = parseMergeName(attrNs(el, 'instr') ?? '');
        if (name) pushField(name);
        return; // 略過快取結果
      }
      if (cl === 'rPr') return; // 樣式另外讀
      if (cl === 'fldChar') {
        const t = attrNs(el, 'fldCharType');
        if (t === 'begin') { fieldDepth++; instrBuf = ''; }
        else if (t === 'end') {
          fieldDepth = Math.max(0, fieldDepth - 1);
          const name = parseMergeName(instrBuf);
          if (name) pushField(name);
          instrBuf = '';
        }
        return;
      }
      if (cl === 'instrText') {
        instrBuf += el.textContent ?? '';
        return;
      }
      if (cl === 'br' || cl === 'cr') {
        pendingBreak = true;
        return;
      }
      if (cl === 't') {
        if (fieldDepth > 0) return; // 合併欄位的快取值，略過
        const txt = el.textContent ?? '';
        if (txt.includes('\n')) pendingBreak = true;
        if (/\s/.test(txt)) pendingSpace = true;
        const visible = txt.replace(/[«»]/g, '').trim();
        if (visible) {
          segments.push({ kind: 'text', value: visible });
          pendingBreak = false;
        }
        return;
      }
      if (cl === 'r') {
        const rPr = first(el, 'rPr');
        if (rPr) {
          const sz = first(rPr, 'sz');
          const v = sz?.getAttribute('w:val');
          if (v && !segments.length) fontPt = parseInt(v, 10) / 2 || fontPt;
          if (first(rPr, 'b') && !segments.length) bold = true;
          if (first(rPr, 'i') && !segments.length) italic = true;
          const rf = first(rPr, 'rFonts');
          if (rf && !fontFamily) fontFamily = fontStack(rf);
        }
      }
      Array.from(el.children).forEach(walk);
    };
    walk(p);

    const pPr = first(p, 'pPr');
    if (pPr) {
      const jc = first(pPr, 'jc');
      const v = jc?.getAttribute('w:val');
      if (v === 'left' || v === 'start') align = 'left';
      else if (v === 'right' || v === 'end') align = 'right';
      else if (v) align = 'center';
    }
  });

  return { segments, fieldSeps, fields, fontPt: Math.round(fontPt * 10) / 10 || 12, bold, italic, align, fontFamily };
}

function fontStack(rf: Element): string {
  const names = ['eastAsia', 'ascii', 'hAnsi']
    .map((k) => rf.getAttribute(`w:${k}`))
    .filter(Boolean) as string[];
  const orig = Array.from(new Set(names));
  const first = orig[0] ?? '';
  const serif = /ming|song|kai|serif|times|pming/i.test(first);
  const sans = /hei|gothic|arial|calibri|sans/i.test(first);
  const tail = serif
    ? "'Noto Serif TC', 'PMingLiU', serif"
    : sans
      ? "'Noto Sans TC', 'Microsoft JhengHei', sans-serif"
      : "'Noto Serif TC', serif";
  return [...orig.map((n) => `'${n}'`), tail].join(', ');
}

interface ParsedBox {
  x: number; y: number; w: number; h: number;
  text: BoxText | null;
  imagePath?: string;
  imageW: number; imageH: number;
}

export interface DocxImportResult {
  name: string;
  paperW: number;
  paperH: number;
  fields: CertField[];
  bgImage: string | null;
  bgName: string;
  warnings: string[];
}

export async function importDocx(file: File): Promise<DocxImportResult> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const docXml = await zip.file('word/document.xml')!.async('string');
  const doc = new DOMParser().parseFromString(docXml, 'application/xml');
  const rels = await loadRels(zip);

  // 紙張尺寸
  const pgSz = first(doc, 'pgSz');
  let paperW = 297;
  let paperH = 210;
  let marL = 0, marT = 0;
  if (pgSz) {
    const w = parseInt(pgSz.getAttribute('w:w') ?? '0', 10);
    const h = parseInt(pgSz.getAttribute('w:h') ?? '0', 10);
    paperW = Math.round((w / TWIP_PER_MM) * 10) / 10;
    paperH = Math.round((h / TWIP_PER_MM) * 10) / 10;
    const mar = first(doc, 'pgMar');
    if (mar) {
      marL = (parseInt(mar.getAttribute('w:left') ?? '0', 10)) / TWIP_PER_MM;
      marT = (parseInt(mar.getAttribute('w:top') ?? '0', 10)) / TWIP_PER_MM;
    }
  }

  const boxes: ParsedBox[] = [];
  const warnings: string[] = [];

  // 官方格式常把全頁底圖放在 header；逐個 header/footer 部分解析
  const partNames = Object.keys(zip.files).filter(
    (n) => /^word\/(header|footer)\d*\.xml$/.test(n)
  );
  for (const partName of partNames) {
    const partXml = await zip.file(partName)!.async('string');
    const partDoc = new DOMParser().parseFromString(partXml, 'application/xml');
    const partRels = await loadPartRels(zip, partName);
    boxes.push(...collectBoxes(partDoc, partRels, paperW, paperH, marL, marT));
  }
  boxes.push(...collectBoxes(doc, rels, paperW, paperH, marL, marT));

  // ── 組成欄位 ──
  const fields: CertField[] = [];
  const anyMerge = boxes.some((b) => b.text && b.text.fields.length > 0);

  for (const b of boxes) {
    if (!b.text) continue;
    const t = b.text;
    if (anyMerge) {
      if (t.fields.length === 0) continue; // 固定文字屬預印內容，略過
      const sourceColumns: SourceColumn[] = t.fields.map((column, i) => ({
        column,
        sep: t.fieldSeps[i] ?? (i === 0 ? '' : ' '),
      }));
      fields.push(
        createField({
          name: t.fields.join(' ＋ '),
          kind: 'text',
          xMm: Math.round((b.x + b.w / 2) * 100) / 100,
          yMm: Math.round((b.y + b.h / 2) * 100) / 100,
          widthMm: Math.max(0, Math.round(b.w * 100) / 100),
          fontPt: t.fontPt,
          bold: t.bold,
          italic: t.italic,
          align: t.align,
          fontFamily: t.fontFamily || "'Noto Serif TC', 'PMingLiU', serif",
          sourceColumn: t.fields.length === 1 ? t.fields[0] : '',
          sourceColumns,
          content: '',
        })
      );
    } else if (t.segments.some((s) => s.kind === 'text')) {
      // 無合併欄位的 Word：把每個有文字的方塊變成欄位
      const txt = t.segments.map((s) => s.value).join(' ').trim();
      if (!txt) continue;
      fields.push(
        createField({
          name: txt.slice(0, 12),
          xMm: Math.round((b.x + b.w / 2) * 100) / 100,
          yMm: Math.round((b.y + b.h / 2) * 100) / 100,
          widthMm: Math.max(0, Math.round(b.w * 100) / 100),
          fontPt: t.fontPt,
          bold: t.bold,
          italic: t.italic,
          align: t.align,
          fontFamily: t.fontFamily,
          content: txt,
        })
      );
    }
  }

  // ── 全頁底圖 ──
  let bgImage: string | null = null;
  let bgName = '';
  for (const b of boxes) {
    if (!b.imagePath) continue;
    const area = b.imageW * b.imageH;
    if (area > paperW * paperH * 0.45) {
      const path = b.imagePath;
      const media = zip.file(path);
      if (media) {
        const blob = await media.async('base64');
        const ext = (path.split('.').pop() ?? 'png').toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/' + ext;
        bgImage = `data:${mime};base64,${blob}`;
        bgName = path.split('/').pop() ?? 'word-image';
      }
    }
  }

  if (fields.length === 0) {
    warnings.push('在文件中找不到 Word 合併欄位（MERGEFIELD）或文字方塊；請確認是官方合併列印 .docx。');
  }

  return {
    name: file.name.replace(/\.docx?$/i, ''),
    paperW,
    paperH,
    fields,
    bgImage,
    bgName,
    warnings,
  };
}

/** 由某個 XML 部分（document／header／footer）收集文字方塊與圖片方塊 */
function collectBoxes(
  root: Document | Element,
  rels: Record<string, string>,
  paperW: number,
  paperH: number,
  marL: number,
  marT: number
): ParsedBox[] {
  const boxes: ParsedBox[] = [];
  const ridPath = (rid?: string): string | undefined => {
    if (!rid) return undefined;
    const target = rels[rid];
    if (!target) return undefined;
    if (target.startsWith('/')) return target.slice(1);
    // header/footer 位於 word/ 之下，相對目標（media/xxx）補上 word/
    return `word/${target.replace(/^\/?word\//, '')}`;
  };

  // ── VML 文字方塊／圖片（官方 .doc 另存的主要形式）──
  for (const shape of all(root, 'shape')) {
    const style = parseVmlStyle(shape.getAttribute('style') ?? '');
    const txbxEl = first(shape, 'txbxContent');
    const imgData = first(shape, 'imagedata');
    if (!txbxEl && !imgData) continue;

    const x = styleLen(style, 'margin-left', 'left');
    const y = styleLen(style, 'margin-top', 'top');
    const w = styleLen(style, 'width');
    const h = styleLen(style, 'height');
    const rid = imgData ? attrNs(imgData, 'id') ?? undefined : undefined;

    // 在 v:group 內要做群組座標轉換
    const group = closestLocal(shape, 'group');
    if (group) {
      const gStyle = parseVmlStyle(group.getAttribute('style') ?? '');
      const gx = styleLen(gStyle, 'margin-left', 'left');
      const gy = styleLen(gStyle, 'margin-top', 'top');
      const gw = styleLen(gStyle, 'width');
      const gh = styleLen(gStyle, 'height');
      const coord = (group.getAttribute('coordsize') ?? '').split(/[ ,]/);
      const cw = parseFloat(coord[0] ?? '0');
      const ch = parseFloat(coord[1] ?? '0');
      if (cw > 0 && ch > 0) {
        const kx = gw / (cw / 96 * 25.4);
        const ky = gh / (ch / 96 * 25.4);
        boxes.push({
          x: gx + x * kx, y: gy + y * ky, w: w * kx, h: h * ky,
          text: txbxEl ? extractText(txbxEl) : null,
          imagePath: ridPath(rid),
          imageW: w * kx, imageH: h * ky,
        });
        continue;
      }
    }
    boxes.push({
      x, y, w, h,
      text: txbxEl ? extractText(txbxEl) : null,
      imagePath: ridPath(rid),
      imageW: w, imageH: h,
    });
  }

  // ── DrawingML 錨定文字方塊／圖片 ──
  for (const anchor of all(root, 'anchor')) {
    const posH = first(anchor, 'positionH');
    const posV = first(anchor, 'positionV');
    const extent = first(anchor, 'extent');
    const cx = extent ? parseInt(extent.getAttribute('cx') ?? '0', 10) / EMU_PER_MM : 0;
    const cy = extent ? parseInt(extent.getAttribute('cy') ?? '0', 10) / EMU_PER_MM : 0;
    let x = 0, y = 0;
    const offH = posH ? first(posH, 'posOffset') : null;
    const offV = posV ? first(posV, 'posOffset') : null;
    const relH = posH?.getAttribute('relativeFrom') ?? 'page';
    const relV = posV?.getAttribute('relativeFrom') ?? 'page';
    if (offH) x = parseInt(offH.textContent ?? '0', 10) / EMU_PER_MM;
    if (offV) y = parseInt(offV.textContent ?? '0', 10) / EMU_PER_MM;
    if (relH !== 'page') x += marL;
    if (relV !== 'page') y += marT;
    if (first(posH ?? anchor, 'align')?.textContent === 'center') x = (paperW - cx) / 2;
    if (first(posV ?? anchor, 'align')?.textContent === 'center') y = (paperH - cy) / 2;

    const txbxEl = first(anchor, 'txbxContent');
    const blip = first(anchor, 'blip');
    boxes.push({
      x, y, w: cx, h: cy,
      text: txbxEl ? extractText(txbxEl) : null,
      imagePath: ridPath(blip ? attrNs(blip, 'embed') ?? undefined : undefined),
      imageW: cx, imageH: cy,
    });
  }

  return boxes;
}

function closestLocal(el: Element, local: string): Element | null {
  let cur: Element | null = el.parentElement;
  while (cur) {
    if (ln(cur) === local) return cur;
    cur = cur.parentElement;
  }
  return null;
}

function parseRelsXml(xml: string): Record<string, string> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const out: Record<string, string> = {};
  doc.querySelectorAll('Relationship').forEach((r) => {
    const el = r as Element;
    out[el.getAttribute('Id') ?? ''] = el.getAttribute('Target') ?? '';
  });
  return out;
}

async function loadPartRels(zip: JSZip, partPath: string): Promise<Record<string, string>> {
  // partPath 例：word/header1.xml → word/_rels/header1.xml.rels
  const m = /^(word)\/(.*)\.xml$/.exec(partPath);
  const relPath = m ? `${m[1]}/_rels/${m[2]}.xml.rels` : '';
  const f = relPath ? zip.file(relPath) : null;
  return f ? parseRelsXml(await f.async('string')) : {};
}

async function loadRels(zip: JSZip): Promise<Record<string, string>> {
  const f = zip.file('word/_rels/document.xml.rels');
  return f ? parseRelsXml(await f.async('string')) : {};
}

/** 套用匯入結果到範本更新 */
export function docxResultToTemplatePatch(r: DocxImportResult): Partial<CertTemplate> {
  return {
    name: r.name,
    paperW: r.paperW,
    paperH: r.paperH,
    fields: r.fields,
    bgImage: r.bgImage,
    bgName: r.bgName,
    dataMode: 'excel',
    excelFileName: '',
    excelColumns: [],
    excelRows: [],
    excelSheets: undefined,
    excelSheet: undefined,
    manualRows: [{}],
  };
}
