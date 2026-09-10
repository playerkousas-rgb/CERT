// ─────────────────────────────────────────────────────────────
// 預印證書對位列印工具 — 資料模型
// 所有位置／尺寸均以 mm 或 pt 為單位，確保跨電腦、跨瀏覽器一致
// ─────────────────────────────────────────────────────────────

export type FieldKind = 'text' | 'image';
export type TextAlign = 'left' | 'center' | 'right';
export type DataMode = 'excel' | 'manual';

/** 一個欄位可由多個 Excel 欄組成（官方格式：中文姓名 ＋ 英文姓名） */
export interface SourceColumn {
  /** Excel 欄名 */
  column: string;
  /** 與前一個值之間的連接字元：' '（同行空格）或 '\n'（換行） */
  sep: string;
}

/** 一個放在預印紙上的欄位（文字或簽名/印章圖片） */
export interface CertField {
  id: string;
  /** 欄位名稱（亦用於手動輸入標籤），例如「姓名」 */
  name: string;
  kind: FieldKind;
  /** 中心點 X（mm，由紙張左邊緣起計） */
  xMm: number;
  /** 中心點 Y（mm，由紙張頂邊緣起計） */
  yMm: number;
  /** 自動換行寬度（mm），0 = 依內容自動 */
  widthMm: number;
  /** 字級（pt） */
  fontPt: number;
  fontFamily: string;
  fontColor: string;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  /** 行距倍數 */
  lineHeight: number;
  /** 固定內容：文字欄位用作預設／後援值；圖片欄位放 data URL（全部證書相同，如簽名、印章） */
  content: string;
  /** Excel 模式：對應的試算表欄（空 = 使用固定內容） */
  sourceColumn: string;
  /** 官方 Word 匯入：一個文字方塊由多個合併欄組成時使用 */
  sourceColumns?: SourceColumn[];
}

/** 印表機校準（平移 + 縮放） */
export interface Calibration {
  /** 水平平移修正（mm），正值向右移 */
  offsetX: number;
  /** 垂直平移修正（mm），正值向下移 */
  offsetY: number;
  /** 水平縮放（%，100 = 正常） */
  scaleX: number;
  /** 垂直縮放（%，100 = 正常） */
  scaleY: number;
}

/** 一款預印證書的完整範本 */
export interface CertTemplate {
  id: string;
  /** 範本名稱，例如「小童軍參與證書（橫A4）」 */
  name: string;
  /** 紙張闊度（mm） */
  paperW: number;
  /** 紙張高度（mm） */
  paperH: number;
  /** 預印紙掃描圖（data URL），只作螢幕對位／連底圖列印用 */
  bgImage: string | null;
  bgName: string;
  /** 一次性設定是否已完成（官方 Word 匯入或選用欄位套後為 true）；日常使用者可直接入資料列印 */
  setupDone?: boolean;
  fields: CertField[];
  calibration: Calibration;
  /** 列印時是否連底圖一起印（印落預印紙應關閉；印普通紙打樣可開啟） */
  printBg: boolean;
  /* ── 資料 ── */
  dataMode: DataMode;
  excelFileName: string;
  excelColumns: string[];
  excelRows: Record<string, string>[];
  /** 多工作表試算表（官方檔案含 4 個工作表） */
  excelSheets?: ExcelSheet[];
  excelSheet?: string;
  /** 手動資料：以 field id 為 key */
  manualRows: Record<string, string>[];
  updatedAt: number;
}

export interface ExcelSheet {
  name: string;
  columns: string[];
  rows: Record<string, string>[];
}
