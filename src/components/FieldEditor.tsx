import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Trash2, Type, Bold, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppData, TextField } from '../types';

interface FieldEditorProps {
  appData: AppData;
  addField: (field: TextField) => void;
  updateField: (id: string, updates: Partial<TextField>) => void;
  removeField: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Courier New',
  'Microsoft JhengHei',
  'MingLiU',
  'SimSun',
  'KaiTi',
];

export default function FieldEditor({
  appData,
  addField,
  updateField,
  removeField,
  onNext,
  onBack,
}: FieldEditorProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedField = appData.fields.find(f => f.id === selectedFieldId);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.container) return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newField: TextField = {
        id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `欄位 ${appData.fields.length + 1}`,
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
        fontSize: 5,
        fontFamily: 'Arial',
        fontColor: '#000000',
        bold: false,
        textAlign: 'center',
      };

      addField(newField);
      setSelectedFieldId(newField.id);
    },
    [appData.fields.length, addField]
  );

  const handleFieldMouseDown = useCallback(
    (e: React.MouseEvent, fieldId: string) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedFieldId(fieldId);
      setDragging(fieldId);

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const field = appData.fields.find(f => f.id === fieldId);
      if (!field) return;

      const fieldPixelX = (field.x / 100) * rect.width;
      const fieldPixelY = (field.y / 100) * rect.height;
      setDragOffset({
        x: e.clientX - rect.left - fieldPixelX,
        y: e.clientY - rect.top - fieldPixelY,
      });
    },
    [appData.fields]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
      updateField(dragging, {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
    },
    [dragging, dragOffset, updateField]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [dragging, handleMouseUp]);

  // Calculate display scale
  const displayWidth = containerRef.current?.clientWidth || 700;
  const displayHeight = appData.templateHeight
    ? (displayWidth / appData.templateWidth) * appData.templateHeight
    : 500;

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
          設定文字欄位
        </h2>
        <p className="text-white/50 text-sm sm:text-base">
          點擊證書上的位置來新增文字欄位，拖曳可調整位置
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Certificate Preview */}
        <div className="flex-1 min-w-0">
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onClick={handleContainerClick}
            data-container="true"
            className="relative cursor-crosshair rounded-xl overflow-hidden border border-[#d4a853]/20 bg-[#0a192f]/80 shadow-xl"
            style={{ aspectRatio: `${appData.templateWidth} / ${appData.templateHeight}` }}
          >
            <img
              src={appData.templateImage!}
              alt="Certificate"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />

            {/* Field markers */}
            {appData.fields.map((field) => {
              const isSelected = field.id === selectedFieldId;
              return (
                <div
                  key={field.id}
                  onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute cursor-move select-none transition-shadow ${
                    isSelected
                      ? 'z-20'
                      : 'z-10'
                  }`}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={`px-2 py-0.5 rounded text-xs whitespace-nowrap border transition-all ${
                      isSelected
                        ? 'border-[#d4a853] bg-[#d4a853]/20 text-[#d4a853] shadow-lg shadow-[#d4a853]/20'
                        : 'border-white/40 bg-black/50 text-white/80 hover:border-[#d4a853]/60'
                    }`}
                    style={{
                      fontSize: `${Math.max(10, (field.fontSize / 100) * displayHeight)}px`,
                      fontFamily: field.fontFamily,
                      fontWeight: field.bold ? 'bold' : 'normal',
                      color: isSelected ? '#d4a853' : field.fontColor,
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    }}
                  >
                    {field.name}
                  </div>
                  {/* Position indicator dot */}
                  <div
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${
                      isSelected ? 'bg-[#d4a853]' : 'bg-white/60'
                    }`}
                  />
                </div>
              );
            })}

            {/* Empty state overlay */}
            {appData.fields.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center bg-black/40 rounded-xl px-6 py-4">
                  <Plus className="w-8 h-8 text-[#d4a853]/50 mx-auto mb-2" />
                  <p className="text-white/50 text-sm">點擊此處新增欄位</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
            <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5">
              <h3 className="text-[#d4a853] font-bold text-sm tracking-wider">欄位設定</h3>
            </div>

            <div className="p-4 max-h-[500px] overflow-y-auto">
              {selectedField ? (
                <motion.div
                  key={selectedField.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {/* Field Name */}
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">欄位名稱</label>
                    <input
                      type="text"
                      value={selectedField.name}
                      onChange={(e) => updateField(selectedField.id, { name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#d4a853]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">字型</label>
                    <select
                      value={selectedField.fontFamily}
                      onChange={(e) => updateField(selectedField.id, { fontFamily: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#d4a853]/50 focus:outline-none transition-colors"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f} className="bg-[#0a192f]">
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 flex justify-between">
                      <span>字型大小</span>
                      <span className="text-[#d4a853]">{selectedField.fontSize}%</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={selectedField.fontSize}
                      onChange={(e) =>
                        updateField(selectedField.id, { fontSize: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Font Color */}
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">字型顏色</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={selectedField.fontColor}
                        onChange={(e) =>
                          updateField(selectedField.id, { fontColor: e.target.value })
                        }
                      />
                      <span className="text-white/60 text-xs font-mono">
                        {selectedField.fontColor}
                      </span>
                    </div>
                  </div>

                  {/* Bold */}
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">粗體</label>
                    <button
                      onClick={() =>
                        updateField(selectedField.id, { bold: !selectedField.bold })
                      }
                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                        selectedField.bold
                          ? 'bg-[#d4a853] text-[#0a192f]'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
                      }`}
                    >
                      <Bold className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="text-white/50 text-xs mb-1.5 block">對齊方式</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'left' as const, icon: AlignLeft },
                        { value: 'center' as const, icon: AlignCenter },
                        { value: 'right' as const, icon: AlignRight },
                      ].map(({ value, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => updateField(selectedField.id, { textAlign: value })}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                            selectedField.textAlign === value
                              ? 'bg-[#d4a853] text-[#0a192f]'
                              : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">X 位置 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={selectedField.x.toFixed(1)}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            x: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#d4a853]/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/50 text-xs mb-1.5 block">Y 位置 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={selectedField.y.toFixed(1)}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            y: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#d4a853]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => {
                      removeField(selectedField.id);
                      setSelectedFieldId(null);
                    }}
                    className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    刪除此欄位
                  </button>
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <Type className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm">選擇一個欄位以編輯屬性</p>
                  <p className="text-white/20 text-xs mt-1">或點擊證書新增欄位</p>
                </div>
              )}
            </div>

            {/* Field List */}
            {appData.fields.length > 0 && (
              <div className="border-t border-[#d4a853]/10 p-4">
                <p className="text-white/40 text-xs mb-2">所有欄位 ({appData.fields.length})</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {appData.fields.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                        field.id === selectedFieldId
                          ? 'bg-[#d4a853]/15 text-[#d4a853] border border-[#d4a853]/30'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                      }`}
                    >
                      {field.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
          onClick={onNext}
          disabled={appData.fields.length === 0}
          className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] font-bold text-sm tracking-wider hover:shadow-lg hover:shadow-[#d4a853]/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          下一步：輸入資料 →
        </button>
      </div>
    </motion.div>
  );
}
