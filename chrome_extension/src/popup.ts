// Scholar Extractor Popup - Refactored to Collection flow (L0–L3–Export)
// Fixes:
//   P1 #1 - Send records as JSON, validate validCount
//   P1 #6 - Align UI with /api/collections flow; wire all buttons

const BACKEND_URL = "http://localhost:3001";
const STORAGE_COL_ID = "scholar_active_col_id_v9";
const STORAGE_STAGE = "scholar_stage_v9";

let activeColId = "";
let activeRunId = "";
let pollingTimer: ReturnType<typeof setInterval> | null = null;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function showStatus(msg: string, kind: "green" | "red" | "yellow" = "green") {
  const badge = el("backendStatusBadge");
  badge.textContent = msg;
  badge.className = `badge badge-${kind}`;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(BACKEND_URL + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

// ─────────────────────────────────────────────
// Stage Navigation
// ─────────────────────────────────────────────
const STAGES = ["COLLECT", "DEDUP", "FILTER", "EXPORT"] as const;
type Stage = (typeof STAGES)[number];

const PANEL_IDS: Record<Stage, string> = {
  COLLECT: "panelCollect",
  DEDUP: "panelDedup",
  FILTER: "panelFilter",
  EXPORT: "panelExport",
};

function switchStage(stage: Stage) {
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

// ─────────────────────────────────────────────
// Collections
// ─────────────────────────────────────────────
async function loadCollections() {
  const data = await apiFetch("/api/collections");
  const list: any[] = data.collections || [];
  const sel = el<HTMLSelectElement>("activeCollectionSelect");
  sel.innerHTML = "";
  if (list.length === 0) {
    sel.innerHTML = `<option value="">-- Chưa có Collection --</option>`;
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

async function setActiveCollection(id: string) {
  activeColId = id;
  chrome.storage?.local?.set({ [STORAGE_COL_ID]: id });
  const sel = el<HTMLSelectElement>("activeCollectionSelect");
  if (sel) sel.value = id;
  await refreshMetrics();
}

async function createCollection() {
  const name = el<HTMLInputElement>("newColName").value.trim();
  if (!name) return alert("Vui lòng nhập tên Collection.");
  const desc = el<HTMLInputElement>("newColDesc").value.trim();
  const data = await apiFetch("/api/collections", {
    method: "POST",
    body: JSON.stringify({ name, description: desc }),
  });
  if (data.id || data.collection?.id) {
    const id = data.id || data.collection.id;
    await loadCollections();
    await setActiveCollection(id);
    el("createCollectionForm").style.display = "none";
    showStatus(`✓ Đã tạo "${name}"`, "green");
  } else {
    alert("Tạo Collection thất bại: " + (data.error || JSON.stringify(data)));
  }
}

// ─────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────
async function refreshMetrics() {
  if (!activeColId) return;
  try {
    const [rawData, canonData] = await Promise.all([
      apiFetch(`/api/collections/${activeColId}/records`),
      apiFetch(`/api/collections/${activeColId}/canonical-records`),
    ]);
    const raw = rawData.records?.length ?? rawData.count ?? 0;
    const canonical = canonData.records?.length ?? canonData.canonicalRecords?.length ?? 0;
    const dups = raw - canonical;
    el("metricRaw").textContent = String(raw);
    el("metricCanonical").textContent = String(canonical);
    el("metricDup").textContent = String(Math.max(0, dups));
  } catch {}
}

// ─────────────────────────────────────────────
// Stage 1: Search / Collect
// ─────────────────────────────────────────────
async function startSearch() {
  if (!activeColId) return alert("Vui lòng chọn hoặc tạo Collection trước!");
  const query = el<HTMLTextAreaElement>("searchQueryInput").value.trim();
  if (!query) return alert("Vui lòng nhập Boolean Query!");

  const source =
    (document.querySelector('input[name="srcRadio"]:checked') as HTMLInputElement)?.value ||
    "OpenAlex";
  const yearStart = parseInt(el<HTMLInputElement>("yearStartInput").value) || undefined;
  const yearEnd = parseInt(el<HTMLInputElement>("yearEndInput").value) || undefined;
  const maxResults = parseInt(el<HTMLInputElement>("maxResultsInput").value) || 50;

  showStatus("⏳ Đang gửi lệnh thu thập...", "yellow");

  const data = await apiFetch(`/api/collections/${activeColId}/runs`, {
    method: "POST",
    body: JSON.stringify({
      source,
      query,
      filters: { yearStart, yearEnd, maxResults },
    }),
  });

  if (data.runId || data.run?.id) {
    activeRunId = data.runId || data.run.id;
    el("btnStartSearch").style.display = "none";
    el("btnPauseSearch").style.display = "";
    el("btnCancelSearch").style.display = "";
    el("runProgress").style.display = "";
    startPollingRun(activeRunId);
  } else {
    showStatus("Lỗi: " + (data.error || "Không nhận được runId"), "red");
  }
}

function startPollingRun(runId: string) {
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
      clearInterval(pollingTimer!);
      pollingTimer = null;
      el("btnStartSearch").style.display = "";
      el("btnPauseSearch").style.display = "none";
      el("btnResumeSearch").style.display = "none";
      el("btnCancelSearch").style.display = "none";
      showStatus(`✓ ${run.status}: ${run.itemsSaved} bài đã lưu`, "green");
      await refreshMetrics();
    }
  }, 1500);
}

async function pauseSearch() {
  if (!activeRunId || !activeColId) return;
  await apiFetch(`/api/collections/${activeColId}/runs/${activeRunId}/pause`, { method: "POST" });
  el("btnPauseSearch").style.display = "none";
  el("btnResumeSearch").style.display = "";
  showStatus("⏸ Đã tạm dừng", "yellow");
}

async function resumeSearch() {
  if (!activeRunId || !activeColId) return;
  await apiFetch(`/api/collections/${activeColId}/runs/${activeRunId}/resume`, { method: "POST" });
  el("btnResumeSearch").style.display = "none";
  el("btnPauseSearch").style.display = "";
  showStatus("▶ Tiếp tục thu thập", "yellow");
  startPollingRun(activeRunId);
}

async function cancelSearch() {
  if (!activeRunId || !activeColId) return;
  await apiFetch(`/api/collections/${activeColId}/runs/${activeRunId}/cancel`, { method: "POST" });
  if (pollingTimer) clearInterval(pollingTimer!);
  el("btnStartSearch").style.display = "";
  el("btnPauseSearch").style.display = "none";
  el("btnResumeSearch").style.display = "none";
  el("btnCancelSearch").style.display = "none";
  el("runProgress").style.display = "none";
  showStatus("⏹ Đã hủy lượt thu thập", "yellow");
  await refreshMetrics();
}

// ─────────────────────────────────────────────
// Stage 1: Import CSV (P1 #1 fix: header required)
// ─────────────────────────────────────────────
async function importCsv() {
  if (!activeColId) return alert("Vui lòng chọn Collection trước!");
  const content = el<HTMLTextAreaElement>("importCsvContent").value.trim();
  if (!content) return alert("Chưa có nội dung CSV!");

  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return alert("Cần ít nhất 1 dòng header và 1 dòng dữ liệu.");

  // Ensure first line is treated as header by the importer
  const header = lines[0].toLowerCase();
  if (!header.includes("title")) {
    return alert(
      "Dòng đầu tiên phải là header chứa 'title'. Ví dụ:\ntitle,authors,year,doi,abstract,venue,source"
    );
  }

  const resultEl = el("importResult");
  resultEl.textContent = "Đang nhập...";

  const data = await apiFetch(`/api/collections/${activeColId}/import-file`, {
    method: "POST",
    headers: { "Content-Type": "text/csv; charset=utf-8" },
    body: content,
  });

  // P1 fix: validate validCount
  const validCount = data.validCount ?? data.savedCount ?? data.count ?? 0;
  const invalidCount = data.invalidCount ?? data.errorCount ?? 0;

  if (validCount === 0) {
    resultEl.textContent = `⚠️ 0 bài được nhập. Lỗi: ${invalidCount}. Kiểm tra lại format CSV và header.`;
    resultEl.style.color = "orange";
  } else {
    resultEl.textContent = `✅ Đã nhập: ${validCount} bài. Lỗi: ${invalidCount}.`;
    resultEl.style.color = "green";
    await refreshMetrics();
  }
}

async function importCurrentTab() {
  if (!activeColId) return alert("Vui lòng chọn Collection trước!");
  const resultEl = el("importResult");
  resultEl.textContent = "Đang lấy thông tin tab...";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    resultEl.textContent = "Không lấy được tab hiện tại.";
    return;
  }

  let extractedData: any;
  try {
    [extractedData] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getMeta = (name: string) =>
          document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ||
          document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ||
          "";
        return {
          title: document.title || getMeta("og:title"),
          url: location.href,
          abstract: getMeta("description") || getMeta("og:description"),
          doi: getMeta("citation_doi") || getMeta("dc.identifier"),
          authors: getMeta("citation_author") || getMeta("dc.creator"),
          year: getMeta("citation_publication_date")?.slice(0, 4) || getMeta("dc.date")?.slice(0, 4),
          venue: getMeta("citation_journal_title") || getMeta("citation_conference_title"),
        };
      },
    });
  } catch (e: any) {
    resultEl.textContent = "Không thể chạy script trên tab này: " + e.message;
    return;
  }

  const record = extractedData?.result;
  if (!record?.title) {
    resultEl.textContent = "Không trích xuất được metadata từ trang này.";
    return;
  }

  // Send single record as JSON via import-file with CSV content
  const csvContent = [
    "title,authors,year,doi,abstract,venue,url,source",
    [record.title, record.authors, record.year, record.doi, record.abstract, record.venue, record.url, "Tab Import"]
      .map((f) => `"${(f || "").replace(/"/g, '""')}"`)
      .join(","),
  ].join("\n");

  const data = await apiFetch(`/api/collections/${activeColId}/import-file`, {
    method: "POST",
    headers: { "Content-Type": "text/csv; charset=utf-8" },
    body: csvContent,
  });

  const saved = data.validCount ?? data.savedCount ?? 0;
  if (saved > 0) {
    resultEl.textContent = `✅ Đã lưu: "${record.title}"`;
    resultEl.style.color = "green";
    await refreshMetrics();
  } else {
    resultEl.textContent = `⚠️ Không lưu được. Lỗi: ${data.error || "Không rõ"}`;
    resultEl.style.color = "orange";
  }
}

// ─────────────────────────────────────────────
// Stage 2: Dedup / Canonical (P1 #4: cache invalidated by backend now)
// ─────────────────────────────────────────────
async function loadDupGroups() {
  if (!activeColId) {
    el("dupGroupsContainer").innerHTML = `<div class="empty-state">Vui lòng chọn Collection.</div>`;
    return;
  }
  const data = await apiFetch(`/api/collections/${activeColId}/suspected-duplicates`);
  const groups: any[] = data.groups || data.suspectedDuplicates || [];
  const container = el("dupGroupsContainer");

  if (groups.length === 0) {
    container.innerHTML = `<div class="empty-state">✅ Không phát hiện bản ghi trùng lặp.</div>`;
    return;
  }

  container.innerHTML = groups
    .map(
      (g: any) => `
    <div style="border:1px solid #e5e7eb;border-radius:6px;padding:10px;margin-bottom:8px">
      <b>Nhóm trùng (${g.records?.length ?? 0} bản ghi)</b>
      ${(g.records || [])
        .map(
          (r: any) => `
        <div style="margin-top:6px;padding:6px;background:#f9fafb;border-radius:4px">
          <div><b>${r.title}</b></div>
          <div style="font-size:12px;color:#6b7280">${r.authors || ""} · ${r.year || "?"} · ${r.doi || "no doi"}</div>
        </div>`
        )
        .join("")}
    </div>`
    )
    .join("");
}

// ─────────────────────────────────────────────
// Stage 3: Filter — Canonical list view
// ─────────────────────────────────────────────
async function loadCanonicalList() {
  if (!activeColId) {
    el("canonicalListContainer").innerHTML = `<div class="empty-state">Vui lòng chọn Collection.</div>`;
    return;
  }
  const data = await apiFetch(`/api/collections/${activeColId}/canonical-records`);
  const records: any[] = data.records || data.canonicalRecords || [];
  const container = el("canonicalListContainer");

  if (records.length === 0) {
    container.innerHTML = `<div class="empty-state">Chưa có bản ghi canonical. Hãy thu thập và bỏ trùng trước.</div>`;
    return;
  }

  el("metricCanonical").textContent = String(records.length);

  container.innerHTML = records
    .map((r: any) => {
      const l3 = r.keywordFilterResult;
      const l2 = r.metadataFilterResult;
      const statusColor =
        l3?.status === "MATCH" ? "#16a34a" : l3?.status === "NO_MATCH" ? "#dc2626" : "#d97706";
      return `
      <div style="border-bottom:1px solid #e5e7eb;padding:8px 0">
        <div style="font-weight:600;font-size:13px">${r.title || "(Không có tiêu đề)"}</div>
        <div style="font-size:12px;color:#6b7280">${r.authors || ""} · ${r.year || "?"} · <i>${r.venue || ""}</i></div>
        ${l3 ? `<span style="font-size:11px;color:${statusColor};font-weight:600">L3: ${l3.status} ${l3.hasExclusionHit ? "⚠️ EXCLUSION" : ""}</span>` : ""}
        ${l2 ? `<span style="font-size:11px;color:#6b7280;margin-left:8px">L2: ${l2.overallResult ?? ""}</span>` : ""}
      </div>`;
    })
    .join("");
}

// ─────────────────────────────────────────────
// Stage 4: Export links
// ─────────────────────────────────────────────
function updateExportLinks() {
  if (!activeColId) return;
  const base = `${BACKEND_URL}/api/collections/${activeColId}/export`;
  const links: Array<[string, string]> = [
    ["lnkExportPassCsv", `${base}?type=pass_unknown&format=csv`],
    ["lnkExportAllCsv", `${base}?type=all&format=csv`],
    ["lnkExportRis", `${base}?type=pass_unknown&format=ris`],
    ["lnkExportBib", `${base}?type=pass_unknown&format=bibtex`],
    ["lnkExportSearchLog", `${BACKEND_URL}/api/collections/${activeColId}/export/search-log`],
    ["lnkExportFilterLog", `${BACKEND_URL}/api/collections/${activeColId}/export/filter-log`],
    ["lnkExportDupMap", `${BACKEND_URL}/api/collections/${activeColId}/export/duplicate-mapping`],
    ["lnkExportGuide", `${base}/guide`],
  ];
  links.forEach(([id, href]) => {
    const a = el<HTMLAnchorElement>(id);
    if (a) a.href = href;
  });
}

// ─────────────────────────────────────────────
// Backend health check
// ─────────────────────────────────────────────
async function checkHealth() {
  try {
    const data = await apiFetch("/api/status");
    if (data.status === "ok") {
      showStatus("● Backend Online", "green");
      return true;
    }
  } catch {}
  showStatus("● Mất kết nối Backend", "red");
  return false;
}

// ─────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await checkHealth();

  // Restore state
  chrome.storage?.local?.get([STORAGE_COL_ID, STORAGE_STAGE], async (stored) => {
    if (stored[STORAGE_COL_ID]) activeColId = stored[STORAGE_COL_ID];
    await loadCollections();
    switchStage((stored[STORAGE_STAGE] as Stage) || "COLLECT");
  });

  // Collection selector
  el("activeCollectionSelect").addEventListener("change", (e) => {
    setActiveCollection((e.target as HTMLSelectElement).value);
  });

  // New collection form
  el("btnNewCollection").addEventListener("click", () => {
    const form = el("createCollectionForm");
    form.style.display = form.style.display === "none" ? "block" : "none";
    el<HTMLInputElement>("newColName").focus();
  });
  el("btnCreateCollection").addEventListener("click", createCollection);
  el("btnCancelNewCol").addEventListener("click", () => {
    el("createCollectionForm").style.display = "none";
  });

  // Stage navigation
  document.querySelectorAll(".wizard-step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stage = btn.getAttribute("data-stage") as Stage;
      if (stage) switchStage(stage);
    });
  });

  // Collect stage
  el("btnStartSearch").addEventListener("click", startSearch);
  el("btnPauseSearch").addEventListener("click", pauseSearch);
  el("btnResumeSearch").addEventListener("click", resumeSearch);
  el("btnCancelSearch").addEventListener("click", cancelSearch);
  el("btnImportCsv").addEventListener("click", importCsv);
  el("btnImportTab").addEventListener("click", importCurrentTab);

  // Dedup stage
  el("btnRefreshCanonical").addEventListener("click", loadDupGroups);

  // Filter stage
  el("btnLoadCanonical").addEventListener("click", loadCanonicalList);
});
