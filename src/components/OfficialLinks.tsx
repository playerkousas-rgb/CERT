import { ExternalLink, FileArchive, FileText, Globe } from 'lucide-react';

const LINKS = [
  {
    icon: FileArchive,
    title: '支部官方檔案資料夾（全部 Word／Excel／通告 PDF）',
    desc: '世界童軍環境章、進度性／活動徽章、童軍先修章 Word 格式、合併列印步驟、幼童軍支部證書資料 Excel，及 p007/2023、p014/2016、p031/2020、p037/2019（Google Drive）',
    url: 'https://drive.google.com/drive/folders/1MXnolz8wKE2Yqde2EKPnRgcgVTaBEA_J',
  },
  {
    icon: FileText,
    title: '深資童軍證書簽發通告（P31/2020）',
    desc: '肩章、段章、金帶、海上／航空活動、社區參與、宗教章證書的簽發層級、式樣及編號方法（PDF）',
    url: 'https://drive.google.com/file/d/1wHVPjV5TTQwTQTL0SECcAGri2nJFEDL1/view',
  },
  {
    icon: FileArchive,
    title: '幼童軍支部證書格式及合併列印方法（05/2019）ZIP',
    desc: '官方唯一合併列印檔，含進度性徽章、活動徽章、童軍先修章、世界童軍環境章 .doc 及 Excel 範本（Google Drive）',
    url: 'https://drive.google.com/file/d/1BiZP96vso5KOz7LoLVv8SWerz7jIX6Fy/view',
  },
  {
    icon: FileText,
    title: '幼童軍支部各級徽章評核、簽發及領取／購買方法（2019）',
    desc: '附四款證書式樣與欄位說明（p037/2019 PDF）',
    url: 'https://www.scout.org.hk/article_attach/31942/p037-19.pdf',
  },
  {
    icon: FileText,
    title: '幼童軍支部各級徽章簽發及領取／購買方法（2016）',
    desc: '新證書式樣啟用通告（p014/2016 PDF）',
    url: 'https://www.scout.org.hk/article_attach/25423/p014-16.pdf',
  },
  {
    icon: FileText,
    title: '童軍支部各級徽章簽發及領取／購買方法（2023）',
    desc: '探索／標準／高級、服務／領導才、專科徽章證書式樣（p007/2023 PDF）',
    url: 'https://www.scout.org.hk/uploads/tc/circulars/10672/p007-23.pdf',
  },
  {
    icon: Globe,
    title: '深資童軍支部 — 通告及表格',
    desc: '段章／金帶簽發方法（2020）、PT/19、PT/20 等（Google Sites）',
    url: 'https://sites.google.com/scouting.org.hk/venture/%E9%80%9A%E5%91%8A%E5%8F%8A%E8%A1%A8%E6%A0%BC',
  },
  {
    icon: Globe,
    title: '樂行童軍資訊網',
    desc: '樂行支部通告；最高獎章證書由總會簽發（PT/21、PT/22、PT/69）',
    url: 'https://sites.google.com/view/hong-kong-rover-scout/',
  },
  {
    icon: Globe,
    title: '總會表格下載總覽（青少年活動署）',
    desc: '所有 PT 表格及通告',
    url: 'https://www.scout.org.hk/tc/circulars-forms/forms/index.html?type=8',
  },
];

export default function OfficialLinks() {
  return (
    <div className="space-y-1.5">
      {LINKS.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#d4a853]/30 transition-all p-2.5 group"
        >
          <div className="flex items-start gap-2.5">
            <l.icon className="w-4 h-4 text-[#d4a853]/70 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-white/80 font-medium leading-snug group-hover:text-white flex items-center gap-1">
                <span className="truncate">{l.title}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
              </div>
              <div className="text-[10.5px] text-white/40 mt-0.5 leading-relaxed">{l.desc}</div>
            </div>
          </div>
        </a>
      ))}
      <p className="text-[10.5px] text-white/35 leading-relaxed pt-1">
        提示：深資童軍獎章、榮譽童軍獎章、樂行童軍獎章及貝登堡獎章的證書由總會簽發（以 PT/19–22、PT/69 申請），
        旅團無須自行套印；需要單位自印的主要是段章／金帶、訓練班及活動證書。
      </p>
    </div>
  );
}
