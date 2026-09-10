import { Crosshair } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-[#d4a853]/20 bg-[#0a192f]/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a853] to-[#b8860b] flex items-center justify-center shadow-lg shadow-[#d4a853]/20">
          <Crosshair className="w-5 h-5 text-[#0a192f]" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide" style={{ fontFamily: "'Noto Serif TC', serif" }}>
            預印證書對位列印工具
          </h1>
          <p className="text-[10px] sm:text-[11px] text-[#d4a853]/70 tracking-[0.18em] font-medium">
            童軍支部專用 · mm 精確對位 · 任何可上網電腦直接列印 / 存 PDF
          </p>
        </div>
      </div>
    </header>
  );
}
