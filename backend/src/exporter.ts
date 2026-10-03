import fs from 'fs';
import path from 'path';
import { PaperRecord } from './types';
import { sanitizeString } from './sanitizer';

export function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) {
    return '""';
  }
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Xuat danh sach PaperRecord ra file CSV theo chuan 10 cot cua SWT302 (UTF-8 BOM)
 */
export function exportToCsv(
  records: PaperRecord[],
  outputPath: string
): { success: boolean; filePath: string; error?: string } {
  try {
    const headers = [
      'source',
      'title',
      'authors',
      'year',
      'venue',
      'doi',
      'abstract',
      'url',
      'query',
      'retrieval_date'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM de Excel hien thi Tieng Viet khong loi
    csvContent += headers.join(',') + '\r\n';

    for (const record of records) {
      const row = [
        escapeCsvField(record.source || record.discoverySource || 'Google Scholar'),
        escapeCsvField(record.title || ''),
        escapeCsvField(record.authors || ''),
        escapeCsvField(record.year || ''),
        escapeCsvField(record.venue || ''),
        escapeCsvField(record.doi || ''),
        escapeCsvField(record.abstract || ''), // Abstract de trong hoac bo sung xac minh, khong dua snippet vao day
        escapeCsvField(record.url || ''),
        escapeCsvField(record.query || ''),
        escapeCsvField(record.retrieval_date || '')
      ];
      csvContent += row.join(',') + '\r\n';
    }

    // Sanitize toan bo file CSV truoc khi ghi de bao dam bao mat
    const sanitizedCsv = sanitizeString(csvContent);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, sanitizedCsv, 'utf-8');
    return { success: true, filePath: outputPath };
  } catch (err: any) {
    return { success: false, filePath: outputPath, error: err.message };
  }
}
