import fs from "fs";
import path from "path";
import { DataQualityL0 } from "../pipeline/dataQualityL0";
import { DedupL1 } from "../pipeline/dedupL1";
import { KeywordFilterL3 } from "../pipeline/keywordFilterL3";
import { MetadataFilterL2 } from "../pipeline/metadataFilterL2";
import {
  CanonicalRecord,
  Collection,
  FilterRun,
  KeywordFilterConfig,
  MetadataFilterConfig,
  NormalizedRecord,
  RetrievalEvent,
  SearchRun,
  SuspectedDuplicateGroup,
} from "../types";

export class CollectionStore {
  private static baseDir = path.join(process.cwd(), "data");
  private static collectionsDir = path.join(process.cwd(), "data", "collections");
  private static runsDir = path.join(process.cwd(), "data", "runs");
  private static recordsDir = path.join(process.cwd(), "data", "records");
  private static eventsDir = path.join(process.cwd(), "data", "events");
  private static canonicalDir = path.join(process.cwd(), "data", "canonical");
  private static suspectedDir = path.join(process.cwd(), "data", "suspected");
  private static filtersDir = path.join(process.cwd(), "data", "filters");

  // In-memory cache indexes
  private static collections: Map<string, Collection> = new Map();
  private static runs: Map<string, SearchRun> = new Map();
  private static records: Map<string, NormalizedRecord> = new Map(); // recordId -> record
  private static collectionRecordMap: Map<string, Set<string>> = new Map(); // collectionId -> Set<recordId>
  private static runRecordMap: Map<string, Set<string>> = new Map(); // searchRunId -> Set<recordId>
  private static events: Map<string, RetrievalEvent[]> = new Map(); // recordId -> events

  // L1 & L2 & L3 Store
  private static canonicalRecords: Map<string, CanonicalRecord[]> = new Map(); // collectionId -> CanonicalRecord[]
  private static suspectedDuplicates: Map<string, SuspectedDuplicateGroup[]> = new Map(); // collectionId -> groups
  private static filterRuns: Map<string, FilterRun[]> = new Map(); // collectionId -> FilterRun[]

  private static initialized = false;

  static init(): void {
    if (this.initialized) return;

    // Đảm bảo các thư mục tồn tại
    [
      this.baseDir,
      this.collectionsDir,
      this.runsDir,
      this.recordsDir,
      this.eventsDir,
      this.canonicalDir,
      this.suspectedDir,
      this.filtersDir,
    ].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    this.loadAllFromDisk();
    this.recoverInterruptedRuns();
    this.migrateLegacyProfilesIfAny();
    this.initialized = true;
  }

  private static atomicWriteJson(filePath: string, data: any): void {
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, serialized, "utf-8");
    fs.renameSync(tempPath, filePath);
  }

  private static loadAllFromDisk(): void {
    try {
      // 1. Collections
      const colFiles = fs.readdirSync(this.collectionsDir).filter((f) => f.endsWith(".json"));
      for (const f of colFiles) {
        try {
          const content = fs.readFileSync(path.join(this.collectionsDir, f), "utf-8");
          const col: Collection = JSON.parse(content);
          if (col && col.id) {
            this.collections.set(col.id, col);
            if (!this.collectionRecordMap.has(col.id)) {
              this.collectionRecordMap.set(col.id, new Set());
            }
          }
        } catch (e) {
          console.warn(`[CollectionStore] Lỗi đọc collection ${f}:`, e);
        }
      }

      // 2. Search runs
      const runFiles = fs.readdirSync(this.runsDir).filter((f) => f.endsWith(".json"));
      for (const f of runFiles) {
        try {
          const content = fs.readFileSync(path.join(this.runsDir, f), "utf-8");
          const run: SearchRun = JSON.parse(content);
          if (run && run.id) {
            this.runs.set(run.id, run);
            if (!this.runRecordMap.has(run.id)) {
              this.runRecordMap.set(run.id, new Set());
            }
          }
        } catch (e) {
          console.warn(`[CollectionStore] Lỗi đọc run ${f}:`, e);
        }
      }

      // 3. Raw / Normalized records
      const recFiles = fs.readdirSync(this.recordsDir).filter((f) => f.endsWith(".json"));
      for (const f of recFiles) {
        try {
          const content = fs.readFileSync(path.join(this.recordsDir, f), "utf-8");
          const rec: NormalizedRecord = JSON.parse(content);
          if (rec && rec.id) {
            this.records.set(rec.id, rec);
            if (rec.collectionId) {
              if (!this.collectionRecordMap.has(rec.collectionId)) {
                this.collectionRecordMap.set(rec.collectionId, new Set());
              }
              this.collectionRecordMap.get(rec.collectionId)!.add(rec.id);
            }
            if (rec.searchRunId) {
              if (!this.runRecordMap.has(rec.searchRunId)) {
                this.runRecordMap.set(rec.searchRunId, new Set());
              }
              this.runRecordMap.get(rec.searchRunId)!.add(rec.id);
            }
          }
        } catch (e) {
          console.warn(`[CollectionStore] Lỗi đọc record ${f}:`, e);
        }
      }

      // 4. Canonical records (L1)
      const canFiles = fs.readdirSync(this.canonicalDir).filter((f) => f.endsWith(".json"));
      for (const f of canFiles) {
        try {
          const collectionId = f.replace(/\.json$/, "");
          const content = fs.readFileSync(path.join(this.canonicalDir, f), "utf-8");
          const list: CanonicalRecord[] = JSON.parse(content);
          this.canonicalRecords.set(collectionId, list || []);
        } catch (e) {
          console.warn(`[CollectionStore] Lỗi đọc canonical ${f}:`, e);
        }
      }

      // 5. Suspected duplicate groups
      const susFiles = fs.readdirSync(this.suspectedDir).filter((f) => f.endsWith(".json"));
      for (const f of susFiles) {
        try {
          const collectionId = f.replace(/\.json$/, "");
          const content = fs.readFileSync(path.join(this.suspectedDir, f), "utf-8");
          const groups: SuspectedDuplicateGroup[] = JSON.parse(content);
          this.suspectedDuplicates.set(collectionId, groups || []);
        } catch (e) {
          console.warn(`[CollectionStore] Lỗi đọc suspected duplicates ${f}:`, e);
        }
      }

      // 6. Filter runs
      const filterFiles = fs.readdirSync(this.filtersDir).filter((f) => f.endsWith(".json"));
      for (const f of filterFiles) {
        try {
          const collectionId = f.replace(/\.json$/, "");
          const content = fs.readFileSync(path.join(this.filtersDir, f), "utf-8");
          const frList: FilterRun[] = JSON.parse(content);
          this.filterRuns.set(collectionId, frList || []);
        } catch (e) {
          console.warn(`[CollectionStore] Lỗi đọc filter runs ${f}:`, e);
        }
      }
    } catch (e: any) {
      console.warn(`[CollectionStore] Khởi tạo đĩa gặp cảnh báo:`, e.message);
    }
  }

  private static recoverInterruptedRuns(): void {
    for (const [id, run] of this.runs) {
      if (run.status === "running" || run.status === "queued") {
        run.status = "paused";
        run.errorLog.push(
          `[${new Date().toISOString()}] Server khởi động lại trong khi đang chạy. Đã tạm dừng an toàn tại checkpoint để bạn có thể Resume.`
        );
        this.saveRun(run);
      }
    }
  }

  private static migrateLegacyProfilesIfAny(): void {
    const snapshotsDir = path.join(this.baseDir, "snapshots");
    if (!fs.existsSync(snapshotsDir)) return;

    try {
      const snapFiles = fs.readdirSync(snapshotsDir).filter((f) => f.endsWith(".json"));
      for (const file of snapFiles) {
        const researchId = file.replace(/\.json$/, "");
        if (this.collections.has(researchId)) continue;

        try {
          const raw = fs.readFileSync(path.join(snapshotsDir, file), "utf-8");
          const data = JSON.parse(raw);
          const rawRecords = data.rawRecords || [];
          const canonical = data.canonicalRecords || [];
          const allPapers = [...rawRecords, ...canonical];

          if (allPapers.length > 0 || researchId.startsWith("preset_") || researchId.startsWith("profile_")) {
            const collection: Collection = {
              id: researchId,
              name: researchId.replace(/^profile_/, "Đề tài ").replace(/^preset_/, "Mẫu "),
              description: "Hồ sơ chuyển đổi từ phiên bản trước",
              notes: "Dữ liệu được lưu trữ tự động từ snapshot cũ.",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.saveCollection(collection);

            const runId = `migrated_run_${researchId}`;
            const run: SearchRun = {
              id: runId,
              collectionId: researchId,
              source: "Legacy Import",
              userQuery: "Legacy Snapshot Data",
              actualQuery: "Legacy Snapshot Data",
              filters: {},
              status: "completed",
              itemsReceived: allPapers.length,
              itemsSaved: allPapers.length,
              itemsError: 0,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              errorLog: [],
            };
            this.saveRun(run);

            const normalizedList: NormalizedRecord[] = allPapers.map((p: any, idx: number) => ({
              id: p.id || `migrated_${idx}`,
              collectionId: researchId,
              searchRunId: runId,
              title: p.title || "Untitled",
              authors: p.authors || "",
              year: String(p.year || ""),
              publicationDate: p.retrieval_date,
              abstract: p.abstract || p.snippet || "",
              doi: p.doi || "",
              venue: p.venue || "",
              source: p.source || "Legacy Import",
              sourceRecordId: p.id || "",
              landingPageUrl: p.url || "",
              openAccessPdfUrl: p.pdfUrl || "",
              retrievedAt: p.retrieval_date || new Date().toISOString(),
              rawPayload: p,
            }));
            this.saveBatchRecords(researchId, runId, normalizedList);

            // Tự động chạy L0-L1 ban đầu cho collection chuyển đổi
            this.runL0L1Pipeline(researchId);
          }
        } catch (err) {
          // Bỏ qua lỗi từng snapshot cũ
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  // ==========================================
  // COLLECTION OPERATIONS
  // ==========================================

  static saveCollection(collection: Collection): Collection {
    collection.updatedAt = new Date().toISOString();
    this.collections.set(collection.id, collection);
    if (!this.collectionRecordMap.has(collection.id)) {
      this.collectionRecordMap.set(collection.id, new Set());
    }
    const filePath = path.join(this.collectionsDir, `${collection.id}.json`);
    this.atomicWriteJson(filePath, collection);
    return collection;
  }

  static getCollection(id: string): Collection | undefined {
    return this.collections.get(id);
  }

  static getAllCollections(): Collection[] {
    return Array.from(this.collections.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static deleteCollection(id: string): boolean {
    if (!this.collections.has(id)) return false;
    this.collections.delete(id);
    const filePath = path.join(this.collectionsDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  }

  // ==========================================
  // SEARCH RUN OPERATIONS
  // ==========================================

  static saveRun(run: SearchRun): SearchRun {
    this.runs.set(run.id, run);
    if (!this.runRecordMap.has(run.id)) {
      this.runRecordMap.set(run.id, new Set());
    }
    const filePath = path.join(this.runsDir, `${run.id}.json`);
    this.atomicWriteJson(filePath, run);
    return run;
  }

  static getRun(id: string): SearchRun | undefined {
    return this.runs.get(id);
  }

  static getRunsByCollection(collectionId: string): SearchRun[] {
    return Array.from(this.runs.values())
      .filter((r) => r.collectionId === collectionId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  // ==========================================
  // RAW & NORMALIZED RECORD OPERATIONS
  // ==========================================

  static saveBatchRecords(
    collectionId: string,
    searchRunId: string,
    newRecords: NormalizedRecord[]
  ): { savedCount: number; duplicateCount: number } {
    let savedCount = 0;
    let duplicateCount = 0;

    for (const rec of newRecords) {
      rec.collectionId = collectionId;
      rec.searchRunId = searchRunId;

      const existingId = this.findExistingRecordId(collectionId, rec);
      const targetId = existingId || rec.id;
      rec.id = targetId;

      const event: RetrievalEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        recordId: targetId,
        collectionId,
        searchRunId,
        source: rec.source,
        retrievedAt: new Date().toISOString(),
        rawQuery: rec.rawPayload?.query || "",
        actualQuery: rec.rawPayload?.actualQuery || "",
        rawData: rec.rawPayload,
      };

      if (!this.events.has(targetId)) {
        this.events.set(targetId, []);
      }
      this.events.get(targetId)!.push(event);

      const evtFile = path.join(this.eventsDir, `${targetId}.json`);
      this.atomicWriteJson(evtFile, this.events.get(targetId)!);

      if (existingId) {
        const old = this.records.get(existingId)!;
        if (!old.abstract && rec.abstract) old.abstract = rec.abstract;
        if (!old.openAccessPdfUrl && rec.openAccessPdfUrl) old.openAccessPdfUrl = rec.openAccessPdfUrl;
        if (!old.venue && rec.venue) old.venue = rec.venue;
        if (!old.doi && rec.doi) old.doi = rec.doi;
        this.records.set(existingId, old);
        const recFile = path.join(this.recordsDir, `${existingId}.json`);
        this.atomicWriteJson(recFile, old);
        duplicateCount++;
      } else {
        this.records.set(targetId, rec);
        if (!this.collectionRecordMap.has(collectionId)) {
          this.collectionRecordMap.set(collectionId, new Set());
        }
        this.collectionRecordMap.get(collectionId)!.add(targetId);

        if (!this.runRecordMap.has(searchRunId)) {
          this.runRecordMap.set(searchRunId, new Set());
        }
        this.runRecordMap.get(searchRunId)!.add(targetId);

        const recFile = path.join(this.recordsDir, `${targetId}.json`);
        this.atomicWriteJson(recFile, rec);
        savedCount++;
      }
    }

    return { savedCount, duplicateCount };
  }

  private static findExistingRecordId(collectionId: string, rec: NormalizedRecord): string | null {
    const colIds = this.collectionRecordMap.get(collectionId);
    if (!colIds) return null;

    if (rec.doi) {
      const cleanDoi = rec.doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//i, "");
      for (const id of colIds) {
        const item = this.records.get(id);
        if (item && item.doi) {
          const itemDoi = item.doi.trim().toLowerCase().replace(/^https?:\/\/doi\.org\//i, "");
          if (itemDoi === cleanDoi) return id;
        }
      }
    }

    if (colIds.has(rec.id)) return rec.id;
    return null;
  }

  static getRecordsByCollection(collectionId: string): NormalizedRecord[] {
    const ids = this.collectionRecordMap.get(collectionId);
    if (!ids) return [];
    const list: NormalizedRecord[] = [];
    for (const id of ids) {
      const rec = this.records.get(id);
      if (rec) list.push(rec);
    }
    return list;
  }

  static getRecord(recordId: string): NormalizedRecord | undefined {
    return this.records.get(recordId);
  }

  // ==========================================
  // PIPELINE L0 - L1 (CANONICAL & DEDUP)
  // ==========================================

  static getCanonicalRecords(collectionId: string): CanonicalRecord[] {
    if (!this.canonicalRecords.has(collectionId)) {
      this.runL0L1Pipeline(collectionId);
    }
    return this.canonicalRecords.get(collectionId) || [];
  }

  static getSuspectedDuplicates(collectionId: string): SuspectedDuplicateGroup[] {
    return this.suspectedDuplicates.get(collectionId) || [];
  }

  /**
   * Chạy pipeline L0 (Chuẩn hóa) & L1 (Gộp trùng chắc chắn + Phát hiện trùng nghi ngờ)
   */
  static runL0L1Pipeline(collectionId: string): {
    totalRaw: number;
    totalCanonical: number;
    exactDuplicates: number;
    suspectedGroupsCount: number;
  } {
    const rawList = this.getRecordsByCollection(collectionId);
    const { canonicalRecords, exactDuplicateCount } = DedupL1.processExactDeduplication(rawList);
    const suspectedGroups = DedupL1.findSuspectedDuplicates(canonicalRecords, collectionId);

    this.canonicalRecords.set(collectionId, canonicalRecords);
    this.suspectedDuplicates.set(collectionId, suspectedGroups);

    // Lưu snapshot ra đĩa
    const canPath = path.join(this.canonicalDir, `${collectionId}.json`);
    this.atomicWriteJson(canPath, canonicalRecords);

    const susPath = path.join(this.suspectedDir, `${collectionId}.json`);
    this.atomicWriteJson(susPath, suspectedGroups);

    return {
      totalRaw: rawList.length,
      totalCanonical: canonicalRecords.length,
      exactDuplicates: exactDuplicateCount,
      suspectedGroupsCount: suspectedGroups.length,
    };
  }

  /**
   * Người dùng xác nhận Merge hoặc Keep separate cho nhóm trùng nghi ngờ
   */
  static resolveSuspectedDuplicate(
    collectionId: string,
    groupId: string,
    resolution: "merged" | "separated",
    targetCanonicalId?: string
  ): boolean {
    const groups = this.suspectedDuplicates.get(collectionId);
    if (!groups) return false;

    const group = groups.find((g) => g.id === groupId);
    if (!group) return false;

    group.resolution = resolution;
    group.resolvedAt = new Date().toISOString();

    if (resolution === "merged") {
      const canonicals = this.getCanonicalRecords(collectionId);
      const keeperId = targetCanonicalId || group.recordIds[0];
      const mergedOutId = group.recordIds.find((id) => id !== keeperId);

      const keeper = canonicals.find((c) => c.id === keeperId);
      const absorbed = canonicals.find((c) => c.id === mergedOutId);

      if (keeper && absorbed) {
        keeper.mergedRecordIds = Array.from(
          new Set([...keeper.mergedRecordIds, ...absorbed.mergedRecordIds, absorbed.id])
        );
        keeper.sourcesList = Array.from(new Set([...keeper.sourcesList, ...absorbed.sourcesList]));
        if (!keeper.abstract && absorbed.abstract) keeper.abstract = absorbed.abstract;
        if (!keeper.openAccessPdfUrl && absorbed.openAccessPdfUrl) keeper.openAccessPdfUrl = absorbed.openAccessPdfUrl;

        // Xóa bản ghi absorbed khỏi canonical list
        const filteredCanonicals = canonicals.filter((c) => c.id !== mergedOutId);
        this.canonicalRecords.set(collectionId, filteredCanonicals);
        const canPath = path.join(this.canonicalDir, `${collectionId}.json`);
        this.atomicWriteJson(canPath, filteredCanonicals);
      }
    }

    const susPath = path.join(this.suspectedDir, `${collectionId}.json`);
    this.atomicWriteJson(susPath, groups);
    return true;
  }

  // ==========================================
  // PIPELINE L2 (METADATA FILTER)
  // ==========================================

  static runL2Pipeline(collectionId: string, config: MetadataFilterConfig): FilterRun {
    const canonicals = this.getCanonicalRecords(collectionId);
    const { results, counts } = MetadataFilterL2.evaluateBatch(canonicals, config);

    const filterRunId = `filter_l2_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const recordResults: FilterRun["recordResults"] = {};

    for (const [id, res] of Object.entries(results)) {
      recordResults[id] = {
        metadataStatus: res.overallStatus,
        metadataReasons: res.reasons,
      };
    }

    const run: FilterRun = {
      id: filterRunId,
      collectionId,
      version: `l2_v${Date.now()}`,
      timestamp: new Date().toISOString(),
      filterType: "L2_metadata",
      metadataConfig: config,
      totalEvaluated: canonicals.length,
      counts: {
        pass: counts.pass,
        fail: counts.fail,
        unknown: counts.unknown,
      },
      recordResults,
    };

    this.saveFilterRun(run);
    // Lưu lại canonical list kèm kết quả mới nhất
    const canPath = path.join(this.canonicalDir, `${collectionId}.json`);
    this.atomicWriteJson(canPath, canonicals);

    return run;
  }

  // ==========================================
  // PIPELINE L3 (KEYWORD FILTER)
  // ==========================================

  static runL3Pipeline(collectionId: string, config: KeywordFilterConfig): FilterRun {
    const canonicals = this.getCanonicalRecords(collectionId);
    const { results, counts } = KeywordFilterL3.evaluateBatch(canonicals, config);

    const filterRunId = `filter_l3_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const recordResults: FilterRun["recordResults"] = {};

    for (const [id, res] of Object.entries(results)) {
      recordResults[id] = {
        keywordStatus: res.status,
        hasExclusionHit: res.hasExclusionHit,
        matchedTerms: res.matchedTerms,
      };
    }

    const run: FilterRun = {
      id: filterRunId,
      collectionId,
      version: config.version || `l3_v${Date.now()}`,
      timestamp: new Date().toISOString(),
      filterType: "L3_keyword",
      keywordConfig: config,
      totalEvaluated: canonicals.length,
      counts: {
        keywordMatch: counts.match,
        keywordNoMatch: counts.noMatch,
        keywordInsufficient: counts.insufficient,
        exclusionHit: counts.exclusionHit,
      },
      recordResults,
    };

    this.saveFilterRun(run);
    const canPath = path.join(this.canonicalDir, `${collectionId}.json`);
    this.atomicWriteJson(canPath, canonicals);

    return run;
  }

  static saveFilterRun(run: FilterRun): FilterRun {
    if (!this.filterRuns.has(run.collectionId)) {
      this.filterRuns.set(run.collectionId, []);
    }
    const list = this.filterRuns.get(run.collectionId)!;
    list.unshift(run);

    const fPath = path.join(this.filtersDir, `${run.collectionId}.json`);
    this.atomicWriteJson(fPath, list);
    return run;
  }

  static getFilterRuns(collectionId: string): FilterRun[] {
    return this.filterRuns.get(collectionId) || [];
  }
}

CollectionStore.init();
