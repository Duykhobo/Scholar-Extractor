"use strict";
(() => {
  // src/popup.ts
  var BACKEND_URL = "http://localhost:3001";
  var STORAGE_COL_ID = "scholar_active_col_id_v9";
  var STORAGE_STAGE = "scholar_stage_v9";
  var activeColId = "";
  var activeRunId = "";
  var pollingTimer = null;
  function el(id) {
    return document.getElementById(id);
  }
  function showStatus(msg, kind = "green") {
    const badge = el("backendStatusBadge");
    badge.textContent = msg;
    badge.className = `badge badge-${kind}`;
  }
  async function apiFetch(path, opts) {
    const res = await fetch(BACKEND_URL + path, {
      headers: { "Content-Type": "application/json" },
      ...opts
    });
    return res.json();
  }
  var STAGES = ["COLLECT", "DEDUP", "FILTER", "EXPORT"];
  var PANEL_IDS = {
    COLLECT: "panelCollect",
    DEDUP: "panelDedup",
    FILTER: "panelFilter",
    EXPORT: "panelExport"
  };
  function switchStage(stage) {
    chrome.storage?.local?.set({ [STORAGE_STAGE]: stage });
    STAGES.forEach((s) => {
      const panel = document.getElementById(PANEL_IDS[s]);
      const btn = el(`stepBtn${s.charAt(0) + s.slice(1).toLowerCase()}`);
      if (panel) panel.style.display = s === stage ? "block" : "none";
      if (btn) btn.classList.toggle("active", s === stage);
    });
    if (stage === "DEDUP") loadDupGroups();
    if (stage === "FILTER") loadCanonicalList();
    if (stage === "EXPORT") updateExportLinks();
  }
  async function loadCollections() {
    const data = await apiFetch("/api/collections");
    const list = data.collections || [];
    const sel = el("activeCollectionSelect");
    sel.innerHTML = "";
    if (list.length === 0) {
      sel.innerHTML = `<option value="">-- Ch\u01B0a c\xF3 Collection --</option>`;
    } else {
      list.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.name}`;
        if (c.id === activeColId) opt.selected = true;
        sel.appendChild(opt);
      });
      if (!activeColId && list[0]) await setActiveCollection(list[0].id);
    }
    await refreshMetrics();
  }
  async function setActiveCollection(id) {
    activeColId = id;
    chrome.storage?.local?.set({ [STORAGE_COL_ID]: id });
    const sel = el("activeCollectionSelect");
    if (sel) sel.value = id;
    await refreshMetrics();
  }
  async function createCollection() {
    const name = el("newColName").value.trim();
    if (!name) return alert("Vui l\xF2ng nh\u1EADp t\xEAn Collection.");
    const desc = el("newColDesc").value.trim();
    const data = await apiFetch("/api/collections", {
      method: "POST",
      body: JSON.stringify({ name, description: desc })
    });
    if (data.id || data.collection?.id) {
      const id = data.id || data.collection.id;
      await loadCollections();
      await setActiveCollection(id);
      el("createCollectionForm").style.display = "none";
      showStatus(`\u2713 \u0110\xE3 t\u1EA1o "${name}"`, "green");
    } else {
      alert("T\u1EA1o Collection th\u1EA5t b\u1EA1i: " + (data.error || JSON.stringify(data)));
    }
  }
  async function refreshMetrics() {
    if (!activeColId) return;
    try {
      const [rawData, canonData] = await Promise.all([
        apiFetch(`/api/collections/${activeColId}/records`),
        apiFetch(`/api/collections/${activeColId}/canonical-records`)
      ]);
      const raw = rawData.records?.length ?? rawData.count ?? 0;
      const canonical = canonData.records?.length ?? canonData.canonicalRecords?.length ?? 0;
      const dups = raw - canonical;
      el("metricRaw").textContent = String(raw);
      el("metricCanonical").textContent = String(canonical);
      el("metricDup").textContent = String(Math.max(0, dups));
    } catch {
    }
  }
  async function startSearch() {
    if (!activeColId) return alert("Vui l\xF2ng ch\u1ECDn ho\u1EB7c t\u1EA1o Collection tr\u01B0\u1EDBc!");
    const query = el("searchQueryInput").value.trim();
    if (!query) return alert("Vui l\xF2ng nh\u1EADp Boolean Query!");
    const source = document.querySelector('input[name="srcRadio"]:checked')?.value || "OpenAlex";
    const yearStart = parseInt(el("yearStartInput").value) || void 0;
    const yearEnd = parseInt(el("yearEndInput").value) || void 0;
    const maxResults = parseInt(el("maxResultsInput").value) || 50;
    showStatus("\u23F3 \u0110ang g\u1EEDi l\u1EC7nh thu th\u1EADp...", "yellow");
    const data = await apiFetch(`/api/collections/${activeColId}/runs`, {
      method: "POST",
      body: JSON.stringify({
        source,
        query,
        filters: { yearStart, yearEnd, maxResults }
      })
    });
    if (data.runId || data.run?.id) {
      activeRunId = data.runId || data.run.id;
      el("btnStartSearch").style.display = "none";
      el("btnPauseSearch").style.display = "";
      el("btnCancelSearch").style.display = "";
      el("runProgress").style.display = "";
      startPollingRun(activeRunId);
    } else {
      showStatus("L\u1ED7i: " + (data.error || "Kh\xF4ng nh\u1EADn \u0111\u01B0\u1EE3c runId"), "red");
    }
  }
  function startPollingRun(runId) {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(async () => {
      if (!activeColId || !runId) return;
      const data = await apiFetch(`/api/collections/${activeColId}/runs/${runId}`);
      const run = data.run || data;
      if (!run || !run.status) return;
      const pct = run.progressPercent ?? 0;
      el("runProgressBar").style.width = `${pct}%`;
      el("runStatusLabel").textContent = run.status;
      el("runCountLabel").textContent = `${run.itemsSaved ?? 0} / ${run.totalReported ?? "?"}`;
      if (["completed", "cancelled", "failed", "completed_with_errors"].includes(run.status)) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        el("btnStartSearch").style.display = "";
        el("btnPauseSearch").style.display = "none";
        el("btnResumeSearch").style.display = "none";
        el("btnCancelSearch").style.display = "none";
        showStatus(`\u2713 ${run.status}: ${run.itemsSaved} b\xE0i \u0111\xE3 l\u01B0u`, "green");
        await refreshMetrics();
      }
    }, 1500);
  }
  async function pauseSearch() {
    if (!activeRunId || !activeColId) return;
    await apiFetch(`/api/collections/${activeColId}/runs/${activeRunId}/pause`, { method: "POST" });
    el("btnPauseSearch").style.display = "none";
    el("btnResumeSearch").style.display = "";
    showStatus("\u23F8 \u0110\xE3 t\u1EA1m d\u1EEBng", "yellow");
  }
  async function resumeSearch() {
    if (!activeRunId || !activeColId) return;
    await apiFetch(`/api/collections/${activeColId}/runs/${activeRunId}/resume`, { method: "POST" });
    el("btnResumeSearch").style.display = "none";
    el("btnPauseSearch").style.display = "";
    showStatus("\u25B6 Ti\u1EBFp t\u1EE5c thu th\u1EADp", "yellow");
    startPollingRun(activeRunId);
  }
  async function cancelSearch() {
    if (!activeRunId || !activeColId) return;
    await apiFetch(`/api/collections/${activeColId}/runs/${activeRunId}/cancel`, { method: "POST" });
    if (pollingTimer) clearInterval(pollingTimer);
    el("btnStartSearch").style.display = "";
    el("btnPauseSearch").style.display = "none";
    el("btnResumeSearch").style.display = "none";
    el("btnCancelSearch").style.display = "none";
    el("runProgress").style.display = "none";
    showStatus("\u23F9 \u0110\xE3 h\u1EE7y l\u01B0\u1EE3t thu th\u1EADp", "yellow");
    await refreshMetrics();
  }
  async function importCsv() {
    if (!activeColId) return alert("Vui l\xF2ng ch\u1ECDn Collection tr\u01B0\u1EDBc!");
    const content = el("importCsvContent").value.trim();
    if (!content) return alert("Ch\u01B0a c\xF3 n\u1ED9i dung CSV!");
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return alert("C\u1EA7n \xEDt nh\u1EA5t 1 d\xF2ng header v\xE0 1 d\xF2ng d\u1EEF li\u1EC7u.");
    const header = lines[0].toLowerCase();
    if (!header.includes("title")) {
      return alert(
        "D\xF2ng \u0111\u1EA7u ti\xEAn ph\u1EA3i l\xE0 header ch\u1EE9a 'title'. V\xED d\u1EE5:\ntitle,authors,year,doi,abstract,venue,source"
      );
    }
    const resultEl = el("importResult");
    resultEl.textContent = "\u0110ang nh\u1EADp...";
    const data = await apiFetch(`/api/collections/${activeColId}/import-file`, {
      method: "POST",
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: content
    });
    const validCount = data.validCount ?? data.savedCount ?? data.count ?? 0;
    const invalidCount = data.invalidCount ?? data.errorCount ?? 0;
    if (validCount === 0) {
      resultEl.textContent = `\u26A0\uFE0F 0 b\xE0i \u0111\u01B0\u1EE3c nh\u1EADp. L\u1ED7i: ${invalidCount}. Ki\u1EC3m tra l\u1EA1i format CSV v\xE0 header.`;
      resultEl.style.color = "orange";
    } else {
      resultEl.textContent = `\u2705 \u0110\xE3 nh\u1EADp: ${validCount} b\xE0i. L\u1ED7i: ${invalidCount}.`;
      resultEl.style.color = "green";
      await refreshMetrics();
    }
  }
  async function importCurrentTab() {
    if (!activeColId) return alert("Vui l\xF2ng ch\u1ECDn Collection tr\u01B0\u1EDBc!");
    const resultEl = el("importResult");
    resultEl.textContent = "\u0110ang l\u1EA5y th\xF4ng tin tab...";
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      resultEl.textContent = "Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c tab hi\u1EC7n t\u1EA1i.";
      return;
    }
    let extractedData;
    try {
      [extractedData] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") || "";
          return {
            title: document.title || getMeta("og:title"),
            url: location.href,
            abstract: getMeta("description") || getMeta("og:description"),
            doi: getMeta("citation_doi") || getMeta("dc.identifier"),
            authors: getMeta("citation_author") || getMeta("dc.creator"),
            year: getMeta("citation_publication_date")?.slice(0, 4) || getMeta("dc.date")?.slice(0, 4),
            venue: getMeta("citation_journal_title") || getMeta("citation_conference_title")
          };
        }
      });
    } catch (e) {
      resultEl.textContent = "Kh\xF4ng th\u1EC3 ch\u1EA1y script tr\xEAn tab n\xE0y: " + e.message;
      return;
    }
    const record = extractedData?.result;
    if (!record?.title) {
      resultEl.textContent = "Kh\xF4ng tr\xEDch xu\u1EA5t \u0111\u01B0\u1EE3c metadata t\u1EEB trang n\xE0y.";
      return;
    }
    const csvContent = [
      "title,authors,year,doi,abstract,venue,url,source",
      [record.title, record.authors, record.year, record.doi, record.abstract, record.venue, record.url, "Tab Import"].map((f) => `"${(f || "").replace(/"/g, '""')}"`).join(",")
    ].join("\n");
    const data = await apiFetch(`/api/collections/${activeColId}/import-file`, {
      method: "POST",
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: csvContent
    });
    const saved = data.validCount ?? data.savedCount ?? 0;
    if (saved > 0) {
      resultEl.textContent = `\u2705 \u0110\xE3 l\u01B0u: "${record.title}"`;
      resultEl.style.color = "green";
      await refreshMetrics();
    } else {
      resultEl.textContent = `\u26A0\uFE0F Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c. L\u1ED7i: ${data.error || "Kh\xF4ng r\xF5"}`;
      resultEl.style.color = "orange";
    }
  }
  async function loadDupGroups() {
    if (!activeColId) {
      el("dupGroupsContainer").innerHTML = `<div class="empty-state">Vui l\xF2ng ch\u1ECDn Collection.</div>`;
      return;
    }
    const data = await apiFetch(`/api/collections/${activeColId}/suspected-duplicates`);
    const groups = data.groups || data.suspectedDuplicates || [];
    const container = el("dupGroupsContainer");
    if (groups.length === 0) {
      container.innerHTML = `<div class="empty-state">\u2705 Kh\xF4ng ph\xE1t hi\u1EC7n b\u1EA3n ghi tr\xF9ng l\u1EB7p.</div>`;
      return;
    }
    container.innerHTML = groups.map(
      (g) => `
    <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;margin-bottom:8px">
      <b>Nh\xF3m tr\xF9ng (${g.records?.length ?? 0} b\u1EA3n ghi)</b>
      ${(g.records || []).map(
        (r) => `
        <div style="margin-top:6px;padding:6px;background:#f9fafb;border-radius:4px">
          <div><b>${r.title}</b></div>
          <div style="font-size:12px;color:#6b7280">${r.authors || ""} \xB7 ${r.year || "?"} \xB7 ${r.doi || "no doi"}</div>
        </div>`
      ).join("")}
    </div>`
    ).join("");
  }
  async function loadCanonicalList() {
    if (!activeColId) {
      el("canonicalListContainer").innerHTML = `<div class="empty-state">Vui l\xF2ng ch\u1ECDn Collection.</div>`;
      return;
    }
    const data = await apiFetch(`/api/collections/${activeColId}/canonical-records`);
    const records = data.records || data.canonicalRecords || [];
    const container = el("canonicalListContainer");
    if (records.length === 0) {
      container.innerHTML = `<div class="empty-state">Ch\u01B0a c\xF3 b\u1EA3n ghi canonical. H\xE3y thu th\u1EADp v\xE0 b\u1ECF tr\xF9ng tr\u01B0\u1EDBc.</div>`;
      return;
    }
    el("metricCanonical").textContent = String(records.length);
    container.innerHTML = records.map((r) => {
      const l3 = r.keywordFilterResult;
      const l2 = r.metadataFilterResult;
      const statusColor = l3?.status === "MATCH" ? "#16a34a" : l3?.status === "NO_MATCH" ? "#dc2626" : "#d97706";
      return `
      <div style="border-bottom:1px solid #e5e7eb;padding:8px 0">
        <div style="font-weight:600;font-size:13px">${r.title || "(Kh\xF4ng c\xF3 ti\xEAu \u0111\u1EC1)"}</div>
        <div style="font-size:12px;color:#6b7280">${r.authors || ""} \xB7 ${r.year || "?"} \xB7 <i>${r.venue || ""}</i></div>
        ${l3 ? `<span style="font-size:11px;color:${statusColor};font-weight:600">L3: ${l3.status} ${l3.hasExclusionHit ? "\u26A0\uFE0F EXCLUSION" : ""}</span>` : ""}
        ${l2 ? `<span style="font-size:11px;color:#6b7280;margin-left:8px">L2: ${l2.overallResult ?? ""}</span>` : ""}
      </div>`;
    }).join("");
  }
  function updateExportLinks() {
    if (!activeColId) return;
    const base = `${BACKEND_URL}/api/collections/${activeColId}/export`;
    const links = [
      ["lnkExportPassCsv", `${base}?type=pass_unknown&format=csv`],
      ["lnkExportAllCsv", `${base}?type=all&format=csv`],
      ["lnkExportRis", `${base}?type=pass_unknown&format=ris`],
      ["lnkExportBib", `${base}?type=pass_unknown&format=bibtex`],
      ["lnkExportSearchLog", `${BACKEND_URL}/api/collections/${activeColId}/export/search-log`],
      ["lnkExportFilterLog", `${BACKEND_URL}/api/collections/${activeColId}/export/filter-log`],
      ["lnkExportDupMap", `${BACKEND_URL}/api/collections/${activeColId}/export/duplicate-mapping`],
      ["lnkExportGuide", `${base}/guide`]
    ];
    links.forEach(([id, href]) => {
      const a = el(id);
      if (a) a.href = href;
    });
  }
  async function checkHealth() {
    try {
      const data = await apiFetch("/api/status");
      if (data.status === "ok") {
        showStatus("\u25CF Backend Online", "green");
        return true;
      }
    } catch {
    }
    showStatus("\u25CF M\u1EA5t k\u1EBFt n\u1ED1i Backend", "red");
    return false;
  }
  document.addEventListener("DOMContentLoaded", async () => {
    await checkHealth();
    chrome.storage?.local?.get([STORAGE_COL_ID, STORAGE_STAGE], async (stored) => {
      if (stored[STORAGE_COL_ID]) activeColId = stored[STORAGE_COL_ID];
      await loadCollections();
      switchStage(stored[STORAGE_STAGE] || "COLLECT");
    });
    el("activeCollectionSelect").addEventListener("change", (e) => {
      setActiveCollection(e.target.value);
    });
    el("btnNewCollection").addEventListener("click", () => {
      const form = el("createCollectionForm");
      form.style.display = form.style.display === "none" ? "block" : "none";
      el("newColName").focus();
    });
    el("btnCreateCollection").addEventListener("click", createCollection);
    el("btnCancelNewCol").addEventListener("click", () => {
      el("createCollectionForm").style.display = "none";
    });
    document.querySelectorAll(".wizard-step-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const stage = btn.getAttribute("data-stage");
        if (stage) switchStage(stage);
      });
    });
    el("btnStartSearch").addEventListener("click", startSearch);
    el("btnPauseSearch").addEventListener("click", pauseSearch);
    el("btnResumeSearch").addEventListener("click", resumeSearch);
    el("btnCancelSearch").addEventListener("click", cancelSearch);
    el("btnImportCsv").addEventListener("click", importCsv);
    el("btnImportTab").addEventListener("click", importCurrentTab);
    el("btnRefreshCanonical").addEventListener("click", loadDupGroups);
    el("btnLoadCanonical").addEventListener("click", loadCanonicalList);
  });
})();
