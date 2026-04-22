import { Check } from 'lucide-react';

const steps = [
  { number: 1, label: '上傳範本', sublabel: 'Template' },
  { number: 2, label: '設定欄位', sublabel: 'Fields' },
  { number: 3, label: '輸入資料', sublabel: 'Data' },
  { number: 4, label: '預覽匯出', sublabel: 'Export' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                  currentStep > step.number
                    ? 'bg-[#d4a853] text-[#0a192f] shadow-lg shadow-[#d4a853]/30'
                    : currentStep === step.number
                    ? 'bg-[#d4a853]/20 text-[#d4a853] border-2 border-[#d4a853] shadow-lg shadow-[#d4a853]/10'
                    : 'bg-white/5 text-white/30 border border-white/10'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium transition-colors ${
                  currentStep >= step.number ? 'text-[#d4a853]' : 'text-white/30'
                }`}
              >
                {step.label}
              </span>
              <span
                className={`text-[9px] tracking-wider ${
                  currentStep >= step.number ? 'text-[#d4a853]/50' : 'text-white/15'
                }`}
              >
                {step.sublabel}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 sm:mx-4 mt-[-20px]">
                <div
                  className={`h-0.5 rounded-full transition-all duration-500 ${
                    currentStep > step.number
                      ? 'bg-[#d4a853] shadow-sm shadow-[#d4a853]/30'
                      : 'bg-white/10'
                  }
                  `}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
