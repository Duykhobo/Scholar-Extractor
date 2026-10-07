import fs from "fs";
import path from "path";
import { UniversalFileImporter } from "../adapters/fileimport";
import {
  AuditEvent,
  CanonicalRecord,
  Criterion,
  DuplicateCandidate,
  EvidenceEntry,
  FullTextAttempt,
  Member,
  Project,
  ProtocolVersion,
  QueryVersion,
  ScreeningDecision,
  SearchRun,
  SnowballingLink,
} from "../types";

export class ProjectStore {
  private static baseDir = path.resolve(__dirname, "../../data/projects");
  private static isInitialized = false;

  private static projects = new Map<string, Project>();
  private static protocols = new Map<string, ProtocolVersion[]>(); // projectId -> versions
  private static queries = new Map<string, QueryVersion[]>(); // projectId -> queries
  private static records = new Map<string, Map<string, CanonicalRecord>>(); // projectId -> recordId -> record
  private static duplicates = new Map<string, DuplicateCandidate[]>(); // projectId -> duplicates
  private static decisions = new Map<string, Map<string, ScreeningDecision[]>>(); // projectId -> recordId -> decisions
  private static fulltext = new Map<string, Map<string, FullTextAttempt>>(); // projectId -> recordId -> attempt
  private static evidence = new Map<string, Map<string, EvidenceEntry>>(); // projectId -> recordId -> entry
  private static snowballing = new Map<string, SnowballingLink[]>(); // projectId -> links
  private static auditLogs = new Map<string, AuditEvent[]>(); // projectId -> logs
  private static runs = new Map<string, SearchRun[]>(); // projectId -> runs

  static init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.ensureDirs();
    this.loadFromDisk();
    this.ensureDefaultPresets();
  }

  private static ensureDirs(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private static getProjectDir(projectId: string): string {
    const dir = path.join(this.baseDir, projectId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // ==========================================
  // DISK PERSISTENCE & LOADING
  // ==========================================
  private static loadFromDisk(): void {
    if (!fs.existsSync(this.baseDir)) return;
    const projectDirs = fs.readdirSync(this.baseDir);

    for (const pDir of projectDirs) {
      const fullPath = path.join(this.baseDir, pDir);
      if (!fs.statSync(fullPath).isDirectory()) continue;

      const projectFile = path.join(fullPath, "project.json");
      if (fs.existsSync(projectFile)) {
        try {
          const p: Project = JSON.parse(fs.readFileSync(projectFile, "utf-8"));
          this.projects.set(p.id, p);

          // Load other entities
          this.loadProjectEntities(p.id);
        } catch (err) {
          console.warn(`[ProjectStore] Lỗi đọc project ${pDir}:`, err);
        }
      }
    }
  }

  private static loadProjectEntities(projectId: string): void {
    const pDir = this.getProjectDir(projectId);

    // Protocols
    const protoFile = path.join(pDir, "protocols.json");
    if (fs.existsSync(protoFile)) {
      this.protocols.set(projectId, JSON.parse(fs.readFileSync(protoFile, "utf-8")));
    }

    // Queries
    const queryFile = path.join(pDir, "queries.json");
    if (fs.existsSync(queryFile)) {
      this.queries.set(projectId, JSON.parse(fs.readFileSync(queryFile, "utf-8")));
    }

    // Runs
    const runsFile = path.join(pDir, "runs.json");
    if (fs.existsSync(runsFile)) {
      this.runs.set(projectId, JSON.parse(fs.readFileSync(runsFile, "utf-8")));
    }

    // Records
    const recFile = path.join(pDir, "records.json");
    if (fs.existsSync(recFile)) {
      const list: CanonicalRecord[] = JSON.parse(fs.readFileSync(recFile, "utf-8"));
      const map = new Map<string, CanonicalRecord>();
      list.forEach((r) => map.set(r.id, r));
      this.records.set(projectId, map);
    }

    // Duplicates
    const dupFile = path.join(pDir, "duplicates.json");
    if (fs.existsSync(dupFile)) {
      this.duplicates.set(projectId, JSON.parse(fs.readFileSync(dupFile, "utf-8")));
    }

    // Decisions
    const decFile = path.join(pDir, "decisions.json");
    if (fs.existsSync(decFile)) {
      const list: ScreeningDecision[] = JSON.parse(fs.readFileSync(decFile, "utf-8"));
      const map = new Map<string, ScreeningDecision[]>();
      list.forEach((d) => {
        if (!map.has(d.recordId)) map.set(d.recordId, []);
        map.get(d.recordId)!.push(d);
      });
      this.decisions.set(projectId, map);
    }

    // Fulltext
    const ftFile = path.join(pDir, "fulltext.json");
    if (fs.existsSync(ftFile)) {
      const list: FullTextAttempt[] = JSON.parse(fs.readFileSync(ftFile, "utf-8"));
      const map = new Map<string, FullTextAttempt>();
      list.forEach((f) => map.set(f.recordId, f));
      this.fulltext.set(projectId, map);
    }

    // Evidence
    const evFile = path.join(pDir, "evidence.json");
    if (fs.existsSync(evFile)) {
      const list: EvidenceEntry[] = JSON.parse(fs.readFileSync(evFile, "utf-8"));
      const map = new Map<string, EvidenceEntry>();
      list.forEach((e) => map.set(e.recordId, e));
      this.evidence.set(projectId, map);
    }

    // Snowballing
    const snowFile = path.join(pDir, "snowballing.json");
    if (fs.existsSync(snowFile)) {
      this.snowballing.set(projectId, JSON.parse(fs.readFileSync(snowFile, "utf-8")));
    }

    // Audit logs
    const auditFile = path.join(pDir, "audit.json");
    if (fs.existsSync(auditFile)) {
      this.auditLogs.set(projectId, JSON.parse(fs.readFileSync(auditFile, "utf-8")));
    }
  }

  private static atomicWrite(filePath: string, data: any): void {
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      const tmp = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      fs.writeFileSync(tmp, jsonStr, "utf-8");
      try {
        fs.renameSync(tmp, filePath);
      } catch {
        fs.copyFileSync(tmp, filePath);
        try {
          fs.unlinkSync(tmp);
        } catch {}
      }
    } catch {
      fs.writeFileSync(filePath, jsonStr, "utf-8");
    }
  }

  // ==========================================
  // PROJECT CRUD
  // ==========================================
  static getAllProjects(): Project[] {
    this.init();
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  static getProject(id: string): Project | undefined {
    this.init();
    return this.projects.get(id);
  }

  static saveProject(project: Project): Project {
    this.init();
    project.updatedAt = new Date().toISOString();
    this.projects.set(project.id, project);

    const pDir = this.getProjectDir(project.id);
    this.atomicWrite(path.join(pDir, "project.json"), project);

    this.logAudit(project.id, "PROJECT_SAVE", { name: project.name });
    return project;
  }

  static deleteProject(id: string): boolean {
    this.init();
    this.projects.delete(id);
    this.protocols.delete(id);
    this.queries.delete(id);
    this.records.delete(id);
    this.duplicates.delete(id);
    this.decisions.delete(id);
    this.fulltext.delete(id);
    this.evidence.delete(id);
    this.snowballing.delete(id);
    this.auditLogs.delete(id);
    this.runs.delete(id);

    const pDir = path.join(this.baseDir, id);
    if (fs.existsSync(pDir)) {
      fs.rmSync(pDir, { recursive: true, force: true });
    }
    return true;
  }

  // ==========================================
  // PROTOCOL & CRITERIA VERSIONING
  // ==========================================
  static getProtocols(projectId: string): ProtocolVersion[] {
    this.init();
    return this.protocols.get(projectId) || [];
  }

  static getActiveProtocol(projectId: string): ProtocolVersion | undefined {
    const project = this.getProject(projectId);
    if (!project) return undefined;
    const protos = this.getProtocols(projectId);
    return protos.find((p) => p.version === project.activeProtocolVersion) || protos[0];
  }

  static saveProtocolVersion(
    projectId: string,
    protocol: ProtocolVersion,
    reason?: string,
  ): { protocol: ProtocolVersion; affectedDecisionsCount: number } {
    this.init();
    const list = this.getProtocols(projectId);
    const existingIndex = list.findIndex((p) => p.version === protocol.version);

    if (existingIndex >= 0) {
      list[existingIndex] = protocol;
    } else {
      protocol.reasonForChange = reason || "Cập nhật protocol nghiên cứu";
      protocol.createdAt = new Date().toISOString();
      list.push(protocol);
    }

    this.protocols.set(projectId, list);
    const pDir = this.getProjectDir(projectId);
    this.atomicWrite(path.join(pDir, "protocols.json"), list);

    // Update active version on project
    const project = this.getProject(projectId);
    if (project) {
      project.activeProtocolVersion = protocol.version;
      this.saveProject(project);
    }

    // Flag existing screening decisions as OUTDATED if criteria changed
    let affectedDecisionsCount = 0;
    const projectDecisions = this.decisions.get(projectId);
    if (projectDecisions) {
      for (const [recordId, decList] of projectDecisions.entries()) {
        for (const dec of decList) {
          if (dec.protocolVersion !== protocol.version) {
            dec.isOutdated = true;
            affectedDecisionsCount++;
          }
        }
      }
      this.saveDecisionsToDisk(projectId);
    }

    this.logAudit(projectId, "PROTOCOL_CHANGE", {
      version: protocol.version,
      reason,
      affectedDecisionsCount,
    });

    return { protocol, affectedDecisionsCount };
  }

  static saveProtocol(
    projectId: string,
    protocol: ProtocolVersion,
    reason?: string,
  ): { protocol: ProtocolVersion; affectedDecisionsCount: number } {
    return this.saveProtocolVersion(projectId, protocol, reason);
  }

  // ==========================================
  // SEARCH WORKSPACE & QUERY VERSIONS
  // ==========================================
  static getQueries(projectId: string): QueryVersion[] {
    this.init();
    return this.queries.get(projectId) || [];
  }

  static saveQuery(projectId: string, query: QueryVersion): QueryVersion {
    this.init();
    const list = this.getQueries(projectId);
    const idx = list.findIndex((q) => q.id === query.id || q.versionTag === query.versionTag);
    if (idx >= 0) {
      list[idx] = query;
    } else {
      list.push(query);
    }
    this.queries.set(projectId, list);
    this.atomicWrite(path.join(this.getProjectDir(projectId), "queries.json"), list);
    return query;
  }

  static getSearchRuns(projectId: string): SearchRun[] {
    this.init();
    return this.runs.get(projectId) || [];
  }

  static saveSearchRun(projectId: string, run: SearchRun): SearchRun {
    this.init();
    const list = this.getSearchRuns(projectId);
    const idx = list.findIndex((r) => r.id === run.id);
    if (idx >= 0) list[idx] = run;
    else list.push(run);
    this.runs.set(projectId, list);
    this.atomicWrite(path.join(this.getProjectDir(projectId), "runs.json"), list);
    return run;
  }

  // ==========================================
  // CANONICAL & OCCURRENCE RECORDS
  // ==========================================
  static getRecords(projectId: string): CanonicalRecord[] {
    this.init();
    const map = this.records.get(projectId);
    return map ? Array.from(map.values()) : [];
  }

  static getRecord(projectId: string, recordId: string): CanonicalRecord | undefined {
    this.init();
    return this.records.get(projectId)?.get(recordId);
  }

  static saveRecords(projectId: string, records: CanonicalRecord[]): void {
    this.init();
    if (!this.records.has(projectId)) {
      this.records.set(projectId, new Map());
    }
    const map = this.records.get(projectId)!;
    records.forEach((r) => map.set(r.id, r));
    this.atomicWrite(path.join(this.getProjectDir(projectId), "records.json"), Array.from(map.values()));
  }

  // ==========================================
  // DEDUPLICATION
  // ==========================================
  static getDuplicates(projectId: string): DuplicateCandidate[] {
    this.init();
    return this.duplicates.get(projectId) || [];
  }

  static getDuplicateCandidates(projectId: string): DuplicateCandidate[] {
    return this.getDuplicates(projectId);
  }

  static saveDuplicates(projectId: string, dups: DuplicateCandidate[]): void {
    this.init();
    this.duplicates.set(projectId, dups);
    this.atomicWrite(path.join(this.getProjectDir(projectId), "duplicates.json"), dups);
  }

  static resolveDuplicate(
    projectId: string,
    candidateId: string,
    resolution: "merged" | "separated",
    resolvedBy?: string,
  ): boolean {
    const dups = this.getDuplicates(projectId);
    const target = dups.find((d) => d.id === candidateId);
    if (!target) return false;

    target.status = resolution;
    target.resolvedBy = resolvedBy || "User";
    target.resolvedAt = new Date().toISOString();

    if (resolution === "merged") {
      // Merge record B into record A
      const recA = this.getRecord(projectId, target.recordIdA);
      const recB = this.getRecord(projectId, target.recordIdB);
      if (recA && recB) {
        if (!recA.mergedRecordIds) recA.mergedRecordIds = [recA.id];
        if (!recA.mergedRecordIds.includes(recB.id)) {
          recA.mergedRecordIds.push(recB.id);
        }
        if (!recA.sourcesList) recA.sourcesList = [recA.source];
        if (!recA.sourcesList.includes(recB.source)) {
          recA.sourcesList.push(recB.source);
        }
        this.saveRecords(projectId, [recA]);
      }
    }

    this.saveDuplicates(projectId, dups);
    this.logAudit(projectId, "DUPLICATE_RESOLVE", { candidateId, resolution });
    return true;
  }

  // ==========================================
  // SCREENING DECISIONS (V1 & V2)
  // ==========================================
  static getAllDecisions(projectId: string): Map<string, ScreeningDecision[]> {
    this.init();
    return this.decisions.get(projectId) || new Map();
  }

  static getDecisions(projectId: string, recordId?: string): ScreeningDecision[] {
    this.init();
    const map = this.decisions.get(projectId);
    if (!map) return [];
    if (recordId) return map.get(recordId) || [];
    const all: ScreeningDecision[] = [];
    for (const list of map.values()) all.push(...list);
    return all;
  }

  static saveDecision(projectId: string, decision: ScreeningDecision): ScreeningDecision {
    this.init();
    if (!this.decisions.has(projectId)) {
      this.decisions.set(projectId, new Map());
    }
    const map = this.decisions.get(projectId)!;
    if (!map.has(decision.recordId)) {
      map.set(decision.recordId, []);
    }
    const list = map.get(decision.recordId)!;
    const existingIdx = list.findIndex(
      (d) => d.stage === decision.stage && d.protocolVersion === decision.protocolVersion,
    );

    decision.decidedAt = new Date().toISOString();
    decision.isOutdated = false;

    if (existingIdx >= 0) {
      list[existingIdx] = decision;
    } else {
      list.push(decision);
    }

    this.saveDecisionsToDisk(projectId);
    this.logAudit(projectId, "SCREENING_DECISION", {
      recordId: decision.recordId,
      stage: decision.stage,
      decision: decision.decision,
      reason: decision.primaryReason,
    });
    return decision;
  }

  private static saveDecisionsToDisk(projectId: string): void {
    const all = this.getDecisions(projectId);
    this.atomicWrite(path.join(this.getProjectDir(projectId), "decisions.json"), all);
  }

  // ==========================================
  // FULL-TEXT ATTEMPTS & ELIGIBILITY
  // ==========================================
  static getFullTextAttempts(projectId: string): FullTextAttempt[] {
    this.init();
    const map = this.fulltext.get(projectId);
    return map ? Array.from(map.values()) : [];
  }

  static getFullTextAttempt(projectId: string, recordId: string): FullTextAttempt | undefined {
    this.init();
    return this.fulltext.get(projectId)?.get(recordId);
  }

  static saveFullTextAttempt(projectId: string, attempt: FullTextAttempt): FullTextAttempt {
    this.init();
    if (!this.fulltext.has(projectId)) {
      this.fulltext.set(projectId, new Map());
    }
    attempt.attemptedAt = new Date().toISOString();
    this.fulltext.get(projectId)!.set(attempt.recordId, attempt);
    const all = Array.from(this.fulltext.get(projectId)!.values());
    this.atomicWrite(path.join(this.getProjectDir(projectId), "fulltext.json"), all);
    return attempt;
  }

  // ==========================================
  // EVIDENCE TABLE (8 CỘT)
  // ==========================================
  static getEvidenceEntries(projectId: string): EvidenceEntry[] {
    this.init();
    const map = this.evidence.get(projectId);
    return map ? Array.from(map.values()) : [];
  }

  static getEvidenceEntry(projectId: string, recordId: string): EvidenceEntry | undefined {
    this.init();
    return this.evidence.get(projectId)?.get(recordId);
  }

  static saveEvidenceEntry(projectId: string, entry: EvidenceEntry): EvidenceEntry {
    this.init();
    if (!this.evidence.has(projectId)) {
      this.evidence.set(projectId, new Map());
    }
    entry.enteredAt = new Date().toISOString();
    this.evidence.get(projectId)!.set(entry.recordId, entry);
    const all = Array.from(this.evidence.get(projectId)!.values());
    this.atomicWrite(path.join(this.getProjectDir(projectId), "evidence.json"), all);
    return entry;
  }

  // ==========================================
  // SNOWBALLING
  // ==========================================
  static getSnowballingLinks(projectId: string): SnowballingLink[] {
    this.init();
    return this.snowballing.get(projectId) || [];
  }

  static saveSnowballingLink(projectId: string, link: SnowballingLink): SnowballingLink {
    this.init();
    const list = this.getSnowballingLinks(projectId);
    list.push(link);
    this.snowballing.set(projectId, list);
    this.atomicWrite(path.join(this.getProjectDir(projectId), "snowballing.json"), list);
    return link;
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  static getAuditLogs(projectId: string): AuditEvent[] {
    this.init();
    return this.auditLogs.get(projectId) || [];
  }

  static logAudit(projectId: string, eventType: string, details: Record<string, any>, userId?: string): void {
    if (!this.auditLogs.has(projectId)) {
      this.auditLogs.set(projectId, []);
    }
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      timestamp: new Date().toISOString(),
      eventType,
      userId: userId || "Current User",
      details,
    };
    const list = this.auditLogs.get(projectId)!;
    list.push(event);
    this.atomicWrite(path.join(this.getProjectDir(projectId), "audit.json"), list);
  }

  // ==========================================
  // DEFAULT PRESETS (SWT302 LÂM, AAC VISUALLY IMPAIRED, BLANK)
  // ==========================================
  private static ensureDefaultPresets(): void {
    // 1. Preset SWT302 REST API Testing (Lâm / Nhóm 1 - SaoCungDuoc)
    if (!this.projects.has("sample_swt302_lam")) {
      this.createSwt302LamPreset();
    }

    // 2. Preset Visually Impaired AAC
    if (!this.projects.has("preset_visually_impaired_aac")) {
      this.createVisuallyImpairedPreset();
    }
  }

  private static createSwt302LamPreset(): void {
    const projectId = "sample_swt302_lam";
    const members: Member[] = [
      {
        id: "mem_lam",
        name: "Lâm",
        role: "Reviewer chính (ACM Digital Library)",
        assignedSources: ["ACM Digital Library"],
        isReviewer: true,
        isExtractor: true,
        plannedAuthorOrder: 1,
        confirmedFinalDraft: true,
      },
      {
        id: "mem_duy",
        name: "K.Duy",
        role: "Reviewer (Snowballing & Đối soát)",
        assignedSources: ["Snowballing", "IEEE Xplore"],
        isReviewer: true,
        isExtractor: false,
        plannedAuthorOrder: 2,
        confirmedFinalDraft: true,
      },
    ];

    const criteria: Criterion[] = [
      {
        id: "crit_ic_l",
        code: "IC-L",
        name: "Ngôn ngữ tiếng Anh",
        description: "Paper viết bằng tiếng Anh, có bằng chứng ngôn ngữ riêng.",
        kind: "inclusion",
        stage: "both",
        evaluationMethod: "suggested",
        isActive: true,
      },
      {
        id: "crit_ic_t",
        code: "IC-T",
        name: "Conference hoặc Journal khoa học",
        description: "Đăng trên conference hoặc journal khoa học (không phải blog, thesis, dissertation).",
        kind: "inclusion",
        stage: "both",
        evaluationMethod: "auto",
        isActive: true,
      },
      {
        id: "crit_ic_e",
        code: "IC-E",
        name: "Kết quả thực nghiệm định lượng",
        description: "Có ít nhất 1 con số kết quả thực nghiệm trong Table hoặc Figure.",
        kind: "inclusion",
        stage: "v2",
        evidenceRequirements: "Table/Figure số liệu thực nghiệm",
        evaluationMethod: "manual",
        isActive: true,
      },
      {
        id: "crit_ic_y",
        code: "IC-Y",
        name: "Năm xuất bản 2020 trở đi",
        description: "Xuất bản từ năm 2020 đến 2026.",
        kind: "inclusion",
        stage: "both",
        evaluationMethod: "auto",
        isActive: true,
      },
      {
        id: "crit_ic_p",
        code: "IC-P",
        name: "Phạm vi REST API Testing",
        description:
          "Kiểm thử ở mức request cho dịch vụ HTTP (OpenAPI, Swagger, RAML hoặc yêu cầu NL). GraphQL riêng lẻ không đạt.",
        kind: "inclusion",
        stage: "v1",
        evaluationMethod: "suggested",
        isActive: true,
      },
      {
        id: "crit_ic_i",
        code: "IC-I",
        name: "Kỹ thuật kiểm thử EP / BVA",
        description: "Áp dụng Phân hoạch tương đương (EP) và/hoặc Phân tích giá trị biên (BVA) cho tham số request.",
        kind: "inclusion",
        stage: "both",
        evaluationMethod: "suggested",
        isActive: true,
      },
      {
        id: "crit_ec_d",
        code: "EC-D",
        name: "Trùng lặp (Duplicate)",
        description: "Trùng lặp với paper đã có trong hệ thống.",
        kind: "exclusion",
        stage: "both",
        evaluationMethod: "auto",
        isActive: true,
      },
      {
        id: "crit_ec_a",
        code: "EC-A",
        name: "Không thể tải toàn văn",
        description: "Không thể truy cập full-text sau khi tìm kiếm mọi nguồn mở/tác giả hợp lệ.",
        kind: "exclusion",
        stage: "v2",
        evaluationMethod: "manual",
        isActive: true,
      },
      {
        id: "crit_ec_s",
        code: "EC-S",
        name: "Dưới 4 trang (< 4 trang)",
        description: "Số trang toàn văn dưới 4 trang (abstract ngắn, poster, workshop summary 2-3 trang).",
        kind: "exclusion",
        stage: "v2",
        evaluationMethod: "auto",
        isActive: true,
      },
      {
        id: "crit_ec_n",
        code: "EC-N",
        name: "Không có thực nghiệm",
        description: "Vision paper, tutorial, position paper hoặc tập kỷ yếu (container) không phải bài thực nghiệm.",
        kind: "exclusion",
        stage: "both",
        evaluationMethod: "suggested",
        isActive: true,
      },
      {
        id: "crit_ec_o",
        code: "EC-O",
        name: "Ngoài phạm vi (Out of Scope)",
        description:
          "UI/E2E testing (Selenium), unit testing nội bộ (JUnit), fault localization thuần, hoặc phi phần mềm.",
        kind: "exclusion",
        stage: "both",
        evaluationMethod: "suggested",
        isActive: true,
      },
    ];

    const project: Project = {
      id: projectId,
      name: "Tự động sinh ca kiểm thử REST API áp dụng EP & BVA",
      rqCode: "FA26-EXT-12",
      teamName: "Nhóm 1 — SaoCungDuoc",
      rq: "Kỹ thuật phân hoạch tương đương (EP) và phân tích giá trị biên (BVA) được kết hợp với các mô hình/công cụ sinh ca kiểm thử tự động cho REST API như thế nào nhằm tối ưu hóa tỉ lệ phát hiện lỗi và độ bao phủ?",
      h0: "Không có sự khác biệt có ý nghĩa thống kê về hiệu quả phát hiện lỗi giữa phương pháp có áp dụng EP/BVA và phương pháp kiểm thử ngẫu nhiên thuần túy.",
      h1: "Áp dụng EP/BVA kết hợp sinh test tự động giúp tăng đáng kể tỷ lệ phát hiện lỗi và độ bao phủ so với kiểm thử ngẫu nhiên.",
      framework: "PICO",
      pico: {
        population: "RESTful APIs HTTP, microservices, OpenAPI/Swagger specifications",
        intervention: "Kỹ thuật sinh test tự động áp dụng Phân hoạch tương đương (EP) và Phân tích giá trị biên (BVA)",
        comparison: "Random testing, baseline fuzzing, kiểm thử thủ công không áp dụng EP/BVA",
        outcome:
          "Độ bao phủ mã nguồn (Code coverage), số lượng và phân loại lỗi phát hiện (Fault taxonomy, bugs found)",
      },
      members,
      searchPeriod: {
        startDate: "2026-10-01",
        endDate: "2026-10-05T23:59:00",
        timezone: "Asia/Ho_Chi_Minh (UTC+7)",
      },
      reportLanguage: "vi",
      activeProtocolVersion: "v1.0",
      activeStage: "VALIDATION",
      createdAt: "2026-10-01T08:00:00Z",
      updatedAt: "2026-10-05T23:59:00Z",
    };

    const protocol: ProtocolVersion = {
      version: "v1.0",
      projectId,
      title: "Protocol nghiên cứu tổng quan có hệ thống: REST API Testing EP/BVA",
      description: "Quy trình SLR chuẩn PRISMA 2020 cho đề tài SWT302 FA26-EXT-12",
      createdAt: "2026-10-01T08:00:00Z",
      criteria,
      sourcePolicies: {
        "ACM Digital Library": { role: "primary", notes: "Nguồn chính" },
        "IEEE Xplore": { role: "primary", notes: "Nguồn chính" },
        "Google Scholar": { role: "supplementary", notes: "Nguồn bài ứng viên bổ trợ" },
      },
    };

    this.saveProject(project);
    this.saveProtocolVersion(projectId, protocol);

    // Save Queries V1, V2, V3
    this.saveQuery(projectId, {
      id: "q_v1",
      projectId,
      versionTag: "V1",
      rawQuery:
        '("REST API testing" OR "natural language requirement") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")',
      targetDatabase: "ACM Digital Library",
      searchFields: "AllField",
      expansionRuleApplied: "<20 kết quả: cần nới lỏng ở V2",
      createdAt: "2026-10-04T08:00:00Z",
    });

    this.saveQuery(projectId, {
      id: "q_v2",
      projectId,
      versionTag: "V2",
      rawQuery:
        '("REST API testing" OR "natural language requirement") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing")',
      targetDatabase: "ACM Digital Library",
      searchFields: "AllField",
      expansionRuleApplied: "Bỏ khối O để nới lỏng query",
      createdAt: "2026-10-04T08:30:00Z",
    });

    this.saveQuery(projectId, {
      id: "q_v3",
      projectId,
      versionTag: "V3",
      rawQuery:
        '("REST API" OR "RESTful API" OR "REST API testing") AND ("equivalence partitioning" OR "equivalence class partitioning" OR "boundary value analysis" OR "boundary value testing" OR "boundary testing") AND ("fault detection" OR "faults found" OR "bug detection" OR "bugs found" OR defects OR failures OR "mutation testing" OR "mutation score" OR "mutant detection")',
      targetDatabase: "ACM Digital Library",
      searchFields: "AllField",
      expansionRuleApplied: "Mở rộng từ đồng nghĩa đa dạng (chuỗi chính)",
      createdAt: "2026-10-04T09:00:00Z",
    });

    // Seed 73 records from sample files if available
    this.seedRecordsFromSampleFiles(projectId);
  }

  private static seedRecordsFromSampleFiles(projectId: string): void {
    const sampleDirCandidates = [
      path.resolve(__dirname, "../../../lam/SLR"),
      path.resolve(process.cwd(), "../lam/SLR"),
      path.resolve(process.cwd(), "lam/SLR"),
      path.resolve(__dirname, "../../lam/SLR"),
      path.resolve(__dirname, "../../../"),
    ];
    let sampleDir = "";
    let file01Name = "01_all_records.csv";
    let file02Name = "02_after_screening_v1.csv";
    let file03Name = "03_final_included.csv";
    let fileEvName = "evidence-table.md";

    for (const d of sampleDirCandidates) {
      if (fs.existsSync(path.join(d, "01_all_records.csv"))) {
        sampleDir = d;
        break;
      } else if (fs.existsSync(path.join(d, "01_all_records(2).csv"))) {
        sampleDir = d;
        file01Name = "01_all_records(2).csv";
        file02Name = "02_after_screening_v1(1).csv";
        file03Name = "03_final_included(1).csv";
        fileEvName = "evidence-table(1).md";
        break;
      }
    }

    if (!sampleDir) return;

    const file01 = path.join(sampleDir, file01Name);
    const file02 = path.join(sampleDir, file02Name);
    const file03 = path.join(sampleDir, file03Name);
    const fileEv = path.join(sampleDir, fileEvName);

    if (!fs.existsSync(file01)) return;

    try {
      const csv01 = fs.readFileSync(file01, "utf-8");
      // Import bằng RFC 4180 parser an toàn
      const rows = UniversalFileImporter.parseCsvRows(csv01);
      if (rows.length <= 1) return;

      const records: CanonicalRecord[] = [];
      const decisions: ScreeningDecision[] = [];

      for (let i = 1; i < rows.length; i++) {
        const parts = rows[i];
        if (!parts || parts.length < 5) continue;
        const displayId = parts[0]?.trim();
        const source = parts[1]?.trim() || "ACM Digital Library";
        const queryVersion = parts[2]?.trim() || "V1";
        const loai = parts[3]?.trim() || "bài báo";
        const doi = parts[4]?.trim() || "";
        const title = parts[5]?.trim() || "";
        const authors = parts[6]?.trim() || "";
        const year = parts[7]?.trim() || "";
        const venue = parts[8]?.trim() || "";
        const url = parts[9]?.trim() || (doi ? `https://doi.org/${doi}` : "");

        const isContainer = loai.includes("tập kỷ yếu") || title.toLowerCase().includes("proceedings");

        const rec: CanonicalRecord = {
          id: `rec_${displayId.toLowerCase()}`,
          collectionId: projectId,
          searchRunId: "run_acm_initial",
          sourceRecordId: doi || displayId,
          title,
          normalizedTitle: title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, " ")
            .trim(),
          authors,
          year,
          publicationDate: year ? `${year}-01-01` : undefined,
          abstract: "",
          doi,
          venue,
          source,
          landingPageUrl: url,
          url,
          displayId,
          version: "1",
          docType: isContainer ? "proceedings" : "article",
          isContainer,
          documentType: isContainer ? "proceedings" : "proceedings-article",
          retrievedAt: "2026-10-04T00:00:00Z",
          mergedRecordIds: [displayId],
          sourcesList: [source],
          qualityFlags: {
            missing_title: !title,
            missing_abstract: true,
            missing_year: !year,
            missing_doi: !doi,
            missing_fulltext: false,
            needs_data_review: false,
          },
        };

        records.push(rec);
      }

      this.saveRecords(projectId, records);

      // Load 02 decisions if available
      if (fs.existsSync(file02)) {
        const csv02 = fs.readFileSync(file02, "utf-8");
        const rows02 = UniversalFileImporter.parseCsvRows(csv02);
        for (let i = 1; i < rows02.length; i++) {
          const parts = rows02[i];
          if (!parts || parts.length < 2) continue;
          const displayId = parts[0]?.trim();
          const targetRec = records.find((r: any) => r.displayId === displayId);
          if (targetRec) {
            const decVal = parts[parts.length - 2]?.trim().toUpperCase();
            const reason = parts[parts.length - 1]?.trim().replace(/^"|"$/g, "");
            let decisionType: "INCLUDE" | "EXCLUDE" | "UNSURE" = "UNSURE";
            if (decVal === "INCLUDE") decisionType = "INCLUDE";
            else if (decVal === "EXCLUDE") decisionType = "EXCLUDE";

            decisions.push({
              recordId: targetRec.id,
              projectId,
              protocolVersion: "v1.0",
              stage: "v1",
              decision: decisionType,
              primaryReason: reason || "Đánh giá tiêu đề & tóm tắt",
              primaryReasonCode: reason?.split(":")[0]?.trim() || "EC-N",
              reasonText: reason,
              decidedBy: "Lâm",
              decidedAt: "2026-10-04T12:00:00Z",
            });
          }
        }
      }

      // Load 03 decisions if available
      if (fs.existsSync(file03)) {
        const csv03 = fs.readFileSync(file03, "utf-8");
        const rows03 = UniversalFileImporter.parseCsvRows(csv03);
        for (let i = 1; i < rows03.length; i++) {
          const parts = rows03[i];
          if (!parts || parts.length < 2) continue;
          const displayId = parts[0]?.trim();
          const targetRec = records.find((r: any) => r.displayId === displayId);
          if (targetRec) {
            const v2Status = parts[parts.length - 2]?.trim() || "";
            const v2Note = parts[parts.length - 1]?.trim().replace(/^"|"$/g, "") || "";
            let decisionType: "INCLUDE" | "EXCLUDE" | "UNSURE" = "INCLUDE";
            if (v2Status.includes("LOẠI") || v2Status.includes("ĐỀ XUẤT LOẠI") || v2Status.includes("EC-")) {
              decisionType = "EXCLUDE";
            }
            decisions.push({
              recordId: targetRec.id,
              projectId,
              protocolVersion: "v1.0",
              stage: "v2",
              decision: decisionType,
              primaryReason: `${v2Status}: ${v2Note}`,
              primaryReasonCode: v2Status.includes("EC-S") ? "EC-S" : v2Status.includes("EC-A") ? "EC-A" : "EC-N",
              reasonText: v2Note,
              decidedBy: "Lâm",
              decidedAt: "2026-10-04T18:00:00Z",
            });

            const ftAtt: FullTextAttempt = {
              id: `ft_${targetRec.id}`,
              recordId: targetRec.id,
              projectId,
              status: v2Status.includes("EC-A") ? "UNAVAILABLE" : "FOUND",
              url: targetRec.landingPageUrl,
              pageCount: v2Status.includes("EC-S") ? 3 : 10,
              attemptedAt: "2026-10-04T18:00:00Z",
            };
            if (!this.fulltext.has(projectId)) this.fulltext.set(projectId, new Map());
            this.fulltext.get(projectId)!.set(ftAtt.recordId, ftAtt);
          }
        }
      }

      // Lưu hàng loạt decisions vào memory & ghi 1 lần duy nhất
      if (!this.decisions.has(projectId)) this.decisions.set(projectId, new Map());
      const decMap = this.decisions.get(projectId)!;
      for (const d of decisions) {
        if (!decMap.has(d.recordId)) decMap.set(d.recordId, []);
        decMap.get(d.recordId)!.push(d);
      }
      this.saveDecisionsToDisk(projectId);

      // Ghi fulltext 1 lần duy nhất
      if (this.fulltext.has(projectId)) {
        const ftAll = Array.from(this.fulltext.get(projectId)!.values());
        this.atomicWrite(path.join(this.getProjectDir(projectId), "fulltext.json"), ftAll);
      }

      // Load Evidence Table from markdown if available
      if (fs.existsSync(fileEv)) {
        const evContent = fs.readFileSync(fileEv, "utf-8");
        const evLines = evContent.split(/\r?\n/).filter((l) => l.startsWith("|") && !l.includes("---"));
        if (!this.evidence.has(projectId)) this.evidence.set(projectId, new Map());
        const evMap = this.evidence.get(projectId)!;

        for (let i = 1; i < evLines.length; i++) {
          const cols = evLines[i]
            .split("|")
            .map((c) => c.trim())
            .slice(1, -1);
          if (cols.length >= 8) {
            // cols[0] là số thứ tự hoặc paper nếu bảng không có cột #
            let paperCol = cols.length >= 9 ? cols[1] : cols[0];
            let toolCol = cols.length >= 9 ? cols[2] : cols[1];
            let dataCol = cols.length >= 9 ? cols[3] : cols[2];
            let metricCol = cols.length >= 9 ? cols[4] : cols[3];
            let resultCol = cols.length >= 9 ? cols[5] : cols[4];
            let codeCol = cols.length >= 9 ? cols[6] : cols[5];
            let limitCol = cols.length >= 9 ? cols[7] : cols[6];
            let nearRqCol = cols.length >= 9 ? cols[8] : cols[7];

            const targetRec =
              records.find((r: any) => r.doi && paperCol.includes(r.doi)) ||
              records.find((r: any) => paperCol.toLowerCase().includes(r.title.slice(0, 20).toLowerCase()));

            const recId = targetRec ? targetRec.id : `rec_ev_${i}`;
            const displayTitle = targetRec ? `[${targetRec.displayId}] ${targetRec.title}` : paperCol;

            const entry: EvidenceEntry = {
              id: `ev_${recId}`,
              recordId: recId,
              projectId,
              paperDisplay: displayTitle,
              toolOrLlm: toolCol || "N/A",
              dataset: dataCol || "N/A",
              metric: metricCol || "N/A",
              result: resultCol || "N/A",
              code: codeCol || "N/A",
              limitations: limitCol || "N/A",
              nearRq: nearRqCol || "N/A",
              citations: [
                {
                  field: "result",
                  sourceUrl: targetRec?.landingPageUrl,
                  page: "Results / Table / Figure",
                  verifiedStatus: resultCol && resultCol !== "N/A" ? "verified" : "insufficient_evidence",
                },
              ],
              enteredBy: "Lâm",
              enteredAt: "2026-10-05T00:00:00Z",
            };
            evMap.set(entry.recordId, entry);
          }
        }
        const evAll = Array.from(evMap.values());
        this.atomicWrite(path.join(this.getProjectDir(projectId), "evidence.json"), evAll);
      }
    } catch (err) {
      console.warn("[ProjectStore] Lỗi seed dữ liệu mẫu:", err);
    }
  }

  private static createVisuallyImpairedPreset(): void {
    const projectId = "preset_visually_impaired_aac";
    const project: Project = {
      id: projectId,
      name: "Giao tiếp tử tế & Sự tự tin của trẻ khiếm thị (Visually Impaired AAC)",
      rqCode: "AAC-VI-2026",
      teamName: "Nhóm Nghiên cứu Giáo dục Hòa nhập",
      rq: "Ứng dụng các thiết bị và phần mềm giao tiếp hỗ trợ (AAC) nâng cao sự tự tin và kỹ năng giao tiếp hòa nhập của trẻ khiếm thị như thế nào?",
      framework: "PICO",
      pico: {
        population: "Trẻ em khiếm thị (visually impaired children, blind students)",
        intervention: "Thiết bị, phần mềm giao tiếp tăng cường và thay thế (AAC, assistive tech)",
        comparison: "Phương pháp giáo dục truyền thống không có công cụ hỗ trợ giao tiếp",
        outcome: "Mức độ tự tin, khả năng biểu đạt cảm xúc, kỹ năng tương tác xã hội",
      },
      members: [
        {
          id: "mem_giaovien",
          name: "Thanh Duy",
          role: "Chủ nhiệm đề tài",
          assignedSources: ["PubMed", "OpenAlex", "Crossref"],
          isReviewer: true,
          isExtractor: true,
          plannedAuthorOrder: 1,
          confirmedFinalDraft: true,
        },
      ],
      reportLanguage: "vi",
      activeProtocolVersion: "v1.0",
      activeStage: "SEARCH",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const criteria: Criterion[] = [
      {
        id: "crit_aac_01",
        code: "IC-01",
        name: "Đối tượng trẻ em khiếm thị",
        description: "Nghiên cứu trên trẻ em hoặc học sinh khiếm thị, suy giảm thị lực.",
        kind: "inclusion",
        stage: "both",
        evaluationMethod: "suggested",
        isActive: true,
      },
      {
        id: "crit_aac_02",
        code: "IC-02",
        name: "Can thiệp công nghệ AAC",
        description: "Áp dụng công nghệ, thiết bị hoặc phương pháp giao tiếp tăng cường (AAC).",
        kind: "inclusion",
        stage: "both",
        evaluationMethod: "suggested",
        isActive: true,
      },
      {
        id: "crit_aac_03",
        code: "IC-03",
        name: "Đo lường sự tự tin / giao tiếp",
        description: "Có chỉ số hoặc đánh giá thực nghiệm về giao tiếp hoặc sự tự tin.",
        kind: "inclusion",
        stage: "v2",
        evaluationMethod: "manual",
        isActive: true,
      },
    ];

    const protocol: ProtocolVersion = {
      version: "v1.0",
      projectId,
      title: "Protocol nghiên cứu: AAC cho trẻ khiếm thị",
      createdAt: new Date().toISOString(),
      criteria,
      sourcePolicies: {
        PubMed: { role: "primary" },
        OpenAlex: { role: "primary" },
        Crossref: { role: "supplementary" },
      },
    };

    this.saveProject(project);
    this.saveProtocolVersion(projectId, protocol);
  }

  // ==========================================
  // BACKUP & RESTORE JSON
  // ==========================================
  static exportProjectBackup(projectId: string): Record<string, any> {
    this.init();
    const project = this.getProject(projectId);
    if (!project) throw new Error("Không tìm thấy dự án.");

    return {
      backupVersion: "2.0",
      exportedAt: new Date().toISOString(),
      project,
      protocols: this.getProtocols(projectId),
      queries: this.getQueries(projectId),
      searchRuns: this.getSearchRuns(projectId),
      records: this.getRecords(projectId),
      duplicates: this.getDuplicates(projectId),
      decisions: this.getDecisions(projectId),
      fulltextAttempts: this.getFullTextAttempts(projectId),
      evidenceEntries: this.getEvidenceEntries(projectId),
      snowballingLinks: this.getSnowballingLinks(projectId),
      auditLogs: this.getAuditLogs(projectId),
    };
  }

  static importProjectBackup(backupData: Record<string, any>): Project {
    this.init();
    if (!backupData.project || !backupData.project.id) {
      throw new Error("Tệp sao lưu không đúng định dạng: thiếu thông tin project.");
    }

    const p = backupData.project as Project;
    this.saveProject(p);

    if (Array.isArray(backupData.protocols)) {
      backupData.protocols.forEach((proto: ProtocolVersion) => {
        this.saveProtocolVersion(p.id, proto);
      });
    }

    if (Array.isArray(backupData.queries)) {
      backupData.queries.forEach((q: QueryVersion) => {
        this.saveQuery(p.id, q);
      });
    }

    if (Array.isArray(backupData.searchRuns)) {
      backupData.searchRuns.forEach((r: SearchRun) => {
        this.saveSearchRun(p.id, r);
      });
    }

    if (Array.isArray(backupData.records)) {
      this.saveRecords(p.id, backupData.records);
    }

    if (Array.isArray(backupData.duplicates)) {
      this.saveDuplicates(p.id, backupData.duplicates);
    }

    if (Array.isArray(backupData.decisions)) {
      backupData.decisions.forEach((d: ScreeningDecision) => {
        this.saveDecision(p.id, d);
      });
    }

    if (Array.isArray(backupData.fulltextAttempts)) {
      backupData.fulltextAttempts.forEach((ft: FullTextAttempt) => {
        this.saveFullTextAttempt(p.id, ft);
      });
    }

    if (Array.isArray(backupData.evidenceEntries)) {
      backupData.evidenceEntries.forEach((e: EvidenceEntry) => {
        this.saveEvidenceEntry(p.id, e);
      });
    }

    if (Array.isArray(backupData.snowballingLinks)) {
      backupData.snowballingLinks.forEach((sb: SnowballingLink) => {
        this.saveSnowballingLink(p.id, sb);
      });
    }

    this.logAudit(p.id, "PROJECT_RESTORE", {
      recordsCount: backupData.records?.length || 0,
      decisionsCount: backupData.decisions?.length || 0,
    });

    return p;
  }
}
