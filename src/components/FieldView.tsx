import type { CertField } from '../types';
import { fieldStyle } from '../lib/layout';

/** 螢幕顯示用的單一欄位；編輯模式可拖曳 */
export default function FieldView({
  field,
  value,
  interactive,
  selected,
  ghost,
  onPointerDown,
}: {
  field: CertField;
  value: string;
  interactive?: boolean;
  selected?: boolean;
  ghost?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const style = fieldStyle(field) as React.CSSProperties;
  const outline = selected
    ? '1.5px dashed #d4a853'
    : interactive
      ? '1px dashed rgba(212,168,83,0.35)'
      : 'none';
  const common = {
    cursor: interactive ? 'move' : 'default',
    touchAction: interactive ? ('none' as const) : ('auto' as const),
    outline,
    outlineOffset: '2px',
    opacity: ghost ? 0.55 : 1,
  };
  const stopDbl = interactive ? (e: React.MouseEvent) => e.stopPropagation() : undefined;

  if (field.kind === 'image') {
    return (
      <div
        style={{ ...style, ...common, textAlign: field.align }}
        onPointerDown={onPointerDown}
        onDoubleClick={stopDbl}
      >
        {value ? (
          <img src={value} alt={field.name} style={{ width: '100%', height: 'auto', display: 'block' }} draggable={false} />
        ) : (
          <div
            style={{
              width: '100%',
              minHeight: '14mm',
              border: '1px dashed #c0392b',
              color: '#c0392b',
              fontSize: '7pt',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            未上傳簽名／印章
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        ...style,
        ...common,
        backgroundColor: interactive && !value ? 'rgba(212,168,83,0.08)' : 'transparent',
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={stopDbl}
    >
      {value || (interactive ? field.name : '')}
    </div>
  );
}
