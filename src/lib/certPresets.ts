// ─────────────────────────────────────────────────────────────
// 官方／常用證書欄位套
// 依據香港童軍總會青少年活動通告及官方合併列印檔整理：
//   · 幼童軍「證書格式及合併列印方法」05/2019（Word + 4 工作表 Excel）
//   · 第14/2016、37/2019 號通告；童軍支部 p007/2023；深資 P31/2020
// sourceColumns 為官方 Excel 的實際欄名，上傳官方資料表後會自動組合。
// 位置為 A4 橫向（297×210mm）常用起始位置，掃描底圖微調即可；
// 若要完全精準，請在第一步直接「匯入官方 Word 格式（.docx）」。
// ─────────────────────────────────────────────────────────────
import type { CertField, CertTemplate, SourceColumn } from '../types';
import { createField } from './store';

export interface CertPreset {
  key: string;
  section: string;
  label: string;
  note?: string;
  paperW: number;
  paperH: number;
  fields: Array<Partial<CertField> & { name: string; kind: 'text' | 'image'; xMm: number; yMm: number }>;
}

const SERIF = "'Noto Serif TC', 'PMingLiU', 'MingLiU', serif";

// 常用位置（A4 橫向 297×210）
const P = {
  name: { x: 148, y: 96 },
  group: { x: 148, y: 114 },
  badge: { x: 148, y: 143 },
  date: { x: 74, y: 178 },
  certNo: { x: 36, y: 196 },
  sign: { x: 146, y: 168 },
  signName: { x: 146, y: 187 },
  signTitle: { x: 146, y: 196 },
  stamp: { x: 226, y: 176 },
};

type PF = Partial<CertField> & { name: string; kind: 'text' | 'image'; xMm: number; yMm: number };

function text(name: string, x: number, y: number, extra: Partial<CertField> = {}): PF {
  return {
    name, kind: 'text', xMm: x, yMm: y,
    fontPt: 12, fontFamily: SERIF, fontColor: '#111111', align: 'center', ...extra,
  };
}
function image(name: string, x: number, y: number, extra: Partial<CertField> = {}): PF {
  return { name, kind: 'image', xMm: x, yMm: y, widthMm: 30, align: 'center', ...extra };
}
const cols = (list: [string, string][]): SourceColumn[] =>
  list.map(([column, sep], i) => ({ column, sep: i === 0 ? '' : sep }));

const stampSign = (stampLabel: string) => [
  image(stampLabel, P.stamp.x, P.stamp.y),
  image('簽署', P.sign.x, P.sign.y),
];

export const CERT_PRESETS: CertPreset[] = [
  {
    key: 'blank',
    section: '一般',
    label: '空白範本（自行加欄位）',
    note: '由零開始，雙擊掃描底圖自行加欄位。',
    paperW: 297, paperH: 210,
    fields: [
      text('姓名', 148, 96, { fontPt: 26, bold: true, content: '陳大文' }),
      text('日期', 148, 160, { fontPt: 13 }),
      text('證書編號', 262, 18, { fontPt: 10, align: 'right', widthMm: 46 }),
    ],
  },

  // ── 幼童軍 ─────────────────────────────────────────────
  {
    key: 'cub-progress',
    section: '幼童軍',
    label: '進度性徽章證書（幼童軍獎章／歷奇章／高級歷奇章）',
    note: '官方 Excel 分頁「幼童軍進度性徽章」。由幼童軍團長簽發；中英文姓名／旅名／徽章名同列。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', P.certNo.x, P.certNo.y, {
        fontPt: 10, align: 'left', widthMm: 56, sourceColumn: '證書編號',
      }),
      text('姓名', P.name.x, P.name.y, {
        fontPt: 24, bold: true, widthMm: 190,
        sourceColumns: cols([['中文姓名', ' '], ['英文姓名', ' ']]),
        content: '陳大文 CHAN Tai-man',
      }),
      text('旅團', P.group.x, P.group.y, {
        fontPt: 13, widthMm: 210,
        sourceColumns: cols([['旅團中文名稱', ' '], ['旅團英文名稱', ' ']]),
        content: '東九龍第八八八旅 888th East Kowloon Group',
      }),
      text('進度性徽章', P.badge.x, P.badge.y, {
        fontPt: 17, bold: true, widthMm: 180,
        sourceColumns: cols([['進度性徽章中文名稱', ' '], ['進度性徽章英文名稱', ' ']]),
        content: '幼童軍高級歷奇章 Cub Scout Adventure Crest Award',
      }),
      text('日期', P.date.x, P.date.y, { fontPt: 12, widthMm: 46, sourceColumn: '日期', content: '1/3/2016' }),
      ...stampSign('旅／幼童軍團印'),
      text('簽署人姓名', P.signName.x, P.signName.y, {
        fontPt: 11, widthMm: 90,
        sourceColumns: cols([['簽署人中文姓名', ' '], ['簽署人英文姓名', ' ']]),
        content: '何小明 HO Siu-ming',
      }),
    ],
  },
  {
    key: 'cub-activity',
    section: '幼童軍',
    label: '活動徽章證書',
    note: '官方 Excel 分頁「幼童軍活動徽章」（世界童軍環境章除外）。「幼童軍團長／班領導人（刪除不適用者）」兩欄會印 XXXX 劃去不適用者，請於第二步按需自行加文字欄。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', P.certNo.x, P.certNo.y, { fontPt: 10, align: 'left', widthMm: 56, sourceColumn: '證書編號' }),
      text('姓名', P.name.x, P.name.y, {
        fontPt: 24, bold: true, widthMm: 190,
        sourceColumns: cols([['中文姓名', ' '], ['英文姓名', ' ']]),
      }),
      text('旅團', P.group.x, P.group.y, {
        fontPt: 13, widthMm: 210,
        sourceColumns: cols([['旅團中文名稱', ' '], ['旅團英文名稱', ' ']]),
      }),
      text('活動徽章', P.badge.x, P.badge.y, {
        fontPt: 17, bold: true, widthMm: 180,
        sourceColumns: cols([['活動徽章中文名稱', ' '], ['活動徽章英文名稱', ' ']]),
        content: '愛護動物章 Animal Care',
      }),
      text('日期', P.date.x, P.date.y, { fontPt: 12, widthMm: 46, sourceColumn: '日期' }),
      ...stampSign('簽發單位印（旅／團或總會／地域／區印）'),
      text('簽署人姓名', P.signName.x, P.signName.y, {
        fontPt: 11, widthMm: 90,
        sourceColumns: cols([['簽署人中文姓名', ' '], ['簽署人英文姓名', ' ']]),
      }),
      text('簽署人職位（不適用者劃去）', P.signTitle.x, P.signTitle.y, {
        fontPt: 9.5, widthMm: 110, content: '幼童軍團長 Cub Scout Leader ／ 班領導人 Course Leader',
      }),
    ],
  },
  {
    key: 'cub-link',
    section: '幼童軍',
    label: '童軍先修章證書',
    note: '官方 Excel 分頁「童軍先修章」。中英文姓名、旅名分別佔兩行；由幼童軍團長簽發及蓋旅／幼童軍團印。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', P.certNo.x, P.certNo.y, { fontPt: 10, align: 'left', widthMm: 56, sourceColumn: '證書編號' }),
      text('姓名', P.name.x, P.name.y, {
        fontPt: 24, bold: true, widthMm: 190,
        sourceColumns: cols([['中文姓名', '\n'], ['英文姓名', '\n']]),
      }),
      text('旅團', P.group.x, P.group.y, {
        fontPt: 13, widthMm: 210,
        sourceColumns: cols([['旅團中文名稱', '\n'], ['旅團英文名稱', '\n']]),
      }),
      text('日期', P.date.x, P.date.y, { fontPt: 12, widthMm: 46, sourceColumn: '日期' }),
      ...stampSign('旅／幼童軍團印'),
      text('簽署人姓名', P.signName.x, P.signName.y, {
        fontPt: 11, widthMm: 100,
        sourceColumns: cols([['簽署人中文姓名', ' '], ['簽署人英文姓名', ' ']]),
      }),
    ],
  },
  {
    key: 'cub-environment',
    section: '幼童軍',
    label: '世界童軍環境章證書',
    note: '官方 Word 檔「世界童軍環境章.docx」。含所屬支部及簽署人職位；編號由簽發單位／總會編配。',
    paperW: 297, paperH: 210,
    fields: [
      text('姓名', P.name.x, P.name.y, {
        fontPt: 24, bold: true, widthMm: 190,
        sourceColumns: cols([['中文姓名', ' '], ['英文姓名', ' ']]),
      }),
      text('所屬支部', 225, 62, {
        fontPt: 12, widthMm: 110,
        sourceColumns: cols([['所屬支部中文', ' '], ['所屬支部英文', ' ']]),
        content: '幼童軍支部 Cub Scout Section',
      }),
      text('旅團', P.group.x, P.group.y, {
        fontPt: 13, widthMm: 210,
        sourceColumns: cols([['旅團中文名稱', ' '], ['旅團英文名稱', ' ']]),
      }),
      text('日期', P.date.x, P.date.y, { fontPt: 12, widthMm: 46, sourceColumn: '日期' }),
      text('證書編號', P.certNo.x, P.certNo.y, { fontPt: 10, align: 'left', widthMm: 56, sourceColumn: '證書編號' }),
      ...stampSign('簽發單位印'),
      text('簽署人姓名', P.signName.x, P.signName.y, {
        fontPt: 11, widthMm: 90,
        sourceColumns: cols([['簽署人中文姓名', ' '], ['簽署人英文姓名', ' ']]),
      }),
      text('簽署人職位', P.signTitle.x, P.signTitle.y, {
        fontPt: 9.5, widthMm: 100,
        sourceColumns: cols([['簽署人職位中文', ' '], ['簽署人職位英文', ' ']]),
      }),
    ],
  },

  // ── 童軍 ─────────────────────────────────────────────
  {
    key: 'scout-progress',
    section: '童軍',
    label: '進度性獎章證書（探索／標準／高級獎章）',
    note: '依童軍支部簽發方法（p007/2023）式樣，由童軍團長簽發；編號須填於證書左下方。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號（左下角）', 30, 186, { fontPt: 10, align: 'left', widthMm: 60, content: 'HKIR/888/2026/001' }),
      text('姓名（中文及英文）', P.name.x, P.name.y, { fontPt: 24, bold: true, widthMm: 180, content: '陳大文 CHAN Tai-man' }),
      text('所屬旅團（隸屬 of）', P.group.x, P.group.y, { fontPt: 13, widthMm: 210, content: '隸屬 of 港島第八八八旅 888th Hong Kong Group' }),
      text('頒發日期（日／月／年）', 70, 170, { fontPt: 12, widthMm: 46, content: '10/09/2026' }),
      ...stampSign('旅／童軍團印'),
      text('童軍團長姓名', P.signName.x, P.signName.y, { fontPt: 11, widthMm: 70 }),
    ],
  },
  {
    key: 'scout-award',
    section: '童軍',
    label: '服務獎章／領導才獎章證書',
    note: '由青少年活動署授權人士簽發；購買布章時須出示正本。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號（左下角）', 30, 186, { fontPt: 10, align: 'left', widthMm: 60 }),
      text('姓名（中文及英文）', P.name.x, P.name.y, { fontPt: 24, bold: true, widthMm: 180 }),
      text('所屬旅團', P.group.x, P.group.y, { fontPt: 13, widthMm: 210 }),
      text('獎章名稱', P.badge.x, P.badge.y, { fontPt: 17, bold: true, widthMm: 130, content: '服務獎章' }),
      text('頒發日期（日／月／年）', 70, 170, { fontPt: 12, widthMm: 46 }),
      ...stampSign('簽發單位蓋印'),
      text('簽署人姓名及職位', P.signName.x, P.signName.y, { fontPt: 11, widthMm: 90 }),
    ],
  },
  {
    key: 'scout-proficiency',
    section: '童軍',
    label: '專科徽章證書（興趣／技能／服務／教導組）',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號（左下角）', 30, 186, { fontPt: 10, align: 'left', widthMm: 60 }),
      text('姓名（中文及英文）', P.name.x, P.name.y, { fontPt: 24, bold: true, widthMm: 180 }),
      text('所屬旅團', P.group.x, P.group.y, { fontPt: 13, widthMm: 210 }),
      text('專科徽章名稱', 128, P.badge.y, { fontPt: 15, bold: true, widthMm: 90 }),
      text('組別', 208, P.badge.y, { fontPt: 11, widthMm: 70 }),
      text('頒發日期（日／月／年）', 70, 170, { fontPt: 12, widthMm: 46 }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', P.signName.x, P.signName.y, { fontPt: 11, widthMm: 90 }),
    ],
  },

  // ── 深資童軍（P31/2020）──────────────────────────────
  {
    key: 'venture-epaulette',
    section: '深資童軍',
    label: '深資童軍肩章證書',
    note: '依 P31/2020 第 5 節：肩章證書由總會、地域、童軍區或深資童軍團獲授權人士填妥、簽署及蓋印。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', 30, 186, { fontPt: 10, align: 'left', widthMm: 60, content: 'VSE/01/13' }),
      text('姓名（中文及英文）', 148, 96, { fontPt: 24, bold: true, widthMm: 190 }),
      text('所屬旅團', 148, 116, { fontPt: 13, widthMm: 210 }),
      text('頒發日期 日期 Date', 96, 176, { fontPt: 12, widthMm: 60, content: '15/9/2014' }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', 146, 188, { fontPt: 11, widthMm: 100 }),
    ],
  },
  {
    key: 'venture-bar',
    section: '深資童軍',
    label: '段章證書（自立／責任／活動／探險段章）',
    note: '依 P31/2020 第 3 節，段章由青少年活動署、地域、童軍區或深資童軍團簽發。注意：深資童軍獎章、榮譽童軍獎章證書由總會簽發（PT/19、PT/20），無須套印。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', 30, 186, { fontPt: 10, align: 'left', widthMm: 60, content: 'VSE/01/13' }),
      text('姓名（中文及英文）', 148, 96, { fontPt: 24, bold: true, widthMm: 190 }),
      text('所屬旅團', 148, 116, { fontPt: 13, widthMm: 210 }),
      text('段章名稱（中英文）', 148, 140, { fontPt: 17, bold: true, widthMm: 200, content: '責任段章 Responsibility Bar' }),
      text('頒發日期 日期 Date', 96, 176, { fontPt: 12, widthMm: 60 }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', 146, 188, { fontPt: 11, widthMm: 100 }),
    ],
  },
  {
    key: 'venture-gilt',
    section: '深資童軍',
    label: '金帶證書（自立／責任／活動／探險金帶）',
    note: '依 P31/2020 式樣：含中英文姓名、金帶名稱（如「探險金帶 Exploration Bar」）、日期 Date、編號 No.（示例 DRA/EXP/01/13）、簽署及蓋印。',
    paperW: 297, paperH: 210,
    fields: [
      text('編號 No.', 70, 190, { fontPt: 10, align: 'left', widthMm: 70, content: 'DRA/EXP/01/13' }),
      text('姓名（中文及英文）', 148, 96, { fontPt: 24, bold: true, widthMm: 190 }),
      text('金帶名稱（中英文）', 148, 140, { fontPt: 17, bold: true, widthMm: 200, content: '探險金帶 Exploration Bar' }),
      text('日期 Date', 100, 168, { fontPt: 12, widthMm: 60, content: '15/9/2014' }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', 146, 188, { fontPt: 11, widthMm: 100 }),
    ],
  },
  {
    key: 'venture-other',
    section: '深資童軍',
    label: '其他徽章證書（海上／航空／社區參與／宗教／環境章）',
    note: '依 P31/2020：海上活動、航空活動、社區參與章、宗教章、世界童軍環境章由區／地域／總會獲授權人士簽發；寰宇童軍章由香港總監簽發。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', 30, 186, { fontPt: 10, align: 'left', widthMm: 60 }),
      text('姓名（中文及英文）', 148, 96, { fontPt: 24, bold: true, widthMm: 190 }),
      text('所屬旅團', 148, 116, { fontPt: 13, widthMm: 210 }),
      text('徽章名稱（中英文）', 148, 140, { fontPt: 16, bold: true, widthMm: 200 }),
      text('頒發日期 日期 Date', 96, 176, { fontPt: 12, widthMm: 60 }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', 146, 188, { fontPt: 11, widthMm: 100 }),
    ],
  },
  {
    key: 'venture-training',
    section: '深資童軍',
    label: '深資訓練班／活動證書（總會無提供格式時用）',
    note: '支部自辦訓練班、活動或單元證書可用此格式；最高獎章證書由總會簽發。',
    paperW: 297, paperH: 210,
    fields: [
      text('姓名（中文及英文）', 148, 86, { fontPt: 24, bold: true, widthMm: 200 }),
      text('所屬旅團', 148, 110, { fontPt: 13, widthMm: 210 }),
      text('訓練班／活動或單元名稱', 148, 132, { fontPt: 16, bold: true, widthMm: 220 }),
      text('日期', 92, 172, { fontPt: 12, widthMm: 60 }),
      text('證書編號', 262, 18, { fontPt: 10, align: 'right', widthMm: 46 }),
      image('主辦單位印章', 228, 172, { widthMm: 28 }),
      image('班領導人簽署', 150, 166, { widthMm: 34 }),
      text('班領導人姓名及職位', 150, 186, { fontPt: 11, widthMm: 100 }),
    ],
  },

  // ── 樂行童軍 ─────────────────────────────────────────
  {
    key: 'rover-epaulette',
    section: '樂行童軍',
    label: '樂行童軍肩章證書',
    note: '樂行童軍肩章為支部入門要求；總會未設公開下載格式，此套依深資肩章式樣（P31/2020）類推，掃描實物後微調位置。',
    paperW: 297, paperH: 210,
    fields: [
      text('證書編號', 30, 186, { fontPt: 10, align: 'left', widthMm: 60 }),
      text('姓名（中文及英文）', 148, 96, { fontPt: 24, bold: true, widthMm: 190 }),
      text('所屬旅團', 148, 116, { fontPt: 13, widthMm: 210 }),
      text('頒發日期 日期 Date', 96, 176, { fontPt: 12, widthMm: 60 }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', 146, 188, { fontPt: 11, widthMm: 100 }),
    ],
  },
  {
    key: 'rover-training',
    section: '樂行童軍',
    label: '樂行訓練班／Moot／活動證書',
    note: '樂行童軍獎章及貝登堡獎章證書由總會簽發（PT/21、PT/22、PT/69），無須套印；支部自辦活動用此格式。',
    paperW: 297, paperH: 210,
    fields: [
      text('姓名（中文及英文）', 148, 86, { fontPt: 24, bold: true, widthMm: 200 }),
      text('所屬旅團', 148, 110, { fontPt: 13, widthMm: 210 }),
      text('訓練班／活動名稱', 148, 132, { fontPt: 16, bold: true, widthMm: 220 }),
      text('日期', 92, 172, { fontPt: 12, widthMm: 60 }),
      text('證書編號', 262, 18, { fontPt: 10, align: 'right', widthMm: 46 }),
      image('主辦單位印章', 228, 172, { widthMm: 28 }),
      image('簽署', 150, 166, { widthMm: 34 }),
      text('簽署人姓名及職位', 150, 186, { fontPt: 11, widthMm: 100 }),
    ],
  },

  // ── 跨支部／一般 ─────────────────────────────────────
  {
    key: 'religious',
    section: '跨支部',
    label: '宗教章證書（跨支部）',
    note: '跨支部證書，必須清楚填寫獲頒徽章成員所屬支部。',
    paperW: 297, paperH: 210,
    fields: [
      text('所屬支部', 225, 62, { fontPt: 12, widthMm: 100 }),
      text('證書編號（左下角）', 30, 186, { fontPt: 10, align: 'left', widthMm: 60 }),
      text('姓名（中文及英文）', P.name.x, P.name.y, { fontPt: 24, bold: true, widthMm: 180 }),
      text('所屬旅團', P.group.x, P.group.y, { fontPt: 13, widthMm: 210 }),
      text('徽章名稱', P.badge.x, P.badge.y, { fontPt: 15, bold: true, widthMm: 130 }),
      text('頒發日期（日／月／年）', 70, 170, { fontPt: 12, widthMm: 46 }),
      ...stampSign('獲授權單位蓋印'),
      text('獲授權人士姓名及職位', P.signName.x, P.signName.y, { fontPt: 11, widthMm: 90 }),
    ],
  },
  {
    key: 'training',
    section: '一般',
    label: '訓練班／活動參與證書（總會無提供格式時用）',
    note: '適用於總會未提供列印檔的訓練班、活動參與或完成證書。',
    paperW: 297, paperH: 210,
    fields: [
      text('姓名（中文及英文）', 148, 86, { fontPt: 24, bold: true, widthMm: 200 }),
      text('活動／課程名稱', 148, 130, { fontPt: 16, bold: true, widthMm: 220 }),
      text('日期（日／月／年）', 92, 172, { fontPt: 12, widthMm: 60 }),
      text('證書編號', 262, 18, { fontPt: 10, align: 'right', widthMm: 46 }),
      image('機構印章', 228, 172, { widthMm: 28 }),
      image('簽署', 150, 166, { widthMm: 34 }),
      text('簽署人姓名及職位', 150, 186, { fontPt: 11, widthMm: 100 }),
    ],
  },
];

export function getPreset(key: string): CertPreset {
  return CERT_PRESETS.find((p) => p.key === key) ?? CERT_PRESETS[0];
}

/** 套用欄位套，傳回可直接寫進 CertTemplate 的更新 */
export function applyPreset(preset: CertPreset): Partial<CertTemplate> {
  const fields: CertField[] = preset.fields.map((f) => createField(f) as CertField);
  return {
    name: preset.label.length > 24 ? preset.label.slice(0, 24) : preset.label,
    paperW: preset.paperW,
    paperH: preset.paperH,
    fields,
    dataMode: 'manual' as const,
    excelFileName: '',
    excelColumns: [],
    excelRows: [],
    excelSheets: undefined,
    excelSheet: undefined,
    manualRows: [{}],
  };
}
