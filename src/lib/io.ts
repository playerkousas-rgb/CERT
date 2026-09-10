// 圖片與檔案讀取工具

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('讀檔失敗'));
    r.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = src;
  });
}

/**
 * 把已有的 data URL 圖片縮至最長邊 maxDim 並轉 JPEG（全頁底圖用，慳 localStorage）。
 * 無 canvas 環境（測試）會原樣回傳。
 */
export async function downscaleDataURL(
  dataUrl: string,
  maxDim = 1700,
  quality = 0.82
): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

/**
 * 把圖片縮至最長邊 maxDim，壓成 data URL。
 * keepPng：保留透明背景（簽名、印章）；其餘轉 JPG 並鋪白底。
 */
export async function scaledDataURL(
  file: File,
  maxDim: number,
  opts: { keepPng?: boolean } = {}
): Promise<{ url: string; width: number; height: number }> {
  const raw = await readFileAsDataURL(file);
  const img = await loadImage(raw);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const isPng = file.type === 'image/png';
  if (opts.keepPng && isPng) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { url: canvas.toDataURL('image/png'), width: w, height: h };
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { url: canvas.toDataURL('image/jpeg', 0.9), width: w, height: h };
}
