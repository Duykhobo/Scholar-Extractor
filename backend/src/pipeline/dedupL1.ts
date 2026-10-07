import { CanonicalRecord, NormalizedRecord, SuspectedDuplicateGroup } from "../types";
import { DataQualityL0 } from "./dataQualityL0";

export class DedupL1 {
  /**
   * Tính toán độ tương đồng chuỗi Levenshtein / Jaccard Token đơn giản cho tiêu đề
   */
  static cleanTitle(title: string): string {
    return (title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  static calculateTitleSimilarity(t1: string, t2: string): number {
    const s1 = this.cleanTitle(t1);
    const s2 = this.cleanTitle(t2);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;

    const tokens1 = new Set(s1.split(" ").filter((w) => w.length > 2));
    const tokens2 = new Set(s2.split(" ").filter((w) => w.length > 2));
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    let intersection = 0;
    for (const t of tokens1) {
      if (tokens2.has(t)) intersection++;
    }

    const union = new Set([...tokens1, ...tokens2]).size;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Gộp trùng chắc chắn (Exact Duplicate) theo DOI hoặc (Source + SourceRecordId)
   */
  static processExactDeduplication(records: NormalizedRecord[]): {
    canonicalRecords: CanonicalRecord[];
    exactDuplicateCount: number;
  } {
    const doiMap = new Map<string, CanonicalRecord>(); // normalizedDoi -> canonical
    const sourceIdMap = new Map<string, CanonicalRecord>(); // `${source}:::${sourceRecordId}` -> canonical
    const resultList: CanonicalRecord[] = [];
    let exactDuplicateCount = 0;

    for (const raw of records) {
      const processed = DataQualityL0.processRecord(raw);
      const cleanDoi = processed.doi;
      const sourceKey = processed.source && processed.sourceRecordId ? `${processed.source}:::${processed.sourceRecordId}` : "";

      let existingCanonical: CanonicalRecord | undefined;

      // 1. Kiểm tra DOI trùng chắc chắn
      if (cleanDoi && doiMap.has(cleanDoi)) {
        existingCanonical = doiMap.get(cleanDoi);
      }
      // 2. Kiểm tra cùng nguồn + cùng sourceRecordId
      else if (sourceKey && sourceIdMap.has(sourceKey)) {
        existingCanonical = sourceIdMap.get(sourceKey);
      }

      if (existingCanonical) {
        // Gộp vào canonical đã có
        existingCanonical.mergedRecordIds.push(processed.id);
        if (!existingCanonical.sourcesList.includes(processed.source)) {
          existingCanonical.sourcesList.push(processed.source);
        }

        // Bổ sung dữ liệu nếu bản ghi trước thiếu
        if (!existingCanonical.abstract && processed.abstract) {
          existingCanonical.abstract = processed.abstract;
        }
        if (!existingCanonical.openAccessPdfUrl && processed.openAccessPdfUrl) {
          existingCanonical.openAccessPdfUrl = processed.openAccessPdfUrl;
        }
        if (!existingCanonical.doi && processed.doi) {
          existingCanonical.doi = processed.doi;
          doiMap.set(processed.doi, existingCanonical);
        }
        if (!existingCanonical.venue && processed.venue) {
          existingCanonical.venue = processed.venue;
        }
        if (!existingCanonical.year && processed.year) {
          existingCanonical.year = processed.year;
        }

        // Cập nhật lại quality flags
        existingCanonical.qualityFlags = DataQualityL0.assessQuality(existingCanonical);
        exactDuplicateCount++;
      } else {
        // Tạo CanonicalRecord mới
        const canonical: CanonicalRecord = {
          ...processed,
          mergedRecordIds: [processed.id],
          sourcesList: [processed.source],
          qualityFlags: processed.qualityFlags,
        };

        if (cleanDoi) doiMap.set(cleanDoi, canonical);
        if (sourceKey) sourceIdMap.set(sourceKey, canonical);
        resultList.push(canonical);
      }
    }

    return {
      canonicalRecords: resultList,
      exactDuplicateCount,
    };
  }

  /**
   * Phát hiện các cặp trùng nghi ngờ (Suspected Duplicates) dựa trên tiêu đề mờ và năm/tác giả
   * Không tự ý gộp! Đưa vào nhóm để người dùng xác nhận
   */
  static findSuspectedDuplicates(
    canonicalRecords: CanonicalRecord[],
    collectionId: string,
    threshold: number = 0.82
  ): SuspectedDuplicateGroup[] {
    const groups: SuspectedDuplicateGroup[] = [];
    const paired = new Set<string>();

    for (let i = 0; i < canonicalRecords.length; i++) {
      const recA = canonicalRecords[i];
      if (!recA.title || recA.title.length < 10) continue;

      for (let j = i + 1; j < canonicalRecords.length; j++) {
        const recB = canonicalRecords[j];
        if (!recB.title || recB.title.length < 10) continue;

        const pairKey = [recA.id, recB.id].sort().join("___");
        if (paired.has(pairKey)) continue;

        // Tránh so sánh nếu cả 2 đã có DOI khác nhau hoàn toàn (không tự gộp khi đã có 2 DOI phân biệt)
        if (recA.doi && recB.doi && recA.doi !== recB.doi) {
          // Ngoại lệ: nếu một trong hai là preprint và một bài là journal article thì cảnh báo rõ ràng
          const isPreprintPair =
            recA.source.toLowerCase().includes("arxiv") ||
            recB.source.toLowerCase().includes("arxiv") ||
            recA.venue.toLowerCase().includes("arxiv") ||
            recB.venue.toLowerCase().includes("arxiv");

          if (!isPreprintPair) {
            // Hai bài báo đã có 2 DOI chính thức khác nhau thì không phải trùng
            continue;
          }
        }

        const similarity = this.calculateTitleSimilarity(recA.title, recB.title);
        if (similarity >= threshold) {
          // Kiểm tra thêm năm (nếu có năm thì độ lệch không quá 1 năm)
          if (recA.year && recB.year) {
            const diff = Math.abs(parseInt(recA.year, 10) - parseInt(recB.year, 10));
            if (!isNaN(diff) && diff > 1) {
              continue; // Khác năm quá 1 năm -> không nghi ngờ trùng
            }
          }

          paired.add(pairKey);
          const groupId = `suspect_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          groups.push({
            id: groupId,
            collectionId,
            title: recA.title,
            year: recA.year || recB.year,
            similarity: Math.round(similarity * 100) / 100,
            recordIds: [recA.id, recB.id],
            canonicalRecordId: recA.id,
            resolution: "unresolved",
          });
        }
      }
    }

    return groups;
  }
}
