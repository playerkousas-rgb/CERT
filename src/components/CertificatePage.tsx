import type { CertTemplate } from '../types';
import FieldView from './FieldView';

/**
 * 以實體 mm 尺寸渲染一張證書頁（螢幕預覽用）。
 * 外層會用 CSS transform 縮放，本體尺寸 = paperW × paperH mm。
 */
export default function CertificatePage({
  template,
  values,
  showBg = true,
  applyCalibration = false,
  interactive = false,
  selectedId = null,
  onFieldPointerDown,
  pageRef,
  onPageDoubleClick,
}: {
  template: CertTemplate;
  values: Record<string, string>;
  showBg?: boolean;
  applyCalibration?: boolean;
  interactive?: boolean;
  selectedId?: string | null;
  onFieldPointerDown?: (e: React.PointerEvent, fieldId: string) => void;
  pageRef?: React.Ref<HTMLDivElement>;
  onPageDoubleClick?: (e: React.MouseEvent, mmX: number, mmY: number) => void;
}) {
  const c = template.calibration;
  const useCal =
    applyCalibration &&
    !(c.offsetX === 0 && c.offsetY === 0 && c.scaleX === 100 && c.scaleY === 100);
  const transform = useCal
    ? `translate(${c.offsetX}mm, ${c.offsetY}mm) scale(${c.scaleX / 100}, ${c.scaleY / 100})`
    : 'none';

  return (
    <div
      ref={pageRef}
      onDoubleClick={(e) => {
        if (!onPageDoubleClick || !pageRef || !('current' in pageRef) || !pageRef.current) return;
        const rect = pageRef.current.getBoundingClientRect();
        const mmX = ((e.clientX - rect.left) / rect.width) * template.paperW;
        const mmY = ((e.clientY - rect.top) / rect.height) * template.paperH;
        onPageDoubleClick(e, mmX, mmY);
      }}
      style={{
        width: `${template.paperW}mm`,
        height: `${template.paperH}mm`,
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 6px 28px rgba(0,0,0,0.35)',
        cursor: interactive ? 'crosshair' : 'default',
        touchAction: interactive ? 'none' : 'auto',
        flex: '0 0 auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '0 0',
          transform,
        }}
      >
        {showBg && template.bgImage && (
          <img
            src={template.bgImage}
            alt="預印紙掃描底圖"
            draggable={false}
            style={{ position: 'absolute', left: 0, top: 0, width: `${template.paperW}mm`, height: `${template.paperH}mm` }}
          />
        )}
        {template.fields.map((f) => (
          <FieldView
            key={f.id}
            field={f}
            value={values[f.id] ?? ''}
            interactive={interactive}
            selected={selectedId === f.id}
            ghost={interactive && !(values[f.id] ?? '')}
            onPointerDown={onFieldPointerDown ? (e) => onFieldPointerDown(e, f.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
