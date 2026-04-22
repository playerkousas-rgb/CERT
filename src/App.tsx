import { useState, useCallback } from 'react';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import TemplateUpload from './components/TemplateUpload';
import FieldEditor from './components/FieldEditor';
import DataInput from './components/DataInput';
import PreviewExport from './components/PreviewExport';
import type { AppData, TextField } from './types';

const initialAppData: AppData = {
  templateImage: null,
  templateWidth: 0,
  templateHeight: 0,
  templateName: '',
  fields: [],
  dataMode: 'manual',
  excelData: [],
  excelColumns: [],
  fieldColumnMap: {},
  manualData: [{}],
};

function App() {
  const [step, setStep] = useState(1);
  const [appData, setAppData] = useState<AppData>(initialAppData);

  const updateAppData = useCallback((updates: Partial<AppData>) => {
    setAppData((prev) => {
      const newData = { ...prev, ...updates };
      // Clear fields if template changed
      if (
        updates.templateImage &&
        updates.templateImage !== prev.templateImage
      ) {
        newData.fields = [];
        newData.manualData = [{}];
        newData.excelData = [];
        newData.excelColumns = [];
        newData.fieldColumnMap = {};
      }
      return newData;
    });
  }, []);

  const addField = useCallback((field: TextField) => {
    setAppData((prev) => ({ ...prev, fields: [...prev.fields, field] }));
  }, []);

  const updateField = useCallback(
    (id: string, updates: Partial<TextField>) => {
      setAppData((prev) => ({
        ...prev,
        fields: prev.fields.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      }));
    },
    []
  );

  const removeField = useCallback((id: string) => {
    setAppData((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== id),
    }));
  }, []);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <TemplateUpload
            appData={appData}
            updateAppData={updateAppData}
            onNext={() => setStep(2)}
          />
        );
      case 2:
        return (
          <FieldEditor
            appData={appData}
            addField={addField}
            updateField={updateField}
            removeField={removeField}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        );
      case 3:
        return (
          <DataInput
            appData={appData}
            updateAppData={updateAppData}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        );
      case 4:
        return (
          <PreviewExport
            appData={appData}
            updateAppData={updateAppData}
            onBack={() => setStep(3)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a192f] via-[#0f2744] to-[#0a192f] relative">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #d4a853 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #d4a853 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10">
        <Header />
        <StepIndicator currentStep={step} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
          {renderStep()}
        </main>
        <footer className="text-center py-6 border-t border-[#d4a853]/10">
          <p className="text-[#d4a853]/40 text-xs tracking-[0.3em] font-medium">
            COPYRIGHT © 2026 SKWSCOUT
          </p>
          <p className="text-white/15 text-[10px] mt-1 tracking-wider">
            UNIVERSAL CERTIFICATE PRINTING TOOL
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
