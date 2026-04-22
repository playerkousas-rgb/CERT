import { Document, Packer, Paragraph, ImageRun, AlignmentType } from 'docx';
import { renderCertificateOnCanvas } from './canvasRenderer';
import type { TextField } from '../types';

function dataURLtoUint8Array(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function generateWordDocument(
  templateImage: string,
  fields: TextField[],
  data: Record<string, string>[],
  imageWidth: number,
  imageHeight: number
): Promise<Blob> {
  const isLandscape = imageWidth > imageHeight;

  const a4WidthTwips = 11906;
  const a4HeightTwips = 16838;
  const pageWidth = isLandscape ? a4HeightTwips : a4WidthTwips;
  const pageHeight = isLandscape ? a4WidthTwips : a4HeightTwips;

  const pageWidthPx = isLandscape ? 1122 : 794;
  const pageHeightPx = isLandscape ? 794 : 1122;

  const imageAspect = imageWidth / imageHeight;
  const pageAspect = pageWidthPx / pageHeightPx;

  let displayWidthPx: number;
  let displayHeightPx: number;

  if (imageAspect > pageAspect) {
    displayWidthPx = pageWidthPx;
    displayHeightPx = Math.round(pageWidthPx / imageAspect);
  } else {
    displayHeightPx = pageHeightPx;
    displayWidthPx = Math.round(pageHeightPx * imageAspect);
  }

  const sections = [];

  for (const record of data) {
    const certificateDataURL = await renderCertificateOnCanvas(
      templateImage,
      fields,
      record,
      imageWidth,
      imageHeight
    );

    const imageData = dataURLtoUint8Array(certificateDataURL);

    sections.push({
      properties: {
        page: {
          size: { width: pageWidth, height: pageHeight },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: 'png',
              data: imageData,
              transformation: {
                width: displayWidthPx,
                height: displayHeightPx,
              },
            }),
          ],
        }),
      ],
    });
  }

  const doc = new Document({ sections });
  return await Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
