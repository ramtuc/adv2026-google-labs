import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSerialPort, WebSerialNavigator } from '../types/serial';

interface UseWebSerialOptions {
  onLineReceived: (line: string) => void;
  defaultBaudRate?: number;
}

export function useWebSerial({ onLineReceived, defaultBaudRate = 115200 }: UseWebSerialOptions) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [baudRate, setBaudRate] = useState<number>(defaultBaudRate);
  const [error, setError] = useState<string | null>(null);
  const [portInfo, setPortInfo] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const portRef = useRef<WebSerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReadingRef = useRef<boolean>(false);
  const onLineReceivedRef = useRef(onLineReceived);
  onLineReceivedRef.current = onLineReceived;

  // Check Web Serial API support
  useEffect(() => {
    const nav = navigator as unknown as WebSerialNavigator;
    const supported = Boolean(nav && nav.serial && typeof nav.serial.requestPort === 'function');
    setIsSupported(supported);
  }, []);

  // Disconnect cleanly
  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (err) {
        console.warn('Error cancelling reader:', err);
      }
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (err) {
        console.warn('Error closing port:', err);
      }
      portRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setPortInfo(null);
  }, []);

  // Connect to serial port
  const connect = useCallback(async (customBaud?: number) => {
    const targetBaud = customBaud || baudRate;
    const nav = navigator as unknown as WebSerialNavigator;

    if (!nav.serial) {
      setError('お使いのブラウザは Web Serial API に対応していません。Chrome、Edge、または Opera をご利用ください。');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Prompt user to select serial port
      const port = await nav.serial.requestPort({
        // Optional ESP32 USB filters (Espressif VID: 0x303a, Silicon Labs CP210x: 0x10c4, WCH CH340: 0x1a86, FTDI: 0x0403)
      });

      await port.open({
        baudRate: targetBaud,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        bufferSize: 8192,
        flowControl: 'none',
      });

      portRef.current = port;

      // Extract port info if available
      try {
        const info = port.getInfo ? port.getInfo() : null;
        if (info && (info.usbVendorId || info.usbProductId)) {
          const vid = info.usbVendorId ? `0x${info.usbVendorId.toString(16).padStart(4, '0')}` : 'Unknown';
          const pid = info.usbProductId ? `0x${info.usbProductId.toString(16).padStart(4, '0')}` : 'Unknown';
          setPortInfo(`USB VID:${vid} PID:${pid}`);
        } else {
          setPortInfo(`Serial Port (${targetBaud} bps)`);
        }
      } catch {
        setPortInfo(`Connected (${targetBaud} bps)`);
      }

      setIsConnected(true);
      setIsConnecting(false);
      keepReadingRef.current = true;

      // Read loop with text decoding & line buffering
      if (port.readable) {
        const textDecoder = new TextDecoderStream();
        // Pipe stream
        port.readable.pipeTo(textDecoder.writable as unknown as WritableStream<Uint8Array>).catch((err) => {
          // Stream piping cancelled or port closed
          console.debug('PipeTo ended:', err);
        });

        const reader = textDecoder.readable.getReader();
        readerRef.current = reader;

        let lineBuffer = '';

        (async () => {
          try {
            while (keepReadingRef.current) {
              const { value, done } = await reader.read();
              if (done) {
                break;
              }
              if (value) {
                lineBuffer += value;
                const lines = lineBuffer.split(/\r?\n/);
                // Last element is either empty or incomplete line
                lineBuffer = lines.pop() || '';
                for (const line of lines) {
                  if (line.trim().length > 0 || line === '') {
                    onLineReceivedRef.current(line);
                  }
                }
              }
            }
          } catch (readErr: any) {
            if (keepReadingRef.current) {
              console.error('Serial read error:', readErr);
              setError(`シリアル通信エラー: ${readErr?.message || '接続が切断されました'}`);
            }
          } finally {
            if (keepReadingRef.current) {
              disconnect();
            }
          }
        })();
      }
    } catch (err: any) {
      console.warn('Web Serial connection cancelled or failed:', err);
      setIsConnecting(false);
      if (err.name === 'NotFoundError') {
        // User closed or cancelled port selector
        return;
      }
      if (err.name === 'SecurityError' || err.message?.includes('permissions policy') || err.message?.includes('disallowed')) {
        setError('シリアルポートへのアクセスが許可されていません。iframeの権限ポリシー更新を反映するため、ページを再読み込みするか別タブで開いてお試しください。');
      } else {
        setError(`接続エラー: ${err.message || 'ポートを開けませんでした'}`);
      }
    }
  }, [baudRate, disconnect]);

  // Restart ESP32 using DTR/RTS hardware auto-reset circuit
  const resetEsp32 = useCallback(async (mode: 'normal' | 'bootloader' = 'normal') => {
    if (!portRef.current || !isConnected) {
      throw new Error('ESP32がシリアルポートに接続されていません');
    }

    setIsResetting(true);
    try {
      const port = portRef.current;
      if (mode === 'normal') {
        // ESP32 Standard Auto-Reset Sequence:
        // In the standard transistor auto-reset circuit:
        // RTS=1 pulls EN to GND (holding chip in reset).
        // DTR=0 keeps IO0 high (normal boot).
        await port.setSignals({ dataTerminalReady: false, requestToSend: true });
        await new Promise((r) => setTimeout(r, 120));
        // Release EN
        await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      } else {
        // ROM Download / Bootloader Mode Sequence:
        // Pull IO0 low (DTR=1) and EN low (RTS=1)
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
        await new Promise((r) => setTimeout(r, 150));
        // Release EN (RTS=0) while keeping IO0 low (DTR=1)
        await port.setSignals({ dataTerminalReady: true, requestToSend: false });
        await new Promise((r) => setTimeout(r, 100));
        // Release IO0 (DTR=0)
        await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      }
    } catch (err: any) {
      console.error('Failed to toggle DTR/RTS signals:', err);
      throw err;
    } finally {
      setTimeout(() => {
        setIsResetting(false);
      }, 300);
    }
  }, [isConnected]);

  // Send serial command to ESP32
  const sendData = useCallback(async (text: string, lineEnding: 'crlf' | 'lf' | 'none' = 'crlf') => {
    if (!portRef.current || !isConnected) {
      throw new Error('ESP32がシリアルポートに接続されていません');
    }

    try {
      let payload = text;
      if (lineEnding === 'crlf') {
        payload += '\r\n';
      } else if (lineEnding === 'lf') {
        payload += '\n';
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(payload);

      if (portRef.current.writable) {
        const writer = portRef.current.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
      }
    } catch (err: any) {
      console.error('Failed to send data to ESP32:', err);
      throw err;
    }
  }, [isConnected]);

  return {
    isSupported,
    isConnected,
    isConnecting,
    baudRate,
    setBaudRate,
    error,
    setError,
    portInfo,
    isResetting,
    connect,
    disconnect,
    resetEsp32,
    sendData,
  };
}
