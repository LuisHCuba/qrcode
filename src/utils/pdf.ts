import {
  getDocument,
  GlobalWorkerOptions,
  PDFDocumentProxy,
} from 'pdfjs-dist';
import type { PdfPageImage } from '../types';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

export async function renderPdfPages(
  file: File,
  scale = 2,
): Promise<PdfPageImage[]> {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data }).promise;
  const images: PdfPageImage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    images.push(await renderPageToImage(page, scale));
  }

  return images;
}

async function renderPageToImage(
  page: Awaited<ReturnType<PDFDocumentProxy['getPage']>>,
  scale: number,
): Promise<PdfPageImage> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context indisponível');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

