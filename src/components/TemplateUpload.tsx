import { useState, useRef, useCallback } from 'react';
import { Upload, Image, FileText, CheckCircle2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppData } from '../types';
import { renderPDFToImage } from '../lib/pdfRenderer';

interface TemplateUploadProps {
  appData: AppData;
  updateAppData: (updates: Partial<AppData>) => void;
  onNext: () => void;
}

export default function TemplateUpload({ appData, updateAppData, onNext }: TemplateUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      if (!isPDF && !isImage) {
        setError('請上傳 PNG、JPEG 或 PDF 檔案');
        setIsLoading(false);
        return;
      }

      if (isPDF) {
        const result = await renderPDFToImage(file);
        updateAppData({
          templateImage: result.dataURL,
          templateWidth: result.width,
          templateHeight: result.height,
          templateName: file.name,
          fields: [],
          manualData: [{}],
          excelData: [],
          excelColumns: [],
          fieldColumnMap: {},
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataURL = e.target!.result as string;
            const img = new window.Image();
            img.onload = () => {
              updateAppData({
                templateImage: dataURL,
                templateWidth: img.naturalWidth,
                templateHeight: img.naturalHeight,
                templateName: file.name,
                fields: [],
                manualData: [{}],
                excelData: [],
                excelColumns: [],
                fieldColumnMap: {},
              });
              resolve();
            };
            img.onerror = () => {
              setError('無法載入圖片');
              resolve();
            };
            img.src = dataURL;
          };
          reader.onerror = () => {
            setError('無法讀取圖片檔案');
            reject(new Error('File read error'));
          };
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      console.error(err);
      setError('處理檔案時發生錯誤，請重試');
    } finally {
      setIsLoading(false);
    }
  }, [updateAppData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const removeTemplate = useCallback(() => {
    updateAppData({
      templateImage: null,
      templateWidth: 0,
      templateHeight: 0,
      templateName: '',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [updateAppData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <h2
          className="text-3xl sm:text-4xl font-bold text-white mb-3"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          上傳證書範本
        </h2>
        <p className="text-white/50 text-sm sm:text-base">
          上傳您的證書 PNG、JPEG 或 PDF 檔案，系統會自動校正避免變形
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!appData.templateImage ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-12 sm:p-16 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-[#d4a853] bg-[#d4a853]/10 shadow-2xl shadow-[#d4a853]/10'
                  : 'border-white/20 bg-white/[0.02] hover:border-[#d4a853]/50 hover:bg-white/[0.04]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleFileInput}
                className="hidden"
              />

              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-[#d4a853] animate-spin" />
                  <p className="text-[#d4a853] text-lg">正在處理檔案...</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#d4a853]/20 to-[#d4a853]/5 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#d4a853]" />
                  </div>
                  <p className="text-white/80 text-lg font-medium mb-2">
                    拖放檔案至此處，或點擊上傳
                  </p>
                  <p className="text-white/40 text-sm mb-6">
                    支援 PNG、JPEG、PDF 格式
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs">
                      <Image className="w-3.5 h-3.5" />
                      PNG / JPEG
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs">
                      <FileText className="w-3.5 h-3.5" />
                      PDF
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="rounded-2xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              <div className="relative group">
                <div className="p-6 flex items-center justify-center bg-[#0a192f]/50" style={{ maxHeight: '500px' }}>
                  <img
                    src={appData.templateImage}
                    alt="Certificate template"
                    className="max-w-full max-h-[460px] object-contain rounded-lg shadow-2xl"
                    style={{ imageRendering: 'auto' }}
                  />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeTemplate(); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 border-t border-[#d4a853]/10">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium">{appData.templateName}</p>
                    <p className="text-white/40 text-xs">
                      {appData.templateWidth} × {appData.templateHeight} 像素 · 
                      自動校正比例 {(appData.templateWidth / appData.templateHeight).toFixed(2)}:1
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#d4a853]/70 hover:text-[#d4a853] transition-colors"
                  >
                    更換檔案
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={onNext}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-[#d4a853]/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                下一步：設定欄位 →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
