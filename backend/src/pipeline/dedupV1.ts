import { CanonicalPaper, DuplicateGroup, PaperRecord, SourceProvenance } from "../types";

export interface DedupV1Result {
  canonicalRecords: CanonicalPaper[];
  duplicateGroups: DuplicateGroup[];
  candidateGroups: DuplicateGroup[];
  stats: {
    rawCount: number;
    canonicalCount: number;
    exactDoiDuplicates: number;
    titleExactDuplicates: number;
    candidateDuplicates: number;
    containersCount: number;
  };
}

export class PipelineV1Dedup {
  /**
   * Chuẩn hóa DOI
   */
  static normalizeDoi(doi?: string): string {
    if (!doi) return "";
    return doi
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
      .replace(/^\/+|\/+$/g, "");
  }

  /**
   * Chuẩn hóa Title để so khớp
   */
  static normalizeTitle(title?: string): string {
    if (!title) return "";
    return title
      .toLowerCase()
      .replace(/[\p{P}\p{S}]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Tính điểm độ phong phú metadata để chọn Canonical Record tốt nhất
   */
  private static scoreRichness(record: PaperRecord): number {
    let score = 0;
    if (record.doi) score += 50;
    if (record.abstract && record.abstract.length > 100) score += 30;
    else if (record.abstract) score += 15;
    if (record.venue && !/unknown|n\/a/i.test(record.venue)) score += 20;
    if (record.authors && record.authors.length > 5) score += 15;
    if (record.year) score += 10;
    if (record.pdfUrl) score += 10;
    return score;
  }

  /**
   * Tính toán độ tương đồng giữa hai tiêu đề (0.0 - 1.0)
   */
  static calculateTitleSimilarity(t1: string, t2: string): number {
    const s1 = this.normalizeTitle(t1);
    const s2 = this.normalizeTitle(t2);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;

    const words1 = s1.split(" ").filter(Boolean);
    const words2 = s2.split(" ").filter(Boolean);
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    let intersection = 0;
    for (const w of set1) {
      if (set2.has(w)) intersection++;
    }
    const jaccard = intersection / (set1.size + set2.size - intersection || 1);

    const getBigrams = (str: string) => {
      const b = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) b.add(str.slice(i, i + 2));
      return b;
    };
    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    let bInter = 0;
    for (const bg of b1) {
      if (b2.has(bg)) bInter++;
    }
    const dice = (2 * bInter) / (b1.size + b2.size || 1);

    return Math.max(jaccard, dice);
  }

  /**
   * Thực hiện V1: Chuẩn hóa, gom nhóm trùng lặp và tạo Canonical Records
   */
  static processV1(
    rawRecords: PaperRecord[],
    existingGroups?: DuplicateGroup[],
  ): DedupV1Result {
    const rawCount = rawRecords.length;
    const doiMap = new Map<string, PaperRecord[]>();
    const titleMap = new Map<string, PaperRecord[]>();
    const recordsWithoutDoi: PaperRecord[] = [];

    // 1. Phân nhóm theo DOI chuẩn hóa
    for (const record of rawRecords) {
      const cleanDoi = this.normalizeDoi(record.doi);
      if (cleanDoi) {
        if (!doiMap.has(cleanDoi)) doiMap.set(cleanDoi, []);
        doiMap.get(cleanDoi)!.push(record);
      } else {
        recordsWithoutDoi.push(record);
      }
    }

    const duplicateGroups: DuplicateGroup[] = [];
    const candidateGroups: DuplicateGroup[] = [];
    const canonicalList: CanonicalPaper[] = [];
    let exactDoiDupCount = 0;
    let titleExactDupCount = 0;
    let candidateDupCount = 0;
    let containersCount = 0;

    // 2. Xử lý nhóm theo DOI (Trùng tuyệt đối)
    for (const [doi, groupRecords] of doiMap.entries()) {
      groupRecords.sort((a, b) => this.scoreRichness(b) - this.scoreRichness(a));
      const canonicalBase = groupRecords[0];

      const allSourcesSet = new Set<string>();
      const combinedProvenance: SourceProvenance[] = [];
      const mergedIds: string[] = [];

      for (const rec of groupRecords) {
        if (rec.source) allSourcesSet.add(rec.source);
        if (rec.discoverySource) allSourcesSet.add(rec.discoverySource);
        if (rec.provenanceList) combinedProvenance.push(...rec.provenanceList);
        else {
          combinedProvenance.push({
            source: rec.source || "Unknown",
            sourceRecordId: rec.id,
            queryVersion: rec.queryVersion || "Q1",
            retrievedAt: rec.retrieval_date || new Date().toISOString(),
            method: rec.collectionMethod || "search",
            url: rec.url,
          });
        }
        if (rec.id !== canonicalBase.id) {
          mergedIds.push(rec.id);
        }
      }

      if (groupRecords.length > 1) {
        exactDoiDupCount += groupRecords.length - 1;
        duplicateGroups.push({
          id: `dg_doi_${doi.replace(/[^a-zA-Z0-9]/g, "_")}`,
          canonicalId: canonicalBase.id,
          duplicateIds: mergedIds,
          reason: `Trùng khớp chính xác DOI: ${doi} qua ${allSourcesSet.size} nguồn (${Array.from(allSourcesSet).join(", ")})`,
          rule: "exact_doi",
          userConfirmed: true,
          createdAt: new Date().toISOString(),
        });
      }

      const canonical: CanonicalPaper = {
        ...canonicalBase,
        doi,
        pipelineStage: "V1",
        allSources: Array.from(allSourcesSet),
        provenanceList: combinedProvenance,
        mergedRecordIds: mergedIds,
      };

      if (canonical.isContainer) containersCount++;
      canonicalList.push(canonical);
    }

    // 3. Xử lý các bài không có DOI: nhóm theo Title chuẩn hóa và Fuzzy similarity > 88%
    for (const record of recordsWithoutDoi) {
      const normTitle = this.normalizeTitle(record.title);
      if (normTitle) {
        let matchedKey: string | null = null;
        for (const existingKey of titleMap.keys()) {
          if (existingKey === normTitle || this.calculateTitleSimilarity(existingKey, normTitle) >= 0.88) {
            matchedKey = existingKey;
            break;
          }
        }
        const keyToUse = matchedKey || normTitle;
        if (!titleMap.has(keyToUse)) titleMap.set(keyToUse, []);
        titleMap.get(keyToUse)!.push(record);
      } else {
        const canonical: CanonicalPaper = {
          ...record,
          pipelineStage: "V1",
          allSources: [record.source],
          provenanceList: record.provenanceList || [],
          mergedRecordIds: [],
        };
        canonicalList.push(canonical);
      }
    }

    for (const [, groupRecords] of titleMap.entries()) {
      groupRecords.sort((a, b) => this.scoreRichness(b) - this.scoreRichness(a));
      const canonicalBase = groupRecords[0];

      const allSourcesSet = new Set<string>();
      const combinedProvenance: SourceProvenance[] = [];
      const mergedIds: string[] = [];

      for (const rec of groupRecords) {
        if (rec.source) allSourcesSet.add(rec.source);
        if (rec.provenanceList) combinedProvenance.push(...rec.provenanceList);
        if (rec.id !== canonicalBase.id) mergedIds.push(rec.id);
      }

      const isUserConfirmed = Boolean(
        existingGroups?.find((g) => g.canonicalId === canonicalBase.id && g.userConfirmed),
      );

      if (groupRecords.length > 1) {
        candidateDupCount += groupRecords.length - 1;
        titleExactDupCount += groupRecords.length - 1;
        candidateGroups.push({
          id: `dg_title_${canonicalBase.id}`,
          canonicalId: canonicalBase.id,
          duplicateIds: mergedIds,
          reason: `Trùng khớp tiêu đề (>88%) chưa có DOI: "${canonicalBase.title}"`,
          rule: "title_fuzzy",
          userConfirmed: isUserConfirmed,
          createdAt: new Date().toISOString(),
        });
      }

      if (isUserConfirmed || groupRecords.length === 1) {
        // Đã được người dùng xác nhận gộp, hoặc nhóm đơn chiếc
        const canonical: CanonicalPaper = {
          ...canonicalBase,
          pipelineStage: "V1",
          allSources: Array.from(allSourcesSet),
          provenanceList: combinedProvenance,
          mergedRecordIds: mergedIds,
        };
        if (canonical.isContainer) containersCount++;
        canonicalList.push(canonical);
      } else {
        // Chưa được người dùng xác nhận gộp: GIỮ NGUYÊN các bản ghi trong canonical list,
        // gắn cờ potentialDuplicate để không tự ý xóa bỏ bản ghi khi chưa đối soát
        for (let idx = 0; idx < groupRecords.length; idx++) {
          const rec = groupRecords[idx];
          const isBase = idx === 0;
          const canonical: CanonicalPaper = {
            ...rec,
            pipelineStage: "V1",
            allSources: [rec.source],
            provenanceList: rec.provenanceList || [],
            mergedRecordIds: [],
            potentialDuplicate: !isBase,
            duplicateOfId: !isBase ? canonicalBase.id : undefined,
            duplicateReason: !isBase ? `Nghi vấn trùng tiêu đề (>88%) với "${canonicalBase.title}"` : undefined,
          };
          if (canonical.isContainer) containersCount++;
          canonicalList.push(canonical);
        }
      }
    }

    return {
      canonicalRecords: canonicalList,
      duplicateGroups,
      candidateGroups,
      stats: {
        rawCount,
        canonicalCount: canonicalList.length,
        exactDoiDuplicates: exactDoiDupCount,
        titleExactDuplicates: titleExactDupCount,
        candidateDuplicates: candidateDupCount,
        containersCount,
      },
    };
  }

  /**
   * Hoàn tác gộp bản ghi (Undo merge)
   */
  static unmergeGroup(
    canonicalId: string,
    canonicalRecords: CanonicalPaper[],
    rawRecords: PaperRecord[],
  ): CanonicalPaper[] {
    const targetIdx = canonicalRecords.findIndex((c) => c.id === canonicalId);
    if (targetIdx === -1) return canonicalRecords;

    const target = canonicalRecords[targetIdx];
    const unmergedRecords: CanonicalPaper[] = [];

    // Tìm lại các bản ghi gốc đã gộp
    for (const id of [target.id, ...target.mergedRecordIds]) {
      const raw = rawRecords.find((r) => r.id === id);
      if (raw) {
        unmergedRecords.push({
          ...raw,
          pipelineStage: "V1",
          allSources: [raw.source],
          provenanceList: raw.provenanceList || [],
          mergedRecordIds: [],
        });
      }
    }

    const updatedList = [...canonicalRecords];
    updatedList.splice(targetIdx, 1, ...unmergedRecords);
    return updatedList;
  }
}
