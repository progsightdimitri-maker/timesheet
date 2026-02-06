
type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  details?: any;
}

type Listener = (logs: LogEntry[]) => void;

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: Listener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('CRASH (Global Error)', { message: event.message, filename: event.filename, lineno: event.lineno });
      });
      window.addEventListener('unhandledrejection', (event) => {
        this.error('CRASH (Unhandled Promise)', { reason: event.reason });
      });
    }
  }

  log(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      details
    };
    this.logs = [entry, ...this.logs].slice(0, 100);
    this.notify();
    
    const styles = {
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold',
      success: 'color: #10b981'
    };
    console.log(`%c[DEBUG] ${message}`, styles[level], details || '');
  }

  info(msg: string, details?: any) { this.log('info', msg, details); }
  warn(msg: string, details?: any) { this.log('warn', msg, details); }
  error(msg: string, details?: any) { this.log('error', msg, details); }
  success(msg: string, details?: any) { this.log('success', msg, details); }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.logs));
  }
}

export const debugLogger = new DebugLogger();
