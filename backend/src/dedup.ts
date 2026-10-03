import { PaperRecord, DedupStats } from './types';

export function normalizeTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Giu lai chu cai, so va dau cach
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanDoi(rawDoi: string): string {
  if (!rawDoi) return '';
  let doi = String(rawDoi).trim();
  doi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  doi = doi.replace(/^doi:\s*/i, '');
  return doi.toLowerCase().trim();
}

/**
 * Khu trung lap:
 * 1. Khoa chinh: DOI (neu co)
 * 2. Khoa phu: Normalized Title
 */
export function deduplicateRecords(records: PaperRecord[]): {
  uniqueRecords: PaperRecord[];
  dedupStats: DedupStats;
} {
  const seenDoi = new Set<string>();
  const seenTitle = new Set<string>();
  const uniqueRecords: PaperRecord[] = [];

  let dupByDoi = 0;
  let dupByTitle = 0;

  for (const record of records) {
    const cleanedDoi = cleanDoi(record.doi);
    const normTitle = normalizeTitle(record.title);

    // 1. Kiem tra trung theo DOI (neu DOI hop le)
    if (cleanedDoi) {
      if (seenDoi.has(cleanedDoi)) {
        dupByDoi++;
        continue;
      }
      seenDoi.add(cleanedDoi);
    }

    // 2. Kiem tra trung theo Tieu de chuan hoa
    if (normTitle) {
      if (seenTitle.has(normTitle)) {
        dupByTitle++;
        continue;
      }
      seenTitle.add(normTitle);
    }

    uniqueRecords.push(record);
  }

  return {
    uniqueRecords,
    dedupStats: {
      initialCount: records.length,
      dupByDoi,
      dupByTitle,
      totalUnique: uniqueRecords.length
    }
  };
}
