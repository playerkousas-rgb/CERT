import type { TextField } from '../types';

export async function renderCertificateOnCanvas(
  templateImage: string,
  fields: TextField[],
  data: Record<string, string>,
  imageWidth: number,
  imageHeight: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

      for (const field of fields) {
        const text = data[field.name] || '';
        if (!text) continue;

        const x = (field.x / 100) * imageWidth;
        const y = (field.y / 100) * imageHeight;
        const fontSize = (field.fontSize / 100) * imageHeight;

        ctx.save();
        ctx.font = `${field.bold ? 'bold ' : ''}${fontSize}px "${field.fontFamily}", sans-serif`;
        ctx.fillStyle = field.fontColor;
        ctx.textAlign = field.textAlign;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load template image'));
    img.src = templateImage;
  });
}
