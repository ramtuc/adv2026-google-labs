/**
 * Types for Web Serial API and ESP-IDF log parser
 */

export type EspLogLevel = 'E' | 'W' | 'I' | 'D' | 'V' | 'BOOT' | 'PANIC' | 'RAW';

export interface ParsedLogLine {
  id: string;
  raw: string;
  level: EspLogLevel;
  timestamp: string | null; // e.g. "1245" in ms or formatted
  tag: string | null;       // e.g. "wifi", "main", "esp_tls"
  message: string;
  receivedAt: Date;
  isError: boolean;
  isWarning: boolean;
  isReset: boolean;
  isPanic: boolean;
  errorCategory?: string;   // e.g. "Guru Meditation Error", "LoadProhibited", "Brownout"
}

export interface SerialSignalOptions {
  dataTerminalReady?: boolean; // DTR
  requestToSend?: boolean;     // RTS
  break?: boolean;
}

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

// Web Serial types for TypeScript compatibility
export interface WebSerialPort {
  open(options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  setSignals(signals: SerialSignalOptions): Promise<void>;
  getSignals?(): Promise<{
    dataCarrierDetect?: boolean;
    clearToSend?: boolean;
    ringIndicator?: boolean;
    dataSetReady?: boolean;
  }>;
  getInfo?(): SerialPortInfo;
}

export interface WebSerialNavigator {
  serial?: {
    requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<WebSerialPort>;
    getPorts(): Promise<WebSerialPort[]>;
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
  };
}

export interface AiAnalysisResult {
  logLine: string;
  contextLines: string[];
  detectedType: string;
  analysis: string;
  timestamp: Date;
}
