import type * as XLSXTypes from 'xlsx';
import type { CertField, ExcelSheet } from '../types';

/** 讀取試算表，回傳所有工作表（官方合併檔每款證書一個工作表） */
export async function parseExcel(
  file: File
): Promise<{
  fileName: string;
  sheets: ExcelSheet[];
  columns: string[];
  rows: Record<string, string>[];
}> {
  const XLSX = await import('xlsx');
  const sheetToData = (ws: XLSXTypes.WorkSheet) => {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    const rows = rawRows.map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) out[k] = formatCell(v);
      return out;
    });
    return { columns, rows };
  };

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true });
  const sheets: ExcelSheet[] = wb.SheetNames.map((name) => {
    const { columns, rows } = sheetToData(wb.Sheets[name]);
    return { name, columns, rows };
  }).filter((s) => s.columns.length > 0);
  const first = sheets[0] ?? { name: '', columns: [], rows: [] };
  return { fileName: file.name, sheets, columns: first.columns, rows: first.rows };
}

function formatCell(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'number') {
    // 避免 1.23400000000002 之類；整數不帶小數點
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  }
  return String(v).trim();
}

/** 依欄位名稱自動對應試算表欄（姓名、日期、編號…） */
export function autoMapColumns(
  fields: CertField[],
  columns: string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  const norm = (s: string) => s.replace(/[\s_\-()（）:：]/g, '').toLowerCase();
  const used = new Set<string>();
  for (const f of fields) {
    if (f.sourceColumns && f.sourceColumns.length > 0) continue; // 多欄組合欄位不做單欄自動對應
    if (f.kind === 'image') continue;
    const target = norm(f.name);
    let hit = columns.find((c) => !used.has(c) && norm(c) === target);
    if (!hit) {
      hit = columns.find((c) => {
        if (used.has(c)) return false;
        const n = norm(c);
        return n.includes(target) || (target.includes(n) && n.length >= 2);
      });
    }
    if (hit) {
      map[f.id] = hit;
      used.add(hit);
    }
  }
  return map;
}
