"use strict";
(() => {
  // src/popup.ts
  var DEFAULT_BACKEND_URL = "http://localhost:3001";
  var STORAGE_KEY = "scholar_slr_session_v2";
  var ScholarExtensionApp = class {
    backendUrl = DEFAULT_BACKEND_URL;
    allRecords = [];
    uniqueRecords = [];
    dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
    searchSummary = null;
    allEvidences = [];
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
    backendUrlInput;
    searchFirstBtn;
    nextBtn;
    autoFetchBtn;
    stopBtn;
    resetBtn;
    exportCsvBtn;
    exportScreeningBtn;
    exportSessionBtn;
    saveLogBtn;
    statusDiv;
    backendStatusBadge;
    statsBox;
    resultsContainer;
    filterInput;
    filterDecisionSelect;
    async init() {
      this.bindDOMElements();
      this.attachEventListeners();
      await this.restoreSessionFromStorage();
      await this.checkBackendHealth();
    }
    bindDOMElements() {
      this.queryInput = document.getElementById("queryInput");
      this.asYloInput = document.getElementById("asYloInput");
      this.asYhiInput = document.getElementById("asYhiInput");
      this.hlInput = document.getElementById("hlInput");
      this.maxPagesInput = document.getElementById("maxPagesInput");
      this.uiTotalInput = document.getElementById("uiTotalInput");
      this.backendUrlInput = document.getElementById("backendUrlInput");
      if (this.backendUrlInput && this.backendUrlInput.value) {
        this.backendUrl = this.backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
      }
      this.searchFirstBtn = document.getElementById("searchFirstBtn");
      this.nextBtn = document.getElementById("nextBtn");
      this.autoFetchBtn = document.getElementById("autoFetchBtn");
      this.stopBtn = document.getElementById("stopBtn");
      this.resetBtn = document.getElementById("resetBtn");
      this.exportCsvBtn = document.getElementById("exportCsvBtn");
      this.exportScreeningBtn = document.getElementById("exportScreeningBtn");
      this.exportSessionBtn = document.getElementById("exportSessionBtn");
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
      this.resetBtn.addEventListener("click", () => this.handleResetSession());
      this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
      this.exportScreeningBtn.addEventListener("click", () => this.handleExportScreeningCsv());
      this.exportSessionBtn.addEventListener("click", () => this.handleExportSessionJson());
      this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());
      const loadStringABtn = document.getElementById("loadStringABtn");
      if (loadStringABtn) {
        loadStringABtn.addEventListener("click", () => {
          this.queryInput.value = '("REST API testing" OR "natural language requirement" OR "RESTestBench") AND ("equivalence partitioning" OR "boundary-value analysis" OR "boundary testing") AND ("fault detection" OR "mutant detection" OR "bugs found")';
          this.setStatus("\u0110\xE3 \u0111i\u1EC1n Chu\u1ED7i A (Ch\xEDnh th\u1EE9c theo review-protocol.md).", "info");
        });
      }
      const loadStringBBtn = document.getElementById("loadStringBBtn");
      if (loadStringBBtn) {
        loadStringBBtn.addEventListener("click", () => {
          this.queryInput.value = '("REST API" OR "RESTful API" OR "web API" OR "web service") AND ("boundary value analysis" OR "boundary value" OR "boundary testing" OR "equivalence partitioning") AND ("mutation testing" OR "mutants" OR "mutation score")';
          this.setStatus("\u0110\xE3 \u0111i\u1EC1n Chu\u1ED7i B (D\u1EF1 ph\xF2ng n\u1EDBi r\u1ED9ng theo review-protocol.md).", "info");
        });
      }
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
    // Luu phien lam viec vao chrome.storage.local de khong bi mat khi dong popup
    async saveSessionToStorage() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const state = {
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
          hl: this.hlInput.value
        };
        await chrome.storage.local.set({ [STORAGE_KEY]: state });
      }
    }
    // Khoi phuc phien lam viec khi mo lai popup
    async restoreSessionFromStorage() {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const res = await chrome.storage.local.get([STORAGE_KEY]);
        const state = res[STORAGE_KEY];
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
          this.setStatus(`\u2713 \u0110\xE3 kh\xF4i ph\u1EE5c phi\xEAn l\xE0m vi\u1EC7c tr\u01B0\u1EDBc: ${this.allRecords.length} b\u1EA3n ghi (Offset ti\u1EBFp theo: start=${this.currentStart}).`, "info");
        }
      }
    }
    async handleResetSession() {
      if (!confirm("B\u1EA1n c\xF3 ch\u1EAFc ch\u1EAFn mu\u1ED1n x\xF3a to\xE0n b\u1ED9 phi\xEAn hi\u1EC7n t\u1EA1i \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u l\u01B0\u1EE3t t\xECm ki\u1EBFm m\u1EDBi?")) {
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
      this.resultsContainer.innerHTML = '<div class="empty-state">\u0110\xE3 l\xE0m m\u1EDBi phi\xEAn. B\u1EA5m "L\u1EA5y trang 1" \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u thu th\u1EADp.</div>';
      this.setButtonsState(false);
      this.setStatus("\u0110\xE3 l\xE0m m\u1EDBi phi\xEAn l\xE0m vi\u1EC7c th\xE0nh c\xF4ng.", "info");
    }
    async checkBackendHealth() {
      try {
        const res = await fetch(`${this.backendUrl}/api/health`, { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          this.apiRequestsUsed = Math.max(this.apiRequestsUsed, data.totalApiRequestsUsed || 0);
          this.backendStatusBadge.innerHTML = `\u25CF Backend Online (3001) | Key: ${data.isKeyConfigured ? "\u2713 S\u1EB5n s\xE0ng" : "\u26A0 Ch\u01B0a th\u1EA5y trong .env"}`;
          this.backendStatusBadge.className = data.isKeyConfigured ? "badge badge-green" : "badge badge-yellow";
        } else {
          throw new Error("HTTP " + res.status);
        }
      } catch {
        this.backendStatusBadge.innerHTML = `\u2715 Ch\u01B0a b\u1EADt Backend Node.js. H\xE3y ch\u1EA1y: <code>cd backend && npm start</code>`;
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
      this.allEvidences = [];
      this.isCancelled = false;
      const success = await this.fetchSinglePage(0, true);
      if (success) {
        this.currentStart = 10;
        await this.saveSessionToStorage();
      }
    }
    // 2. Lay trang tiep theo
    async handleFetchNextPage() {
      if (this.isFetching) return;
      const offsetToFetch = this.currentStart;
      const success = await this.fetchSinglePage(offsetToFetch, false);
      if (success) {
        this.currentStart += 10;
        await this.saveSessionToStorage();
      }
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
      let pagesFetched = 0;
      while (pagesFetched < maxPages && !this.isCancelled) {
        const pageIndex = Math.floor(this.currentStart / 10) + 1;
        this.setStatus(`\u0110ang t\u1EA3i trang ${pageIndex}... (offset start=${this.currentStart})`, "info");
        const success = await this.fetchSinglePage(this.currentStart, false);
        if (!success || this.isCancelled) {
          break;
        }
        this.currentStart += 10;
        pagesFetched++;
        await this.saveSessionToStorage();
        await new Promise((r) => setTimeout(r, 600));
      }
      this.stopBtn.style.display = "none";
      this.autoFetchBtn.disabled = false;
      if (this.isCancelled) {
        this.setStatus(`\u0110\xE3 d\u1EEBng qu\xE1 tr\xECnh l\u1EA5y d\u1EEF li\u1EC7u. D\u1EEF li\u1EC7u c\xE1c trang tr\u01B0\u1EDBc \u0111\u01B0\u1EE3c b\u1EA3o to\xE0n an to\xE0n!`, "warning");
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
        if (data.evidence) {
          this.allEvidences.push(data.evidence);
        }
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
        this.setStatus(`L\u1ED7i khi l\u1EA5y d\u1EEF li\u1EC7u: ${err.message}. Offset ch\u01B0a t\u0103ng, d\u1EEF li\u1EC7u c\u0169 gi\u1EEF nguy\xEAn an to\xE0n!`, "error");
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
    updateStatsDisplay() {
      this.statsBox.style.display = "block";
      const s = this.searchSummary;
      const cacheLabel = s?.fromCache ? '<span class="badge badge-yellow">T\u1EEB cache SerpApi</span>' : '<span class="badge badge-green">Live API</span>';
      const totalReported = s?.totalReportedResults ? s.totalReportedResults.toLocaleString() : "N/A";
      this.statsBox.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 Request API \u0111\xE3 d\xF9ng</div>
          <div class="stat-value">${this.apiRequestsUsed}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">T\u1ED5ng k\u1EBFt qu\u1EA3 ngu\u1ED3n b\xE1o</div>
          <div class="stat-value">${totalReported} <small class="text-muted">(\u01AF\u1EDBc l\u01B0\u1EE3ng)</small></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">S\u1ED1 record thu th\u1EADp th\u1EF1c t\u1EBF</div>
          <div class="stat-value text-blue">${this.allRecords.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Paper \u1EE9ng vi\xEAn duy nh\u1EA5t</div>
          <div class="stat-value text-green">${this.uniqueRecords.length}</div>
        </div>
      </div>
      <div class="stat-sub">
        <span><b>M\xE3 t\xECm ki\u1EBFm:</b> <code>${s?.searchId || "N/A"}</code></span>
        <span><b>Tr\u1EA1ng th\xE1i:</b> ${cacheLabel}</span>
        <span><b>Tr\xF9ng DOI:</b> ${this.dedupStats.exactDupByDoi} | <b>Tr\xF9ng Title (gi\u1EEF l\u1EA1i):</b> ${this.dedupStats.potentialDupByTitle}</span>
      </div>
      <div class="notice-callout">
        <b>Quy \u0111\u1ECBnh Protocol RBL:</b> Ngu\u1ED3n Google Scholar ch\u1EC9 l\xE0 paper \u1EE9ng vi\xEAn b\u1ED5 tr\u1EE3, <b>kh\xF4ng t\xEDnh tr\u1EF1c ti\u1EBFp v\xE0o Identification c\u1EE7a s\u01A1 \u0111\u1ED3 PRISMA ch\xEDnh</b>. Kh\xF4ng coi <code>snippet</code> l\xE0 abstract.
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
        const dupWarning = r.potentialDuplicate ? `<div class="dup-badge">\u26A0\uFE0F \u0110\u1EC0 XU\u1EA4T TR\xD9NG L\u1EB6P: ${this.escapeHtml(r.duplicateReason || "")}</div>` : "";
        const matchedCriteriaStr = (r.matchedCriteria || []).map((c) => `<span class="badge badge-blue">${c}</span>`).join(" ");
        return `
        <div class="paper-card ${r.potentialDuplicate ? "paper-dup" : ""}" id="paper_${r.id}">
          ${dupWarning}
          <div class="paper-header">
            <span class="paper-index">#${idx + 1}</span>
            <a href="${r.url || "#"}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
          </div>

          <div class="paper-meta">
            <span>\u{1F464} <b>T\xE1c gi\u1EA3:</b> ${this.escapeHtml(r.authors || "N/A")} ${r.uncertain_authors ? '<span class="tag-warn">C\u1EA7n x\xE1c minh</span>' : ""}</span>
            <span>\u{1F4C5} <b>N\u0103m:</b> ${r.year || "N/A"} ${r.uncertain_year ? '<span class="tag-warn">Ch\u01B0a ch\u1EAFc ch\u1EAFn</span>' : ""}</span>
            <span>\u{1F3DB}\uFE0F <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")} ${r.uncertain_venue ? '<span class="tag-warn">C\u1EA7n x\xE1c minh</span>' : ""}</span>
            <span>\u{1F517} <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Tr\u1ED1ng (C\u1EA7n x\xE1c minh)</span>'}</span>
          </div>

          <div class="paper-snippet">
            <b>\u0110o\u1EA1n tr\xEDch (Snippet) [Kh\xF4ng ph\u1EA3i Abstract]:</b><br>
            <i>"${this.escapeHtml(r.snippet || "Kh\xF4ng c\xF3 \u0111o\u1EA1n tr\xEDch.")}"</i>
          </div>

          <div class="screening-panel">
            <div class="screening-header">
              <span><b>G\u1EE3i \xFD V1:</b> ${decisionBadge}</span>
              <span><b>Ti\xEAu ch\xED kh\u1EDBp:</b> ${matchedCriteriaStr || '<small class="text-muted">Ch\u01B0a kh\u1EDBp</small>'}</span>
            </div>
            <div class="reason-text">${this.escapeHtml(r.screeningReason)}</div>

            <div class="decision-buttons" data-id="${r.id}">
              <span class="decision-label">X\xE1c nh\u1EADn c\u1EE7a b\u1EA1n (finalDecision):</span>
              <button class="btn-dec ${isInclude ? "active-inc" : ""}" data-decision="Include">\u2713 Include</button>
              <button class="btn-dec ${isExclude ? "active-exc" : ""}" data-decision="Exclude">\u2717 Exclude</button>
              <button class="btn-dec ${isUnsure ? "active-uns" : ""}" data-decision="Unsure">? Unsure</button>
            </div>
            <div class="user-notes-row">
              <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi ch\xFA th\u1EA9m \u0111\u1ECBnh c\u1EE7a b\u1EA1n (v\xED d\u1EE5: l\xFD do nh\u1EADn/lo\u1EA1i, ph\u01B0\u01A1ng ph\xE1p REST API)..." value="${this.escapeHtml(r.userNotes || "")}">
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
    async updatePaperDecision(paperId, decision) {
      const record = this.allRecords.find((r) => r.id === paperId);
      if (record) record.finalDecision = decision;
      const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
      if (uniqueRecord) uniqueRecord.finalDecision = decision;
      await this.saveSessionToStorage();
      this.renderRecordsList();
    }
    async updatePaperNotes(paperId, notes) {
      const record = this.allRecords.find((r) => r.id === paperId);
      if (record) record.userNotes = notes;
      const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
      if (uniqueRecord) uniqueRecord.userNotes = notes;
      await this.saveSessionToStorage();
    }
    getDecisionBadge(decision) {
      if (decision === "Include") return '<span class="badge badge-green">Include</span>';
      if (decision === "Exclude") return '<span class="badge badge-red">Exclude</span>';
      return '<span class="badge badge-yellow">Unsure</span>';
    }
    // 1. Xuat CSV Metadata chuan 10 cot PRISMA
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
          escapeCsv(row.url || ""),
          escapeCsv(row.query || ""),
          escapeCsv(row.retrieval_date || "")
        ].join(",");
        csvContent += line + "\r\n";
      });
      this.downloadFile(csvContent, "01_all_records.csv", "text/csv;charset=utf-8;");
      this.setStatus(`\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 01_all_records.csv (${this.uniqueRecords.length} b\u1EA3n ghi metadata chu\u1EA9n PRISMA).`, "success");
    }
    // 2. Xuat CSV Screening Decisions day du quyet dinh & ghi chu
    handleExportScreeningCsv() {
      if (this.uniqueRecords.length === 0) {
        this.setStatus("Ch\u01B0a c\xF3 b\u1EA3n ghi n\xE0o \u0111\u1EC3 xu\u1EA5t.", "warning");
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
        "suggested_decision",
        "screening_reason",
        "final_decision",
        "user_notes",
        "potential_duplicate",
        "duplicate_reason",
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
          escapeCsv(row.id),
          escapeCsv(row.source || row.discoverySource || "Google Scholar"),
          escapeCsv(row.title || ""),
          escapeCsv(row.year || ""),
          escapeCsv(row.venue || ""),
          escapeCsv(row.doi || ""),
          escapeCsv(row.url || ""),
          escapeCsv(row.screeningStage || "V1"),
          escapeCsv((row.matchedCriteria || []).join("; ")),
          escapeCsv(row.suggestedDecision || "Unsure"),
          escapeCsv(row.screeningReason || ""),
          escapeCsv(row.finalDecision || ""),
          escapeCsv(row.userNotes || ""),
          escapeCsv(row.potentialDuplicate ? "YES" : "NO"),
          escapeCsv(row.duplicateReason || ""),
          escapeCsv(row.query || ""),
          escapeCsv(row.retrieval_date || "")
        ].join(",");
        csvContent += line + "\r\n";
      });
      this.downloadFile(csvContent, "02_screening_decisions.csv", "text/csv;charset=utf-8;");
      this.setStatus(`\u2713 \u0110\xE3 t\u1EA3i xu\u1ED1ng file 02_screening_decisions.csv (\u0110\u1EA7y \u0111\u1EE7 quy\u1EBFt \u0111\u1ECBnh s\xE0ng l\u1ECDc & ghi ch\xFA).`, "success");
    }
    // 3. Xuat Backup toan bo session JSON
    handleExportSessionJson() {
      const sessionPayload = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        query: this.queryInput.value,
        filters: {
          as_ylo: this.asYloInput.value,
          as_yhi: this.asYhiInput.value,
          hl: this.hlInput.value
        },
        stats: {
          apiRequestsUsed: this.apiRequestsUsed,
          totalCollected: this.allRecords.length,
          totalRetained: this.uniqueRecords.length,
          dedupStats: this.dedupStats,
          searchSummary: this.searchSummary
        },
        records: this.uniqueRecords,
        rawEvidences: this.allEvidences
      };
      const jsonContent = JSON.stringify(sessionPayload, null, 2);
      this.downloadFile(jsonContent, `session_backup_${Date.now()}.json`, "application/json");
      this.setStatus("\u2713 \u0110\xE3 t\u1EA3i file Backup To\xE0n Phi\xEAn (Bao g\u1ED3m d\u1EEF li\u1EC7u t\u1EA5t c\u1EA3 c\xE1c trang & b\u1EB1ng ch\u1EE9ng).", "success");
    }
    downloadFile(content, filename, type) {
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
        candidateCount: this.uniqueRecords.length,
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
          this.setStatus("\u2713 \u0110\xE3 ghi nh\u1EADt k\xFD v\xE0o search-log.md th\xE0nh c\xF4ng (Ghi nh\u1EADn s\u1ED1 paper \u1EE9ng vi\xEAn b\u1ED5 tr\u1EE3 ngo\xE0i PRISMA)!", "success");
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
