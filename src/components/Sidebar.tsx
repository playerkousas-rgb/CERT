import { useRef } from 'react';
import { FilePlus2, Copy, Trash2, Upload, Download, Layers, FileText, FileUp, PackageOpen } from 'lucide-react';
import type { CertTemplate } from '../types';

export default function Sidebar({
  templates,
  activeId,
  onSelect,
  onNew,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
  onImportWord,
  onImportBundle,
  onExportBundle,
}: {
  templates: CertTemplate[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onImport: (file: File) => void;
  onExport: () => void;
  /** 一次性設定：一次過匯入多個官方 .docx */
  onImportWord: (files: File[]) => void;
  onImportBundle: (file: File) => void;
  onExportBundle: () => void;
}) {
  const jsonRef = useRef<HTMLInputElement>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  const bundleRef = useRef<HTMLInputElement>(null);
  const active = templates.find((t) => t.id === activeId);
  const readyCount = templates.filter((t) => t.setupDone).length;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-[#d4a853]/15 bg-[#081426]/80 flex flex-col h-[calc(100vh-65px)] sticky top-[65px]">
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-[#d4a853] text-xs font-bold tracking-widest px-1 mb-2.5">
          <Layers className="w-3.5 h-3.5" />
          證書範本庫
        </div>

        {/* 一次性設定：批量匯入官方 Word */}
        <button
          onClick={() => wordRef.current?.click()}
          className="w-full mb-2 py-2.5 rounded-lg bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] text-xs font-bold hover:shadow-md hover:shadow-[#d4a853]/20 transition-all flex items-center justify-center gap-2"
          title="一次過選全部官方 Word（.docx，可多選），每份證書自動建成範本"
        >
          <FileUp className="w-4 h-4" />
          一次過匯入官方 Word
        </button>
        <input
          ref={wordRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            if (fs.length) onImportWord(fs);
            e.target.value = '';
          }}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onNew}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-white/10 text-white/60 text-xs hover:bg-white/5 hover:text-white transition-all"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            新增空白
          </button>
          <button
            onClick={() => bundleRef.current?.click()}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-white/10 text-white/60 text-xs hover:bg-white/5 hover:text-white transition-all"
            title="由其他電腦匯入整個範本包"
          >
            <PackageOpen className="w-3.5 h-3.5" />
            匯入範本包
          </button>
          <input
            ref={bundleRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportBundle(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {templates.map((t) => {
          const isActive = t.id === activeId;
          const landscape = t.paperW > t.paperH;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`w-full text-left p-2.5 rounded-lg transition-all group ${
                isActive
                  ? 'bg-[#d4a853]/15 border border-[#d4a853]/35'
                  : 'border border-transparent hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex-shrink-0 border ${isActive ? 'border-[#d4a853]' : 'border-white/25'} flex items-center justify-center`}
                  style={{
                    width: landscape ? 22 : 16,
                    height: landscape ? 16 : 22,
                  }}
                >
                  <FileText className={`w-3 h-3 ${isActive ? 'text-[#d4a853]' : 'text-white/30'}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium truncate ${isActive ? 'text-[#f0d98f]' : 'text-white/75'}`}>
                    {t.name}
                  </div>
                  <div className="text-[10px] text-white/35 mt-0.5">
                    {t.setupDone ? '可直接入資料列印 · ' : '未設定 · '}
                    {t.fields.length} 欄位
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-white/5 space-y-2">
        <button
          onClick={onExportBundle}
          disabled={readyCount === 0}
          className="w-full py-2 rounded-lg border border-[#d4a853]/30 text-[#d4a853]/90 text-xs hover:bg-[#d4a853]/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-30"
          title="把全部已設定範本（連位置、底圖）打包，分享給其他電腦；對方匯入後只需校準印表機即可使用"
        >
          <PackageOpen className="w-3.5 h-3.5" />
          匯出範本包分享（{readyCount} 款）
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onDuplicate}
            disabled={!active}
            title="複製此範本"
            className="py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center disabled:opacity-30"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onExport}
            disabled={!active}
            title="匯出此範本 .cert.json"
            className="py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center disabled:opacity-30"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={!active || templates.length <= 1}
            title="刪除範本"
            className="py-2 rounded-lg border border-white/10 text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center justify-center disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => jsonRef.current?.click()}
          className="w-full py-1.5 rounded-lg text-[10.5px] text-white/35 hover:text-white/70 transition-all flex items-center justify-center gap-1"
        >
          <Upload className="w-3 h-3" />
          匯入單一 .cert.json
        </button>
        <input
          ref={jsonRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = '';
          }}
        />
        <p className="text-[10px] leading-relaxed text-white/30 px-0.5">
          負責人只需匯入一次官方 Word；其他電腦用「匯出範本包」分享。範本自動儲存在此瀏覽器。
        </p>
      </div>
    </aside>
  );
}
