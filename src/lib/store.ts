import type { CertTemplate, CertField, Calibration, DataMode } from '../types';

// ─────────────────────────────────────────────────────────────
// 常數
// ─────────────────────────────────────────────────────────────
export interface PaperPreset {
  key: string;
  label: string;
  w: number;
  h: number;
}

export const PAPER_PRESETS: PaperPreset[] = [
  { key: 'A4', label: 'A4（210 × 297 mm）', w: 210, h: 297 },
  { key: 'A5', label: 'A5（148 × 210 mm）', w: 148, h: 210 },
  { key: 'B5', label: 'B5（176 × 250 mm）', w: 176, h: 250 },
  { key: 'Letter', label: 'Letter（216 × 279 mm）', w: 215.9, h: 279.4 },
  { key: 'custom', label: '自訂尺寸', w: 210, h: 297 },
];

/** 網頁字型（任何可上網電腦一致）為首，系統字型在後 */
export const FONTS: { value: string; label: string }[] = [
  { value: "'Noto Serif TC', 'PMingLiU', 'MingLiU', serif", label: '思源宋體（網頁）' },
  { value: "'Noto Sans TC', 'Microsoft JhengHei', sans-serif", label: '思源黑體（網頁）' },
  { value: "'DFKai-SB', 'BiauKai', 'KaiTi', 'Kaiti SC', 'Noto Serif TC', serif", label: '標楷體（系統）' },
  { value: "'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif", label: '微軟正黑體（系統）' },
  { value: "'PMingLiU', 'MingLiU', 'Noto Serif TC', serif", label: '新細明體（系統）' },
  { value: "Georgia, 'Times New Roman', 'Noto Serif TC', serif", label: 'Georgia（英文）' },
  { value: "Arial, Helvetica, 'Noto Sans TC', sans-serif", label: 'Arial（英文）' },
];

export const uid = (): string =>
  `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// ─────────────────────────────────────────────────────────────
// 預設值
// ─────────────────────────────────────────────────────────────
export function defaultCalibration(): Calibration {
  return { offsetX: 0, offsetY: 0, scaleX: 100, scaleY: 100 };
}

export function createField(partial: Partial<CertField> = {}): CertField {
  return {
    id: uid(),
    name: '新欄位',
    kind: 'text',
    xMm: 105,
    yMm: 100,
    widthMm: 0,
    fontPt: 20,
    fontFamily: FONTS[0].value,
    fontColor: '#1a1a1a',
    bold: false,
    italic: false,
    align: 'center',
    lineHeight: 1.3,
    content: '',
    sourceColumn: '',
    ...partial,
  };
}

export function createTemplate(name = '新證書範本'): CertTemplate {
  const nameField = createField({ name: '姓名', yMm: 95, fontPt: 26, bold: true, content: '陳大文' });
  const dateField = createField({
    name: '日期',
    yMm: 160,
    fontPt: 14,
    content: '',
    widthMm: 80,
  });
  const noField = createField({
    name: '證書編號',
    xMm: 185,
    yMm: 18,
    fontPt: 10,
    widthMm: 45,
    align: 'right',
    content: '',
  });
  return {
    id: uid(),
    name,
    paperW: 297, // 橫 A4
    paperH: 210,
    bgImage: null,
    bgName: '',
    fields: [nameField, dateField, noField],
    calibration: defaultCalibration(),
    printBg: false,
    dataMode: 'manual',
    excelFileName: '',
    excelColumns: [],
    excelRows: [],
    manualRows: [{}],
    updatedAt: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────
// 範本庫（localStorage）
// ─────────────────────────────────────────────────────────────
const STORE_KEY = 'scout-preprinted-cert-templates-v1';
const ACTIVE_KEY = 'scout-preprinted-cert-active-v1';

interface Store {
  templates: CertTemplate[];
  activeId: string | null;
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      // 全新使用者：不在此即時寫入（App 會先嘗試載入部署種子範本），稍後由自動儲存寫回
      const t = createTemplate('預設範本（橫向 A4）');
      return { templates: [t], activeId: t.id };
    }
    const parsed = JSON.parse(raw) as Store;
    const activeId = localStorage.getItem(ACTIVE_KEY);
    if (!parsed.templates.some((t) => t.id === activeId)) {
      parsed.activeId = parsed.templates[0]?.id ?? null;
    } else {
      parsed.activeId = activeId;
    }
    return parsed;
  } catch {
    const t = createTemplate('預設範本（橫向 A4）');
    return { templates: [t], activeId: t.id };
  }
}

export function saveStore(store: Store): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    if (store.activeId) localStorage.setItem(ACTIVE_KEY, store.activeId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '瀏覽器儲存空間不足' };
  }
}

export function exportTemplate(t: CertTemplate): void {
  const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${t.name.replace(/[\\/:*?"<>|]/g, '_')}.cert.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 把匯入的 JSON 物件正規化成新範本（重新編 id、重設跟機的校準值） */
function normalizeTemplate(obj: Partial<CertTemplate>): CertTemplate {
  const base = createTemplate(obj.name || '匯入的範本');
  return {
    ...base,
    ...obj,
    id: uid(), // 匯入視為新範本，避免覆蓋
    calibration: defaultCalibration(), // 校準值跟機／跟印表機，需重新校準
    fields: (obj.fields ?? []).map((f) => ({ ...createField(), ...f })),
    updatedAt: Date.now(),
  } as CertTemplate;
}

export function parseTemplateFile(file: File): Promise<CertTemplate> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result as string) as Partial<CertTemplate>;
        if (Array.isArray((obj as { templates?: unknown }).templates)) {
          reject(new Error('這是範本包，請用左側「匯入範本包」一次過匯入'));
          return;
        }
        resolve(normalizeTemplate(obj));
      } catch (e) {
        reject(e instanceof Error && e.message.includes('範本包')
          ? e
          : new Error('檔案格式不正確，應為 .cert.json 範本檔'));
      }
    };
    r.onerror = () => reject(new Error('讀檔失敗'));
    r.readAsText(file);
  });
}

/** 一次過匯出全部範本（含官方 Word 匯入的位置與底圖），供其他電腦直接使用 */
export function exportBundle(templates: CertTemplate[]): void {
  const payload = {
    type: 'cert-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    templates,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '童軍證書範本包.cert-bundle.json';
  a.click();
  URL.revokeObjectURL(url);
}

/** 把匯入的 JSON 文字正規化成新範本陣列（範本包或單一範本均可） */
export function parseBundleJson(text: string): CertTemplate[] {
  const obj = JSON.parse(text) as
    | Partial<CertTemplate>
    | { type?: string; templates?: Partial<CertTemplate>[] };
  const list = Array.isArray((obj as { templates?: unknown[] }).templates)
    ? (obj as { templates: Partial<CertTemplate>[] }).templates
    : [obj as Partial<CertTemplate>];
  if (!list.length || !list.some((t) => Array.isArray(t.fields))) {
    throw new Error('檔案內找不到範本資料');
  }
  return list.map(normalizeTemplate);
}

/** 匯入範本包（或單一 .cert.json），回傳所有新範本 */
export function parseBundleFile(file: File): Promise<CertTemplate[]> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        resolve(parseBundleJson(r.result as string));
      } catch {
        reject(new Error('檔案格式不正確，應為 .cert-bundle.json 或 .cert.json'));
      }
    };
    r.onerror = () => reject(new Error('讀檔失敗'));
    r.readAsText(file);
  });
}

/**
 * 把新範本合併進現有範本庫：
 * 同名＝更新版面（保留本機校準值），不同名＝新增。回傳新範本庫。
 */
export function mergeTemplates(current: CertTemplate[], incoming: CertTemplate[]): CertTemplate[] {
  const byName = new Map(current.map((t) => [t.name, t]));
  const next = [...current];
  for (const m of incoming) {
    const old = byName.get(m.name);
    if (old) {
      const idx = next.findIndex((t) => t.id === old.id);
      next[idx] = { ...m, id: old.id, calibration: old.calibration, updatedAt: Date.now() };
    } else {
      next.push(m);
    }
  }
  return next;
}

// ── 部署預載（seed）：把「童軍證書範本包.cert-bundle.json」改名為
// seed.cert-bundle.json 放進 public/ 後重新部署，所有新瀏覽器首次開啟即自動載入 ──
export const STORE_KEY_PUBLIC = STORE_KEY;
export const SEED_VERSION_KEY = 'scout-cert-seed-version-v1';
export const SEED_VERSION = '1';

// ─────────────────────────────────────────────────────────────
// 資料解析：取得每一張證書、每個欄位最終要印的內容
// ─────────────────────────────────────────────────────────────
/** 按各欄指定的分隔字元合併多個 Excel 欄；空值會跳過 */
function joinBySeps(
  cols: { column: string; sep: string }[],
  row: Record<string, string>
): string {
  let out = '';
  for (const c of cols) {
    const v = (row[c.column] ?? '').trim();
    if (!v) continue;
    out = out === '' ? v : out + (c.sep || ' ') + v;
  }
  return out;
}

export function recordCount(t: CertTemplate): number {
  if (t.dataMode === 'excel') return t.excelRows.length;
  return Math.max(1, t.manualRows.length);
}

/** 傳回第 index 張證書的 fieldId → 顯示文字／圖片 */
export function resolveRecord(
  t: CertTemplate,
  index: number
): Record<string, string> {
  const out: Record<string, string> = {};
  const row =
    t.dataMode === 'excel'
      ? t.excelRows[index] ?? {}
      : t.manualRows[index] ?? {};
  for (const f of t.fields) {
    if (f.kind === 'image') {
      out[f.id] = f.content; // 簽名／印章全部相同
    } else if (t.dataMode === 'excel' && f.sourceColumns?.length) {
      // 官方 Word 匯入：一個方塊由多個 Excel 欄組成（中文＋英文姓名等）
      out[f.id] = joinBySeps(f.sourceColumns, row);
    } else if (t.dataMode === 'excel' && f.sourceColumn) {
      out[f.id] = row[f.sourceColumn] ?? f.content ?? '';
    } else {
      out[f.id] = row[f.id] ?? f.content ?? '';
    }
  }
  return out;
}

export function setDataMode(t: CertTemplate, mode: DataMode): CertTemplate {
  return { ...t, dataMode: mode };
}

/** mm → pt（CSS pt） */
export const mmToPt = (mm: number): number => mm * 72 / 25.4;
