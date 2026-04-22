import * as pdfjsLib from 'pdfjs-dist';

// Use Vite's asset handling for the worker file
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function renderPDFToImage(file: File): Promise<{
  dataURL: string;
  width: number;
  height: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const page = await pdf.getPage(1);
  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvas,
    viewport,
  }).promise;

  return {
    dataURL: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
  };
}
