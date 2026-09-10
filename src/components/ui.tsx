import type { ReactNode } from 'react';

export function Panel({ title, icon, children, className = '' }: { title?: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#d4a853]/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden ${className}`}>
      {title && (
        <div className="p-4 border-b border-[#d4a853]/10 bg-[#d4a853]/5 flex items-center gap-2">
          {icon}
          <h3 className="text-[#d4a853] font-bold text-sm tracking-wider">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="text-white/50 text-xs mb-1.5 flex items-center justify-between gap-2">
      <span>{children}</span>
      {hint && <span className="text-white/30 font-normal">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 focus:border-[#d4a853]/60 focus:outline-none transition-colors disabled:opacity-40';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={`${inputCls} ${className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={`${inputCls} ${className ?? ''}`}>
      {children}
    </select>
  );
}

export function NumInput({
  value,
  onValue,
  step = 0.1,
  min,
  max,
  suffix,
  disabled,
}: {
  value: number;
  onValue: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : ''}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onValue(v);
        }}
        className={`${inputCls} ${suffix ? 'pr-9' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 text-xs pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'outline' | 'danger';

export function Btn({
  children,
  onClick,
  variant = 'outline',
  disabled,
  className = '',
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const styles: Record<BtnVariant, string> = {
    primary:
      'bg-gradient-to-r from-[#d4a853] to-[#b8860b] text-[#0a192f] font-bold hover:shadow-lg hover:shadow-[#d4a853]/25',
    outline: 'border border-[#d4a853]/35 text-[#d4a853] hover:bg-[#d4a853]/10',
    ghost: 'border border-white/10 text-white/60 hover:bg-white/5 hover:text-white',
    danger: 'border border-red-500/30 text-red-300 hover:bg-red-500/15',
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-lg text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Noto Serif TC', serif" }}>
        {title}
      </h2>
      <p className="text-white/50 text-sm">{subtitle}</p>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-sm text-white/75 hover:text-white transition-colors text-left"
    >
      <span
        className={`flex-shrink-0 w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#d4a853]' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
      {label}
    </button>
  );
}
