import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Printer, Loader2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AppData } from '../types';
import { generateWordDocument, downloadBlob } from '../lib/wordGenerator';
import { renderCertificateOnCanvas } from '../lib/canvasRenderer';

interface PreviewExportProps {
  appData: AppData;
  updateAppData: (updates: Partial<AppData>) => void;
  onBack: () => void;
}

export default function PreviewExport({ appData, updateAppData, onBack }: PreviewExportProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // Get the data records based on mode
  const dataRecords = useMemo(() => {
    if (appData.dataMode === 'excel') {
      return appData.excelData.map((row) => {
        const record: Record<string, string> = {};
        for (const field of appData.fields) {
          const columnName = appData.fieldColumnMap[field.name];
          record[field.name] = columnName ? row[columnName] || '' : '';
        }
        return record;
      });
    } else {
      return appData.manualData;
    }
  }, [appData]);

  const totalRecords = dataRecords.length;
  const currentRecord = dataRecords[currentIndex] || {};

  // Render preview
  const renderPreview = useCallback(async () => {
    if (!appData.templateImage) return;
    setIsRendering(true);
    try {
      const img = await renderCertificateOnCanvas(
        appData.templateImage,
        appData.fields,
        currentRecord,
        appData.templateWidth,
        appData.templateHeight
      );
      setPreviewImage(img);
    } catch (err) {
      console.error('Preview render error:', err);
    } finally {
      setIsRendering(false);
    }
  }, [appData.templateImage, appData.fields, currentRecord, appData.templateWidth, appData.templateHeight]);

  // Auto-render when record changes
  useEffect(() => {
    if (appData.templateImage) {
      renderPreview();
    }
  }, [currentIndex, appData.templateImage, renderPreview]);

  const handleExport = useCallback(async () => {
    if (!appData.templateImage) return;
    setIsExporting(true);
    try {
      const blob = await generateWordDocument(
        appData.templateImage,
        appData.fields,
        dataRecords,
        appData.templateWidth,
        appData.templateHeight
      );
      downloadBlob(blob, `證書_合併列印_${dataRecords.length}張.docx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('匯出失敗，請重試');
    } finally {
      setIsExporting(false);
    }
  }, [appData, dataRecords]);

  const handlePrint = useCallback(async () => {
    if (!appData.templateImage) return;
    try {
      const allImages: string[] = [];
      for (const record of dataRecords) {
        const img = await renderCertificateOnCanvas(
          appData.templateImage,
          appData.fields,
          record,
          appData.templateWidth,
          appData.templateHeight
        );
        allImages.push(img);
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>證書列印</title>
          <style>
            @page { margin: 0; size: ${
              appData.templateWidth > appData.templateHeight ? 'landscape' : 'portrait'
            }; }
            body { margin: 0; padding: 0; }
            img { width: 100vw; height: 100vh; object-fit: contain; display: block; page-break-after: always; }
            img:last-child { page-break-after: auto; }
          </style>
        </head>
        <body>
          ${allImages.map((img) => `<img src="${img}" />`).join('')}
        </body>
        </html>
      `);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (err) {
      console.error('Print error:', err);
    }
  }, [appData, dataRecords]);

  const handleExportSingle = useCallback(async () => {
    if (!appData.templateImage) return;
    setIsExporting(true);
    try {
      const blob = await generateWordDocument(
        appData.templateImage,
        appData.fields,
        [currentRecord],
        appData.templateWidth,
        appData.templateHeight
      );
      downloadBlob(blob, `證書_第${currentIndex + 1}張.docx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('匯出失敗，請重試');
    } finally {
      setIsExporting(false);
    }
  }, [appData, currentRecord, currentIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center mb-6">
        <h2
          className="text-3xl sm:text-4xl font-bold text-white mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          預覽與匯出
        </h2>
        <p className="text-white/50 text-sm sm:text-base">
          預覽證書效果，確認無誤後匯出 Word 檔案
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#d4a853]" />
                <span className="text-[#d4a853] font-bold text-sm tracking-wider">證書預覽</span>
              </div>
              <span className="text-white/40 text-xs">
                {currentIndex + 1} / {totalRecords}
              </span>
            </div>
            <div className="p-4 sm:p-6 bg-[#0a192f]/50 flex items-center justify-center min-h-[300px]">
              {isRendering ? (
                <Loader2 className="w-8 h-8 text-[#d4a853] animate-spin" />
              ) : previewImage ? (
                <img
                  src={previewImage}
                  alt="Certificate preview"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <p className="text-white/30 text-sm">無法渲染預覽</p>
              )}
            </div>
          </div>

          {/* Navigation */}
          {totalRecords > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalRecords, 7) }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i === currentIndex
                        ? 'bg-[#d4a853] scale-125'
                        : 'bg-white/20 hover:bg-white/40'
                    }`
                    }
                  />
                ))}
                {totalRecords > 7 && (
                  <span className="text-white/30 text-xs ml-1">...+{totalRecords - 7}</span>
                )}
              </div>
              <button
                onClick={() => setCurrentIndex(Math.min(totalRecords - 1, currentIndex + 1))}
                disabled={currentIndex === totalRecords - 1}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Export Panel */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5">
              <h3 className="text-[#d4a853] font-bold text-sm tracking-wider">匯出選項</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Export All */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-[#d4a853]/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? '正在匯出...' : `匯出全部 (${totalRecords} 張)`}
              </button>

              {/* Export Single */}
              <button
                onClick={handleExportSingle}
                disabled={isExporting}
                className="w-full py-3 rounded-xl border border-[#d4a853]/30 text-[#d4a853] text-sm font-medium hover:bg-[#d4a853]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                僅匯出此張
              </button>

              {/* Print */}
              <button
                onClick={handlePrint}
                className="w-full py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium hover:bg-white/5 hover:text-white/80 transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                列印全部
              </button>
            </div>

            {/* Info */}
            <div className="p-4 border-t border-[#d4a853]/10 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">資料模式</span>
                <span className="text-white/70">
                  {appData.dataMode === 'excel' ? 'Excel 匯入' : '手動輸入'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">證書數量</span>
                <span className="text-white/70">{totalRecords} 張</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">文字欄位</span>
                <span className="text-white/70">{appData.fields.length} 個</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">範本比例</span>
                <span className="text-white/70">
                  {(appData.templateWidth / appData.templateHeight).toFixed(2)}:1
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 hover:text-white transition-all"
        >
          ← 上一步
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-6 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 hover:text-white transition-all"
        >
          回到頂部 ↑
        </button>
      </div>
    </motion.div>
  );
}
