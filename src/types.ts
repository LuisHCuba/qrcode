export interface PdfPageImage {
  dataUrl: string;
  width: number;
  height: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QRFragment {
  id: string;
  page: number;
  index: number;
  dataUrl: string;
  decodedText?: string | null;
}

