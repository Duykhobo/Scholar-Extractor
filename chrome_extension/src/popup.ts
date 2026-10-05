import { DedupStats, PaperRecord, ScreeningDecision, SearchExecutionSummary, TabAnalysisResult } from "./types";

const DEFAULT_BACKEND_URL = "http://localhost:3001";
const STORAGE_KEY = "scholar_slr_session_v2";

interface SessionState {
  allRecords: PaperRecord[];
  uniqueRecords: PaperRecord[];
  dedupStats: DedupStats;
  searchSummary: SearchExecutionSummary | null;
  allEvidences: any[];
  currentStart: number;
  apiRequestsUsed: number;
  query: string;
  asYlo: string;
  asYhi: string;
  hl: string;
}

class ScholarExtensionApp {
  private backendUrl: string = DEFAULT_BACKEND_URL;
  private allRecords: PaperRecord[] = [];
  private uniqueRecords: PaperRecord[] = [];
  private dedupStats: DedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
  private searchSummary: SearchExecutionSummary | null = null;
  private allEvidences: any[] = [];

  private currentStart: number = 0;
  private isFetching: boolean = false;
  private isCancelled: boolean = false;
  private apiRequestsUsed: number = 0;

  // DOM Elements
  private queryInput!: HTMLInputElement;
  private asYloInput!: HTMLInputElement;
  private asYhiInput!: HTMLInputElement;
  private hlInput!: HTMLInputElement;
  private maxPagesInput!: HTMLInputElement;
  private uiTotalInput!: HTMLInputElement;
  private backendUrlInput!: HTMLInputElement;

  private searchFirstBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private autoFetchBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;

  private exportCsvBtn!: HTMLButtonElement;
  private exportScreeningBtn!: HTMLButtonElement;
  private exportSessionBtn!: HTMLButtonElement;
  private saveLogBtn!: HTMLButtonElement;

  private statusDiv!: HTMLElement;
  private backendStatusBadge!: HTMLElement;
  private statsBox!: HTMLElement;
  private resultsContainer!: HTMLElement;
  private filterInput!: HTMLInputElement;
  private filterDecisionSelect!: HTMLSelectElement;

  private extractActiveTabBtn!: HTMLButtonElement;
  private uploadPdfBtn!: HTMLButtonElement;
  private pdfFileInput!: HTMLInputElement;
  private tabExtractModal!: HTMLElement;
  private modalBody!: HTMLElement;
  private confirmTabExtractBtn!: HTMLButtonElement;
  private cancelTabExtractBtn!: HTMLButtonElement;
  private closeModalBtn!: HTMLButtonElement;

  private selectedRecordId: string | null = null;
  private uploadTargetPaperId: string | null = null;
  private pendingAnalysisResult: TabAnalysisResult | null = null;
  private pendingRecordId: string | null = null;

  async init() {
    this.bindDOMElements();
    this.attachEventListeners();
    await this.restoreSessionFromStorage();
    await this.checkBackendHealth();
  }

  private bindDOMElements() {
    this.queryInput = document.getElementById("queryInput") as HTMLInputElement;
    this.asYloInput = document.getElementById("asYloInput") as HTMLInputElement;
    this.asYhiInput = document.getElementById("asYhiInput") as HTMLInputElement;
    this.hlInput = document.getElementById("hlInput") as HTMLInputElement;
    this.maxPagesInput = document.getElementById("maxPagesInput") as HTMLInputElement;
    this.uiTotalInput = document.getElementById("uiTotalInput") as HTMLInputElement;

    this.backendUrlInput = document.getElementById("backendUrlInput") as HTMLInputElement;
    if (this.backendUrlInput && this.backendUrlInput.value) {
      this.backendUrl = this.backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
    }
    this.searchFirstBtn = document.getElementById("searchFirstBtn") as HTMLButtonElement;
    this.nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    this.autoFetchBtn = document.getElementById("autoFetchBtn") as HTMLButtonElement;
    this.stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
    this.resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;

    this.exportCsvBtn = document.getElementById("exportCsvBtn") as HTMLButtonElement;
    this.exportScreeningBtn = document.getElementById("exportScreeningBtn") as HTMLButtonElement;
    this.exportSessionBtn = document.getElementById("exportSessionBtn") as HTMLButtonElement;
    this.saveLogBtn = document.getElementById("saveLogBtn") as HTMLButtonElement;

    this.statusDiv = document.getElementById("status") as HTMLElement;
    this.backendStatusBadge = document.getElementById("backendStatusBadge") as HTMLElement;
    this.statsBox = document.getElementById("statsBox") as HTMLElement;
    this.resultsContainer = document.getElementById("resultsContainer") as HTMLElement;
    this.filterInput = document.getElementById("filterInput") as HTMLInputElement;
    this.filterDecisionSelect = document.getElementById("filterDecisionSelect") as HTMLSelectElement;

    this.extractActiveTabBtn = document.getElementById("extractActiveTabBtn") as HTMLButtonElement;
    this.uploadPdfBtn = document.getElementById("uploadPdfBtn") as HTMLButtonElement;
    this.pdfFileInput = document.getElementById("pdfFileInput") as HTMLInputElement;
    this.tabExtractModal = document.getElementById("tabExtractModal") as HTMLElement;
    this.modalBody = document.getElementById("modalBody") as HTMLElement;
    this.confirmTabExtractBtn = document.getElementById("confirmTabExtractBtn") as HTMLButtonElement;
    this.cancelTabExtractBtn = document.getElementById("cancelTabExtractBtn") as HTMLButtonElement;
    this.closeModalBtn = document.getElementById("closeModalBtn") as HTMLButtonElement;
  }

  private attachEventListeners() {
    this.searchFirstBtn.addEventListener("click", () => this.handleSearchFirstPage());
    this.nextBtn.addEventListener("click", () => this.handleFetchNextPage());
    this.autoFetchBtn.addEventListener("click", () => this.handleAutoFetchPages());
    this.stopBtn.addEventListener("click", () => this.handleStopFetch());
    this.resetBtn.addEventListener("click", () => this.handleResetSession());

    this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
    this.exportScreeningBtn.addEventListener("click", () => this.handleExportScreeningCsv());
    this.exportSessionBtn.addEventListener("click", () => this.handleExportSessionJson());
    this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());

    if (this.extractActiveTabBtn) {
      this.extractActiveTabBtn.addEventListener("click", () => this.handleExtractFromActiveTab());
    }
    if (this.uploadPdfBtn) {
      this.uploadPdfBtn.addEventListener("click", () => this.handleUploadPdfForPaper());
    }
    if (this.pdfFileInput) {
      this.pdfFileInput.addEventListener("change", (e) => this.handlePdfFileSelected(e));
    }
    if (this.confirmTabExtractBtn) {
      this.confirmTabExtractBtn.addEventListener("click", () => this.handleConfirmTabExtract());
    }
    if (this.cancelTabExtractBtn) {
      this.cancelTabExtractBtn.addEventListener("click", () => this.handleCancelTabExtract());
    }
    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener("click", () => this.handleCancelTabExtract());
    }

    // Gan chuoi mau tu protocol nhom (review-protocol.md)
    const loadStringABtn = document.getElementById("loadStringABtn");
    if (loadStringABtn) {
      loadStringABtn.addEventListener("click", () => {
        this.queryInput.value =
          '("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")';
        this.setStatus("Đã điền Chuỗi A (Chính thức theo review-protocol.md).", "info");
      });
    }

    const loadStringBBtn = document.getElementById("loadStringBBtn");
    if (loadStringBBtn) {
      loadStringBBtn.addEventListener("click", () => {
        this.queryInput.value =
          '("REST API" OR "RESTful API" OR "web API" OR "web service") AND ("boundary value analysis" OR "boundary value" OR "boundary testing" OR "equivalence partitioning") AND ("mutation testing" OR "mutants" OR "mutation score")';
        this.setStatus("Đã điền Chuỗi B (Dự phòng nới rộng theo review-protocol.md).", "info");
      });
    }

    // Loc cuc bo bang - Khong goi lai API
    this.filterInput.addEventListener("input", () => this.renderRecordsList());
    this.filterDecisionSelect.addEventListener("change", () => this.renderRecordsList());
  }

  private setStatus(msg: string, type: "info" | "success" | "error" | "warning" = "info") {
    this.statusDiv.innerText = msg;
    const colors = {
      info: "#2563eb",
      success: "#16a34a",
      error: "#dc2626",
      warning: "#d97706",
    };
    this.statusDiv.style.color = colors[type];
  }

  // Luu phien lam viec vao chrome.storage.local de khong bi mat khi dong popup
  private async saveSessionToStorage() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const state: SessionState = {
        allRecords: this.allRecords,
        uniqueRecords: this.uniqueRecords,
        dedupStats: this.dedupStats,
        searchSummary: this.searchSummary,
        allEvidences: this.allEvidences,
        currentStart: this.currentStart,
        apiRequestsUsed: this.apiRequestsUsed,
        query: this.queryInput.value,
        asYlo: this.asYloInput.value,
        asYhi: this.asYhiInput.value,
        hl: this.hlInput.value,
      };
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    }
  }

  // Khoi phuc phien lam viec khi mo lai popup
  private async restoreSessionFromStorage() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const res = await chrome.storage.local.get([STORAGE_KEY]);
      const state: SessionState | undefined = res[STORAGE_KEY];
      if (state && state.allRecords && state.allRecords.length > 0) {
        this.allRecords = state.allRecords;
        this.uniqueRecords = state.uniqueRecords || state.allRecords;
        this.dedupStats = state.dedupStats || this.dedupStats;
        this.searchSummary = state.searchSummary;
        this.allEvidences = state.allEvidences || [];
        this.currentStart = state.currentStart || 0;
        this.apiRequestsUsed = state.apiRequestsUsed || 0;

        if (state.query) this.queryInput.value = state.query;
        if (state.asYlo) this.asYloInput.value = state.asYlo;
        if (state.asYhi) this.asYhiInput.value = state.asYhi;
        if (state.hl) this.hlInput.value = state.hl;

        this.updateStatsDisplay();
        this.renderRecordsList();
        this.setButtonsState(false);
        this.setStatus(
          `✓ Đã khôi phục phiên làm việc trước: ${this.allRecords.length} bản ghi (Offset tiếp theo: start=${this.currentStart}).`,
          "info",
        );
      }
    }
  }

  private async handleResetSession() {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ phiên hiện tại để bắt đầu lượt tìm kiếm mới?")) {
      return;
    }
    this.allRecords = [];
    this.uniqueRecords = [];
    this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
    this.searchSummary = null;
    this.allEvidences = [];
    this.currentStart = 0;
    this.apiRequestsUsed = 0;

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.remove([STORAGE_KEY]);
    }

    this.statsBox.style.display = "none";
    this.resultsContainer.innerHTML =
      '<div class="empty-state">Đã làm mới phiên. Bấm "Lấy trang 1" để bắt đầu thu thập.</div>';
    this.setButtonsState(false);
    this.setStatus("Đã làm mới phiên làm việc thành công.", "info");
  }

  private async checkBackendHealth() {
    try {
      const res = await fetch(`${this.backendUrl}/api/health`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        this.apiRequestsUsed = Math.max(this.apiRequestsUsed, data.totalApiRequestsUsed || 0);
        this.backendStatusBadge.innerHTML = `● Backend Online (3001) | Key: ${data.isKeyConfigured ? "✓ Sẵn sàng" : "⚠ Chưa thấy trong .env"}`;
        this.backendStatusBadge.className = data.isKeyConfigured ? "badge badge-green" : "badge badge-yellow";
      } else {
        throw new Error("HTTP " + res.status);
      }
    } catch {
      this.backendStatusBadge.innerHTML = `✕ Chưa bật Backend Node.js. Hãy chạy: <code>cd backend && npm start</code>`;
      this.backendStatusBadge.className = "badge badge-red";
    }
  }

  // 1. Tim kiem trang dau tien (start = 0)
  private async handleSearchFirstPage() {
    const q = this.queryInput.value.trim();
    if (!q) {
      this.setStatus("Vui lòng nhập chuỗi tìm kiếm nguyên văn.", "warning");
      return;
    }

    this.currentStart = 0;
    this.allRecords = [];
    this.uniqueRecords = [];
    this.allEvidences = [];
    this.isCancelled = false;

    // Chi tang offset SAU KHI request thanh cong
    const success = await this.fetchSinglePage(0, true);
    if (success) {
      this.currentStart = 10;
      await this.saveSessionToStorage();
    }
  }

  // 2. Lay trang tiep theo
  private async handleFetchNextPage() {
    if (this.isFetching) return;
    const offsetToFetch = this.currentStart;

    // Chi cap nhat currentStart sau khi goi API thanh cong!
    const success = await this.fetchSinglePage(offsetToFetch, false);
    if (success) {
      this.currentStart += 10;
      await this.saveSessionToStorage();
    }
  }

  // 3. Tu dong lay toi da N trang
  private async handleAutoFetchPages() {
    const q = this.queryInput.value.trim();
    if (!q) {
      this.setStatus("Vui lòng nhập chuỗi tìm kiếm nguyên văn.", "warning");
      return;
    }

    const maxPages = Math.max(1, parseInt(this.maxPagesInput.value, 10) || 1);
    this.isCancelled = false;
    this.stopBtn.style.display = "inline-block";
    this.autoFetchBtn.disabled = true;

    let pagesFetched = 0;
    while (pagesFetched < maxPages && !this.isCancelled) {
      const pageIndex = Math.floor(this.currentStart / 10) + 1;
      this.setStatus(`Đang tải trang ${pageIndex}... (offset start=${this.currentStart})`, "info");

      // Chi cap nhat offset sau khi thanh cong
      const success = await this.fetchSinglePage(this.currentStart, false);
      if (!success || this.isCancelled) {
        break;
      }

      this.currentStart += 10;
      pagesFetched++;
      await this.saveSessionToStorage();

      // Giãn cách nhẹ 600ms
      await new Promise((r) => setTimeout(r, 600));
    }

    this.stopBtn.style.display = "none";
    this.autoFetchBtn.disabled = false;
    if (this.isCancelled) {
      this.setStatus(`Đã dừng quá trình lấy dữ liệu. Dữ liệu các trang trước được bảo toàn an toàn!`, "warning");
    }
  }

  private handleStopFetch() {
    this.isCancelled = true;
    this.setStatus("Đang dừng yêu cầu...", "warning");
  }

  // Goi backend de lay 1 trang
  private async fetchSinglePage(startOffset: number, isReset: boolean): Promise<boolean> {
    const q = this.queryInput.value.trim();
    const as_ylo = this.asYloInput.value.trim() || "2020";
    const as_yhi = this.asYhiInput.value.trim() || "2026";
    const hl = this.hlInput.value.trim() || "vi";

    this.isFetching = true;
    this.setButtonsState(true);
    this.setStatus(`Đang gọi SerpApi Google Scholar (start=${startOffset})...`, "info");

    try {
      const response = await fetch(`${this.backendUrl}/api/scholar/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q,
          as_ylo,
          as_yhi,
          hl,
          start: startOffset,
          num: 10,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Lỗi không xác định từ backend.");
      }

      const newRecords: PaperRecord[] = data.records || [];
      this.searchSummary = data.summary;
      if (data.evidence) {
        this.allEvidences.push(data.evidence);
      }
      this.apiRequestsUsed = data.summary?.apiRequestsUsed || this.apiRequestsUsed + 1;

      if (isReset) {
        this.allRecords = newRecords;
      } else {
        this.allRecords = [...this.allRecords, ...newRecords];
      }

      // Khử trùng lặp qua backend
      await this.runDeduplication();

      this.updateStatsDisplay();
      this.renderRecordsList();

      if (newRecords.length === 0) {
        this.setStatus(`Trang này không có thêm bài viết nào. Đã hết kết quả.`, "warning");
        return false;
      }

      const cacheText = data.summary?.fromCache ? "(Từ cache SerpApi)" : "(Live API)";
      this.setStatus(
        `✓ Đã nhận ${newRecords.length} bài viết mới. Tổng tích lũy: ${this.allRecords.length} (Duy nhất: ${this.uniqueRecords.length}) ${cacheText}`,
        "success",
      );
      return true;
    } catch (err: any) {
      this.setStatus(`Lỗi khi lấy dữ liệu: ${err.message}. Offset chưa tăng, dữ liệu cũ giữ nguyên an toàn!`, "error");
      return false;
    } finally {
      this.isFetching = false;
      this.setButtonsState(false);
    }
  }

  private async runDeduplication() {
    try {
      const res = await fetch(`${this.backendUrl}/api/scholar/dedup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: this.allRecords }),
      });
      if (res.ok) {
        const data = await res.json();
        this.uniqueRecords = data.uniqueRecords || this.allRecords;
        this.dedupStats = data.dedupStats;
      } else {
        this.uniqueRecords = [...this.allRecords];
      }
    } catch {
      this.uniqueRecords = [...this.allRecords];
    }
  }

  private setButtonsState(busy: boolean) {
    this.searchFirstBtn.disabled = busy;
    this.nextBtn.disabled = busy;
    if (!busy) {
      const hasRecords = this.allRecords.length > 0;
      this.nextBtn.style.display = hasRecords ? "inline-block" : "none";
      this.autoFetchBtn.style.display = hasRecords ? "inline-block" : "none";
      this.resetBtn.style.display = hasRecords ? "inline-block" : "none";
      this.exportCsvBtn.style.display = hasRecords ? "inline-block" : "none";
      this.exportScreeningBtn.style.display = hasRecords ? "inline-block" : "none";
      this.exportSessionBtn.style.display = hasRecords ? "inline-block" : "none";
      this.saveLogBtn.style.display = hasRecords ? "inline-block" : "none";
    }
  }

  private updateStatsDisplay() {
    this.statsBox.style.display = "block";

    const s = this.searchSummary;
    const cacheLabel = s?.fromCache
      ? '<span class="badge badge-yellow">Từ cache SerpApi</span>'
      : '<span class="badge badge-green">Live API</span>';
    const totalReported = s?.totalReportedResults ? s.totalReportedResults.toLocaleString() : "N/A";

    this.statsBox.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Số Request API đã dùng</div>
          <div class="stat-value">${this.apiRequestsUsed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Tổng kết quả nguồn báo</div>
          <div class="stat-value">${totalReported} <small class="text-muted">(Ước lượng)</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Số record thu thập thực tế</div>
          <div class="stat-value text-blue">${this.allRecords.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Paper ứng viên duy nhất</div>
          <div class="stat-value text-green">${this.uniqueRecords.length}</div>
        </div>
      </div>
      <div class="stat-sub">
        <span><b>Mã tìm kiếm:</b> <code>${s?.searchId || "N/A"}</code></span>
        <span><b>Trạng thái:</b> ${cacheLabel}</span>
        <span><b>Trùng DOI:</b> ${this.dedupStats.exactDupByDoi} | <b>Trùng Title (giữ lại):</b> ${this.dedupStats.potentialDupByTitle}</span>
      </div>
      <div class="notice-callout">
        <b>Quy định Protocol RBL:</b> Nguồn Google Scholar chỉ là paper ứng viên bổ trợ, <b>không tính trực tiếp vào Identification của sơ đồ PRISMA chính</b>. Không coi <code>snippet</code> là abstract.
      </div>
    `;
  }

  private renderRecordsList() {
    if (this.extractActiveTabBtn) {
      this.extractActiveTabBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
    }

    const keyword = this.filterInput.value.toLowerCase().trim();
    const decisionFilter = this.filterDecisionSelect.value;

    const filtered = this.uniqueRecords.filter((r) => {
      // Loc theo quyet dinh
      const effectiveDecision = r.finalDecision || r.suggestedDecision;
      if (decisionFilter !== "all" && effectiveDecision !== decisionFilter) {
        return false;
      }
      // Loc theo tu khoa
      if (keyword) {
        const text = `${r.title} ${r.authors} ${r.venue} ${r.year} ${r.doi} ${r.snippet}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      this.resultsContainer.innerHTML =
        '<div class="empty-state">Không có bài viết nào khớp với bộ lọc hiện tại.</div>';
      return;
    }

    this.resultsContainer.innerHTML = filtered
      .map((r, idx) => {
        const decisionBadge = this.getDecisionBadge(r.suggestedDecision);
        const isInclude = (r.finalDecision || r.suggestedDecision) === "Include";
        const isExclude = (r.finalDecision || r.suggestedDecision) === "Exclude";
        const isUnsure = (r.finalDecision || r.suggestedDecision) === "Unsure";
        const isSelected = r.id === this.selectedRecordId;

        const dupWarning = r.potentialDuplicate
          ? `<div class="dup-badge">⚠️ ĐỀ XUẤT TRÙNG LẶP: ${this.escapeHtml(r.duplicateReason || "")}</div>`
          : "";

        const matchedCriteriaStr = (r.matchedCriteria || [])
          .map((c) => `<span class="badge badge-blue">${c}</span>`)
          .join(" ");
        const unknownCriteriaStr = (r.unknownCriteria || [])
          .map((c) => `<span class="badge badge-yellow" title="Chưa xác minh">${c}?</span>`)
          .join(" ");
        const missingEvidenceStr =
          r.missingEvidence && r.missingEvidence.length > 0
            ? `<div style="font-size: 11px; color: #b45309; margin-top: 3px;">⚠️ <b>Thiếu bằng chứng:</b> ${this.escapeHtml(r.missingEvidence.join(", "))}</div>`
            : "";

        const verifiedBadge = r.user_verified
          ? `<span class="badge badge-green" title="Đã trích xuất & xác minh từ tab">✓ Đã xác minh (${this.escapeHtml(r.extraction_method || "Tab")})</span>`
          : "";
        const sourceUrlBadge = r.extracted_url
          ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">🌐 <b>Nguồn Tab:</b> <a href="${r.extracted_url}" target="_blank">${this.escapeHtml(r.extracted_url.slice(0, 48))}...</a></div>`
          : "";
        const pdfBadge = r.pdfUrl
          ? `<span style="font-size: 10px; color: #047857; margin-left: 6px;">📄 <b>PDF:</b> <a href="${r.pdfUrl}" target="_blank">Mở PDF (${r.page_count ? r.page_count + " trang" : "sẵn sàng"})</a></span>`
          : "";
        const abstractBox = r.abstract
          ? `<div class="paper-snippet" style="border-left-color: #2563eb; background: #eff6ff; margin-top: 4px;"><b>Abstract [Đã trích xuất]:</b><br><i>"${this.escapeHtml(r.abstract.slice(0, 260))}${r.abstract.length > 260 ? "..." : ""}"</i></div>`
          : "";
        const evidenceSummary =
          r.evidence_snippets && r.evidence_snippets.length > 0
            ? `<div style="font-size: 10px; color: #1e40af; margin-top: 3px;">🔍 <b>Bằng chứng trích xuất (${r.evidence_snippets.length}):</b> ${(r.evidence_snippets || []).map((e) => `<span class="badge ${e.isValidEvidence ? "badge-blue" : "badge-yellow"}">${e.type} (${e.section}${e.page ? ", tr." + e.page : ""})</span>`).join(" ")}</div>`
            : "";

        return `
        <div class="paper-card ${r.potentialDuplicate ? "paper-dup" : ""} ${isSelected ? "is-selected" : ""}" id="paper_${r.id}" data-id="${r.id}">
          ${dupWarning}
          <div class="paper-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
              <span class="paper-index">#${idx + 1}</span>
              <a href="${r.url || "#"}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
              ${verifiedBadge}
            </div>
            <button class="btn-extract-card" data-id="${r.id}" title="Lấy dữ liệu & PDF từ tab trình duyệt đang mở vào bài báo này">📑 Lấy từ Tab</button>
          </div>

          <div class="paper-meta">
            <span>👤 <b>Tác giả:</b> ${this.escapeHtml(r.authors || "N/A")} ${r.uncertain_authors ? '<span class="tag-warn">Cần xác minh</span>' : ""}</span>
            <span>📅 <b>Năm:</b> ${r.year || "N/A"} ${r.uncertain_year ? '<span class="tag-warn">Chưa chắc chắn</span>' : ""}</span>
            <span>🏛️ <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")} ${r.uncertain_venue ? '<span class="tag-warn">Cần xác minh</span>' : ""}</span>
            <span>🔗 <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Trống (Cần xác minh)</span>'}</span>
            ${pdfBadge}
          </div>

          ${sourceUrlBadge}
          ${abstractBox}

          <div class="paper-snippet">
            <b>Đoạn trích (Snippet) [Không phải Abstract]:</b><br>
            <i>"${this.escapeHtml(r.snippet || "Không có đoạn trích.")}"</i>
          </div>

          ${evidenceSummary}

          <div class="screening-panel">
            <div class="screening-header">
              <span><b>Gợi ý V1:</b> ${decisionBadge}</span>
              <span><b>Khớp:</b> ${matchedCriteriaStr || '<small class="text-muted">Chưa</small>'}</span>
              ${unknownCriteriaStr ? `<span><b>Chưa xác minh:</b> ${unknownCriteriaStr}</span>` : ""}
            </div>
            <div class="reason-text">${this.escapeHtml(r.screeningReason)}</div>
            ${missingEvidenceStr}

            <div class="decision-buttons" data-id="${r.id}">
              <span class="decision-label">Xác nhận của bạn (finalDecision):</span>
              <button class="btn-dec ${isInclude ? "active-inc" : ""}" data-decision="Include">✓ Include</button>
              <button class="btn-dec ${isExclude ? "active-exc" : ""}" data-decision="Exclude">✗ Exclude</button>
              <button class="btn-dec ${isUnsure ? "active-uns" : ""}" data-decision="Unsure">? Unsure</button>
            </div>
            <div class="user-notes-row">
              <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi chú thẩm định của bạn (ví dụ: lý do nhận/loại, phương pháp REST API)..." value="${this.escapeHtml(r.userNotes || "")}">
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Chon bai bao khi click vao the (tru khi click button, input, link)
    this.resultsContainer.querySelectorAll(".paper-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("input") || target.closest("select") || target.closest("a")) {
          return;
        }
        const id = card.getAttribute("data-id");
        if (id && id !== this.selectedRecordId) {
          this.selectedRecordId = id;
          this.renderRecordsList();
        }
      });
    });

    // Gan su kien cho nut doc tab tren tung the
    this.resultsContainer.querySelectorAll(".btn-extract-card").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLButtonElement;
        const paperId = target.getAttribute("data-id");
        if (paperId) {
          this.handleExtractFromActiveTab(paperId);
        }
      });
    });

    // Gan su kien cho cac nut decision va note
    this.resultsContainer.querySelectorAll(".btn-dec").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const parent = target.closest(".decision-buttons") as HTMLElement;
        const paperId = parent.getAttribute("data-id");
        const decision = target.getAttribute("data-decision") as ScreeningDecision;
        this.updatePaperDecision(paperId!, decision);
      });
    });

    this.resultsContainer.querySelectorAll(".notes-input").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const paperId = target.getAttribute("data-id");
        this.updatePaperNotes(paperId!, target.value);
      });
    });
  }

  // Trich xuat du lieu tu Tab dang mo
  private async handleExtractFromActiveTab(paperId?: string) {
    const targetId = paperId || this.selectedRecordId;
    if (!targetId) {
      this.setStatus("Vui lòng chọn 1 bài báo từ danh sách kết quả trước khi lấy dữ liệu từ tab.", "warning");
      return;
    }

    const record = this.uniqueRecords.find((r) => r.id === targetId);
    if (!record) {
      this.setStatus("Không tìm thấy bản ghi được chọn.", "error");
      return;
    }

    this.selectedRecordId = targetId;
    this.renderRecordsList();

    this.setStatus("Đang kết nối tới Tab đang mở trên trình duyệt...", "info");

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0 || typeof tabs[0].id !== "number") {
        this.setStatus("Không tìm thấy tab trình duyệt đang kích hoạt.", "error");
        return;
      }
      const activeTab = tabs[0];
      const tabId: number = activeTab.id as number;
      const activeUrl = activeTab.url || "";

      let tabData: any = null;

      // Kiem tra neu tab la file PDF truc tiep
      if (activeUrl.toLowerCase().endsWith(".pdf") || activeUrl.toLowerCase().includes(".pdf?")) {
        tabData = {
          sourceUrl: activeUrl,
          method: "Active Tab PDF URL",
          title: activeTab.title || "",
          pdfUrl: activeUrl,
        };
      } else {
        // Thu executeScript tren trang web (HTML)
        try {
          // Buoc 1: Inject bundle content-script.js vao tab dang mo
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content-script.js"],
          });

          // Buoc 2: Thuc thi ham func de lay ket qua tu extractCurrentPageData ve popup
          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                if (typeof (window as any).extractCurrentPageData === "function") {
                  return (window as any).extractCurrentPageData();
                }
              } catch (e) {
                console.error("Loi khi goi extractCurrentPageData trong tab:", e);
              }
              return null;
            },
          });
          if (results && results[0] && results[0].result) {
            tabData = results[0].result;
          }
        } catch (scriptErr: any) {
          console.warn("executeScript failed, fallback to direct tab info:", scriptErr);
        }

        if (!tabData) {
          tabData = {
            sourceUrl: activeUrl,
            method: "Browser Tab Fallback",
            title: activeTab.title || "",
          };
        }
      }

      this.setStatus("Đang gửi dữ liệu trang tới backend để phân tích theo tiêu chí SLR...", "info");

      const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record,
          tabData,
          autoFetchPdf: true,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        const text = await response.text();
        if (response.status === 404 || text.includes("Cannot POST /api/scholar/analyze-tab")) {
          throw new Error(
            `Máy chủ Backend (${this.backendUrl}) chưa nhận diện endpoint /api/scholar/analyze-tab (Mã lỗi 404). Vui lòng khởi động lại (Restart) terminal backend: Nhấn Ctrl+C rồi chạy lại 'npm start'.`,
          );
        }
        throw new Error(`Máy chủ trả về lỗi HTTP ${response.status}: ${text.slice(0, 120)}`);
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "Lỗi khi phân tích dữ liệu tab");
      }

      const analysisResult: TabAnalysisResult = resData.analysis || resData.data;
      if (!analysisResult || !analysisResult.extracted) {
        throw new Error("Dữ liệu phân tích trả về từ backend thiếu cấu trúc analysis hợp lệ.");
      }
      this.pendingAnalysisResult = analysisResult;
      this.pendingRecordId = record.id;

      this.showPreviewModal(analysisResult, record);
      this.setStatus("✓ Đã phân tích xong! Hãy xem trước và xác nhận cập nhật.", "success");
    } catch (err: any) {
      this.setStatus(`Lỗi lấy dữ liệu từ tab: ${err.message}`, "error");
    }
  }

  private showPreviewModal(result: TabAnalysisResult, record: PaperRecord) {
    if (!this.tabExtractModal || !this.modalBody) return;

    let warningHtml = "";
    if (!result.isTitleMatch) {
      warningHtml += `
        <div class="warning-banner" style="background: #fef2f2; border-color: #fca5a5; color: #991b1b; border-left-color: #dc2626;">
          ⚠️ <b>CẢNH BÁO TIÊU ĐỀ KHÔNG KHỚP:</b><br>
          ${this.escapeHtml(result.titleMismatchWarning || `Độ tương đồng tiêu đề chỉ đạt ${(result.titleMatchConfidence * 100).toFixed(0)}%. Hãy kiểm tra kỹ xem tab đang mở có đúng là bài báo này không!`)}
        </div>
      `;
    }

    if (result.warnings && result.warnings.length > 0) {
      warningHtml += result.warnings
        .map(
          (w) => `
        <div class="warning-banner">⚠️ ${this.escapeHtml(w)}</div>
      `,
        )
        .join("");
    }

    // Bang Diff old vs new
    const diffRows = result.changes
      .map((ch) => {
        const cls = ch.willChange ? "diff-changed" : "diff-unchanged";
        const statusIcon = ch.willChange ? "🔄 Sẽ cập nhật" : "➖ Giữ nguyên";
        return `
        <tr>
          <td><b>${this.escapeHtml(ch.field)}</b></td>
          <td>${this.escapeHtml(ch.oldValue || "(trống)")}</td>
          <td class="${cls}">${this.escapeHtml(ch.newValue || "(trống)")}</td>
          <td style="text-align: center;">${statusIcon}</td>
        </tr>
      `;
      })
      .join("");

    // Evidence snippets
    let evidenceHtml = "";
    if (result.evidence && result.evidence.length > 0) {
      const items = result.evidence
        .map((ev) => {
          const itemClass = ev.isValidEvidence ? "evidence-item" : "evidence-item invalid";
          const statusBadge = ev.isValidEvidence
            ? '<span class="badge badge-blue">✓ Bằng chứng hợp lệ</span>'
            : '<span class="badge badge-red">✗ Bị loại (Không tính đạt IC)</span>';
          const sectionBadge = `<span class="badge badge-yellow">Mục: ${this.escapeHtml(ev.section)}</span>`;
          const pageBadge =
            ev.page !== undefined && ev.page !== null ? `<span class="badge badge-blue">Trang ${ev.page}</span>` : "";
          const anchorBadge = ev.anchor
            ? `<span class="badge badge-yellow" title="HTML Anchor">${this.escapeHtml(ev.anchor)}</span>`
            : "";
          return `
          <div class="${itemClass}">
            <div style="display: flex; gap: 6px; margin-bottom: 3px; align-items: center; flex-wrap: wrap;">
              <b>[${ev.type}]</b>
              ${statusBadge}
              ${sectionBadge}
              ${anchorBadge}
              ${pageBadge}
              <code style="font-size: 10px;">${this.escapeHtml(ev.term)}</code>
            </div>
            <div style="font-size: 11px; color: #1e293b; background: #f8fafc; padding: 4px; border-radius: 3px;">
              "${this.escapeHtml(ev.context)}"
            </div>
            ${ev.reason ? `<div style="font-size: 10px; color: #b45309; margin-top: 2px;">ℹ️ ${this.escapeHtml(ev.reason)}</div>` : ""}
          </div>
        `;
        })
        .join("");
      evidenceHtml = `
        <div class="evidence-box">
          <b>🔍 Bằng chứng trích xuất được (${result.evidence.length}):</b>
          <div style="margin-top: 6px;">${items}</div>
        </div>
      `;
    } else {
      evidenceHtml = `
        <div class="evidence-box" style="color: #64748b;">
          <i>Không tìm thấy bằng chứng IC-I/IC-E trực tiếp từ trang/PDF này.</i>
        </div>
      `;
    }

    // Screening update suggestion
    let screeningSuggestionHtml = "";
    if (result.suggestedScreeningUpdate) {
      const s = result.suggestedScreeningUpdate;
      const decBadge = this.getDecisionBadge(s.suggestedDecision);
      screeningSuggestionHtml = `
        <div class="notice-callout" style="margin-top: 8px;">
          <b>Gợi ý thẩm định (${s.stage}):</b> ${decBadge} — ${this.escapeHtml(s.screeningReason)}<br>
          <small style="color: #6b7280;">(Lưu ý: Quyết định cuối cùng <code>finalDecision</code> do bạn quyết định, hệ thống không tự ý thay đổi)</small>
        </div>
      `;
    }

    this.modalBody.innerHTML = `
      ${warningHtml}
      <div style="margin-bottom: 8px; font-size: 11px; color: #475569;">
        <span>🌐 <b>Nguồn:</b> <a href="${this.escapeHtml(result.extracted.sourceUrl)}" target="_blank">${this.escapeHtml(result.extracted.sourceUrl)}</a></span><br>
        <span>⚙️ <b>Phương thức trích xuất:</b> ${this.escapeHtml(result.extracted.method)}</span>
        ${result.extracted.pageCount ? ` | <span>📄 <b>Tổng số trang:</b> ${result.extracted.pageCount}</span>` : ""}
      </div>

      <div style="margin-top: 6px;">
        <b>So sánh các trường dữ liệu (Diff):</b>
        <table class="diff-table">
          <thead>
            <tr>
              <th style="width: 15%;">Trường</th>
              <th style="width: 35%;">Giá trị hiện tại</th>
              <th style="width: 35%;">Giá trị mới trích xuất</th>
              <th style="width: 15%;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${diffRows}
          </tbody>
        </table>
      </div>

      ${evidenceHtml}
      ${screeningSuggestionHtml}
    `;

    this.tabExtractModal.style.display = "flex";
  }

  private async handleConfirmTabExtract() {
    if (!this.pendingAnalysisResult || !this.pendingRecordId) {
      this.closeModal();
      return;
    }

    const record = this.uniqueRecords.find((r) => r.id === this.pendingRecordId);
    const allRecord = this.allRecords.find((r) => r.id === this.pendingRecordId);
    if (!record) {
      this.closeModal();
      return;
    }

    const { extracted, suggestedScreeningUpdate, evidence } = this.pendingAnalysisResult;

    // Cap nhat cac truong metadata neu co gia tri moi
    if (extracted.title) record.title = extracted.title;
    if (extracted.authors) {
      record.authors = extracted.authors;
      record.uncertain_authors = false;
    }
    if (extracted.year) {
      record.year = extracted.year;
      record.uncertain_year = false;
    }
    if (extracted.venue) {
      // QUY TẮC BẮT BUỘC: Không thay venue đã xác minh bằng tên nền tảng arXiv
      const isArxivVenue = /^\s*arxiv(\.org)?\s*$/i.test(extracted.venue);
      if (!isArxivVenue) {
        record.venue = extracted.venue;
        record.uncertain_venue = false;
      }
    }
    if (extracted.doi) {
      record.doi = extracted.doi;
      record.uncertain_doi = false;
    }
    if (extracted.abstract) {
      record.abstract = extracted.abstract;
      record.missing_abstract = false;
    }
    if (extracted.pdfUrl) record.pdfUrl = extracted.pdfUrl;
    if (extracted.pageCount) record.page_count = extracted.pageCount;

    // Ghi nhan PROVENANCE
    record.extracted_url = extracted.sourceUrl;
    record.extracted_at = new Date().toISOString();
    record.extraction_method = extracted.method;
    record.evidence_snippets = evidence;
    record.user_verified = true;
    // QUAN TRONG: query va retrieval_date goc duoc giu nguyen tuyet doi!

    // Cap nhat goi y screening tu dong (nhung GIU NGUYEN finalDecision)
    if (suggestedScreeningUpdate) {
      record.screeningStage = suggestedScreeningUpdate.stage;
      record.suggestedDecision = suggestedScreeningUpdate.suggestedDecision;
      record.matchedCriteria = suggestedScreeningUpdate.matchedCriteria;
      record.unknownCriteria = suggestedScreeningUpdate.unknownCriteria;
      record.missingEvidence = suggestedScreeningUpdate.missingEvidence;
      record.screeningReason = suggestedScreeningUpdate.screeningReason;
      // finalDecision KHONG bi thay doi boi he thong
    }

    // Dong bo ca vao allRecords
    if (allRecord) {
      Object.assign(allRecord, record);
    }

    await this.saveSessionToStorage();
    this.closeModal();
    this.renderRecordsList();
    this.setStatus(`✓ Đã cập nhật thành công dữ liệu và provenance cho bài báo #${record.id}`, "success");
  }

  private handleCancelTabExtract() {
    this.closeModal();
    this.setStatus("Đã hủy bỏ cập nhật. Toàn bộ dữ liệu cũ được giữ nguyên.", "info");
  }

  private closeModal() {
    if (this.tabExtractModal) {
      this.tabExtractModal.style.display = "none";
    }
    this.pendingAnalysisResult = null;
    this.pendingRecordId = null;
  }

  private async updatePaperDecision(paperId: string, decision: ScreeningDecision) {
    const record = this.allRecords.find((r) => r.id === paperId);
    if (record) record.finalDecision = decision;

    const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
    if (uniqueRecord) uniqueRecord.finalDecision = decision;

    await this.saveSessionToStorage();
    this.renderRecordsList();
  }

  private async updatePaperNotes(paperId: string, notes: string) {
    const record = this.allRecords.find((r) => r.id === paperId);
    if (record) record.userNotes = notes;

    const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
    if (uniqueRecord) uniqueRecord.userNotes = notes;

    await this.saveSessionToStorage();
  }

  private getDecisionBadge(decision: ScreeningDecision): string {
    if (decision === "Include") return '<span class="badge badge-green">Include</span>';
    if (decision === "Exclude") return '<span class="badge badge-red">Exclude</span>';
    return '<span class="badge badge-yellow">Unsure</span>';
  }

  // 1. Xuat CSV Metadata chuan 10 cot PRISMA
  private handleExportCsv() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để xuất.", "warning");
      return;
    }

    const headers = [
      "source",
      "title",
      "authors",
      "year",
      "venue",
      "doi",
      "abstract",
      "url",
      "query",
      "retrieval_date",
    ];

    const escapeCsv = (str: unknown) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let csvContent = "\uFEFF";
    csvContent += headers.join(",") + "\r\n";

    this.uniqueRecords.forEach((row) => {
      const line = [
        escapeCsv(row.source || row.discoverySource || "Google Scholar"),
        escapeCsv(row.title || ""),
        escapeCsv(row.authors || ""),
        escapeCsv(row.year || ""),
        escapeCsv(row.venue || ""),
        escapeCsv(row.doi || ""),
        escapeCsv(row.abstract || ""),
        escapeCsv(row.url || ""),
        escapeCsv(row.query || ""),
        escapeCsv(row.retrieval_date || ""),
      ].join(",");
      csvContent += line + "\r\n";
    });

    this.downloadFile(csvContent, "01_all_records.csv", "text/csv;charset=utf-8;");
    this.setStatus(
      `✓ Đã tải xuống file 01_all_records.csv (${this.uniqueRecords.length} bản ghi metadata chuẩn PRISMA).`,
      "success",
    );
  }

  // 2. Xuat CSV Screening Decisions day du quyet dinh & ghi chu
  private handleExportScreeningCsv() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để xuất.", "warning");
      return;
    }

    const headers = [
      "id",
      "source",
      "title",
      "year",
      "venue",
      "doi",
      "url",
      "screening_stage",
      "matched_criteria",
      "unknown_criteria",
      "missing_evidence",
      "suggested_decision",
      "screening_reason",
      "final_decision",
      "user_notes",
      "potential_duplicate",
      "duplicate_reason",
      "query",
      "retrieval_date",
    ];

    const escapeCsv = (str: unknown) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    let csvContent = "\uFEFF";
    csvContent += headers.join(",") + "\r\n";

    this.uniqueRecords.forEach((row) => {
      const line = [
        escapeCsv(row.id),
        escapeCsv(row.source || row.discoverySource || "Google Scholar"),
        escapeCsv(row.title || ""),
        escapeCsv(row.year || ""),
        escapeCsv(row.venue || ""),
        escapeCsv(row.doi || ""),
        escapeCsv(row.url || ""),
        escapeCsv(row.screeningStage || "V1"),
        escapeCsv((row.matchedCriteria || []).join("; ")),
        escapeCsv((row.unknownCriteria || []).join("; ")),
        escapeCsv((row.missingEvidence || []).join("; ")),
        escapeCsv(row.suggestedDecision || "Unsure"),
        escapeCsv(row.screeningReason || ""),
        escapeCsv(row.finalDecision || ""),
        escapeCsv(row.userNotes || ""),
        escapeCsv(row.potentialDuplicate ? "YES" : "NO"),
        escapeCsv(row.duplicateReason || ""),
        escapeCsv(row.query || ""),
        escapeCsv(row.retrieval_date || ""),
      ].join(",");
      csvContent += line + "\r\n";
    });

    this.downloadFile(csvContent, "02_screening_decisions.csv", "text/csv;charset=utf-8;");
    this.setStatus(`✓ Đã tải xuống file 02_screening_decisions.csv (Đầy đủ quyết định sàng lọc & ghi chú).`, "success");
  }

  // 3. Xuat Backup toan bo session JSON
  private handleExportSessionJson() {
    const sessionPayload = {
      timestamp: new Date().toISOString(),
      query: this.queryInput.value,
      filters: {
        as_ylo: this.asYloInput.value,
        as_yhi: this.asYhiInput.value,
        hl: this.hlInput.value,
      },
      stats: {
        apiRequestsUsed: this.apiRequestsUsed,
        totalCollected: this.allRecords.length,
        totalRetained: this.uniqueRecords.length,
        dedupStats: this.dedupStats,
        searchSummary: this.searchSummary,
      },
      records: this.uniqueRecords,
      rawEvidences: this.allEvidences,
    };

    const jsonContent = JSON.stringify(sessionPayload, null, 2);
    this.downloadFile(jsonContent, `session_backup_${Date.now()}.json`, "application/json");
    this.setStatus("✓ Đã tải file Backup Toàn Phiên (Bao gồm dữ liệu tất cả các trang & bằng chứng).", "success");
  }

  private downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Ghi search log vao search-log.md (Paper ung vien bo tro ngoai PRISMA)
  private async handleSaveLog() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để ghi nhật ký.", "warning");
      return;
    }

    const uiVal = this.uiTotalInput.value.trim();
    const uiTotal = uiVal ? parseInt(uiVal, 10) : undefined;

    const shuffled = [...this.uniqueRecords].sort(() => 0.5 - Math.random());
    const spotChecks = shuffled.slice(0, 5).map((r) => ({
      title: r.title,
      year: r.year,
      venue: r.venue,
      doi: r.doi,
      url: r.url,
    }));

    const payload = {
      query: this.queryInput.value.trim(),
      searchId: this.searchSummary?.searchId || `scholar_${Date.now()}`,
      method: "SerpApi",
      params: {
        engine: "google_scholar",
        as_ylo: this.asYloInput.value.trim() || "2020",
        as_yhi: this.asYhiInput.value.trim() || "2026",
        hl: this.hlInput.value.trim() || "vi",
        totalRequests: this.apiRequestsUsed,
      },
      apiTotalResults: this.searchSummary?.totalReportedResults || 0,
      uiTotalResults: uiTotal,
      collectedCount: this.allRecords.length,
      candidateCount: this.uniqueRecords.length,
      dedupStats: this.dedupStats,
      spotChecks,
      retrievalDate: new Date().toISOString().split("T")[0],
    };

    this.setStatus("Đang gửi nhật ký tới backend để lưu vào search-log.md...", "info");

    try {
      const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        this.setStatus(
          "✓ Đã ghi nhật ký vào search-log.md thành công (Ghi nhận số paper ứng viên bổ trợ ngoài PRISMA)!",
          "success",
        );
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      this.setStatus(`Lỗi ghi nhật ký: ${err.message}`, "error");
    }
  }

  private escapeHtml(text?: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new ScholarExtensionApp();
  app.init();
});
