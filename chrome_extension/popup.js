"use strict";
(() => {
  // src/popup.ts
  var BACKEND_URL = "http://localhost:3001";
  var STORAGE_ACTIVE_PROJECT_ID = "scholar_active_project_id_v8";
  var STORAGE_CURRENT_STAGE = "scholar_current_stage_v8";
  var activeProjectId = "";
  var projectsList = [];
  var currentStage = "PROJECT";
  function $(id) {
    return document.getElementById(id);
  }
  function showToast(message, isError = false) {
    const badge = $("backendStatusBadge");
    if (badge) {
      badge.textContent = message;
      badge.className = isError ? "badge badge-red" : "badge badge-green";
      setTimeout(checkBackendHealth, 4e3);
    }
  }
  async function checkBackendHealth() {
    const badge = $("backendStatusBadge");
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`);
      if (res.ok) {
        if (badge) {
          badge.textContent = "\u25CF Backend Online";
          badge.className = "badge badge-green";
        }
        return true;
      }
    } catch {
    }
    if (badge) {
      badge.textContent = "\u25CF M\u1EA5t k\u1EBFt n\u1ED1i Backend";
      badge.className = "badge badge-red";
    }
    return false;
  }
  async function loadProjects() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`);
      if (!res.ok) return;
      const data = await res.json();
      projectsList = data.data || [];
      const select = $("activeProjectSelect");
      if (select) {
        select.innerHTML = "";
        if (projectsList.length === 0) {
          select.innerHTML = `<option value="">-- Ch\u01B0a c\xF3 D\u1EF1 \xE1n --</option>`;
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
  async function setActiveProject(id) {
    activeProjectId = id;
    chrome.storage?.local?.set({ [STORAGE_ACTIVE_PROJECT_ID]: id });
    const select = $("activeProjectSelect");
    if (select) select.value = id;
    await refreshActiveProjectData();
  }
  async function createNewProject() {
    const nameInput = $("newProjName");
    const rqCodeInput = $("newProjRqCode");
    const rqInput = $("newProjRq");
    const picoInput = $("newProjPico");
    const name = nameInput?.value.trim();
    if (!name) {
      alert("Vui l\xF2ng nh\u1EADp t\xEAn D\u1EF1 \xE1n.");
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
        })
      });
      if (!res.ok) {
        alert("L\u1ED7i t\u1EA1o D\u1EF1 \xE1n");
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
      showToast(`\u0110\xE3 t\u1EA1o d\u1EF1 \xE1n "${created.data.name}"`);
    } catch (err) {
      alert(`Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i Backend: ${err.message}`);
    }
  }
  function switchStage(stage) {
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
        panel.style.display = "block";
      } else {
        panel.classList.remove("active");
        panel.style.display = "none";
      }
    });
    if (stage === "V1") loadV1Screening();
    if (stage === "V2") loadV2Screening();
    if (stage === "EVIDENCE") loadEvidence();
    if (stage === "PRISMA") loadPrisma();
  }
  async function refreshActiveProjectData() {
    if (!activeProjectId) return;
  }
  async function loadV1Screening() {
    if (!activeProjectId) return;
    const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/screening-v1`);
    const data = await res.json();
    const container = $("v1ListContainer");
    if (!container) return;
    if (data.data.length === 0) {
      container.innerHTML = `<div class="empty-state">Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o. H\xE3y T\xECm ki\u1EBFm v\xE0 B\u1ECF tr\xF9ng tr\u01B0\u1EDBc.</div>`;
      return;
    }
    container.innerHTML = data.data.map((item) => `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
      <b>${item.record.title}</b> (${item.record.year})<br>
      <i>${item.record.venue}</i><br>
      <div style="margin-top: 5px;">
        <button class="btn btn-sm btn-primary" onclick="window.decideV1('${item.record.id}', 'INCLUDE')">Include</button>
        <button class="btn btn-sm btn-secondary" onclick="window.decideV1('${item.record.id}', 'UNSURE')">Unsure</button>
        <button class="btn btn-sm btn-danger" onclick="window.decideV1('${item.record.id}', 'EXCLUDE')">Exclude</button>
        <span style="margin-left:10px; font-weight:bold; color: ${item.decision.decision === "INCLUDE" ? "green" : item.decision.decision === "EXCLUDE" ? "red" : "orange"}">${item.decision.decision}</span>
      </div>
    </div>
  `).join("");
  }
  window.decideV1 = async (recordId, decision) => {
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
      container.innerHTML = `<div class="empty-state">Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o l\u1ECDt qua v\xF2ng V1.</div>`;
      return;
    }
    container.innerHTML = data.data.map((item) => `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
      <b>${item.record.title}</b> (${item.record.year})<br>
      <div style="margin-top: 5px;">
        <button class="btn btn-sm btn-primary" onclick="window.decideV2('${item.record.id}', 'INCLUDE')">Include (Full)</button>
        <button class="btn btn-sm btn-danger" onclick="window.decideV2('${item.record.id}', 'EXCLUDE')">Exclude (Full)</button>
        <span style="margin-left:10px; font-weight:bold; color: ${item.v2Decision.decision === "INCLUDE" ? "green" : item.v2Decision.decision === "EXCLUDE" ? "red" : "orange"}">${item.v2Decision.decision}</span>
      </div>
    </div>
  `).join("");
  }
  window.decideV2 = async (recordId, decision) => {
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
      container.innerHTML = `<div class="empty-state">Ch\u01B0a c\xF3 b\xE0i b\xE1o n\xE0o l\u1ECDt v\xE0o v\xF2ng n\xE0y ho\u1EB7c ch\u01B0a tr\xEDch xu\u1EA5t.</div>`;
      return;
    }
    container.innerHTML = data.data.map((item) => `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
      <b>${item.paperDisplay}</b><br>
      Tool: <input type="text" id="ev_tool_${item.recordId}" value="${item.toolOrLlm}" style="width: 100px; padding: 2px;">
      Metric: <input type="text" id="ev_metric_${item.recordId}" value="${item.metric}" style="width: 100px; padding: 2px;">
      K\u1EBFt qu\u1EA3: <input type="text" id="ev_res_${item.recordId}" value="${item.result}" style="width: 100px; padding: 2px;">
      <button class="btn btn-sm btn-secondary" onclick="window.saveEv('${item.recordId}')">L\u01B0u</button>
    </div>
  `).join("");
  }
  window.saveEv = async (recordId) => {
    const tool = $(`ev_tool_${recordId}`)?.value;
    const metric = $(`ev_metric_${recordId}`)?.value;
    const result = $(`ev_res_${recordId}`)?.value;
    await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/evidence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, toolOrLlm: tool, metric, result })
    });
    showToast("\u0110\xE3 l\u01B0u Evidence!");
  };
  async function loadPrisma() {
    if (!activeProjectId) return;
    const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/prisma`);
    const data = await res.json();
    const container = $("prismaContainer");
    if (container) {
      container.textContent = data.markdown || "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u PRISMA.";
    }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    await checkBackendHealth();
    chrome.storage?.local?.get([STORAGE_ACTIVE_PROJECT_ID, STORAGE_CURRENT_STAGE], async (res) => {
      if (res[STORAGE_ACTIVE_PROJECT_ID]) activeProjectId = res[STORAGE_ACTIVE_PROJECT_ID];
      const initialStage = res[STORAGE_CURRENT_STAGE] || "PROJECT";
      await loadProjects();
      switchStage(initialStage);
    });
    $("activeProjectSelect")?.addEventListener("change", (e) => {
      setActiveProject(e.target.value);
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
    $("btnRunSearch")?.addEventListener("click", () => {
      showToast("T\xEDnh n\u0103ng API t\u1EF1 \u0111\u1ED9ng \u0111ang g\u1ECDi. Vui l\xF2ng xem \u1EDF tab IMPORT \u0111\u1EC3 nh\u1EADp th\u1EE7 c\xF4ng n\u1EBFu kh\xF4ng c\xF3 API key.");
    });
    $("btnImportCsv")?.addEventListener("click", async () => {
      if (!activeProjectId) return alert("Ch\u1ECDn D\u1EF1 \xE1n tr\u01B0\u1EDBc!");
      const content = $("importCsvContent").value;
      if (!content) return alert("Ch\u01B0a d\xE1n n\u1ED9i dung CSV!");
      const res = await fetch(`${BACKEND_URL}/api/projects/${activeProjectId}/records/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, defaultSource: "Import" })
      });
      const result = await res.json();
      alert(`\u0110\xE3 nh\u1EADp: ${result.validCount} b\xE0i, L\u1ED7i: ${result.invalidCount}`);
    });
    $("btnLoadPrisma")?.addEventListener("click", loadPrisma);
    $("btnExportZip")?.addEventListener("click", () => {
      if (!activeProjectId) return;
      const url = `${BACKEND_URL}/api/projects/${activeProjectId}/export-zip`;
      window.open(url, "_blank");
    });
  });
})();
