import { useEffect, useRef, useState, type ReactNode } from 'react';
import { mmPx } from '../lib/layout';

/** 把實體 mm 尺寸的頁面按容器寬度等比縮小顯示 */
export default function ScaledPage({
  widthMm,
  heightMm,
  maxScale = 1,
  children,
  onScaleChange,
}: {
  widthMm: number;
  heightMm: number;
  maxScale?: number;
  children: ReactNode;
  onScaleChange?: (s: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      const availW = el.clientWidth - 8;
      const availH = el.clientHeight - 8;
      const sW = availW / mmPx(widthMm);
      const sH = availH > 0 ? availH / mmPx(heightMm) : sW;
      const s = Math.min(maxScale, sW, sH);
      setScale(s);
      onScaleChange?.(s);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthMm, heightMm, maxScale, onScaleChange]);

  return (
    <div ref={wrapRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div style={{ width: mmPx(widthMm) * scale, height: mmPx(heightMm) * scale }}>
        <div
          style={{
            width: mmPx(widthMm),
            height: mmPx(heightMm),
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
