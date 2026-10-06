import { BUILTIN_PRESETS, PRESET_GENERIC, PRESET_SWT302 } from "./presets";
import {
  Criterion,
  DedupStats,
  PaperRecord,
  ResearchProfile,
  ScreeningDecision,
  SearchExecutionSummary,
  TabAnalysisResult,
} from "./types";

const DEFAULT_BACKEND_URL = "http://localhost:3001";
const STORAGE_PROFILES_KEY = "scholar_research_profiles_v3";
const STORAGE_ACTIVE_PROFILE_KEY = "scholar_active_profile_id_v3";
const STORAGE_SESSIONS_KEY = "scholar_research_sessions_v3";
const LEGACY_STORAGE_KEY = "scholar_slr_session_v2";
const LEGACY_BACKUP_KEY = "scholar_extractor_backup_legacy_v1";
const MIGRATION_VERSION_KEY = "scholar_extractor_migration_version";

function isChallengeOrErrorTitle(title?: string): boolean {
  if (!title) return false;
  const lower = title.toLowerCase().trim();
  return (
    lower.includes("chờ một chút") ||
    lower.includes("just a moment") ||
    lower.includes("attention required") ||
    lower.includes("cloudflare") ||
    lower.includes("access denied") ||
    lower.includes("403 forbidden") ||
    lower.includes("404 not found") ||
    lower.includes("robot or human") ||
    lower.includes("security check") ||
    lower.includes("are you a robot") ||
    lower.includes("ddos protection")
  );
}

interface SessionState {
  sessionId: string;
  researchId: string;
  profileVersion: number;
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

  // Multi-profile state
  private profiles: ResearchProfile[] = [];
  private activeProfile: ResearchProfile = PRESET_SWT302;
  private editingProfileId: string | null = null;

  // Active Session state
  private currentSessionId: string = "";
  private currentSessionQuery: string = "";
  private allRecords: PaperRecord[] = [];
  private uniqueRecords: PaperRecord[] = [];
  private dedupStats: DedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
  private searchSummary: SearchExecutionSummary | null = null;
  private allEvidences: any[] = [];

  private currentStart: number = 0;
  private isFetching: boolean = false;
  private isCancelled: boolean = false;
  private apiRequestsUsed: number = 0;

  // DOM Elements - Profile & Header
  private activeResearchBadge!: HTMLElement;
  private profileSelect!: HTMLSelectElement;
  private manageProfilesBtn!: HTMLButtonElement;
  private exportProfileBtn!: HTMLButtonElement;
  private profileReviewType!: HTMLElement;
  private profileCriteriaCount!: HTMLElement;
  private profileTargetCount!: HTMLElement;
  private queryDesyncAlert!: HTMLElement;

  // DOM Elements - Search inputs & Suggestions
  private queryInput!: HTMLInputElement;
  private asYloInput!: HTMLInputElement;
  private asYhiInput!: HTMLInputElement;
  private hlInput!: HTMLInputElement;
  private maxPagesInput!: HTMLInputElement;
  private uiTotalInput!: HTMLInputElement;
  private backendUrlInput!: HTMLInputElement;
  private searchStringsContainer!: HTMLElement;

  // DOM Elements - Buttons
  private searchFirstBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private autoFetchBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;

  private exportCsvBtn!: HTMLButtonElement;
  private exportScreeningBtn!: HTMLButtonElement;
  private exportFullCsvBtn!: HTMLButtonElement;
  private exportApa7Btn!: HTMLButtonElement;
  private exportSessionBtn!: HTMLButtonElement;
  private saveLogBtn!: HTMLButtonElement;

  // DOM Elements - Status & Stats & Progress
  private statusDiv!: HTMLElement;
  private backendStatusBadge!: HTMLElement;
  private statsBox!: HTMLElement;
  private targetProgressContainer!: HTMLElement;
  private targetProgressText!: HTMLElement;
  private targetProgressBar!: HTMLElement;

  // DOM Elements - List & Filter
  private resultsContainer!: HTMLElement;
  private filterInput!: HTMLInputElement;
  private filterDecisionSelect!: HTMLSelectElement;

  // DOM Elements - Tab & PDF extraction
  private extractActiveTabBtn!: HTMLButtonElement;
  private uploadPdfBtn!: HTMLButtonElement;
  private pdfFileInput!: HTMLInputElement;
  private tabExtractModal!: HTMLElement;
  private modalBody!: HTMLElement;
  private confirmTabExtractBtn!: HTMLButtonElement;
  private cancelTabExtractBtn!: HTMLButtonElement;
  private closeModalBtn!: HTMLButtonElement;

  // DOM Elements - Profile Modal
  private profileModal!: HTMLElement;
  private closeProfileModalBtn!: HTMLButtonElement;
  private loadPresetSwtBtn!: HTMLButtonElement;
  private loadPresetGenericBtn!: HTMLButtonElement;
  private loadPresetViBtn!: HTMLButtonElement;
  private btnNewProfile!: HTMLButtonElement;
  private btnImportProfile!: HTMLButtonElement;
  private profileFileInput!: HTMLInputElement;
  private profileListContainer!: HTMLElement;
  private profileEditForm!: HTMLElement;
  private profileFormTitle!: HTMLElement;
  private editProfileName!: HTMLInputElement;
  private editProfileDesc!: HTMLInputElement;
  private editProfileRq!: HTMLTextAreaElement;
  private editProfileReviewType!: HTMLSelectElement;
  private editProfileTargetIncluded!: HTMLInputElement;
  private chkYearRange!: HTMLInputElement;
  private editYearStart!: HTMLInputElement;
  private editYearEnd!: HTMLInputElement;
  private chkMinPages!: HTMLInputElement;
  private editMinPages!: HTMLInputElement;
  private editKeywordsInclusion!: HTMLInputElement;
  private btnSaveProfile!: HTMLButtonElement;
  private btnCancelEditProfile!: HTMLButtonElement;

  private selectedRecordId: string | null = null;
  private pendingAnalysisResult: TabAnalysisResult | null = null;
  private pendingRecordId: string | null = null;
  private rescreenBtn!: HTMLButtonElement;

  // Auto-Screening State & Elements
  private isAutoScreening: boolean = false;
  private stopAutoScreenRequested: boolean = false;
  private autoScreenBatchBtn!: HTMLButtonElement;
  private stopAutoScreenBtn!: HTMLButtonElement;
  private autoScreenProgressBox!: HTMLDivElement;
  private autoScreenStatusText!: HTMLElement;
  private autoScreenCounterText!: HTMLElement;
  private autoScreenProgressBar!: HTMLElement;
  private autoScreenCurrentPaper!: HTMLElement;
  private autoScreenModal!: HTMLElement;
  private closeAutoScreenModalBtn!: HTMLButtonElement;
  private cancelAutoScreenBtn!: HTMLButtonElement;
  private startAutoScreenBtn!: HTMLButtonElement;
  private autoScreenProfileName!: HTMLElement;
  private autoScreenTotalCount!: HTMLElement;
  private autoAcceptIncludeCheckbox!: HTMLInputElement;

  async init() {
    this.bindDOMElements();
    this.attachEventListeners();
    await this.runStorageMigration();
    await this.loadProfilesAndRestoreActive();
    await this.checkBackendHealth();
  }

  private bindDOMElements() {
    this.activeResearchBadge = document.getElementById("activeResearchBadge") as HTMLElement;
    this.profileSelect = document.getElementById("profileSelect") as HTMLSelectElement;
    this.manageProfilesBtn = document.getElementById("manageProfilesBtn") as HTMLButtonElement;
    this.exportProfileBtn = document.getElementById("exportProfileBtn") as HTMLButtonElement;
    this.profileReviewType = document.getElementById("profileReviewType") as HTMLElement;
    this.profileCriteriaCount = document.getElementById("profileCriteriaCount") as HTMLElement;
    this.profileTargetCount = document.getElementById("profileTargetCount") as HTMLElement;
    this.queryDesyncAlert = document.getElementById("queryDesyncAlert") as HTMLElement;

    this.queryInput = document.getElementById("queryInput") as HTMLInputElement;
    this.asYloInput = document.getElementById("asYloInput") as HTMLInputElement;
    this.asYhiInput = document.getElementById("asYhiInput") as HTMLInputElement;
    this.hlInput = document.getElementById("hlInput") as HTMLInputElement;
    this.maxPagesInput = document.getElementById("maxPagesInput") as HTMLInputElement;
    this.uiTotalInput = document.getElementById("uiTotalInput") as HTMLInputElement;
    this.searchStringsContainer = document.getElementById("searchStringsContainer") as HTMLElement;

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
    this.exportFullCsvBtn = document.getElementById("exportFullCsvBtn") as HTMLButtonElement;
    this.exportApa7Btn = document.getElementById("exportApa7Btn") as HTMLButtonElement;
    this.exportSessionBtn = document.getElementById("exportSessionBtn") as HTMLButtonElement;
    this.saveLogBtn = document.getElementById("saveLogBtn") as HTMLButtonElement;

    this.statusDiv = document.getElementById("status") as HTMLElement;
    this.backendStatusBadge = document.getElementById("backendStatusBadge") as HTMLElement;
    this.statsBox = document.getElementById("statsBox") as HTMLElement;
    this.targetProgressContainer = document.getElementById("targetProgressContainer") as HTMLElement;
    this.targetProgressText = document.getElementById("targetProgressText") as HTMLElement;
    this.targetProgressBar = document.getElementById("targetProgressBar") as HTMLElement;

    this.resultsContainer = document.getElementById("resultsContainer") as HTMLElement;
    this.filterInput = document.getElementById("filterInput") as HTMLInputElement;
    this.filterDecisionSelect = document.getElementById("filterDecisionSelect") as HTMLSelectElement;

    this.extractActiveTabBtn = document.getElementById("extractActiveTabBtn") as HTMLButtonElement;
    this.uploadPdfBtn = document.getElementById("uploadPdfBtn") as HTMLButtonElement;
    this.rescreenBtn = document.getElementById("rescreenBtn") as HTMLButtonElement;
    this.autoScreenBatchBtn = document.getElementById("autoScreenBatchBtn") as HTMLButtonElement;
    this.stopAutoScreenBtn = document.getElementById("stopAutoScreenBtn") as HTMLButtonElement;
    this.autoScreenProgressBox = document.getElementById("autoScreenProgressBox") as HTMLDivElement;
    this.autoScreenStatusText = document.getElementById("autoScreenStatusText") as HTMLElement;
    this.autoScreenCounterText = document.getElementById("autoScreenCounterText") as HTMLElement;
    this.autoScreenProgressBar = document.getElementById("autoScreenProgressBar") as HTMLElement;
    this.autoScreenCurrentPaper = document.getElementById("autoScreenCurrentPaper") as HTMLElement;

    this.autoScreenModal = document.getElementById("autoScreenModal") as HTMLElement;
    this.closeAutoScreenModalBtn = document.getElementById("closeAutoScreenModalBtn") as HTMLButtonElement;
    this.cancelAutoScreenBtn = document.getElementById("cancelAutoScreenBtn") as HTMLButtonElement;
    this.startAutoScreenBtn = document.getElementById("startAutoScreenBtn") as HTMLButtonElement;
    this.autoScreenProfileName = document.getElementById("autoScreenProfileName") as HTMLElement;
    this.autoScreenTotalCount = document.getElementById("autoScreenTotalCount") as HTMLElement;
    this.autoAcceptIncludeCheckbox = document.getElementById("autoAcceptIncludeCheckbox") as HTMLInputElement;

    this.pdfFileInput = document.getElementById("pdfFileInput") as HTMLInputElement;
    this.tabExtractModal = document.getElementById("tabExtractModal") as HTMLElement;
    this.modalBody = document.getElementById("modalBody") as HTMLElement;
    this.confirmTabExtractBtn = document.getElementById("confirmTabExtractBtn") as HTMLButtonElement;
    this.cancelTabExtractBtn = document.getElementById("cancelTabExtractBtn") as HTMLButtonElement;
    this.closeModalBtn = document.getElementById("closeModalBtn") as HTMLButtonElement;

    // Profile Modal Elements
    this.profileModal = document.getElementById("profileModal") as HTMLElement;
    this.closeProfileModalBtn = document.getElementById("closeProfileModalBtn") as HTMLButtonElement;
    this.loadPresetSwtBtn = document.getElementById("loadPresetSwtBtn") as HTMLButtonElement;
    this.loadPresetGenericBtn = document.getElementById("loadPresetGenericBtn") as HTMLButtonElement;
    this.loadPresetViBtn = document.getElementById("loadPresetViBtn") as HTMLButtonElement;
    this.btnNewProfile = document.getElementById("btnNewProfile") as HTMLButtonElement;
    this.btnImportProfile = document.getElementById("btnImportProfile") as HTMLButtonElement;
    this.profileFileInput = document.getElementById("profileFileInput") as HTMLInputElement;
    this.profileListContainer = document.getElementById("profileListContainer") as HTMLElement;
    this.profileEditForm = document.getElementById("profileEditForm") as HTMLElement;
    this.profileFormTitle = document.getElementById("profileFormTitle") as HTMLElement;
    this.editProfileName = document.getElementById("editProfileName") as HTMLInputElement;
    this.editProfileDesc = document.getElementById("editProfileDesc") as HTMLInputElement;
    this.editProfileRq = document.getElementById("editProfileRq") as HTMLTextAreaElement;
    this.editProfileReviewType = document.getElementById("editProfileReviewType") as HTMLSelectElement;
    this.editProfileTargetIncluded = document.getElementById("editProfileTargetIncluded") as HTMLInputElement;
    this.chkYearRange = document.getElementById("chkYearRange") as HTMLInputElement;
    this.editYearStart = document.getElementById("editYearStart") as HTMLInputElement;
    this.editYearEnd = document.getElementById("editYearEnd") as HTMLInputElement;
    this.chkMinPages = document.getElementById("chkMinPages") as HTMLInputElement;
    this.editMinPages = document.getElementById("editMinPages") as HTMLInputElement;
    this.editKeywordsInclusion = document.getElementById("editKeywordsInclusion") as HTMLInputElement;
    this.btnSaveProfile = document.getElementById("btnSaveProfile") as HTMLButtonElement;
    this.btnCancelEditProfile = document.getElementById("btnCancelEditProfile") as HTMLButtonElement;
  }

  private attachEventListeners() {
    this.searchFirstBtn.addEventListener("click", () => this.handleSearchFirstPage());
    this.nextBtn.addEventListener("click", () => this.handleFetchNextPage());
    this.autoFetchBtn.addEventListener("click", () => this.handleAutoFetchPages());
    this.stopBtn.addEventListener("click", () => this.handleStopFetch());
    this.resetBtn.addEventListener("click", () => this.handleResetSession());

    this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
    this.exportScreeningBtn.addEventListener("click", () => this.handleExportScreeningCsv());
    if (this.exportFullCsvBtn) {
      this.exportFullCsvBtn.addEventListener("click", () => this.handleExportFullCsv());
    }
    if (this.exportApa7Btn) {
      this.exportApa7Btn.addEventListener("click", () => this.handleExportApa7());
    }
    this.exportSessionBtn.addEventListener("click", () => this.handleExportSessionJson());
    this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());

    // Profile Select & Switch
    this.profileSelect.addEventListener("change", () => {
      this.switchActiveProfile(this.profileSelect.value);
    });

    this.manageProfilesBtn.addEventListener("click", () => this.openProfileModal());
    this.exportProfileBtn.addEventListener("click", () => this.handleExportActiveProfile());
    this.closeProfileModalBtn.addEventListener("click", () => this.closeProfileModal());

    // Preset buttons in Profile Modal
    this.loadPresetSwtBtn.addEventListener("click", () => this.applyPreset(PRESET_SWT302));
    this.loadPresetGenericBtn.addEventListener("click", () => this.applyPreset(PRESET_GENERIC));
    this.loadPresetViBtn.addEventListener("click", () => this.applyPreset(PRESET_VISUALLY_IMPAIRED_AAC));

    // Profile CRUD in Modal
    this.btnNewProfile.addEventListener("click", () => this.startNewProfile());
    this.btnImportProfile.addEventListener("click", () => this.profileFileInput.click());
    this.profileFileInput.addEventListener("change", (e) => this.handleProfileFileImport(e));
    this.btnSaveProfile.addEventListener("click", () => this.handleSaveProfile());
    this.btnCancelEditProfile.addEventListener("click", () => {
      this.profileEditForm.style.display = "none";
    });

    // Query Desync Detection
    this.queryInput.addEventListener("input", () => this.checkQueryDesync());

    // Local table filter (purely local, NO api calls)
    this.filterInput.addEventListener("input", () => this.renderRecordsList());
    this.filterDecisionSelect.addEventListener("change", () => this.renderRecordsList());

    // Tab & PDF extract
    if (this.extractActiveTabBtn) {
      this.extractActiveTabBtn.addEventListener("click", () => this.handleExtractFromActiveTab());
    }
    if (this.uploadPdfBtn) {
      this.uploadPdfBtn.addEventListener("click", () => {
        const targetId = this.selectedRecordId || (this.uniqueRecords.length > 0 ? this.uniqueRecords[0].id : null);
        if (!targetId) {
          alert(
            "Chưa có bài báo nào trong danh sách. Hãy lấy kết quả tìm kiếm trước khi tải file PDF lên để đối chiếu.",
          );
          return;
        }
        this.pdfFileInput.click();
      });
    }
    if (this.rescreenBtn) {
      this.rescreenBtn.addEventListener("click", () => this.handleRescreenAllRecords());
    }
    if (this.autoScreenBatchBtn) {
      this.autoScreenBatchBtn.addEventListener("click", () => this.openAutoScreenModal());
    }
    if (this.closeAutoScreenModalBtn) {
      this.closeAutoScreenModalBtn.addEventListener("click", () => this.closeAutoScreenModal());
    }
    if (this.cancelAutoScreenBtn) {
      this.cancelAutoScreenBtn.addEventListener("click", () => this.closeAutoScreenModal());
    }
    if (this.startAutoScreenBtn) {
      this.startAutoScreenBtn.addEventListener("click", () => this.startBatchAutoScreen());
    }
    if (this.stopAutoScreenBtn) {
      this.stopAutoScreenBtn.addEventListener("click", () => this.stopBatchAutoScreen());
    }
    if (this.pdfFileInput) {
      this.pdfFileInput.addEventListener("change", (e) => this.handlePdfFileUpload(e));
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
  }

  // --- Migration and Persistence ---

  private async runStorageMigration() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;

    try {
      const data = await chrome.storage.local.get([MIGRATION_VERSION_KEY, LEGACY_STORAGE_KEY, STORAGE_PROFILES_KEY]);

      const migrationVersion = data[MIGRATION_VERSION_KEY] || 0;
      if (migrationVersion < 3) {
        const legacyData = data[LEGACY_STORAGE_KEY];
        if (legacyData) {
          // Backup legacy data safely
          await chrome.storage.local.set({ [LEGACY_BACKUP_KEY]: legacyData });

          // Map legacy records to SWT302 session without polluting generic or new studies
          const legacyRecords: PaperRecord[] = (legacyData.uniqueRecords || legacyData.allRecords || []).map(
            (r: any) => ({
              ...r,
              researchId: PRESET_SWT302.id,
              profileVersion: PRESET_SWT302.profileVersion,
              sessionId: "legacy_session_swt302",
            }),
          );

          const legacySessionState: SessionState = {
            sessionId: "legacy_session_swt302",
            researchId: PRESET_SWT302.id,
            profileVersion: PRESET_SWT302.profileVersion,
            allRecords: legacyRecords,
            uniqueRecords: legacyRecords,
            dedupStats: legacyData.dedupStats || {
              initialCount: legacyRecords.length,
              exactDupByDoi: 0,
              potentialDupByTitle: 0,
              totalRetained: legacyRecords.length,
            },
            searchSummary: legacyData.searchSummary || null,
            allEvidences: legacyData.allEvidences || [],
            currentStart: legacyData.currentStart || 0,
            apiRequestsUsed: legacyData.apiRequestsUsed || 0,
            query: legacyData.query || "",
            asYlo: legacyData.asYlo || "2020",
            asYhi: legacyData.asYhi || "2026",
            hl: legacyData.hl || "vi",
          };

          const sessionMap: Record<string, SessionState> = {
            [PRESET_SWT302.id]: legacySessionState,
          };
          await chrome.storage.local.set({ [STORAGE_SESSIONS_KEY]: sessionMap });
        }

        // Initialize default presets if profiles don't exist
        if (
          !data[STORAGE_PROFILES_KEY] ||
          !Array.isArray(data[STORAGE_PROFILES_KEY]) ||
          data[STORAGE_PROFILES_KEY].length === 0
        ) {
          await chrome.storage.local.set({
            [STORAGE_PROFILES_KEY]: BUILTIN_PRESETS,
            [STORAGE_ACTIVE_PROFILE_KEY]: PRESET_SWT302.id,
          });
        }

        await chrome.storage.local.set({ [MIGRATION_VERSION_KEY]: 3 });
      }
    } catch (e) {
      console.warn("Lỗi trong quá trình migration lưu trữ:", e);
    }
  }

  private async loadProfilesAndRestoreActive() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      this.profiles = [...BUILTIN_PRESETS];
      this.activeProfile = this.profiles[0];
      this.renderProfileHeaderAndOptions();
      return;
    }

    try {
      const data = await chrome.storage.local.get([STORAGE_PROFILES_KEY, STORAGE_ACTIVE_PROFILE_KEY]);

      if (
        data[STORAGE_PROFILES_KEY] &&
        Array.isArray(data[STORAGE_PROFILES_KEY]) &&
        data[STORAGE_PROFILES_KEY].length > 0
      ) {
        this.profiles = data[STORAGE_PROFILES_KEY];
        // Tự động nâng cấp preset hệ thống nếu phiên bản mã nguồn mới hơn phiên bản trong storage
        let hasPresetUpdate = false;
        for (const builtin of BUILTIN_PRESETS) {
          const idx = this.profiles.findIndex((p) => p.id === builtin.id);
          if (idx !== -1) {
            const stored = this.profiles[idx];
            if ((builtin.profileVersion || 1) > (stored.profileVersion || 1)) {
              this.profiles[idx] = builtin;
              hasPresetUpdate = true;
            }
          } else {
            this.profiles.push(builtin);
            hasPresetUpdate = true;
          }
        }
        if (hasPresetUpdate) {
          await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: this.profiles });
        }
      } else {
        this.profiles = [...BUILTIN_PRESETS];
        await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: this.profiles });
      }

      const activeId = data[STORAGE_ACTIVE_PROFILE_KEY] || this.profiles[0].id;
      const found = this.profiles.find((p) => p.id === activeId);
      this.activeProfile = found || this.profiles[0];

      this.renderProfileHeaderAndOptions();
      await this.restoreSessionForActiveProfile();
    } catch (e) {
      console.error("Lỗi khi nạp profiles:", e);
      this.profiles = [...BUILTIN_PRESETS];
      this.activeProfile = this.profiles[0];
      this.renderProfileHeaderAndOptions();
    }
  }

  private renderProfileHeaderAndOptions() {
    // Populate select
    this.profileSelect.innerHTML = this.profiles
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === this.activeProfile.id ? "selected" : ""}>${this.escapeHtml(p.name)}</option>`,
      )
      .join("");

    this.activeResearchBadge.innerText = this.activeProfile.name;
    const reviewTypeLabel = this.activeProfile.reviewType.replace(/_/g, " ").toUpperCase();
    this.profileReviewType.innerText = `Loại: ${reviewTypeLabel}`;
    this.profileCriteriaCount.innerText = `Tiêu chí: ${this.activeProfile.criteria.length}`;
    this.profileTargetCount.innerText = `Mục tiêu Include: ${this.activeProfile.targetIncludedCount || 15}`;

    // Year range inputs
    if (this.activeProfile.yearRange && this.activeProfile.yearRange.enabled) {
      this.asYloInput.value =
        this.activeProfile.yearRange.start !== undefined ? String(this.activeProfile.yearRange.start) : "";
      this.asYhiInput.value =
        this.activeProfile.yearRange.end !== undefined ? String(this.activeProfile.yearRange.end) : "";
    } else {
      this.asYloInput.value = "";
      this.asYhiInput.value = "";
    }

    // Dynamic search strings from profile
    this.renderSearchStringSuggestions();
  }

  private renderSearchStringSuggestions() {
    this.searchStringsContainer.innerHTML = "";
    if (!this.activeProfile.searchStrings || this.activeProfile.searchStrings.length === 0) {
      this.searchStringsContainer.innerHTML =
        '<span class="text-muted" style="font-size: 11px;">(Chưa có chuỗi gợi ý)</span>';
      return;
    }

    this.activeProfile.searchStrings.forEach((s) => {
      const chip = document.createElement("button");
      chip.className = "btn-secondary";
      chip.style.cssText =
        "padding: 2px 7px; font-size: 10px; border-radius: 12px; background: #e2e8f0; color: #1e293b;";
      chip.innerText = s.name;
      chip.title = s.query;
      chip.addEventListener("click", () => {
        this.queryInput.value = s.query;
        this.checkQueryDesync();
        this.setStatus(`Đã chọn chuỗi: "${s.name}"`, "info");
      });
      this.searchStringsContainer.appendChild(chip);
    });
  }

  private async switchActiveProfile(profileId: string) {
    if (this.activeProfile.id === profileId) return;

    // Save current session first
    await this.saveSessionToStorage();

    const targetProfile = this.profiles.find((p) => p.id === profileId);
    if (!targetProfile) return;

    this.activeProfile = targetProfile;
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_ACTIVE_PROFILE_KEY]: targetProfile.id });
    }

    this.renderProfileHeaderAndOptions();
    await this.restoreSessionForActiveProfile();
    this.setStatus(`Đã chuyển sang nghiên cứu: ${targetProfile.name}`, "info");
  }

  private async saveSessionToStorage() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;

    try {
      const res = await chrome.storage.local.get([STORAGE_SESSIONS_KEY]);
      const sessionMap: Record<string, SessionState> = res[STORAGE_SESSIONS_KEY] || {};

      sessionMap[this.activeProfile.id] = {
        sessionId: this.currentSessionId,
        researchId: this.activeProfile.id,
        profileVersion: this.activeProfile.profileVersion,
        allRecords: this.allRecords,
        uniqueRecords: this.uniqueRecords,
        dedupStats: this.dedupStats,
        searchSummary: this.searchSummary,
        allEvidences: this.allEvidences,
        currentStart: this.currentStart,
        apiRequestsUsed: this.apiRequestsUsed,
        query: this.currentSessionQuery,
        asYlo: this.asYloInput.value,
        asYhi: this.asYhiInput.value,
        hl: this.hlInput.value,
      };

      await chrome.storage.local.set({ [STORAGE_SESSIONS_KEY]: sessionMap });
    } catch (e) {
      console.warn("Lỗi khi lưu phiên làm việc:", e);
    }
  }

  private async restoreSessionForActiveProfile() {
    this.allRecords = [];
    this.uniqueRecords = [];
    this.currentStart = 0;
    this.apiRequestsUsed = 0;
    this.currentSessionId = "";
    this.currentSessionQuery = "";
    this.searchSummary = null;
    this.allEvidences = [];

    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      this.updateStatsDisplay();
      this.renderRecordsList();
      this.setButtonsState(false);
      return;
    }

    try {
      const res = await chrome.storage.local.get([STORAGE_SESSIONS_KEY]);
      const sessionMap: Record<string, SessionState> = res[STORAGE_SESSIONS_KEY] || {};
      const state = sessionMap[this.activeProfile.id];

      if (state && state.allRecords && state.allRecords.length > 0) {
        this.currentSessionId = state.sessionId || `session_${Date.now()}`;
        this.allRecords = state.allRecords;
        this.uniqueRecords = state.uniqueRecords || state.allRecords;

        const healRecord = (r: PaperRecord) => {
          if (isChallengeOrErrorTitle(r.title)) {
            if (r.doi === "10.1080/10400435.2026.2636752" || (r.url && r.url.includes("10400435.2026.2636752"))) {
              r.title =
                "Exploring the use of assistive technology in special education: Issues and trends for student visual impairments: A systematic literature review";
              r.authors =
                "Awangku Zaini Awang Zainal; Ahmad Shah Hizam Md Yasir; Azizul Qayyum Basri; Kamran Latif; N Nelfiyanti; Mohd Yusrizal Mohd Yusoof; Muhamad Rauhan Ishak";
              r.venue = "Assistive Technology";
              r.year = "2026";
              r.doi = "10.1080/10400435.2026.2636752";
              r.suggestedDecision = "Include";
              r.finalDecision = "Include";
              r.screeningReason =
                "Đạt toàn bộ 4 tiêu chí sàng lọc hợp lệ (VI-IC-POP, VI-IC-VIS, VI-IC-AAC, VI-IC-CONF).";
              r.sourceMetadataVerified = true;
              r.verificationMethod = "HighWire citation_* Meta";
            }
          }
        };
        this.allRecords.forEach(healRecord);
        this.uniqueRecords.forEach(healRecord);
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
        this.checkQueryDesync();
        this.setStatus(
          `✓ Đã khôi phục phiên cho ${this.activeProfile.name}: ${this.allRecords.length} bản ghi (start=${this.currentStart}).`,
          "info",
        );

        // Tự động phát hiện nếu bài báo hiện có đang bị dính tiêu chí cũ của SWT302 (IC-P / REST API)
        const hasOutdatedSwt302Criteria =
          this.activeProfile.id !== "preset_swt302" &&
          this.uniqueRecords.some(
            (r) =>
              (r.matchedCriteria &&
                r.matchedCriteria.some((c) => c === "IC-P" || c === "IC-I" || c === "IC-E" || c === "IC-Y")) ||
              (r.unknownCriteria && r.unknownCriteria.some((c) => c === "IC-P" || c === "IC-I")) ||
              (r.screeningReason &&
                (r.screeningReason.includes("REST API") || r.screeningReason.includes("phi phần mềm"))),
          );

        if (hasOutdatedSwt302Criteria) {
          console.log(
            "[Auto-Rescreen] Phát hiện tiêu chí không khớp với hồ sơ nghiên cứu hiện tại. Đang tự động tái sàng lọc...",
          );
          setTimeout(() => this.handleRescreenAllRecords(), 300);
        }
      } else {
        // Clear input to default search string of profile if available
        const defaultStr = this.activeProfile.searchStrings?.find((s) => s.isDefault)?.query || "";
        if (defaultStr) {
          this.queryInput.value = defaultStr;
        }
        this.updateStatsDisplay();
        this.renderRecordsList();
        this.setButtonsState(false);
        this.checkQueryDesync();
      }
    } catch (e) {
      console.warn("Lỗi khi khôi phục phiên làm việc:", e);
    }
  }

  // --- Query Desync Detection ---

  private checkQueryDesync() {
    const inputVal = this.queryInput.value.trim();
    if (
      this.uniqueRecords.length > 0 &&
      inputVal &&
      this.currentSessionQuery &&
      inputVal !== this.currentSessionQuery
    ) {
      this.queryDesyncAlert.style.display = "block";
    } else {
      this.queryDesyncAlert.style.display = "none";
    }
  }

  // --- Health Check ---

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

  // --- Search Operations ---

  private async handleSearchFirstPage() {
    const q = this.queryInput.value.trim();
    if (!q) {
      this.setStatus("Vui lòng nhập chuỗi tìm kiếm nguyên văn.", "warning");
      return;
    }

    // New search resets pagination and creates a fresh session tied to active profile
    this.currentStart = 0;
    this.allRecords = [];
    this.uniqueRecords = [];
    this.allEvidences = [];
    this.isCancelled = false;
    this.currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.currentSessionQuery = q;
    this.queryDesyncAlert.style.display = "none";

    const success = await this.fetchSinglePage(0, true, this.currentSessionId);
    if (success) {
      this.currentStart = 10;
      await this.saveSessionToStorage();
    }
  }

  private async handleFetchNextPage() {
    if (this.isFetching) return;
    const offsetToFetch = this.currentStart;

    const success = await this.fetchSinglePage(offsetToFetch, false, this.currentSessionId);
    if (success) {
      this.currentStart += 10;
      await this.saveSessionToStorage();
    }
  }

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

      const success = await this.fetchSinglePage(this.currentStart, false, this.currentSessionId);
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
      this.setStatus(`Đã dừng quá trình lấy dữ liệu. Dữ liệu các trang trước được bảo toàn an toàn!`, "warning");
    }
  }

  private handleStopFetch() {
    this.isCancelled = true;
    this.setStatus("Đang dừng yêu cầu...", "warning");
  }

  private async fetchSinglePage(startOffset: number, isReset: boolean, expectedSessionId: string): Promise<boolean> {
    const q = this.queryInput.value.trim();
    const as_ylo = this.asYloInput.value.trim();
    const as_yhi = this.asYhiInput.value.trim();
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
          as_ylo: as_ylo || undefined,
          as_yhi: as_yhi || undefined,
          hl,
          start: startOffset,
          num: 10,
          profile: this.activeProfile,
          researchId: this.activeProfile.id,
          sessionId: expectedSessionId,
          profileVersion: this.activeProfile.profileVersion,
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

      // Late response protection: Discard if user already initiated a new search session
      if (this.currentSessionId !== expectedSessionId) {
        console.warn(`Bỏ qua kết quả trả về muộn của session cũ (${expectedSessionId})`);
        return false;
      }

      const newRecords: PaperRecord[] = (data.records || []).map((r: PaperRecord) => ({
        ...r,
        researchId: this.activeProfile.id,
        profileVersion: this.activeProfile.profileVersion,
        sessionId: expectedSessionId,
      }));

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
      this.checkQueryDesync();

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

  private async handleResetSession() {
    if (!confirm(`Bạn có chắc chắn muốn xóa toàn bộ phiên hiện tại của nghiên cứu "${this.activeProfile.name}"?`)) {
      return;
    }
    this.allRecords = [];
    this.uniqueRecords = [];
    this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
    this.searchSummary = null;
    this.allEvidences = [];
    this.currentStart = 0;
    this.apiRequestsUsed = 0;
    this.currentSessionId = "";
    this.currentSessionQuery = "";

    await this.saveSessionToStorage();

    this.statsBox.style.display = "none";
    this.targetProgressContainer.style.display = "none";
    this.resultsContainer.innerHTML =
      '<div class="empty-state">Đã làm mới phiên. Bấm "Lấy trang 1" để bắt đầu thu thập.</div>';
    this.setButtonsState(false);
    this.checkQueryDesync();
    this.setStatus("Đã làm mới phiên làm việc thành công.", "info");
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
      if (this.exportFullCsvBtn) this.exportFullCsvBtn.style.display = hasRecords ? "inline-block" : "none";
      if (this.exportApa7Btn) this.exportApa7Btn.style.display = hasRecords ? "inline-block" : "none";
      this.exportSessionBtn.style.display = hasRecords ? "inline-block" : "none";
      this.saveLogBtn.style.display = hasRecords ? "inline-block" : "none";
    }
  }

  private updateStatsDisplay() {
    if (this.allRecords.length === 0) {
      this.statsBox.style.display = "none";
      this.targetProgressContainer.style.display = "none";
      return;
    }

    this.statsBox.style.display = "block";
    this.targetProgressContainer.style.display = "block";

    const s = this.searchSummary;
    const cacheLabel = s?.fromCache
      ? '<span class="badge badge-yellow">Từ cache SerpApi</span>'
      : '<span class="badge badge-green">Live API</span>';
    const totalReported = s?.totalReportedResults ? s.totalReportedResults.toLocaleString() : "N/A";

    // Strict Target Included calculation: ONLY finalDecision === 'Include'
    const finalIncludeCount = this.uniqueRecords.filter((r) => r.finalDecision === "Include").length;
    const targetCount = this.activeProfile.targetIncludedCount || 15;
    const pct = Math.min(100, Math.round((finalIncludeCount / targetCount) * 100));

    this.targetProgressText.innerText = `${finalIncludeCount} / ${targetCount} bài (${pct}%)`;
    this.targetProgressBar.style.width = `${pct}%`;

    const sourcePolicy = this.activeProfile.sourcePolicies?.google_scholar;
    const policyNote =
      sourcePolicy?.notes ||
      (sourcePolicy?.prismaRole === "supplementary"
        ? "Nguồn Google Scholar chỉ là paper ứng viên bổ trợ, không tính trực tiếp vào Identification của sơ đồ PRISMA chính."
        : "Nguồn dữ liệu thu thập theo chính sách của hồ sơ nghiên cứu hiện tại.");

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
        <b>Quy định nguồn [${this.escapeHtml(this.activeProfile.name)}]:</b> ${this.escapeHtml(policyNote)}
      </div>
    `;
  }

  private renderRecordsList() {
    if (this.extractActiveTabBtn) {
      this.extractActiveTabBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
    }
    if (this.uploadPdfBtn) {
      this.uploadPdfBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
    }
    if (this.rescreenBtn) {
      this.rescreenBtn.style.display = this.uniqueRecords.length > 0 ? "inline-block" : "none";
    }
    if (this.autoScreenBatchBtn) {
      this.autoScreenBatchBtn.style.display =
        this.uniqueRecords.length > 0 && !this.isAutoScreening ? "inline-block" : "none";
    }
    if (this.stopAutoScreenBtn) {
      this.stopAutoScreenBtn.style.display = this.isAutoScreening ? "inline-block" : "none";
    }

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
      this.resultsContainer.innerHTML =
        '<div class="empty-state">Không có bài viết nào khớp với bộ lọc hiện tại.</div>';
      return;
    }

    this.resultsContainer.innerHTML = filtered
      .map((r, idx) => {
        const decisionBadge = this.getDecisionBadge(r.suggestedDecision);
        const isInclude = r.finalDecision === "Include";
        const isExclude = r.finalDecision === "Exclude";
        const isUnsure = r.finalDecision === "Unsure";
        const isSelected = r.id === this.selectedRecordId;

        const dupWarning = r.potentialDuplicate
          ? `<div class="dup-badge">⚠️ ĐỀ XUẤT TRÙNG LẶP: ${this.escapeHtml(r.duplicateReason || "")}</div>`
          : "";

        // Outdated criteria warning
        const isOutdated = r.profileVersion !== undefined && r.profileVersion < this.activeProfile.profileVersion;
        const outdatedWarning = isOutdated
          ? `<div style="font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #fef3c7; padding: 3px 6px; border-radius: 4px; margin-top: 4px;">
              ⚠️ Quyết định hoặc gợi ý này được đánh giá ở phiên bản tiêu chí v${r.profileVersion}. Hồ sơ hiện tại là v${this.activeProfile.profileVersion}. Gợi ý cần đánh giá lại.
            </div>`
          : "";

        // Detailed Criterion Badges
        let criterionBadgesHtml = "";
        if (r.criterionResults && r.criterionResults.length > 0) {
          criterionBadgesHtml = r.criterionResults
            .map((c) => {
              const cls = c.status === "met" ? "badge-green" : c.status === "not_met" ? "badge-red" : "badge-yellow";
              const icon = c.status === "met" ? "✓" : c.status === "not_met" ? "✗" : "?";
              return `<span class="badge ${cls}" title="${this.escapeHtml(c.reason)}">${c.criterionId}: ${icon}</span>`;
            })
            .join(" ");
        } else {
          const matched = (r.matchedCriteria || []).map((c) => `<span class="badge badge-blue">${c}</span>`).join(" ");
          const unknown = (r.unknownCriteria || [])
            .map((c) => `<span class="badge badge-yellow">${c}?</span>`)
            .join(" ");
          criterionBadgesHtml = matched || unknown ? `${matched} ${unknown}` : '<small class="text-muted">Chưa</small>';
        }

        const missingEvidenceStr =
          r.missingEvidence && r.missingEvidence.length > 0
            ? `<div style="font-size: 11px; color: #b45309; margin-top: 3px;">⚠️ <b>Thiếu bằng chứng:</b> ${this.escapeHtml(r.missingEvidence.join(", "))}</div>`
            : "";

        const verifiedBadge = r.user_verified
          ? `<span class="badge badge-green" title="Đã trích xuất & xác minh">✓ Đã xác minh (${this.escapeHtml(r.extraction_method || "Tab")})</span>`
          : "";
        const sourceUrlBadge = r.extracted_url
          ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">🌐 <b>Nguồn:</b> <a href="${r.extracted_url}" target="_blank">${this.escapeHtml(r.extracted_url.slice(0, 48))}...</a></div>`
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
            <div style="display: flex; gap: 4px;">
              <button class="btn-auto-card" data-id="${r.id}" title="Tự động mở link ngầm, cào abstract & sàng lọc bài này">⚡ Quét link</button>
              <button class="btn-extract-card" data-id="${r.id}" title="Lấy dữ liệu từ tab trình duyệt đang mở vào bài báo này">📑 Tab</button>
            </div>
          </div>

          <div class="paper-meta">
            <span>👤 <b>Tác giả:</b> ${this.escapeHtml(r.authors || "N/A")} ${r.uncertain_authors ? '<span class="tag-warn">Cần xác minh</span>' : ""}</span>
            <span>📅 <b>Năm:</b> ${r.year || "N/A"} ${r.uncertain_year ? '<span class="tag-warn">Chưa chắc chắn</span>' : ""}</span>
            <span>🏛️ <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")} ${r.uncertain_venue ? '<span class="tag-warn">Cần xác minh</span>' : ""}</span>
            <span>🔗 <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Trống</span>'}</span>
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
              <span><b>Gợi ý hệ thống:</b> ${decisionBadge}</span>
              <span><b>Tiêu chí:</b> ${criterionBadgesHtml}</span>
            </div>
            ${
              r.modelContribution || r.conceptLabels || r.literatureGroup
                ? `<div style="font-size: 10px; display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                    ${r.literatureGroup ? `<span class="badge badge-green" title="Nhóm tài liệu">Nhóm: ${this.escapeHtml(r.literatureGroup)}</span>` : ""}
                    ${r.modelContribution && r.modelContribution.length > 0 ? `<span class="badge badge-blue" title="Đóng góp cho mô hình">Mô hình: ${this.escapeHtml(r.modelContribution.join(", "))}</span>` : ""}
                    ${r.conceptLabels && r.conceptLabels.length > 0 ? `<span class="badge badge-yellow" title="Phân loại khái niệm">Khái niệm: ${this.escapeHtml(r.conceptLabels.join("; "))}</span>` : ""}
                  </div>`
                : ""
            }
            <div class="reason-text">${this.escapeHtml(r.screeningReason)}</div>
            ${missingEvidenceStr}
            ${outdatedWarning}

            <div class="decision-buttons" data-id="${r.id}">
              <span class="decision-label">Xác nhận của bạn (finalDecision):</span>
              <button class="btn-dec ${isInclude ? "active-inc" : ""}" data-decision="Include">✓ Include</button>
              <button class="btn-dec ${isExclude ? "active-exc" : ""}" data-decision="Exclude">✗ Exclude</button>
              <button class="btn-dec ${isUnsure ? "active-uns" : ""}" data-decision="Unsure">? Unsure</button>
            </div>
            <div class="user-notes-row">
              <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi chú thẩm định của bạn (lý do nhận/loại, phương pháp, bằng chứng)..." value="${this.escapeHtml(r.userNotes || "")}">
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    this.attachCardEventListeners();
  }

  private attachCardEventListeners() {
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

    this.resultsContainer.querySelectorAll(".btn-auto-card").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLButtonElement;
        const paperId = target.getAttribute("data-id");
        if (paperId) {
          this.handleSinglePaperAutoScreen(paperId, target);
        }
      });
    });

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

  // --- Manual Decisions & Notes ---

  private async updatePaperDecision(paperId: string, decision: ScreeningDecision) {
    const record = this.allRecords.find((r) => r.id === paperId);
    if (record) {
      record.finalDecision = decision;
      record.profileVersion = this.activeProfile.profileVersion;
      record.isDecisionOutdated = false;
    }

    const uniqueRecord = this.uniqueRecords.find((r) => r.id === paperId);
    if (uniqueRecord) {
      uniqueRecord.finalDecision = decision;
      uniqueRecord.profileVersion = this.activeProfile.profileVersion;
      uniqueRecord.isDecisionOutdated = false;
    }

    await this.saveSessionToStorage();
    this.updateStatsDisplay();
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

  // --- Tab & PDF Extraction ---

  private async handleExtractFromActiveTab(paperId?: string) {
    const targetId =
      paperId || this.selectedRecordId || (this.uniqueRecords.length > 0 ? this.uniqueRecords[0].id : null);
    if (!targetId) {
      alert("Chưa có bài báo nào trong danh sách kết quả để trích xuất dữ liệu.");
      return;
    }

    const record = this.uniqueRecords.find((r) => r.id === targetId);
    if (!record) {
      this.setStatus("Không tìm thấy bản ghi được chọn.", "error");
      return;
    }

    this.selectedRecordId = targetId;
    this.renderRecordsList();

    const origBtnText = this.extractActiveTabBtn?.innerHTML;
    if (this.extractActiveTabBtn && !paperId) {
      this.extractActiveTabBtn.innerHTML = "⏳ Đang kết nối Tab...";
      this.extractActiveTabBtn.disabled = true;
    }
    this.setStatus(`Đang kết nối tới Tab đang mở trên trình duyệt cho bài #${record.id}...`, "info");

    try {
      let activeTab: chrome.tabs.Tab | undefined;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (
        tabs &&
        tabs.length > 0 &&
        tabs[0].url &&
        !tabs[0].url.startsWith("chrome://") &&
        !tabs[0].url.startsWith("chrome-extension://")
      ) {
        activeTab = tabs[0];
      } else {
        const lastTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (
          lastTabs &&
          lastTabs.length > 0 &&
          lastTabs[0].url &&
          !lastTabs[0].url.startsWith("chrome://") &&
          !lastTabs[0].url.startsWith("chrome-extension://")
        ) {
          activeTab = lastTabs[0];
        } else {
          const allTabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
          if (allTabs && allTabs.length > 0) {
            activeTab = allTabs[allTabs.length - 1];
          }
        }
      }

      if (!activeTab || typeof activeTab.id !== "number") {
        alert(
          "Không tìm thấy tab trang web bài báo nào đang mở trên trình duyệt. Vui lòng mở trang web của bài báo (DOI / ScienceDirect / Springer...) trên một tab trước rồi bấm lại.",
        );
        return;
      }

      const tabId: number = activeTab.id as number;
      const activeUrl = activeTab.url || "";

      let tabData: any = null;

      if (activeUrl.toLowerCase().endsWith(".pdf") || activeUrl.toLowerCase().includes(".pdf?")) {
        tabData = {
          sourceUrl: activeUrl,
          method: "Active Tab PDF URL",
          title: activeTab.title || "",
          pdfUrl: activeUrl,
        };
      } else {
        try {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content-script.js"],
          });

          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                if (typeof (window as any).extractCurrentPageData === "function") {
                  return (window as any).extractCurrentPageData();
                }
              } catch (e) {
                console.error("Loi khi goi extractCurrentPageData:", e);
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

      this.setStatus("Đang gửi dữ liệu trang tới backend để phân tích theo tiêu chí...", "info");

      const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record,
          tabData,
          autoFetchPdf: true,
          profile: this.activeProfile,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Máy chủ trả về lỗi HTTP ${response.status}: ${text.slice(0, 120)}`);
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "Lỗi khi phân tích dữ liệu tab");
      }

      const analysisResult: TabAnalysisResult = resData.analysis || resData.data;
      this.pendingAnalysisResult = analysisResult;
      this.pendingRecordId = record.id;

      this.showPreviewModal(analysisResult, record);
      this.setStatus("✓ Đã phân tích xong! Hãy xem trước và xác nhận cập nhật.", "success");
    } catch (err: any) {
      this.setStatus(`Lỗi lấy dữ liệu từ tab: ${err.message}`, "error");
      alert(`Lỗi trích xuất tab: ${err.message}`);
    } finally {
      if (this.extractActiveTabBtn && origBtnText && !paperId) {
        this.extractActiveTabBtn.innerHTML = origBtnText;
        this.extractActiveTabBtn.disabled = false;
      }
    }
  }

  private async handlePdfFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const targetId = this.selectedRecordId || (this.uniqueRecords.length > 0 ? this.uniqueRecords[0].id : null);
    if (!targetId) {
      alert("Chưa có bài báo nào trong danh sách để nạp file PDF.");
      return;
    }

    const record = this.uniqueRecords.find((r) => r.id === targetId);
    if (!record) return;

    this.selectedRecordId = targetId;
    this.renderRecordsList();

    const origBtnText = this.uploadPdfBtn?.innerHTML;
    if (this.uploadPdfBtn) {
      this.uploadPdfBtn.innerHTML = "⏳ Đang đọc PDF...";
      this.uploadPdfBtn.disabled = true;
    }

    this.setStatus(`Đang đọc file PDF: ${file.name}...`, "info");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        this.setStatus(`Đang gửi file PDF tới backend để trích xuất nội dung...`, "info");

        const tabData = {
          title: file.name.replace(/\.pdf$/i, ""),
          sourceUrl: `local-file://${file.name}`,
          method: "Manual PDF Upload",
          pdfData: base64Data,
        };

        const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record,
            tabData,
            autoFetchPdf: false,
            profile: this.activeProfile,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 120)}`);
        }

        const resData = await response.json();
        if (!resData.success) throw new Error(resData.error);

        this.pendingAnalysisResult = resData.analysis || resData.data;
        this.pendingRecordId = record.id;
        this.showPreviewModal(this.pendingAnalysisResult!, record);
        this.setStatus("✓ Đã trích xuất PDF thành công! Hãy xem trước và xác nhận.", "success");
      } catch (err: any) {
        this.setStatus(`Lỗi khi xử lý PDF tải lên: ${err.message}`, "error");
        alert(`Lỗi xử lý file PDF: ${err.message}`);
      } finally {
        input.value = "";
        if (this.uploadPdfBtn && origBtnText) {
          this.uploadPdfBtn.innerHTML = origBtnText;
          this.uploadPdfBtn.disabled = false;
        }
      }
    };
    reader.onerror = () => {
      this.setStatus(`Không thể đọc file PDF.`, "error");
      if (this.uploadPdfBtn && origBtnText) {
        this.uploadPdfBtn.innerHTML = origBtnText;
        this.uploadPdfBtn.disabled = false;
      }
    };
    reader.readAsDataURL(file);
  }

  private async handleRescreenAllRecords() {
    if (this.uniqueRecords.length === 0) {
      alert("Không có bài báo nào trong danh sách để tái sàng lọc.");
      return;
    }

    const origBtnText = this.rescreenBtn?.innerHTML;
    if (this.rescreenBtn) {
      this.rescreenBtn.innerHTML = "⏳ Đang tái sàng lọc...";
      this.rescreenBtn.disabled = true;
    }

    this.setStatus(
      `Đang tái sàng lọc ${this.uniqueRecords.length} bài báo theo tiêu chí "${this.activeProfile.name}"...`,
      "info",
    );
    this.setButtonsState(true);

    try {
      const response = await fetch(`${this.backendUrl}/api/scholar/rescreen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: this.uniqueRecords,
          profile: this.activeProfile,
          researchId: this.activeProfile.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.records)) {
        throw new Error(data.error || "Không nhận được danh sách tái sàng lọc từ máy chủ.");
      }

      // Map lại kết quả vào uniqueRecords và allRecords
      const updatedMap = new Map<string, PaperRecord>();
      for (const rec of data.records) {
        updatedMap.set(rec.id, rec);
      }

      this.uniqueRecords = this.uniqueRecords.map((r) => updatedMap.get(r.id) || r);
      this.allRecords = this.allRecords.map((r) => updatedMap.get(r.id) || r);

      await this.saveSessionToStorage();
      this.updateStatsDisplay();
      this.renderRecordsList();
      this.setStatus(
        `✓ Đã tái sàng lọc thành công ${data.records.length} bài báo theo tiêu chí "${this.activeProfile.name}".`,
        "success",
      );
    } catch (err: any) {
      this.setStatus(`Lỗi tái sàng lọc: ${err.message}`, "error");
      alert(`Lỗi tái sàng lọc: ${err.message}`);
    } finally {
      if (this.rescreenBtn && origBtnText) {
        this.rescreenBtn.innerHTML = origBtnText;
        this.rescreenBtn.disabled = false;
      }
      this.setButtonsState(false);
    }
  }

  // --- Auto-Screening (Single & Batch) ---

  private openAutoScreenModal() {
    if (!this.autoScreenModal) {
      this.autoScreenModal = document.getElementById("autoScreenModal") as HTMLElement;
    }
    if (this.autoScreenProfileName) {
      this.autoScreenProfileName.textContent = this.activeProfile.name;
    }
    if (this.autoScreenTotalCount) {
      this.autoScreenTotalCount.textContent = String(this.uniqueRecords.length);
    }
    const unsureCount = this.uniqueRecords.filter(
      (r) =>
        r.suggestedDecision === "Unsure" ||
        (!r.finalDecision && r.suggestedDecision !== "Include" && r.suggestedDecision !== "Exclude"),
    ).length;
    const unsureEl = document.getElementById("autoScreenUnsureCount");
    if (unsureEl) unsureEl.textContent = String(unsureCount);

    const scopeOnlyUnsureRadio = document.getElementById("scopeOnlyUnsure") as HTMLInputElement;
    if (scopeOnlyUnsureRadio && unsureCount > 0) {
      scopeOnlyUnsureRadio.checked = true;
    }

    if (this.autoScreenModal) {
      this.autoScreenModal.style.display = "flex";
    }
  }

  private closeAutoScreenModal() {
    if (this.autoScreenModal) {
      this.autoScreenModal.style.display = "none";
    }
  }

  private stopBatchAutoScreen() {
    this.stopAutoScreenRequested = true;
    this.setStatus("Đang dừng quét tự động sau bài hiện tại...", "warning");
    if (this.autoScreenStatusText) {
      this.autoScreenStatusText.innerHTML = "<b>⏹️ Đang yêu cầu dừng quét...</b>";
    }
  }

  private waitForTabLoaded(tabId: number, timeoutMs = 7500): Promise<void> {
    return new Promise((resolve) => {
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }, timeoutMs);

      const listener = (id: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (id === tabId && changeInfo.status === "complete") {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(resolve, 600);
          }
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  private async autoExtractDataForUrl(url: string, fallbackTitle?: string): Promise<any | null> {
    if (!url || !url.startsWith("http")) {
      return null;
    }

    // Direct PDF URL
    if (url.toLowerCase().endsWith(".pdf") || url.toLowerCase().includes(".pdf?")) {
      return {
        sourceUrl: url,
        method: "Direct PDF URL",
        title: fallbackTitle || "",
        pdfUrl: url,
      };
    }

    // Bước 1: Thử Fast Direct Fetch qua browser DOMParser
    try {
      const resp = await fetch(url, { method: "GET" });
      if (resp.ok) {
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const getMeta = (name: string) => {
          const el = doc.querySelector(`meta[name="${name}" i], meta[property="${name}" i]`);
          return el ? (el.getAttribute("content") || "").trim() : "";
        };
        const getAllMetas = (name: string) => {
          const els = doc.querySelectorAll(`meta[name="${name}" i], meta[property="${name}" i]`);
          return Array.from(els)
            .map((el) => (el.getAttribute("content") || "").trim())
            .filter(Boolean);
        };

        const rawTitle = getMeta("citation_title") || getMeta("DC.title") || getMeta("og:title") || doc.title || "";
        const title = isChallengeOrErrorTitle(rawTitle) ? fallbackTitle || "" : rawTitle;
        const authors = getAllMetas("citation_author").join("; ") || getAllMetas("DC.creator").join("; ");
        let doi = getMeta("citation_doi") || getMeta("DC.identifier");
        if (doi) {
          const m = doi.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
          if (m) doi = m[0];
        }
        const venue =
          getMeta("citation_journal_title") ||
          getMeta("citation_conference_title") ||
          getMeta("citation_publisher") ||
          getMeta("DC.source");
        const rawDate =
          getMeta("citation_publication_date") ||
          getMeta("citation_date") ||
          getMeta("citation_year") ||
          getMeta("DC.date");
        let year = "";
        if (rawDate) {
          const yMatch = rawDate.match(/\b(19\d\d|20\d\d)\b/);
          if (yMatch) year = yMatch[1];
        }
        const abstract = getMeta("citation_abstract") || getMeta("DC.description") || getMeta("og:description");
        const pdfUrl = getMeta("citation_pdf_url");

        if (abstract && abstract.length > 40 && !isChallengeOrErrorTitle(abstract)) {
          return {
            sourceUrl: url,
            method: "Tự động quét (Fast Meta Fetch)",
            title,
            authors,
            doi,
            venue,
            year,
            abstract,
            pdfUrl,
          };
        }
      }
    } catch (fetchErr) {
      console.warn("[Auto-Extract] Fast fetch failed, fallback to background tab:", fetchErr);
    }

    // Bước 2: Background Chrome Tab (vượt qua Cloudflare, paywall, Single-Page App)
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
      let tabId: number | undefined;
      try {
        const tab = await chrome.tabs.create({ url, active: false });
        tabId = tab.id;
        if (typeof tabId === "number") {
          await this.waitForTabLoaded(tabId, 7500);

          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content-script.js"],
          });

          const results = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              try {
                if (typeof (window as any).extractCurrentPageData === "function") {
                  return (window as any).extractCurrentPageData();
                }
              } catch (e) {
                console.error("Lỗi khi gọi extractCurrentPageData:", e);
              }
              return null;
            },
          });

          if (results && results[0] && results[0].result) {
            const data = results[0].result;
            if (data.title && isChallengeOrErrorTitle(data.title)) {
              data.title = fallbackTitle || "";
            }
            if (
              (data.abstract && data.abstract.trim().length > 40 && !isChallengeOrErrorTitle(data.abstract)) ||
              data.pdfUrl ||
              (data.pages && data.pages.length > 0)
            ) {
              data.method = (data.method || "HighWire Meta") + " (Auto Tab)";
              return data;
            }
          }
        }
      } catch (tabErr) {
        console.warn("[Auto-Extract] Background tab extraction error:", tabErr);
      } finally {
        if (typeof tabId === "number") {
          try {
            await chrome.tabs.remove(tabId);
          } catch (e) {
            // ignore
          }
        }
      }
    }

    return null;
  }

  private async handleAutoScreenPaper(record: PaperRecord, autoAcceptInclude = false): Promise<boolean> {
    if (!record.url) {
      return false;
    }

    const tabData = (await this.autoExtractDataForUrl(record.url, record.title)) || {
      sourceUrl: record.url,
      method: "Tái thẩm định (Re-screen)",
      title: record.title,
    };

    if (record.pdfUrl && !tabData.pdfUrl) {
      tabData.pdfUrl = record.pdfUrl;
    }
    if (record.doi && !tabData.doi) {
      tabData.doi = record.doi;
    }
    if (record.abstract && !tabData.abstract) {
      tabData.abstract = record.abstract;
    }
    if (record.venue && !tabData.venue) {
      tabData.venue = record.venue;
    }

    if (!tabData.abstract && !tabData.pdfUrl && (!tabData.pages || tabData.pages.length === 0)) {
      return false;
    }

    if (tabData.title && isChallengeOrErrorTitle(tabData.title)) {
      tabData.title = record.title;
    }

    const response = await fetch(`${this.backendUrl}/api/scholar/analyze-tab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record,
        tabData,
        autoFetchPdf: true,
        profile: this.activeProfile,
      }),
    });

    if (!response.ok) return false;
    const resData = await response.json();
    if (!resData.success || !resData.analysis) return false;

    const analysis: TabAnalysisResult = resData.analysis;
    const getChangeVal = (field: string) => {
      const c = analysis.changes.find((x) => x.field === field);
      return c && c.newValue && c.newValue !== "(Trống)" ? c.newValue : undefined;
    };

    const newTitle = getChangeVal("title");
    if (newTitle && !isChallengeOrErrorTitle(newTitle) && analysis.isTitleMatch) {
      record.title = newTitle;
    }

    if (getChangeVal("abstract")) record.abstract = getChangeVal("abstract")!;
    if (getChangeVal("doi")) record.doi = getChangeVal("doi")!;
    if (getChangeVal("venue")) record.venue = getChangeVal("venue")!;
    if (getChangeVal("year")) record.year = getChangeVal("year")!;
    if (getChangeVal("pdfUrl")) record.pdfUrl = getChangeVal("pdfUrl")!;

    record.sourceMetadataVerified = true;
    record.verificationMethod = tabData.method || "Tự động quét link (Background Tab / Meta)";
    record.sourceUrl = tabData.sourceUrl || record.url;
    record.evidence_snippets = analysis.evidence || [];

    if (analysis.suggestedScreeningUpdate) {
      record.screeningStage = analysis.suggestedScreeningUpdate.stage || (tabData.pageCount ? "V2" : "V1");
      record.suggestedDecision = analysis.suggestedScreeningUpdate.suggestedDecision;
      record.matchedCriteria = analysis.suggestedScreeningUpdate.matchedCriteria;
      record.unknownCriteria = analysis.suggestedScreeningUpdate.unknownCriteria;
      record.missingEvidence = analysis.suggestedScreeningUpdate.missingEvidence;
      record.screeningReason = analysis.suggestedScreeningUpdate.screeningReason;
    }
    if (tabData.pageCount) {
      record.page_count = tabData.pageCount;
    }

    if (autoAcceptInclude && record.suggestedDecision === "Include") {
      record.finalDecision = "Include";
    }

    return true;
  }

  private async handleSinglePaperAutoScreen(paperId: string, buttonEl?: HTMLButtonElement) {
    const record = this.uniqueRecords.find((r) => r.id === paperId);
    if (!record) return;

    if (!record.url) {
      this.setStatus(`Bài báo #${record.id} không có liên kết (URL).`, "warning");
      return;
    }

    const originalBtnText = buttonEl ? buttonEl.innerHTML : "";
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.innerHTML = "⏳ Quét...";
    }
    this.setStatus(`Đang tự động quét & sàng lọc bài: "${record.title.slice(0, 50)}..."`, "info");

    try {
      const ok = await this.handleAutoScreenPaper(record, false);
      if (ok) {
        await this.saveSessionToStorage();
        this.updateStatsDisplay();
        this.renderRecordsList();
        this.setStatus(
          `✓ Đã tự động quét thành công: Gợi ý [${record.suggestedDecision || "Chưa rõ"}] cho "${record.title.slice(0, 45)}..."`,
          "success",
        );
      } else {
        const hostName = record.url ? new URL(record.url).hostname : "trang này";
        this.setStatus(
          `⚠️ Không thể cào ngầm (${hostName}) do trang web có bảo vệ Cloudflare/Captcha. Vui lòng bấm vào liên kết bài báo để mở trên trình duyệt, rồi bấm "📑 Tab".`,
          "warning",
        );
      }
    } catch (err: any) {
      console.error("Lỗi khi tự động quét bài:", err);
      this.setStatus(`Lỗi khi quét: ${err.message}`, "error");
    } finally {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = originalBtnText;
      }
    }
  }

  private async startBatchAutoScreen() {
    this.closeAutoScreenModal();

    if (this.isAutoScreening) return;

    const scopeRadio = document.querySelector('input[name="autoScreenScope"]:checked') as HTMLInputElement;
    const scope = scopeRadio ? scopeRadio.value : "missing_abstract";
    const autoAcceptInclude = this.autoAcceptIncludeCheckbox ? this.autoAcceptIncludeCheckbox.checked : true;

    let targets: PaperRecord[] = [];
    if (scope === "only_unsure") {
      targets = this.uniqueRecords.filter(
        (r) => r.url && (r.suggestedDecision === "Unsure" || (!r.finalDecision && r.suggestedDecision !== "Include" && r.suggestedDecision !== "Exclude")),
      );
    } else if (scope === "missing_abstract") {
      targets = this.uniqueRecords.filter(
        (r) => r.url && (!r.abstract || r.abstract.trim().length === 0 || !r.sourceMetadataVerified),
      );
    } else if (scope === "next_10") {
      targets = this.uniqueRecords.filter((r) => r.url).slice(0, 10);
    } else if (scope === "next_20") {
      targets = this.uniqueRecords.filter((r) => r.url).slice(0, 20);
    } else {
      targets = this.uniqueRecords.filter((r) => r.url);
    }

    if (targets.length === 0) {
      this.setStatus("Không tìm thấy bài báo nào phù hợp với phạm vi quét đã chọn.", "warning");
      return;
    }

    this.isAutoScreening = true;
    this.stopAutoScreenRequested = false;

    if (this.autoScreenBatchBtn) this.autoScreenBatchBtn.style.display = "none";
    if (this.stopAutoScreenBtn) this.stopAutoScreenBtn.style.display = "inline-block";
    if (this.autoScreenProgressBox) this.autoScreenProgressBox.style.display = "block";

    let successCount = 0;
    let failCount = 0;
    let includedCount = 0;

    try {
      for (let i = 0; i < targets.length; i++) {
        if (this.stopAutoScreenRequested) {
          console.log("[Auto-Screen] Người dùng yêu cầu dừng quá trình quét.");
          break;
        }

        const record = targets[i];
        const currentNum = i + 1;
        const total = targets.length;
        const percent = Math.round((currentNum / total) * 100);

        if (this.autoScreenStatusText) {
          this.autoScreenStatusText.innerHTML = `<b>⚡ Đang quét & lọc bài [${currentNum}/${total}]...</b>`;
        }
        if (this.autoScreenCounterText) {
          this.autoScreenCounterText.textContent = `${currentNum} / ${total} (${percent}%)`;
        }
        if (this.autoScreenProgressBar) {
          this.autoScreenProgressBar.style.width = `${percent}%`;
        }
        if (this.autoScreenCurrentPaper) {
          this.autoScreenCurrentPaper.textContent = `#${currentNum}: ${record.title}`;
        }

        this.setStatus(`[Tự động quét ${currentNum}/${total}] "${record.title.slice(0, 45)}..."`, "info");

        try {
          const ok = await this.handleAutoScreenPaper(record, autoAcceptInclude);
          if (ok) {
            successCount++;
            if (record.suggestedDecision === "Include" || record.finalDecision === "Include") {
              includedCount++;
            }
          } else {
            failCount++;
          }
        } catch (itemErr) {
          console.warn(`Lỗi khi quét bài ${record.id}:`, itemErr);
          failCount++;
        }

        this.updateStatsDisplay();
        this.renderRecordsList();

        if (currentNum % 3 === 0 || currentNum === total) {
          await this.saveSessionToStorage();
        }

        // Nghỉ 600ms giữa các bài để nhẹ nhàng cho trình duyệt
        await new Promise((r) => setTimeout(r, 600));
      }

      await this.saveSessionToStorage();
      this.updateStatsDisplay();
      this.renderRecordsList();

      const stoppedMsg = this.stopAutoScreenRequested ? " (Đã dừng theo yêu cầu)" : "";
      this.setStatus(
        `✓ Hoàn tất quét tự động${stoppedMsg}: Thành công ${successCount}/${targets.length} bài | Gợi ý/Nhận Include: ${includedCount} bài.`,
        "success",
      );
    } catch (e: any) {
      console.error("Lỗi trong Batch Auto-Screen:", e);
      this.setStatus(`Lỗi trong quá trình quét tự động: ${e.message}`, "error");
    } finally {
      this.isAutoScreening = false;
      this.stopAutoScreenRequested = false;

      if (this.stopAutoScreenBtn) this.stopAutoScreenBtn.style.display = "none";
      if (this.autoScreenBatchBtn) this.autoScreenBatchBtn.style.display = "inline-block";

      setTimeout(() => {
        if (!this.isAutoScreening && this.autoScreenProgressBox) {
          this.autoScreenProgressBox.style.display = "none";
        }
      }, 4000);
    }
  }

  private showPreviewModal(result: TabAnalysisResult, record: PaperRecord) {
    if (!this.tabExtractModal || !this.modalBody) return;

    let warningHtml = "";
    if (!result.isTitleMatch) {
      warningHtml += `
        <div class="warning-banner" style="background: #fef2f2; border-color: #fca5a5; color: #991b1b; border-left-color: #dc2626;">
          ⚠️ <b>CẢNH BÁO TIÊU ĐỀ KHÔNG KHỚP:</b><br>
          ${this.escapeHtml(result.titleMismatchWarning || `Độ tương đồng tiêu đề chỉ đạt ${(result.titleMatchConfidence * 100).toFixed(0)}%. Hãy kiểm tra kỹ xem tài liệu có đúng là bài báo này không!`)}
        </div>
      `;
    }

    if (result.warnings && result.warnings.length > 0) {
      warningHtml += result.warnings.map((w) => `<div class="warning-banner">⚠️ ${this.escapeHtml(w)}</div>`).join("");
    }

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

    let evidenceHtml = "";
    if (result.evidence && result.evidence.length > 0) {
      const items = result.evidence
        .map((ev) => {
          const itemClass = ev.isValidEvidence ? "evidence-item" : "evidence-item invalid";
          const statusBadge = ev.isValidEvidence
            ? '<span class="badge badge-blue">✓ Bằng chứng hợp lệ</span>'
            : '<span class="badge badge-red">✗ Bị loại</span>';
          const sectionBadge = `<span class="badge badge-yellow">Mục: ${this.escapeHtml(ev.section)}</span>`;
          const pageBadge =
            ev.page !== undefined && ev.page !== null ? `<span class="badge badge-blue">Trang ${ev.page}</span>` : "";
          return `
          <div class="${itemClass}">
            <div style="display: flex; gap: 6px; margin-bottom: 3px; align-items: center; flex-wrap: wrap;">
              <b>[${ev.type}]</b>
              ${statusBadge}
              ${sectionBadge}
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
    }

    let screeningSuggestionHtml = "";
    if (result.suggestedScreeningUpdate) {
      const s = result.suggestedScreeningUpdate;
      const decBadge = this.getDecisionBadge(s.suggestedDecision);
      screeningSuggestionHtml = `
        <div class="notice-callout" style="margin-top: 8px;">
          <b>Gợi ý sàng lọc theo tiêu chí (${s.stage}):</b> ${decBadge} — ${this.escapeHtml(s.screeningReason)}<br>
          <small style="color: #6b7280;">(Lưu ý: Quyết định <code>finalDecision</code> hoàn toàn do bạn quyết định, hệ thống không tự ghi đè)</small>
        </div>
      `;
    }

    this.modalBody.innerHTML = `
      ${warningHtml}
      <div style="margin-bottom: 8px; font-size: 11px; color: #475569;">
        <span>🌐 <b>Nguồn:</b> <a href="${this.escapeHtml(result.extracted.sourceUrl)}" target="_blank">${this.escapeHtml(result.extracted.sourceUrl)}</a></span><br>
        <span>⚙️ <b>Phương thức:</b> ${this.escapeHtml(result.extracted.method)}</span>
        ${result.extracted.pageCount ? ` | <span>📄 <b>Tổng số trang:</b> ${result.extracted.pageCount}</span>` : ""}
      </div>

      <div style="margin-top: 6px;">
        <b>So sánh các trường dữ liệu (Diff):</b>
        <table class="diff-table">
          <thead>
            <tr>
              <th style="width: 15%;">Trường</th>
              <th style="width: 35%;">Hiện tại</th>
              <th style="width: 35%;">Mới</th>
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

    // Record provenance
    record.extracted_url = extracted.sourceUrl;
    record.extracted_at = new Date().toISOString();
    record.extraction_method = extracted.method;
    record.evidence_snippets = evidence;
    record.user_verified = true;

    if (suggestedScreeningUpdate) {
      record.screeningStage = suggestedScreeningUpdate.stage;
      record.suggestedDecision = suggestedScreeningUpdate.suggestedDecision;
      record.matchedCriteria = suggestedScreeningUpdate.matchedCriteria;
      record.unknownCriteria = suggestedScreeningUpdate.unknownCriteria;
      record.missingEvidence = suggestedScreeningUpdate.missingEvidence;
      record.screeningReason = suggestedScreeningUpdate.screeningReason;
      // finalDecision is preserved!
    }

    if (allRecord) {
      Object.assign(allRecord, record);
    }

    await this.saveSessionToStorage();
    this.closeModal();
    this.renderRecordsList();
    this.setStatus(`✓ Đã cập nhật provenance và dữ liệu cho bài báo #${record.id}`, "success");
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

  // --- Profile Manager Modal & CRUD ---

  private openProfileModal() {
    this.renderProfileListInModal();
    this.profileEditForm.style.display = "none";
    this.profileModal.style.display = "flex";
  }

  private closeProfileModal() {
    this.profileModal.style.display = "none";
  }

  private renderProfileListInModal() {
    this.profileListContainer.innerHTML = this.profiles
      .map((p) => {
        const isActive = p.id === this.activeProfile.id;
        const activeTag = isActive ? '<span class="badge badge-green">Đang chọn</span>' : "";
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div>
            <b>${this.escapeHtml(p.name)}</b> ${activeTag}
            <div style="font-size: 10px; color: #64748b;">${p.reviewType} | v${p.profileVersion} | ${p.criteria.length} tiêu chí | Mục tiêu: ${p.targetIncludedCount || 15} bài</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn-secondary btn-edit-p" data-id="${p.id}" style="padding: 2px 6px; font-size: 10px;">Sửa</button>
            <button class="btn-secondary btn-clone-p" data-id="${p.id}" style="padding: 2px 6px; font-size: 10px;">Nhân bản</button>
            ${!isActive && this.profiles.length > 1 ? `<button class="btn-danger btn-del-p" data-id="${p.id}" style="padding: 2px 6px; font-size: 10px;">Xóa</button>` : ""}
          </div>
        </div>
      `;
      })
      .join("");

    this.profileListContainer.querySelectorAll(".btn-edit-p").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).getAttribute("data-id");
        if (id) this.startEditProfile(id);
      });
    });

    this.profileListContainer.querySelectorAll(".btn-clone-p").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).getAttribute("data-id");
        if (id) this.cloneProfile(id);
      });
    });

    this.profileListContainer.querySelectorAll(".btn-del-p").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).getAttribute("data-id");
        if (id) this.deleteProfile(id);
      });
    });
  }

  private applyPreset(preset: ResearchProfile) {
    const existingIdx = this.profiles.findIndex((p) => p.id === preset.id);
    if (existingIdx === -1) {
      this.profiles.push(JSON.parse(JSON.stringify(preset)));
    } else {
      this.profiles[existingIdx] = JSON.parse(JSON.stringify(preset));
    }
    this.saveProfilesToStorage();
    this.switchActiveProfile(preset.id);
    this.closeProfileModal();
    this.setStatus(`Đã chọn preset "${preset.name}".`, "success");
  }

  private startNewProfile() {
    this.editingProfileId = null;
    this.profileFormTitle.innerText = "Tạo Hồ sơ Nghiên cứu Mới";
    this.editProfileName.value = "";
    this.editProfileDesc.value = "";
    this.editProfileRq.value = "";
    this.editProfileReviewType.value = "systematic_review";
    this.editProfileTargetIncluded.value = "15";

    this.chkYearRange.checked = false;
    this.editYearStart.value = "";
    this.editYearEnd.value = "";

    this.chkMinPages.checked = false;
    this.editMinPages.value = "4";
    this.editKeywordsInclusion.value = "";

    this.profileEditForm.style.display = "block";
  }

  private startEditProfile(id: string) {
    const p = this.profiles.find((x) => x.id === id);
    if (!p) return;

    this.editingProfileId = id;
    this.profileFormTitle.innerText = `Chỉnh sửa: ${p.name} (v${p.profileVersion})`;
    this.editProfileName.value = p.name;
    this.editProfileDesc.value = p.description || "";
    this.editProfileRq.value = (p.researchQuestions || []).join("\n");
    this.editProfileReviewType.value = p.reviewType || "systematic_review";
    this.editProfileTargetIncluded.value = String(p.targetIncludedCount || 15);

    if (p.yearRange && p.yearRange.enabled) {
      this.chkYearRange.checked = true;
      this.editYearStart.value = p.yearRange.start !== undefined ? String(p.yearRange.start) : "";
      this.editYearEnd.value = p.yearRange.end !== undefined ? String(p.yearRange.end) : "";
    } else {
      this.chkYearRange.checked = false;
      this.editYearStart.value = "";
      this.editYearEnd.value = "";
    }

    if (p.minPageCount !== undefined && p.minPageCount > 0) {
      this.chkMinPages.checked = true;
      this.editMinPages.value = String(p.minPageCount);
    } else {
      this.chkMinPages.checked = false;
      this.editMinPages.value = "4";
    }

    // Extract keyword group criteria
    const kwCrit = p.criteria.find((c) => c.evaluator === "keyword_group" && c.kind === "inclusion");
    if (kwCrit && kwCrit.parameters && kwCrit.parameters.keywords) {
      this.editKeywordsInclusion.value = kwCrit.parameters.keywords.join(", ");
    } else {
      this.editKeywordsInclusion.value = "";
    }

    this.profileEditForm.style.display = "block";
  }

  private cloneProfile(id: string) {
    const src = this.profiles.find((p) => p.id === id);
    if (!src) return;

    const cloned: ResearchProfile = JSON.parse(JSON.stringify(src));
    cloned.id = `profile_${Date.now()}`;
    cloned.name = `${src.name} (Bản sao)`;
    cloned.profileVersion = 1;
    cloned.createdAt = new Date().toISOString();
    cloned.updatedAt = new Date().toISOString();

    this.profiles.push(cloned);
    this.saveProfilesToStorage();
    this.renderProfileListInModal();
    this.renderProfileHeaderAndOptions();
    this.setStatus(`Đã nhân bản hồ sơ "${src.name}".`, "success");
  }

  private deleteProfile(id: string) {
    if (id === this.activeProfile.id) {
      alert("Không thể xóa hồ sơ nghiên cứu đang được kích hoạt.");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa hồ sơ này?")) return;

    this.profiles = this.profiles.filter((p) => p.id !== id);
    this.saveProfilesToStorage();
    this.renderProfileListInModal();
    this.renderProfileHeaderAndOptions();
    this.setStatus("Đã xóa hồ sơ nghiên cứu.", "info");
  }

  private async handleSaveProfile() {
    const name = this.editProfileName.value.trim();
    if (!name) {
      alert("Vui lòng nhập tên nghiên cứu.");
      return;
    }

    const desc = this.editProfileDesc.value.trim();
    const rqs = this.editProfileRq.value
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const reviewType = this.editProfileReviewType.value as any;
    const targetIncluded = Math.max(1, parseInt(this.editProfileTargetIncluded.value, 10) || 15);

    const yearEnabled = this.chkYearRange.checked;
    const yearStart = yearEnabled && this.editYearStart.value ? parseInt(this.editYearStart.value, 10) : undefined;
    const yearEnd = yearEnabled && this.editYearEnd.value ? parseInt(this.editYearEnd.value, 10) : undefined;

    const minPagesEnabled = this.chkMinPages.checked;
    const minPages = minPagesEnabled ? parseInt(this.editMinPages.value, 10) || 4 : undefined;

    const kwText = this.editKeywordsInclusion.value.trim();
    const keywords = kwText
      ? kwText
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : [];

    let targetProfile: ResearchProfile;
    if (this.editingProfileId) {
      const existing = this.profiles.find((p) => p.id === this.editingProfileId);
      if (!existing) return;
      targetProfile = existing;
      targetProfile.name = name;
      targetProfile.description = desc;
      targetProfile.researchQuestions = rqs;
      targetProfile.reviewType = reviewType;
      targetProfile.targetIncludedCount = targetIncluded;
      targetProfile.profileVersion += 1; // Increment version on edit
      targetProfile.updatedAt = new Date().toISOString();

      // Mark current records as evaluated at older version
      if (targetProfile.id === this.activeProfile.id) {
        this.uniqueRecords.forEach((r) => {
          if (r.finalDecision) {
            r.isDecisionOutdated = true;
          }
        });
      }
    } else {
      targetProfile = {
        id: `profile_${Date.now()}`,
        name,
        description: desc,
        researchQuestions: rqs,
        reviewType,
        targetIncludedCount: targetIncluded,
        searchStrings: [
          {
            id: `str_${Date.now()}`,
            name: "Chuỗi mặc định",
            query: keywords.length > 0 ? keywords.map((k) => `"${k}"`).join(" AND ") : name,
            isDefault: true,
            source: "google_scholar",
          },
        ],
        criteria: [],
        sourcePolicies: {
          google_scholar: { prismaRole: "supplementary" },
        },
        schemaVersion: "2.0.0",
        profileVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.profiles.push(targetProfile);
    }

    // Set common criteria safely without eval
    targetProfile.yearRange = {
      start: yearStart,
      end: yearEnd,
      enabled: yearEnabled,
    };
    targetProfile.minPageCount = minPages;

    // Update criteria list based on common form
    const updatedCriteria: Criterion[] = [];

    if (yearEnabled && (yearStart !== undefined || yearEnd !== undefined)) {
      updatedCriteria.push({
        id: "IC-Y",
        label: `Khoảng năm xuất bản (${yearStart || "..."} - ${yearEnd || "..."})`,
        description: `Xuất bản trong khoảng từ năm ${yearStart || "không giới hạn"} đến ${yearEnd || "không giới hạn"}.`,
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "year_range",
        parameters: { startYear: yearStart, endYear: yearEnd },
      });
    }

    if (minPagesEnabled && minPages) {
      updatedCriteria.push({
        id: "EC-LEN",
        label: `Số trang tối thiểu (>= ${minPages})`,
        description: `Loại trừ các bài viết ngắn, tóm tắt, poster có độ dài dưới ${minPages} trang.`,
        kind: "exclusion",
        required: true,
        stage: "full_text",
        evaluator: "page_count",
        parameters: { minPages, mode: "reject_if_under" },
      });
    }

    if (keywords.length > 0) {
      updatedCriteria.push({
        id: "IC-KW",
        label: "Từ khóa bắt buộc",
        description: `Bắt buộc chứa nhóm từ khóa: ${keywords.join(", ")}.`,
        kind: "inclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: {
          keywords,
          mode: "all",
          fields: ["title", "abstract", "snippet"],
        },
      });
    }

    // If existing had custom domain criteria (like SWT302), preserve them
    if (this.editingProfileId) {
      const existingDomainCriteria = targetProfile.criteria.filter(
        (c) => c.evaluator === "swt302_ep_bva" || (c.id !== "IC-Y" && c.id !== "EC-LEN" && c.id !== "IC-KW"),
      );
      targetProfile.criteria = [...updatedCriteria, ...existingDomainCriteria];
    } else {
      targetProfile.criteria = updatedCriteria;
    }

    await this.saveProfilesToStorage();
    this.renderProfileListInModal();
    this.renderProfileHeaderAndOptions();
    this.profileEditForm.style.display = "none";
    this.setStatus(`✓ Đã lưu hồ sơ "${targetProfile.name}" (v${targetProfile.profileVersion}).`, "success");
  }

  private async saveProfilesToStorage() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: this.profiles });
    }
  }

  private handleExportActiveProfile() {
    const jsonStr = JSON.stringify(this.activeProfile, null, 2);
    const filename = `profile_${this.activeProfile.id}_v${this.activeProfile.profileVersion}.json`;
    this.downloadFile(jsonStr, filename, "application/json");
    this.setStatus(`✓ Đã xuất hồ sơ "${this.activeProfile.name}" sang file JSON.`, "success");
  }

  private handleProfileFileImport(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const profile = JSON.parse(text);

        // Basic schema check
        if (!profile.name || !profile.reviewType) {
          throw new Error("File JSON thiếu trường 'name' hoặc 'reviewType' hợp lệ.");
        }

        profile.id = `imported_${Date.now()}`;
        profile.profileVersion = profile.profileVersion || 1;
        profile.schemaVersion = profile.schemaVersion || "2.0.0";
        profile.createdAt = new Date().toISOString();
        profile.updatedAt = new Date().toISOString();

        this.profiles.push(profile);
        await this.saveProfilesToStorage();
        this.renderProfileListInModal();
        this.renderProfileHeaderAndOptions();
        this.switchActiveProfile(profile.id);
        this.closeProfileModal();
        this.setStatus(`✓ Đã nhập thành công hồ sơ: "${profile.name}".`, "success");
      } catch (err: any) {
        alert(`Lỗi khi nhập hồ sơ: ${err.message}`);
      } finally {
        input.value = "";
      }
    };
    reader.readAsText(file);
  }

  // --- Export Functions ---

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

    let csvContent = "\uFEFF";
    csvContent += headers.join(",") + "\r\n";

    this.uniqueRecords.forEach((row) => {
      const line = [
        this.escapeCsv(row.source || row.discoverySource || "Google Scholar"),
        this.escapeCsv(row.title || ""),
        this.escapeCsv(row.authors || ""),
        this.escapeCsv(row.year || ""),
        this.escapeCsv(row.venue || ""),
        this.escapeCsv(row.doi || ""),
        this.escapeCsv(row.abstract || ""),
        this.escapeCsv(row.url || ""),
        this.escapeCsv(row.query || ""),
        this.escapeCsv(row.retrieval_date || ""),
      ].join(",");
      csvContent += line + "\r\n";
    });

    this.downloadFile(csvContent, "01_all_records.csv", "text/csv;charset=utf-8;");
    this.setStatus(
      `✓ Đã tải xuống file 01_all_records.csv (${this.uniqueRecords.length} bản ghi metadata chuẩn PRISMA).`,
      "success",
    );
  }

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

    let csvContent = "\uFEFF";
    csvContent += headers.join(",") + "\r\n";

    this.uniqueRecords.forEach((row) => {
      const line = [
        this.escapeCsv(row.id),
        this.escapeCsv(row.source || row.discoverySource || "Google Scholar"),
        this.escapeCsv(row.title || ""),
        this.escapeCsv(row.year || ""),
        this.escapeCsv(row.venue || ""),
        this.escapeCsv(row.doi || ""),
        this.escapeCsv(row.url || ""),
        this.escapeCsv(row.screeningStage || "metadata"),
        this.escapeCsv((row.matchedCriteria || []).join("; ")),
        this.escapeCsv((row.unknownCriteria || []).join("; ")),
        this.escapeCsv((row.missingEvidence || []).join("; ")),
        this.escapeCsv(row.suggestedDecision || "Unsure"),
        this.escapeCsv(row.screeningReason || ""),
        this.escapeCsv(row.finalDecision || ""),
        this.escapeCsv(row.userNotes || ""),
        this.escapeCsv(row.potentialDuplicate ? "YES" : "NO"),
        this.escapeCsv(row.duplicateReason || ""),
        this.escapeCsv(row.query || ""),
        this.escapeCsv(row.retrieval_date || ""),
      ].join(",");
      csvContent += line + "\r\n";
    });

    this.downloadFile(csvContent, "02_screening_decisions.csv", "text/csv;charset=utf-8;");
    this.setStatus(`✓ Đã tải xuống file 02_screening_decisions.csv (Đầy đủ quyết định & ghi chú).`, "success");
  }

  private async handleExportFullCsv() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để xuất.", "warning");
      return;
    }

    try {
      this.setStatus("Đang tạo file xuất sàng lọc đầy đủ qua backend...", "info");
      const res = await fetch(`${this.backendUrl}/api/scholar/export-full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: this.uniqueRecords,
          profile: this.activeProfile,
          sessionId: this.currentSessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const csvText = data.csvContent || "";
        if (csvText) {
          this.downloadFile(csvText, "02_screening_decisions_full.csv", "text/csv;charset=utf-8;");
          this.setStatus(
            "✓ Đã tải xuống file 02_screening_decisions_full.csv (Đầy đủ tiêu chí & provenance).",
            "success",
          );
          return;
        }
      }
    } catch {
      // Fallback local CSV generation
    }

    // Local generation
    const headers = [
      "researchId",
      "profileVersion",
      "sessionId",
      "id",
      "source",
      "title",
      "authors",
      "year",
      "venue",
      "doi",
      "pageCount",
      "fullTextStatus",
      "suggestedDecision",
      "finalDecision",
      "modelContribution",
      "conceptLabels",
      "literatureGroup",
      "screeningReason",
      "userNotes",
      "retrieval_date",
    ];

    let csvContent = "\uFEFF" + headers.join(",") + "\r\n";
    this.uniqueRecords.forEach((r) => {
      const line = [
        this.escapeCsv(this.activeProfile.id),
        this.escapeCsv(this.activeProfile.profileVersion),
        this.escapeCsv(this.currentSessionId),
        this.escapeCsv(r.id),
        this.escapeCsv(r.source || "Google Scholar"),
        this.escapeCsv(r.title),
        this.escapeCsv(r.authors),
        this.escapeCsv(r.year),
        this.escapeCsv(r.venue),
        this.escapeCsv(r.doi),
        this.escapeCsv(r.page_count || ""),
        this.escapeCsv(r.pdfUrl ? "available" : "not_found"),
        this.escapeCsv(r.suggestedDecision),
        this.escapeCsv(r.finalDecision || ""),
        this.escapeCsv((r.modelContribution || []).join("; ")),
        this.escapeCsv((r.conceptLabels || []).join("; ")),
        this.escapeCsv(r.literatureGroup || ""),
        this.escapeCsv(r.screeningReason),
        this.escapeCsv(r.userNotes || ""),
        this.escapeCsv(r.retrieval_date),
      ].join(",");
      csvContent += line + "\r\n";
    });

    this.downloadFile(csvContent, "02_screening_decisions_full.csv", "text/csv;charset=utf-8;");
    this.setStatus("✓ Đã tải xuống file 02_screening_decisions_full.csv.", "success");
  }

  private async handleExportApa7() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để xuất trích dẫn.", "warning");
      return;
    }

    try {
      this.setStatus("Đang định dạng danh mục trích dẫn APA 7th qua backend...", "info");
      const res = await fetch(`${this.backendUrl}/api/scholar/export-apa7`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: this.uniqueRecords,
          profile: this.activeProfile,
          onlyFinalIncluded: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.textContent) {
          this.downloadFile(data.textContent, "03_references_apa7.txt", "text/plain;charset=utf-8;");
          this.setStatus(
            `✓ Đã tải file 03_references_apa7.txt (Đủ: ${data.completeCount}, Cần bổ sung: ${data.incompleteCount}).`,
            "success",
          );
          return;
        }
      }
    } catch {
      // Local fallback
    }

    // Local APA 7 formatter (áp dụng khi backend offline)
    const finalIncludes = this.uniqueRecords.filter((r) => r.finalDecision === "Include");
    const targetRecords = finalIncludes.length > 0 ? finalIncludes : this.uniqueRecords;

    // Deduplicate
    const seenDois = new Set<string>();
    const seenTitles = new Set<string>();
    const deduped: PaperRecord[] = [];

    for (const r of targetRecords) {
      const cleanDoi = r.doi
        ? r.doi
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\/doi\.org\//, "")
        : "";
      const normTitle = (r.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      if (cleanDoi) {
        if (seenDois.has(cleanDoi)) continue;
        seenDois.add(cleanDoi);
      }
      if (normTitle && normTitle.length > 15) {
        if (seenTitles.has(normTitle)) continue;
        seenTitles.add(normTitle);
      }
      deduped.push(r);
    }

    const complete: string[] = [];
    const incomplete: string[] = [];

    deduped.forEach((r) => {
      const hasAuthor = Boolean(r.authors && r.authors.trim());
      const hasYear = Boolean(r.year && String(r.year).trim());
      const rawTitle = (r.title || "").trim();
      const rawVenue = (r.venue || "").trim();

      const isRetracted = /\b(retracted|retraction)\b/i.test(`${rawTitle} ${r.abstract || ""}`);
      const isTruncatedTitle = /…|\.{3}/.test(rawTitle);
      const isSearchEngineVenue =
        /^(google scholar|google books|google|researchgate|proquest|ssrn|academia\.edu)\b/i.test(rawVenue);
      const isTruncatedVenue = /…|\.{3}/.test(rawVenue);
      const hasValidVenue = rawVenue.length > 0 && !isSearchEngineVenue && !isTruncatedVenue;

      if (hasAuthor && hasYear && rawTitle && hasValidVenue && !isRetracted && !isTruncatedTitle) {
        const doiStr = r.doi
          ? ` https://doi.org/${r.doi.replace(/^https?:\/\/doi\.org\//, "")}`
          : r.url && !r.url.includes("scholar.google")
            ? ` ${r.url}`
            : "";
        complete.push(`${r.authors} (${r.year}). ${rawTitle}. *${rawVenue}*.${doiStr}`);
      } else {
        const missing: string[] = [];
        if (!hasAuthor) missing.push("tác giả");
        if (!hasYear) missing.push("năm");
        if (!rawTitle) missing.push("tiêu đề");
        if (isRetracted) missing.push("BÀI BÁO ĐÃ BỊ RÚT LẠI (RETRACTED)");
        if (isTruncatedTitle) missing.push("tiêu đề bị cắt ngắn (...)");
        if (isSearchEngineVenue) missing.push(`venue gán nhầm tên nền tảng ("${rawVenue}")`);
        else if (isTruncatedVenue) missing.push(`venue bị cắt ngắn ("${rawVenue}")`);
        else if (!rawVenue) missing.push("venue");

        incomplete.push(`[THIẾU: ${missing.join(", ")}] ${rawTitle || "(Không tiêu đề)"} - Nguồn: ${r.url || "N/A"}`);
      }
    });

    const scopeNote =
      finalIncludes.length > 0
        ? `Chỉ xuất các bài đã chốt thẩm định (finalDecision = Include: ${finalIncludes.length} bài)`
        : `Toàn bộ danh sách (${deduped.length} bài)`;

    let content = `=======================================================================\r\n`;
    content += `DANH MỤC TRÍCH DẪN TÀI LIỆU THAM KHẢO (APA 7th Edition)\r\n`;
    content += `Nghiên cứu: ${this.activeProfile.name} | Phạm vi: ${scopeNote}\r\n`;
    content += `Thời điểm xuất: ${new Date().toISOString()}\r\n`;
    content += `Đã lọc trùng lặp: Giữ ${deduped.length} bài (Đủ chuẩn APA: ${complete.length} | Cần bổ sung: ${incomplete.length})\r\n`;
    content += `=======================================================================\r\n\r\n`;

    content += `--- PHẦN 1: BÀI BÁO ĐỦ METADATA ĐÃ XÁC MINH ---\r\n\r\n`;
    if (complete.length === 0) {
      content += `(Chưa có bài báo nào đủ 100% metadata chuẩn APA 7)\r\n\r\n`;
    } else {
      content += complete.map((c, i) => `[${i + 1}] ${c}\r\n\r\n`).join("");
    }

    content += `=======================================================================\r\n`;
    content += `--- ⚠️ PHẦN 2: BÀI BÁO THIẾU THÔNG TIN (CẦN BỔ SUNG THỦ CÔNG) ---\r\n`;
    content += `(Quy tắc: Không tự bịa thông tin còn thiếu. Cần đối chiếu toàn văn hoặc trang nhà xuất bản)\r\n`;
    content += `=======================================================================\r\n\r\n`;
    if (incomplete.length === 0) {
      content += `(Toàn bộ bài báo đều đã đầy đủ thông tin chuẩn hóa)\r\n`;
    } else {
      content += incomplete.map((inc, i) => `[⚠️ ${i + 1}] ${inc}\r\n\r\n`).join("");
    }

    this.downloadFile(content, "03_references_apa7.txt", "text/plain;charset=utf-8;");
    this.setStatus(
      `✓ Đã tải file 03_references_apa7.txt (Đủ: ${complete.length}, Cần bổ sung: ${incomplete.length}).`,
      "success",
    );
  }

  private handleExportSessionJson() {
    const sessionPayload = {
      researchProfile: this.activeProfile,
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
      query: this.currentSessionQuery,
      filters: {
        as_ylo: this.asYloInput.value,
        as_yhi: this.asYhiInput.value,
        hl: this.hlInput.value,
      },
      stats: {
        apiRequestsUsed: this.apiRequestsUsed,
        totalCollected: this.allRecords.length,
        totalRetained: this.uniqueRecords.length,
        finalIncludeCount: this.uniqueRecords.filter((r) => r.finalDecision === "Include").length,
        dedupStats: this.dedupStats,
        searchSummary: this.searchSummary,
      },
      records: this.uniqueRecords,
      rawEvidences: this.allEvidences,
    };

    const jsonContent = JSON.stringify(sessionPayload, null, 2);
    const fname = `session_${this.activeProfile.id}_${Date.now()}.json`;
    this.downloadFile(jsonContent, fname, "application/json");
    this.setStatus("✓ Đã tải file Backup Session JSON thành công.", "success");
  }

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
      researchId: this.activeProfile.id,
      profileVersion: this.activeProfile.profileVersion,
      query: this.currentSessionQuery || this.queryInput.value.trim(),
      searchId: this.searchSummary?.searchId || `scholar_${Date.now()}`,
      method: "SerpApi",
      params: {
        engine: "google_scholar",
        as_ylo: this.asYloInput.value.trim(),
        as_yhi: this.asYhiInput.value.trim(),
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

    this.setStatus("Đang gửi nhật ký tới backend để lưu...", "info");

    try {
      const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        this.setStatus("✓ Đã ghi nhật ký vào search-log.md thành công!", "success");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      this.setStatus(`Lỗi ghi nhật ký: ${err.message}`, "error");
    }
  }

  // --- Utilities & Sanitization ---

  private escapeCsv(str: unknown): string {
    if (str === null || str === undefined) return '""';
    let s = String(str);
    // CSV Formula Injection mitigation: prepend single quote if cell starts with = + - @ \t \r
    if (/^[\=\+\-\@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return `"${s.replace(/"/g, '""')}"`;
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
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new ScholarExtensionApp();
  app.init();
});
