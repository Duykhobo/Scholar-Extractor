"use strict";
(() => {
  // src/popup.ts
  var DEFAULT_BACKEND_URL = "http://localhost:3001";
  var ScholarExtensionApp = class {
    backendUrl = DEFAULT_BACKEND_URL;
    allRecords = [];
    uniqueRecords = [];
    dedupStats = { initialCount: 0, dupByDoi: 0, dupByTitle: 0, totalUnique: 0 };
    searchSummary = null;
    lastSanitizedEvidence = null;
    currentStart = 0;
    isFetching = false;
    isCancelled = false;
    apiRequestsUsed = 0;
    // DOM Elements
    queryInput;
    asYloInput;
    asYhiInput;
    hlInput;
    maxPagesInput;
    uiTotalInput;
    searchFirstBtn;
    nextBtn;
    autoFetchBtn;
    stopBtn;
    exportCsvBtn;
    exportJsonBtn;
    saveLogBtn;
    statusDiv;
    backendStatusBadge;
    statsBox;
    resultsContainer;
    filterInput;
    filterDecisionSelect;
    init() {
      this.bindDOMElements();
      this.attachEventListeners();
      this.checkBackendHealth();
    }
    bindDOMElements() {
      this.queryInput = document.getElementById("queryInput");
      this.asYloInput = document.getElementById("asYloInput");
      this.asYhiInput = document.getElementById("asYhiInput");
      this.hlInput = document.getElementById("hlInput");
      this.maxPagesInput = document.getElementById("maxPagesInput");
      this.uiTotalInput = document.getElementById("uiTotalInput");
      this.searchFirstBtn = document.getElementById("searchFirstBtn");
      this.nextBtn = document.getElementById("nextBtn");
      this.autoFetchBtn = document.getElementById("autoFetchBtn");
      this.stopBtn = document.getElementById("stopBtn");
      this.exportCsvBtn = document.getElementById("exportCsvBtn");
      this.exportJsonBtn = document.getElementById("exportJsonBtn");
      this.saveLogBtn = document.getElementById("saveLogBtn");
      this.statusDiv = document.getElementById("status");
      this.backendStatusBadge = document.getElementById("backendStatusBadge");
      this.statsBox = document.getElementById("statsBox");
      this.resultsContainer = document.getElementById("resultsContainer");
      this.filterInput = document.getElementById("filterInput");
      this.filterDecisionSelect = document.getElementById("filterDecisionSelect");
    }
    attachEventListeners() {
      this.searchFirstBtn.addEventListener("click", () => this.handleSearchFirstPage());
      this.nextBtn.addEventListener("click", () => this.handleFetchNextPage());
      this.autoFetchBtn.addEventListener("click", () => this.handleAutoFetchPages());
      this.stopBtn.addEventListener("click", () => this.handleStopFetch());
      this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
      this.exportJsonBtn.addEventListener("click", () => this.handleExportJson());
      this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());
      this.filterInput.addEventListener("input", () => this.renderRecordsList());
      this.filterDecisionSelect.addEventListener("change", () => this.renderRecordsList());
    }
    setStatus(msg, type = "info") {
      this.statusDiv.innerText = msg;
      const colors = {
        info: "#2563eb",
        success: "#16a34a",
        error: "#dc2626",
        warning: "#d97706"
      };
      this.statusDiv.style.color = colors[type];
    }
    async checkBackendHealth() {
      try {
        const res = await fetch(`${this.backendUrl}/api/health`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          this.apiRequestsUsed = data.totalApiRequestsUsed || 0;
          this.backendStatusBadge.innerHTML = `\u25CF Backend Online (C\u1ED5ng 3001) | Key: ${data.isKeyConfigured ? "\u2713 \u0110\xE3 s\u1EB5n s\xE0ng" : "\u26A0 Ch\u01B0a th\u1EA5y trong .env"}`;
          this.backendStatusBadge.className = data.isKeyConfigured ? "badge badge-green" : "badge badge-yellow";
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch {
        this.backendStatusBadge.innerHTML = `\u2715 Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c Backend Node.js t\u1EA1i ${this.backendUrl}. H\xE3y m\u1EDF terminal v\xE0 ch\u1EA1y: <code>cd backend && npm start</code>`;
        this.backendStatusBadge.className = "badge badge-red";
      }
    }
    // 1. Tim kiem trang dau tien (start = 0)
    async handleSearchFirstPage() {
      const q = this.queryInput.value.trim();
      if (!q) {
        this.setStatus("Vui l\xF2ng nh\u1EADp chu\u1ED7i t\xECm ki\u1EBFm nguy\xEAn v\u0103n.", "warning");
        return;
      }
      this.currentStart = 0;
      this.allRecords = [];
      this.uniqueRecords = [];
      this.isCancelled = false;
      await this.fetchSinglePage(0, true);
    }
    // 2. Lay trang tiep theo
    async handleFetchNextPage() {
      if (this.isFetching) return;
      this.currentStart += 10;
      await this.fetchSinglePage(this.currentStart, false);
    }
    // 3. Tu dong lay toi da N trang
    async handleAutoFetchPages() {
      const q = this.queryInput.value.trim();
      if (!q) {
        this.setStatus("Vui l\xF2ng nh\u1EADp chu\u1ED7i t\xECm ki\u1EBFm nguy\xEAn v\u0103n.", "warning");
        return;
      }
      const maxPages = Math.max(1, parseInt(this.maxPagesInput.value, 10) || 1);
      this.isCancelled = false;
      this.stopBtn.style.display = "inline-block";
      this.autoFetchBtn.disabled = true;
      if (this.allRecords.length === 0) {
        this.currentStart = 0;
      } else {
        this.currentStart += 10;
      }
      const initialStart = this.currentStart;
      const targetEndStart = initialStart + maxPages * 10;
      while (this.currentStart < targetEndStart && !this.isCancelled) {
        const pageIndex = Math.floor(this.currentStart / 10) + 1;
        this.setStatus(`\u0110ang t\u1EA3i trang ${pageIndex}... (offset start=${this.currentStart})`, "info");
        const success = await this.fetchSinglePage(this.currentStart, false);
        if (!success || this.isCancelled) {
          break;
        }
        this.currentStart += 10;
        await new Promise((r) => setTimeout(r, 500));
      }
      this.stopBtn.style.display = "none";
      this.autoFetchBtn.disabled = false;
      if (this.isCancelled) {
        this.setStatus(`\u0110\xE3 d\u1EEBng qu\xE1 tr\xECnh l\u1EA5y d\u1EEF li\u1EC7u theo l\u1EC7nh ng\u01B0\u1EDDi d\xF9ng. \u0110\xE3 b\u1EA3o to\xE0n c\xE1c trang tr\u01B0\u1EDBc!`, "warning");
      }
    }
    handleStopFetch() {
      this.isCancelled = true;
      this.setStatus("\u0110ang d\u1EEBng y\xEAu c\u1EA7u...", "warning");
    }
    // Goi backend de lay 1 trang
    async fetchSinglePage(startOffset, isReset) {
      const q = this.queryInput.value.trim();
      const as_ylo = this.asYloInput.value.trim() || "2020";
      const as_yhi = this.asYhiInput.value.trim() || "2026";
      const hl = this.hlInput.value.trim() || "vi";
      this.isFetching = true;
      this.setButtonsState(true);
      this.setStatus(`\u0110ang g\u1ECDi SerpApi Google Scholar (start=${startOffset})...`, "info");
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
            num: 10
          })
        });
        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "L\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh t\u1EEB backend.");
        }
        const newRecords = data.records || [];
        this.searchSummary = data.summary;
        this.lastSanitizedEvidence = data.evidence;
        this.apiRequestsUsed = data.summary?.apiRequestsUsed || this.apiRequestsUsed + 1;
        if (isReset) {
          this.allRecords = newRecords;
        } else {
          this.allRecords = [...this.allRecords, ...newRecords];
        }
        await this.runDeduplication();
        this.updateStatsDisplay();
        this.renderRecordsList();
        if (newRecords.length === 0) {
          this.setStatus(`Trang n\xE0y kh\xF4ng c\xF3 th\xEAm b\xE0i vi\u1EBFt n\xE0o. \u0110\xE3 h\u1EBFt k\u1EBFt qu\u1EA3.`, "warning");
          return false;
        }
        const cacheText = data.summary?.fromCache ? "(T\u1EEB cache SerpApi)" : "(Live API)";
        this.setStatus(`\u2713 \u0110\xE3 nh\u1EADn ${newRecords.length} b\xE0i vi\u1EBFt m\u1EDBi. T\u1ED5ng t\xEDch l\u0169y: ${this.allRecords.length} (Duy nh\u1EA5t: ${this.uniqueRecords.length}) ${cacheText}`, "success");
        return true;
      } catch (err) {
        this.setStatus(`L\u1ED7i khi l\u1EA5y d\u1EEF li\u1EC7u: ${err.message}. C\xE1c b\u1EA3n ghi \u0111\xE3 l\u1EA5y tr\u01B0\u1EDBc \u0111\xF3 v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF nguy\xEAn an to\xE0n!`, "error");
        return false;
      } finally {
        this.isFetching = false;
        this.setButtonsState(false);
      }
    }
    async runDeduplication() {
      try {
        const res = await fetch(`${this.backendUrl}/api/scholar/dedup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ records: this.allRecords })
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
    setButtonsState(busy) {
      this.searchFirstBtn.disabled = busy;
      this.nextBtn.disabled = busy;
      if (!busy) {
        this.nextBtn.style.display = this.allRecords.length > 0 ? "inline-block" : "none";
        this.autoFetchBtn.style.display = this.allRecords.length > 0 ? "inline-block" : "none";
        this.exportCsvBtn.style.display = this.allRecords.length > 0 ? "inline-block" : "none";
        this.exportJsonBtn.style.display = this.allRecords.length > 0 ? "inline-block" : "none";
        this.saveLogBtn.style.display = this.allRecords.length > 0 ? "inline-block" : "none";
      }
    }
    updateStatsDisplay() {
      this.statsBox.style.display = "block";
      const s = this.searchSummary;
      const cacheLabel = s?.fromCache ? '<span class="badge badge-yellow">T\u1EEB cache SerpApi</span>' : '<span class="badge badge-green">Live API</span>';
      const totalReported = s?.totalReportedResults?.toLocaleString() || "0";
      this.statsBox.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 Request API \u0111\xE3 d\xF9ng</div>
          <div class="stat-value">${this.apiRequestsUsed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">T\u1ED5ng k\u1EBFt qu\u1EA3 ngu\u1ED3n b\xE1o (Scholar)</div>
          <div class="stat-value">${totalReported} <small class="text-muted">(\u01AF\u1EDBc l\u01B0\u1EE3ng)</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 record thu th\u1EADp th\u1EF1c t\u1EBF</div>
          <div class="stat-value text-blue">${this.allRecords.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 paper sau b\u1ECF tr\xF9ng</div>
          <div class="stat-value text-green">${this.uniqueRecords.length}</div>
        </div>
      </div>
      <div class="stat-sub">
        <span><b>M\xE3 t\xECm ki\u1EBFm:</b> <code>${s?.searchId || "N/A"}</code></span>
        <span><b>Tr\u1EA1ng th\xE1i:</b> ${cacheLabel}</span>
        <span><b>Tr\xF9ng l\u1EB7p:</b> DOI: ${this.dedupStats.dupByDoi} | Title: ${this.dedupStats.dupByTitle}</span>
      </div>
      <div class="notice-callout">
        <b>Quy t\u1EAFc SLR/PRISMA:</b> Kh\xF4ng coi <code>total_results</code> l\xE0 s\u1ED1 paper \u0111\xE3 thu th\u1EADp. Kh\xF4ng coi <code>snippet</code> l\xE0 abstract.
      </div>
    `;
    }
    renderRecordsList() {
      const keyword = this.filterInput.value.toLowerCase().trim();
      const decisionFilter = this.filterDecisionSelect.value;
      const filtered = this.uniqueRecords.filter((r) => {
        const effectiveDecision = r.finalDecision || r.suggestedDecision;
        if (decisionFilter !== "all" && effectiveDecision !== decisionFilter) {
          return false;
        }
        if (keyword) {
          const text = `${r.title} ${r.authors} ${r.venue} ${r.year} ${r.doi} ${r.snippet}`.toLowerCase();
          if (!text.includes(keyword)) return false;
        }
        return true;
      });
      if (filtered.length === 0) {
        this.resultsContainer.innerHTML = '<div class="empty-state">Kh\xF4ng c\xF3 b\xE0i vi\u1EBFt n\xE0o kh\u1EDBp v\u1EDBi b\u1ED9 l\u1ECDc hi\u1EC7n t\u1EA1i.</div>';
        return;
      }
      this.resultsContainer.innerHTML = filtered.map((r, idx) => {
        const decisionBadge = this.getDecisionBadge(r.suggestedDecision);
        const isInclude = (r.finalDecision || r.suggestedDecision) === "Include";
        const isExclude = (r.finalDecision || r.suggestedDecision) === "Exclude";
        const isUnsure = (r.finalDecision || r.suggestedDecision) === "Unsure";
        return `
        <div class="paper-card" id="paper_${r.id}">
          <div class="paper-header">
            <span class="paper-index">#${idx + 1}</span>
            <a href="${r.url || "#"}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
          </div>

          <div class="paper-meta">
            <span>\u{1F464} <b>T\xE1c gi\u1EA3:</b> ${this.escapeHtml(r.authors || "N/A")} ${r.uncertain_authors ? '<span class="tag-warn">C\u1EA7n x\xE1c minh</span>' : ""}</span>
            <span>\u{1F4C5} <b>N\u0103m:</b> ${r.year || "N/A"} ${r.uncertain_year ? '<span class="tag-warn">Ch\u01B0a ch\u1EAFc ch\u1EAFn</span>' : ""}</span>
            <span>\u{1F3DB}\uFE0F <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")} ${r.uncertain_venue ? '<span class="tag-warn">C\u1EA7n x\xE1c minh</span>' : ""}</span>
            <span>\u{1F517} <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Tr\u1ED1ng (Scholar kh\xF4ng c\xF3 s\u1EB5n)</span>'}</span>
          </div>

          <div class="paper-snippet">
            <b>\u0110o\u1EA1n tr\xEDch (Snippet) [Kh\xF4ng ph\u1EA3i Abstract]:</b><br>
            <i>"${this.escapeHtml(r.snippet || "Kh\xF4ng c\xF3 \u0111o\u1EA1n tr\xEDch.")}"</i>
          </div>

          <div class="screening-panel">
            <div class="screening-header">
              <span><b>G\u1EE3i \xFD AI:</b> ${decisionBadge}</span>
              <span class="reason-text">${this.escapeHtml(r.screeningReason)}</span>
            </div>

            <div class="decision-buttons" data-id="${r.id}">
              <span class="decision-label">X\xE1c nh\u1EADn c\u1EE7a b\u1EA1n (finalDecision):</span>
              <button class="btn-dec ${isInclude ? "active-inc" : ""}" data-decision="Include">\u2713 Include</button>
              <button class="btn-dec ${isExclude ? "active-exc" : ""}" data-decision="Exclude">\u2717 Exclude</button>
              <button class="btn-dec ${isUnsure ? "active-uns" : ""}" data-decision="Unsure">? Unsure</button>
            </div>
            <div class="user-notes-row">
              <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi ch\xFA th\u1EA9m \u0111\u1ECBnh c\u1EE7a b\u1EA1n..." value="${this.escapeHtml(r.userNotes || "")}">
            </div>
          </div>
        </div>
      `;
      }).join("");
      this.resultsContainer.querySelectorAll(".btn-dec").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget;
          const parent = target.closest(".decision-buttons");
          const paperId = parent.getAttribute("data-id");
          const decision = target.getAttribute("data-decision");
          this.updatePaperDecision(paperId, decision);
        });
      });
      this.resultsContainer.querySelectorAll(".notes-input").forEach((inp) => {
        inp.addEventListener("change", (e) => {
          const target = e.currentTarget;
          const paperId = target.getAttribute("data-id");
          this.updatePaperNotes(paperId, target.value);
        });
      });
    }
    updatePaperDecision(paperId, decision) {
      const record = this.allRecords.find((r) => r.id === paperId);
      if (record) {
        record.finalDecision = decision;
      }
      const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
      if (uniqueRecord) {
        uniqueRecord.finalDecision = decision;
      }
      this.renderRecordsList();
    }
    updatePaperNotes(paperId, notes) {
      const record = this.allRecords.find((r) => r.id === paperId);
      if (record) record.userNotes = notes;
      const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
      if (uniqueRecord) uniqueRecord.userNotes = notes;
    }
    getDecisionBadge(decision) {
      if (decision === "Include") return '<span class="badge badge-green">Include</span>';
      if (decision === "Exclude") return '<span class="badge badge-red">Exclude</span>';
      return '<span class="badge badge-yellow">Unsure</span>';
    }
    // Xuat CSV
    handleExportCsv() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t.", "warning");
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
        "retrieval_date"
      ];
      const escapeCsv = (str) => {
        if (str === null || str === void 0) return '""';
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
          // Khong coi snippet la abstract
          escapeCsv(row.url || ""),
          escapeCsv(row.query || ""),
          escapeCsv(row.retrieval_date || "")
        ].join(",");
        csvContent += line + "\r\n";
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "01_all_records.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.setStatus(`\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 01_all_records.csv (${this.uniqueRecords.length} b\u1EA3n ghi chu\u1EA9n UTF-8 BOM).`, "success");
    }
    // Xuat JSON bang chung (da scrub sach moi credential)
    handleExportJson() {
      if (!this.lastSanitizedEvidence) {
        this.setStatus("Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u b\u1EB1ng ch\u1EE9ng JSON.", "warning");
        return;
      }
      const blob = new Blob([JSON.stringify(this.lastSanitizedEvidence, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence_${this.searchSummary?.searchId || "scholar"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i file JSON B\u1EB1ng ch\u1EE9ng (\u0110\xE3 lo\u1EA1i b\u1ECF d\u1EEF li\u1EC7u nh\u1EA1y c\u1EA3m).", "success");
    }
    // Ghi search log vao search-log.md
    async handleSaveLog() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 ghi nh\u1EADt k\xFD.", "warning");
        return;
      }
      const uiVal = this.uiTotalInput.value.trim();
      const uiTotal = uiVal ? parseInt(uiVal, 10) : void 0;
      const shuffled = [...this.uniqueRecords].sort(() => 0.5 - Math.random());
      const spotChecks = shuffled.slice(0, 5).map((r) => ({
        title: r.title,
        year: r.year,
        venue: r.venue,
        doi: r.doi,
        url: r.url
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
          totalRequests: this.apiRequestsUsed
        },
        apiTotalResults: this.searchSummary?.totalReportedResults || 0,
        uiTotalResults: uiTotal,
        collectedCount: this.allRecords.length,
        uniqueCount: this.uniqueRecords.length,
        dedupStats: this.dedupStats,
        spotChecks,
        retrievalDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
      };
      this.setStatus("\u0110ang g\u1EEDi nh\u1EADt k\xFD t\u1EDBi backend \u0111\u1EC3 l\u01B0u v\xE0o search-log.md...", "info");
      try {
        const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          this.setStatus("\u2713 \u0110\xE3 ghi nh\u1EADt k\xFD v\xE0o search-log.md th\xE0nh c\xF4ng (kh\xF4ng ghi \u0111\xE8 l\u01B0\u1EE3t t\xECm tr\u01B0\u1EDBc)!", "success");
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        this.setStatus(`L\u1ED7i ghi nh\u1EADt k\xFD: ${err.message}`, "error");
      }
    }
    escapeHtml(text) {
      if (!text) return "";
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    const app = new ScholarExtensionApp();
    app.init();
  });
})();
