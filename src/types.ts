export interface TextField {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number; // percentage of image height (1-20)
  fontFamily: string;
  fontColor: string;
  bold: boolean;
  textAlign: 'left' | 'center' | 'right';
}

export interface AppData {
  templateImage: string | null;
  templateWidth: number;
  templateHeight: number;
  templateName: string;
  fields: TextField[];
  dataMode: 'excel' | 'manual';
  excelData: Record<string, string>[];
  excelColumns: string[];
  fieldColumnMap: Record<string, string>;
  manualData: Record<string, string>[];
}
