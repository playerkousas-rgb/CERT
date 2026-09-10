// 動態載入 pdfjs，避免增加首頁 bundle 體積
async function getPdfjs() {
  const [pdfjsMod, workerMod] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsMod.GlobalWorkerOptions.workerSrc = workerMod.default;
  return pdfjsMod;
}

/** 把 PDF 第一頁點陣化為 PNG data URL（掃描本常為 PDF） */
export async function renderPdfFirstPage(
  file: File,
  maxDim = 2200
): Promise<{ url: string; width: number; height: number }> {
  const pdfjsLib = await getPdfjs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await pdf.getPage(1);
  // 先以 scale 1 取比例，再算需要的 scale
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, maxDim / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, viewport } as Parameters<typeof page.render>[0]).promise;
  return { url: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height };
}
