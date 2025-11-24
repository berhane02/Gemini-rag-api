/**
 * Production-ready logging utility
 * Provides structured logging with different log levels
 * Sanitizes sensitive data to prevent exposure in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  [key: string]: unknown;
}

// Sensitive keys that should be redacted in logs
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'auth',
  'credentials',
  'cookie',
  'session',
  'private',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret',
];

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /authorization/i,
  /auth/i,
  /credential/i,
  /session/i,
  /private/i,
  /client[_-]?secret/i,
];

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Sanitizes sensitive data from objects and strings
   */
  private sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Check if string contains sensitive patterns
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(data)) {
          return '[REDACTED]';
        }
      }
      // Redact long strings that might be tokens (e.g., JWT tokens are typically long)
      if (data.length > 50 && /^[A-Za-z0-9_-]+$/.test(data)) {
        return '[REDACTED]';
      }
      return data;
    }

    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        return data.map(item => this.sanitize(item));
      }

      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Check if key indicates sensitive data
        const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
          lowerKey.includes(sensitiveKey.toLowerCase())
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitizes error objects to prevent exposing sensitive stack traces in production
   */
  private sanitizeError(error: Error | unknown): unknown {
    if (!(error instanceof Error)) {
      return this.sanitize(error);
    }

    // In production, only expose safe error messages
    if (this.isProduction) {
      return {
        name: error.name,
        message: this.sanitizeMessage(error.message),
        // Don't expose stack traces in production
      };
    }

    // In development, include stack traces
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  /**
   * Sanitizes error messages to remove sensitive data
   */
  private sanitizeMessage(message: string): string {
    // Remove file paths that might expose directory structure
    let sanitized = message.replace(/\/[^\s]+/g, '[PATH]');
    
    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    
    // Remove potential API keys or tokens
    sanitized = sanitized.replace(/[A-Za-z0-9_-]{32,}/g, (match) => {
      // Keep short strings, redact long ones that look like tokens
      return match.length > 32 ? '[TOKEN]' : match;
    });

    return sanitized;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitize(context) : null;
    const contextStr = sanitizedContext ? ` ${JSON.stringify(sanitizedContext)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    // Only log info in development or server-side production
    if (this.isDevelopment || (this.isProduction && typeof window === 'undefined')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    // Only log warnings in development or server-side production
    if (this.isDevelopment || (this.isProduction && typeof window === 'undefined')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const sanitizedError = error ? this.sanitizeError(error) : undefined;
    const errorContext = {
      ...(context ? this.sanitize(context) as LogContext : {}),
      ...(sanitizedError ? { error: sanitizedError } : {}),
    };
    
    // Always log errors, but sanitized
    const formattedMessage = this.formatMessage('error', message, errorContext);
    
    if (this.isDevelopment) {
      console.error(formattedMessage);
    } else if (typeof window === 'undefined') {
      // Server-side: log errors
      console.error(formattedMessage);
    }
    // Client-side production: don't log to console to prevent exposing data to users
    
    // In production, you might want to send errors to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }
}

export const logger = new Logger();

