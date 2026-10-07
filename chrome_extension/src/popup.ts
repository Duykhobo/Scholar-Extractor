import {
  CanonicalRecord,
} from "./types";

const BACKEND_URL = "http://localhost:3001";
const STORAGE_ACTIVE_PROJECT_ID = "scholar_active_project_id_v8";
const STORAGE_CURRENT_STAGE = "scholar_current_stage_v8";

// Runtime State
let activeProjectId: string = "";
let projectsList: any[] = [];
let currentStage: string = "PROJECT";

// Helper
function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function showToast(message: string, isError: boolean = false): void {
  const badge = $("backendStatusBadge");
  if (badge) {
    badge.textContent = message;
    badge.className = isError ? "badge badge-red" : "badge badge-green";
    setTimeout(checkBackendHealth, 4000);
  }
}

// 1. Backend Health
async function checkBackendHealth(): Promise<boolean> {
  const badge = $("backendStatusBadge");
  try {
    const res = await fetch(`${BACKEND_URL}/api/status`);
    if (res.ok) {
      if (badge) {
        badge.textContent = "● Backend Online";
        badge.className = "badge badge-green";
      }
      return true;
    }
  } catch {}

  if (badge) {
    badge.textContent = "● Mất kết nối Backend";
    badge.className = "badge badge-red";
  }
  return false;
}

// 2. Project Management
async function loadProjects(): Promise<void> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects`);
    if (!res.ok) return;
    const data = await res.json();
    projectsList = data.data || [];

    const select = $("activeProjectSelect") as HTMLSelectElement;
    if (select) {
      select.innerHTML = "";
      if (projectsList.length === 0) {
        select.innerHTML = `<option value="">-- Chưa có Dự án --</option>`;
      } else {
        projectsList.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = `${p.name} (${p.rqCode})`;
          if (p.id === activeProjectId) opt.selected = true;
          select.appendChild(opt);
        });
      }
    }

    if (!activeProjectId && projectsList.length > 0) {
      await setActiveProject(projectsList[0].id);
    } else if (activeProjectId) {
      await refreshActiveProjectData();
    }
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

async function setActiveProject(id: string): Promise<void> {
  activeProjectId = id;
  chrome.storage?.local?.set({ [STORAGE_ACTIVE_PROJECT_ID]: id });
  const select = $("activeProjectSelect") as HTMLSelectElement;
  if (select) select.value = id;
  await refreshActiveProjectData();
}

async function createNewProject(): Promise<void> {
  const nameInput = $("newProjName") as HTMLInputElement;
  const rqCodeInput = $("newProjRqCode") as HTMLInputElement;
  const rqInput = $("newProjRq") as HTMLTextAreaElement;
  const picoInput = $("newProjPico") as HTMLTextAreaElement;

  const name = nameInput?.value.trim();
  if (!name) {
    alert("Vui lòng nhập tên Dự án.");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset: "blank",
        name,
        rqCode: rqCodeInput?.value.trim() || "RQ1",
        rq: rqInput?.value.trim() || "",
        pico: { population: picoInput?.value.trim() || "", intervention: "", comparison: "", outcome: "" }
      }),
    });

    if (!res.ok) {
      alert("Lỗi tạo Dự án");
      return;
    }

    const created = await res.json();
    nameInput.value = "";
    if (rqCodeInput) rqCodeInput.value = "";
    if (rqInput) rqInput.value = "";
    if (picoInput) picoInput.value = "";

    await loadProjects();
    await setActiveProject(created.data.id);
    switchStage("SEARCH");
    showToast(`Đã tạo dự án "${created.data.name}"`);
  } catch (err: any) {
    alert(`Không thể kết nối Backend: ${err.message}`);
  }
}

// 3. Stage Navigation
function switchStage(stage: string): void {
  currentStage = stage;
  chrome.storage?.local?.set({ [STORAGE_CURRENT_STAGE]: stage });

  const stepBtns = document.querySelectorAll(".wizard-step-btn");
  stepBtns.forEach((btn) => {
    if (btn.getAttribute("data-stage") === stage) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  const panels = document.querySelectorAll(".stage-panel");
  panels.forEach((panel) => {
    if (panel.id === `panel${stage.charAt(0) + stage.slice(1).toLowerCase()}`) {
      panel.classList.add("active");
      (panel as HTMLElement).style.display = "block";
    } else {
      panel.classList.remove("active");
      (panel as HTMLElement).style.display = "none";
    }
  });
  
  if (stage === "V1") loadV1Screening();
  if (stage === "V2") loadV2Screening();
  if (stage === "EVIDENCE") loadEvidence();
  if (stage === "PRISMA") loadPrisma();
}

async function refreshActiveProjectData() {
  if (!activeProjectId) return;
  // TODO: refresh metrics summary
}

// ==========================================
// API Calls for Stages
// ==========================================

async function loadV1Screening() {
  if (!activeProjectId) return;
  const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/screening-v1`);
  const data = await res.json();
  const container = $("v1ListContainer");
  if (!container) return;
  
  if (data.data.length === 0) {
    container.innerHTML = `<div class="empty-state">Chưa có bài báo nào. Hãy Tìm kiếm và Bỏ trùng trước.</div>`;
    return;
  }
  
  container.innerHTML = data.data.map((item: any) => `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
      <b>${item.record.title}</b> (${item.record.year})<br>
      <i>${item.record.venue}</i><br>
      <div style="margin-top: 5px;">
        <button class="btn btn-sm btn-primary" onclick="window.decideV1('${item.record.id}', 'INCLUDE')">Include</button>
        <button class="btn btn-sm btn-secondary" onclick="window.decideV1('${item.record.id}', 'UNSURE')">Unsure</button>
        <button class="btn btn-sm btn-danger" onclick="window.decideV1('${item.record.id}', 'EXCLUDE')">Exclude</button>
        <span style="margin-left:10px; font-weight:bold; color: ${item.decision.decision === 'INCLUDE' ? 'green' : (item.decision.decision === 'EXCLUDE' ? 'red' : 'orange')}">${item.decision.decision}</span>
      </div>
    </div>
  `).join("");
}

(window as any).decideV1 = async (recordId: string, decision: string) => {
  await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/screening-v1/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, decision, primaryReason: "manual_v1" })
  });
  loadV1Screening();
};

async function loadV2Screening() {
  if (!activeProjectId) return;
  const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/screening-v2`);
  const data = await res.json();
  const container = $("v2ListContainer");
  if (!container) return;
  
  if (data.data.length === 0) {
    container.innerHTML = `<div class="empty-state">Chưa có bài báo nào lọt qua vòng V1.</div>`;
    return;
  }
  
  container.innerHTML = data.data.map((item: any) => `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
      <b>${item.record.title}</b> (${item.record.year})<br>
      <div style="margin-top: 5px;">
        <button class="btn btn-sm btn-primary" onclick="window.decideV2('${item.record.id}', 'INCLUDE')">Include (Full)</button>
        <button class="btn btn-sm btn-danger" onclick="window.decideV2('${item.record.id}', 'EXCLUDE')">Exclude (Full)</button>
        <span style="margin-left:10px; font-weight:bold; color: ${item.v2Decision.decision === 'INCLUDE' ? 'green' : (item.v2Decision.decision === 'EXCLUDE' ? 'red' : 'orange')}">${item.v2Decision.decision}</span>
      </div>
    </div>
  `).join("");
}

(window as any).decideV2 = async (recordId: string, decision: string) => {
  await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/screening-v2/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, decision, fullTextStatus: "RETRIEVED", pageCount: 5, primaryReason: "manual_v2" })
  });
  loadV2Screening();
};

async function loadEvidence() {
  if (!activeProjectId) return;
  const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/evidence`);
  const data = await res.json();
  const container = $("evidenceListContainer");
  if (!container) return;
  
  if (data.data.length === 0) {
    container.innerHTML = `<div class="empty-state">Chưa có bài báo nào lọt vào vòng này hoặc chưa trích xuất.</div>`;
    return;
  }
  
  container.innerHTML = data.data.map((item: any) => `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
      <b>${item.paperDisplay}</b><br>
      Tool: <input type="text" id="ev_tool_${item.recordId}" value="${item.toolOrLlm}" style="width: 100px; padding: 2px;">
      Metric: <input type="text" id="ev_metric_${item.recordId}" value="${item.metric}" style="width: 100px; padding: 2px;">
      Kết quả: <input type="text" id="ev_res_${item.recordId}" value="${item.result}" style="width: 100px; padding: 2px;">
      <button class="btn btn-sm btn-secondary" onclick="window.saveEv('${item.recordId}')">Lưu</button>
    </div>
  `).join("");
}

(window as any).saveEv = async (recordId: string) => {
  const tool = ($(`ev_tool_${recordId}`) as HTMLInputElement)?.value;
  const metric = ($(`ev_metric_${recordId}`) as HTMLInputElement)?.value;
  const result = ($(`ev_res_${recordId}`) as HTMLInputElement)?.value;
  
  await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/evidence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, toolOrLlm: tool, metric, result })
  });
  showToast("Đã lưu Evidence!");
};

async function loadPrisma() {
  if (!activeProjectId) return;
  const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/prisma`);
  const data = await res.json();
  const container = $("prismaContainer");
  if (container) {
    container.textContent = data.markdown || "Chưa có dữ liệu PRISMA.";
  }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  await checkBackendHealth();

  chrome.storage?.local?.get([STORAGE_ACTIVE_PROJECT_ID, STORAGE_CURRENT_STAGE], async (res) => {
    if (res[STORAGE_ACTIVE_PROJECT_ID]) activeProjectId = res[STORAGE_ACTIVE_PROJECT_ID];
    const initialStage = res[STORAGE_CURRENT_STAGE] || "PROJECT";
    
    await loadProjects();
    switchStage(initialStage);
  });

  $("activeProjectSelect")?.addEventListener("change", (e) => {
    setActiveProject((e.target as HTMLSelectElement).value);
  });

  $("btnOpenNewProjectModal")?.addEventListener("click", () => {
    switchStage("PROJECT");
    $("newProjName")?.focus();
  });

  $("btnCreateProject")?.addEventListener("click", createNewProject);

  document.querySelectorAll(".wizard-step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stage = btn.getAttribute("data-stage");
      if (stage) switchStage(stage);
    });
  });

  $("btnRunSearch")?.addEventListener("click", async () => {
    if (!activeProjectId) return alert("Vui lòng tạo hoặc chọn Dự án trước!");
    const query = ($("searchQuery") as HTMLInputElement).value;
    if (!query) return alert("Vui lòng nhập Boolean Query!");
    
    const useScholar = ($("srcGoogleScholar") as HTMLInputElement).checked;
    if (!useScholar) {
      showToast("Hiện tại giao diện demo API tự động chỉ hỗ trợ Google Scholar.");
      return;
    }
    
    showToast("Đang gọi Google Scholar (SerpApi)... Vui lòng đợi.");
    try {
      const searchRes = await fetch(`${BACKEND_URL}/api/scholar/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, researchId: activeProjectId, num: 10 })
      });
      
      const searchData = await searchRes.json();
      if (!searchRes.ok || !searchData.records) {
        showToast("Lỗi tìm kiếm: " + (searchData.error || "Không có dữ liệu"), true);
        return;
      }
      
      const records = searchData.records;
      
      // Save records via import API
      const importRes = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/records/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: records.map((r:any) => `${r.id},"${r.title.replace(/"/g, '""')}","${r.authors}","${r.year}","${r.doi}","${r.abstract}","${r.venue}"`).join("\n"),
          defaultSource: "Google Scholar"
        })
      });
      
      // Save run log
      await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "Google Scholar", userQuery: query, itemsSaved: records.length, itemsReceived: records.length })
      });
      
      showToast(`Đã tìm thấy & lưu ${records.length} bản ghi!`);
    } catch (err: any) {
      showToast("Lỗi kết nối khi tìm kiếm: " + err.message, true);
    }
  });
  
  $("btnImportCsv")?.addEventListener("click", async () => {
    if (!activeProjectId) return alert("Chọn Dự án trước!");
    const content = ($("importCsvContent") as HTMLTextAreaElement).value;
    if (!content) return alert("Chưa dán nội dung CSV!");
    
    const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/records/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, defaultSource: "Import" })
    });
    const result = await res.json();
    alert(`Đã nhập: ${result.validCount} bài, Lỗi: ${result.invalidCount}`);
  });

  $("btnLoadPrisma")?.addEventListener("click", loadPrisma);

  $("btnExportZip")?.addEventListener("click", () => {
    if (!activeProjectId) return;
    const url = `${BACKEND_URL}/api/projects/${activeProjectId}/export-zip`;
    window.open(url, "_blank");
  });
});
