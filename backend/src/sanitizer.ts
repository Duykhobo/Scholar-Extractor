import { config } from './config';

/**
 * Bo ve bao mat: Khong de lo SERPAPI_KEY hoac credential trong:
 * - Response API tra ve cho Chrome Extension
 * - Console log va backend log
 * - File JSON bang chung
 * - File CSV export
 */
export function sanitizeString(input: string): string {
  if (!input) return input;
  let result = input;

  // 1. Redact direct occurrence of known SerpApi key if configured
  if (config.serpApiKey && config.serpApiKey.length > 5) {
    result = result.split(config.serpApiKey).join('[REDACTED_API_KEY]');
  }

  // 2. Redact api_key=... in query strings and URLs
  result = result.replace(/([?&]api_key=)[^&"'\s]+/gi, '$1[REDACTED]');
  result = result.replace(/([?&]apiKey=)[^&"'\s]+/gi, '$1[REDACTED]');
  result = result.replace(/("api_key"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2');
  result = result.replace(/("apiKey"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2');

  return result;
}

/**
 * De quy duyet va khu toan bo du lieu nhay cam trong object / array
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sensitiveKeyNames = new Set([
      'api_key',
      'apikey',
      'key',
      'secret',
      'token',
      'authorization',
      'serpapi_key'
    ]);

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeyNames.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Kiem tra xem mot chuoi/object co chua khoa nhay cam hay khong (dung cho audit/test)
 */
export function containsSensitiveKey(data: unknown): boolean {
  if (!data) return false;
  if (!config.serpApiKey || config.serpApiKey.length < 5) return false;

  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return str.includes(config.serpApiKey);
}
