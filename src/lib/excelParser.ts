import * as XLSX from 'xlsx';

export async function parseExcelFile(file: File): Promise<{
  columns: string[];
  data: Record<string, string>[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target!.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          defval: '',
        });
        const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        // Convert all values to strings
        const stringData = jsonData.map(row => {
          const newRow: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            newRow[key] = String(value);
          }
          return newRow;
        });
        resolve({ columns, data: stringData });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function autoMapFields(
  fieldNames: string[],
  columns: string[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const fieldName of fieldNames) {
    const match = columns.find(
      col => col.toLowerCase().trim() === fieldName.toLowerCase().trim()
    );
    if (match) {
      map[fieldName] = match;
    }
  }
  return map;
}
