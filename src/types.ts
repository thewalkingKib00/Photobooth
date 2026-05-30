export interface FrameType {
  id: string;
  name: string;
  label: string;
  theme: string; // Tailwind bg-color class
  borderStyle: string;
  textColor: string;
  accentColor: string;
  patterns?: string; // Optional overlay decoration description
  customBg?: string; // Optional base64 background design overlay
}

export interface PhotoSession {
  id: string;
  selectedFrameId: string;
  capturedPhotos: string[]; // base64 strings
  compiledPhotoUrl?: string; // final combined image with frame
  quantity: number;
  totalCost: number;
  paymentStatus: 'pending' | 'success' | 'failed';
  paymentMethod: 'QRIS' | 'GOPAY' | 'OVO' | 'DANA';
  downloadId: string;
  createdAt: string;
  isPrinted: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  frameName: string;
  quantity: number;
  amount: number;
  paymentMethod: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  printStatus: 'NOT_PRINTED' | 'QUEUED' | 'PRINTING' | 'PRINTED';
}

export interface PaperStock {
  current: number;
  capacity: number;
  lowThreshold: number;
}

export interface AppSettings {
  countdownSeconds: number; // default countdown per shot
  priceBase: number; // base price (includes 2 prints)
  priceExtraCopy: number; // price per extra print copy
  spreadsheetUrl: string; // integration google sheet
  printerBluetoothName: string;
  isPrinterConnected: boolean;
  boothName: string; // customizable booth name
  sessionTimeoutSeconds: number; // total photo session duration (e.g. 60s)
  qrisPayload: string; // custom QRIS payload template
}
