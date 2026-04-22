import { Award } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-[#d4a853]/20 bg-[#0a192f]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#d4a853] to-[#b8860b] flex items-center justify-center shadow-lg shadow-[#d4a853]/20">
          <Award className="w-6 h-6 text-[#0a192f]" />
        </div>
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold text-white tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            萬用證書列印工具
          </h1>
          <p className="text-[10px] sm:text-xs text-[#d4a853]/70 tracking-[0.25em] font-medium">
            UNIVERSAL CERTIFICATE PRINTING TOOL
          </p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2 text-[#d4a853]/40 text-xs tracking-wider">
          <span>SKWSCOUT</span>
          <span className="text-[#d4a853]/20">|</span>
          <span>2026</span>
        </div>
      </div>
    </header>
  );
}
