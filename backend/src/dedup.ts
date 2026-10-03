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
 * Quy tac Khử trùng lặp:
 * 1. Khoa chinh: DOI chính xác (Exact DOI match) -> Loại bỏ trùng lặp hoàn toàn.
 * 2. Khoa phu: Tiêu đề chuẩn hóa (Normalized Title) -> NẾU KHÁC DOI hoặc nguồn khác,
 *    TUYỆT ĐỐI KHÔNG TỰ Ý LOẠI BỎ! Chuyển thành Đề xuất trùng (potentialDuplicate)
 *    để người dùng tự xác nhận trên UI và giữ nguyên thông tin nguồn.
 */
export function deduplicateRecords(records: PaperRecord[]): {
  uniqueRecords: PaperRecord[];
  dedupStats: DedupStats;
} {
  const seenDoi = new Map<string, PaperRecord>();
  const seenTitle = new Map<string, PaperRecord>();
  const uniqueRecords: PaperRecord[] = [];

  let exactDupByDoi = 0;
  let potentialDupByTitle = 0;

  for (const record of records) {
    const cleanedDoi = cleanDoi(record.doi);
    const normTitle = normalizeTitle(record.title);

    // 1. Kiem tra trung lap DOI tuyet doi
    if (cleanedDoi) {
      if (seenDoi.has(cleanedDoi)) {
        exactDupByDoi++;
        // Trung DOI hoan toan -> loai bo ban ghi trung
        continue;
      }
      seenDoi.set(cleanedDoi, record);
    }

    // 2. Kiem tra trung lap Tieu de chuan hoa
    if (normTitle) {
      const existingRecord = seenTitle.get(normTitle);
      if (existingRecord) {
        // Cung tieu de nhung khac DOI hoac khong co DOI:
        // KHONG xoa! Danh dau potentialDuplicate de nguoi dung xem xet
        potentialDupByTitle++;
        record.potentialDuplicate = true;
        record.duplicateOfId = existingRecord.id;
        record.duplicateReason = `Trùng tiêu đề với [#${existingRecord.id.slice(-6)}], nguồn: ${existingRecord.source}. Giữ lại để người dùng thẩm định.`;
      } else {
        seenTitle.set(normTitle, record);
      }
    }

    uniqueRecords.push(record);
  }

  return {
    uniqueRecords,
    dedupStats: {
      initialCount: records.length,
      exactDupByDoi,
      potentialDupByTitle,
      totalRetained: uniqueRecords.length
    }
  };
}
