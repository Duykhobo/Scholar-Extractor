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
 * 1. Xuất file CSV chuẩn 10 cột của SWT302/PRISMA (Metadata thuần túy)
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

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.join(',') + '\r\n';

    for (const record of records) {
      const row = [
        escapeCsvField(record.source || record.discoverySource || 'Google Scholar'),
        escapeCsvField(record.title || ''),
        escapeCsvField(record.authors || ''),
        escapeCsvField(record.year || ''),
        escapeCsvField(record.venue || ''),
        escapeCsvField(record.doi || ''),
        escapeCsvField(record.abstract || ''),
        escapeCsvField(record.url || ''),
        escapeCsvField(record.query || ''),
        escapeCsvField(record.retrieval_date || '')
      ];
      csvContent += row.join(',') + '\r\n';
    }

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

/**
 * 2. Xuất file CSV chuyên biệt cho Screening (02_screening_decisions.csv)
 * Chứa đầy đủ quyết định gợi ý, lý do theo IC/EC, quyết định của người dùng và ghi chú
 */
export function exportScreeningCsv(
  records: PaperRecord[],
  outputPath: string
): { success: boolean; filePath: string; error?: string } {
  try {
    const headers = [
      'id',
      'source',
      'title',
      'year',
      'venue',
      'doi',
      'url',
      'screening_stage',
      'matched_criteria',
      'suggested_decision',
      'screening_reason',
      'final_decision',
      'user_notes',
      'potential_duplicate',
      'duplicate_reason',
      'query',
      'retrieval_date'
    ];

    let csvContent = '\uFEFF';
    csvContent += headers.join(',') + '\r\n';

    for (const record of records) {
      const row = [
        escapeCsvField(record.id),
        escapeCsvField(record.source || record.discoverySource || 'Google Scholar'),
        escapeCsvField(record.title || ''),
        escapeCsvField(record.year || ''),
        escapeCsvField(record.venue || ''),
        escapeCsvField(record.doi || ''),
        escapeCsvField(record.url || ''),
        escapeCsvField(record.screeningStage || 'V1'),
        escapeCsvField((record.matchedCriteria || []).join('; ')),
        escapeCsvField(record.suggestedDecision || 'Unsure'),
        escapeCsvField(record.screeningReason || ''),
        escapeCsvField(record.finalDecision || ''),
        escapeCsvField(record.userNotes || ''),
        escapeCsvField(record.potentialDuplicate ? 'YES' : 'NO'),
        escapeCsvField(record.duplicateReason || ''),
        escapeCsvField(record.query || ''),
        escapeCsvField(record.retrieval_date || '')
      ];
      csvContent += row.join(',') + '\r\n';
    }

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
