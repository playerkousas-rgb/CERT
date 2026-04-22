import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, Plus, Trash2, Table2, PenLine, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppData } from '../types';
import { parseExcelFile, autoMapFields } from '../lib/excelParser';

interface DataInputProps {
  appData: AppData;
  updateAppData: (updates: Partial<AppData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DataInput({ appData, updateAppData, onNext, onBack }: DataInputProps) {
  const [activeTab, setActiveTab] = useState<'excel' | 'manual'>(appData.dataMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExcelUpload = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      try {
        const { columns, data } = await parseExcelFile(file);
        const fieldNames = appData.fields.map((f) => f.name);
        const autoMap = autoMapFields(fieldNames, columns);
        updateAppData({
          excelData: data,
          excelColumns: columns,
          fieldColumnMap: autoMap,
          dataMode: 'excel',
        });
      } catch (err) {
        console.error(err);
        setError('無法解析 Excel 檔案，請確認格式正確');
      } finally {
        setIsLoading(false);
      }
    },
    [appData.fields, updateAppData]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleExcelUpload(file);
    },
    [handleExcelUpload]
  );

  const addManualRecord = useCallback(() => {
    updateAppData({ manualData: [...appData.manualData, {}] });
  }, [appData.manualData, updateAppData]);

  const removeManualRecord = useCallback(
    (index: number) => {
      if (appData.manualData.length <= 1) return;
      const newData = appData.manualData.filter((_, i) => i !== index);
      updateAppData({ manualData: newData });
    },
    [appData.manualData, updateAppData]
  );

  const updateManualRecord = useCallback(
    (index: number, fieldName: string, value: string) => {
      const newData = [...appData.manualData];
      newData[index] = { ...newData[index], [fieldName]: value };
      updateAppData({ manualData: newData, dataMode: 'manual' });
    },
    [appData.manualData, updateAppData]
  );

  const updateColumnMap = useCallback(
    (fieldName: string, column: string) => {
      updateAppData({
        fieldColumnMap: { ...appData.fieldColumnMap, [fieldName]: column },
      });
    },
    [appData.fieldColumnMap, updateAppData]
  );

  const getDataCount = () => {
    if (activeTab === 'excel') return appData.excelData.length;
    return appData.manualData.length;
  };

  const hasData = getDataCount() > 0 && (activeTab === 'excel' ? appData.excelData.length > 0 : true);

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
          輸入資料
        </h2>
        <p className="text-white/50 text-sm sm:text-base">
          上傳 Excel 檔案進行合併列印，或手動輸入資料
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'excel'
                ? 'bg-[#d4a853] text-[#0a192f] shadow-lg shadow-[#d4a853]/20'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel 匯入
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-[#d4a853] text-[#0a192f] shadow-lg shadow-[#d4a853]/20'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <PenLine className="w-4 h-4" />
            手動輸入
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'excel' ? (
          <motion.div
            key="excel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Excel Upload */}
            {appData.excelData.length === 0 ? (
              <div className="max-w-xl mx-auto">
                <div
                  onClick={() => document.getElementById('excel-input')?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.02] p-10 text-center hover:border-[#d4a853]/50 hover:bg-white/[0.04] transition-all"
                >
                  <input
                    id="excel-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {isLoading ? (
                    <div className="text-[#d4a853]">載入中...</div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-[#d4a853]/50 mx-auto mb-4" />
                      <p className="text-white/70 text-lg font-medium mb-2">上傳 Excel 檔案</p>
                      <p className="text-white/40 text-sm">支援 .xlsx、.xls、.csv 格式</p>
                    </>
                  )}
                </div>
                {error && (
                  <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Column Mapping */}
                <div className="rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-[#d4a853]" />
                      <h3 className="text-[#d4a853] font-bold text-sm tracking-wider">欄位對應</h3>
                    </div>
                    <p className="text-white/40 text-xs mt-1">將 Excel 欄位對應到證書上的文字欄位</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {appData.fields.map((field) => (
                      <div key={field.id} className="flex items-center gap-3">
                        <span className="text-white/70 text-sm w-32 truncate" title={field.name}>
                          {field.name}
                        </span>
                        <span className="text-white/20">→</span>
                        <select
                          value={appData.fieldColumnMap[field.name] || ''}
                          onChange={(e) => updateColumnMap(field.name, e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#d4a853]/50 focus:outline-none transition-colors"
                        >
                          <option value="" className="bg-[#0a192f]">
                            -- 未對應 --
                          </option>
                          {appData.excelColumns.map((col) => (
                            <option key={col} value={col} className="bg-[#0a192f]">
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Preview */}
                <div className="rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-[#d4a853]" />
                      <h3 className="text-[#d4a853] font-bold text-sm tracking-wider">資料預覽</h3>
                    </div>
                    <span className="text-white/40 text-xs">{appData.excelData.length} 筆資料</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          {appData.excelColumns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-3 text-left text-white/50 font-medium text-xs whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {appData.excelData.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0">
                            {appData.excelColumns.map((col) => (
                              <td
                                key={col}
                                className="px-4 py-2.5 text-white/70 text-xs whitespace-nowrap max-w-[200px] truncate"
                              >
                                {row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {appData.excelData.length > 5 && (
                      <div className="p-3 text-center text-white/30 text-xs">
                        顯示前 5 筆，共 {appData.excelData.length} 筆
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      document.getElementById('excel-input-replace')?.click();
                    }}
                    className="text-xs text-[#d4a853]/60 hover:text-[#d4a853] transition-colors"
                  >
                    更換 Excel 檔案
                  </button>
                  <input
                    id="excel-input-replace"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              {appData.manualData.map((record, recordIndex) => (
                <div
                  key={recordIndex}
                  className="rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden"
                >
                  <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5 flex items-center justify-between">
                    <span className="text-[#d4a853] font-bold text-sm">
                      第 {recordIndex + 1} 張證書
                    </span>
                    {appData.manualData.length > 1 && (
                      <button
                        onClick={() => removeManualRecord(recordIndex)}
                        className="text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {appData.fields.map((field) => (
                      <div key={field.id}>
                        <label className="text-white/50 text-xs mb-1.5 block">
                          {field.name}
                        </label>
                        <input
                          type="text"
                          value={record[field.name] || ''}
                          onChange={(e) =>
                            updateManualRecord(recordIndex, field.name, e.target.value)
                          }
                          placeholder={`輸入${field.name}...`}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:border-[#d4a853]/50 focus:outline-none transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={addManualRecord}
                className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 text-white/40 text-sm hover:border-[#d4a853]/30 hover:text-[#d4a853]/60 hover:bg-[#d4a853]/5 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新增一張證書
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 hover:text-white transition-all"
        >
          ← 上一步
        </button>
        <button
          onClick={() => {
            updateAppData({ dataMode: activeTab });
            onNext();
          }}
          disabled={!hasData}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-[#d4a853]/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          下一步：預覽匯出 →
        </button>
      </div>
    </motion.div>
  );
}
