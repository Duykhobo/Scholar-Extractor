import { PRESET_GENERIC, PRESET_SWT302, PRESET_VISUALLY_IMPAIRED_AAC } from "./presets";
import {
  DedupStats,
  FrameworkType,
  PaperRecord,
  ResearchProfile,
  SearchExecutionSummary,
  SourceAdapterCapability,
  SuspectedDuplicatePair,
  TabAnalysisResult,
  WizardStep,
} from "./types";

const DEFAULT_BACKEND_URL = "http://localhost:3001";
const STORAGE_PROFILES_KEY = "scholar_research_profiles_v3";
const STORAGE_ACTIVE_PROFILE_KEY = "scholar_active_profile_id_v3";
const STORAGE_SESSIONS_KEY = "scholar_research_sessions_v3";
const STORAGE_WIZARD_STEP_KEY = "scholar_wizard_step_v3";
const LEGACY_STORAGE_KEY = "scholar_slr_session_v2";
const LEGACY_BACKUP_KEY = "scholar_extractor_backup_legacy_v1";
const MIGRATION_VERSION_KEY = "scholar_extractor_migration_version";

interface StepConfig {
  badge: string;
  title: string;
  goal: string;
  io: string;
  primaryBtnIcon: string;
  primaryBtnText: string;
  condition: string;
  nextGuide: string;
}

const STEP_CONFIGS: Record<WizardStep, StepConfig> = {
  SETUP: {
    badge: "BƯỚC 0",
    title: "Thiết lập Nghiên cứu & Protocol (Protocol Formulation)",
    goal: "Xác định mục tiêu đề tài, câu hỏi RQ, khung PICO/PICOS/SPIDER và tiêu chí IC/EC.",
    io: "Đề tài & Khung phân tích ➔ Hồ sơ Protocol sẵn sàng (v1.0)",
    primaryBtnIcon: "💾",
    primaryBtnText: "Lưu thiết lập & sang thu thập",
    condition: "Cần điền tên đề tài, ít nhất 1 câu hỏi RQ và từ khóa chính.",
    nextGuide: "Sau khi lưu, chuyển sang B1 để thiết lập truy vấn và thu thập bài báo.",
  },
  B1: {
    badge: "BƯỚC B1",
    title: "Thu thập bài báo (Identification)",
    goal: "Thu thập các bài báo ứng viên từ API học thuật, nhập file và snowballing.",
    io: "Từ khóa & Bộ lọc ➔ Danh sách bản ghi thô (B1)",
    primaryBtnIcon: "🔍",
    primaryBtnText: "Bắt đầu thu thập bài báo",
    condition: "Cần thu thập ít nhất 1 bài báo hợp lệ vào danh sách.",
    nextGuide: "Sau khi có bài báo thô, chuyển sang V1 để khử trùng lặp dữ liệu.",
  },
  V1: {
    badge: "BƯỚC V1",
    title: "Kiểm tra trùng lặp (Deduplication)",
    goal: "Nhận diện và gộp các bản ghi trùng lặp (DOI và so khớp mờ tiêu đề), bảo toàn nguồn gốc provenance.",
    io: "Bản ghi thô ➔ Bản ghi duy nhất (Unique) + Duplicate Log",
    primaryBtnIcon: "✨",
    primaryBtnText: "Kiểm tra trùng lặp (Chạy Dedup)",
    condition: "Tất cả các nhóm nghi trùng cần được gộp hoặc đánh dấu giữ riêng.",
    nextGuide: "Chuyển sang V2 để sàng lọc tiêu đề & tóm tắt theo tiêu chí IC/EC.",
  },
  V2: {
    badge: "BƯỚC V2",
    title: "Sàng lọc Tiêu đề & Tóm tắt (Screening)",
    goal: "Đánh giá tính phù hợp dựa trên Title & Abstract theo tiêu chí IC/EC (PassToFullText / Exclude / Unsure).",
    io: "Bản ghi duy nhất ➔ Danh sách qua vòng toàn văn (PassToFullText)",
    primaryBtnIcon: "⚡",
    primaryBtnText: "Tự động quét & Sàng lọc V2",
    condition: "Không còn bài ở trạng thái Chưa xem / Chờ quyết định.",
    nextGuide: "Chuyển sang V3 để tìm tài liệu toàn văn và thẩm định chuyên sâu.",
  },
  V3: {
    badge: "BƯỚC V3",
    title: "Tìm & Thẩm định Toàn văn (Eligibility)",
    goal: "Thu thập PDF/toàn văn và đọc đánh giá chuyên sâu (>= 4 trang, trích đoạn bằng chứng phương pháp).",
    io: "Danh sách PassToFullText ➔ Nghiên cứu đạt chuẩn (Final Included)",
    primaryBtnIcon: "📑",
    primaryBtnText: "Tìm toàn văn cho các bài đã chọn",
    condition: "Mọi bài Include phải có toàn văn và trích dẫn bằng chứng phương pháp.",
    nextGuide: "Chuyển sang Chốt & Xuất để đối soát số học PRISMA 2020.",
  },
  FINAL: {
    badge: "BƯỚC CHỐT",
    title: "Chốt Danh Sách & Xuất Báo Cáo PRISMA 2020",
    goal: "Đối soát cân bằng số học PRISMA 2020, kiểm tra tính toàn vẹn và xuất 9 báo cáo chuẩn học thuật.",
    io: "Toàn bộ dữ liệu pipeline ➔ 9 tệp xuất bản & PRISMA Flowchart",
    primaryBtnIcon: "📊",
    primaryBtnText: "Xem Sơ Đồ Luồng PRISMA 2020 (Đối soát)",
    condition: "Ma trận PRISMA cân bằng số học, không còn bài vướng audit.",
    nextGuide: "Hoàn tất nghiên cứu và sao lưu Session Backup JSON.",
  },
};

interface StepGuideContent {
  whenToUse: string;
  preparation: string;
  orderOfButtons: string[];
  expectedOutput: string;
  troubleshooting: string;
  proceedCondition: string;
}

const STEP_GUIDE_DATA: Record<WizardStep, StepGuideContent> = {
  SETUP: {
    whenToUse: "Bắt đầu một đề tài tổng quan tài liệu (SLR) mới hoặc điều chỉnh khung nghiên cứu.",
    preparation:
      "Xác định câu hỏi nghiên cứu (RQ), khung PICO/SPIDER, từ khóa tiếng Anh/tiếng Việt và khung năm xuất bản.",
    orderOfButtons: [
      "1. Chọn chế độ: Tạo nghiên cứu mới (hoặc bấm Mẫu có sẵn như SWT302 REST API)",
      "2. Nhập Tên đề tài, Mô tả và các câu hỏi RQ",
      "3. Chọn khung phân tích PICO/PICOS/SPIDER và điền các trường (tích N/A nếu không áp dụng)",
      "4. Thiết lập khung năm, số trang tối thiểu (>= 4 trang), từ khóa bắt buộc và loại trừ",
      "5. Bấm nút: '💾 Lưu thiết lập & Sang thu thập'",
    ],
    expectedOutput: "Hồ sơ đề tài được lưu trên hệ thống và chuyển ngay sang Bước B1 Thu thập bài báo.",
    troubleshooting: "Nếu thông báo thiếu thông tin: kiểm tra Tên nghiên cứu và đảm bảo có ít nhất 1 từ khóa.",
    proceedCondition: "Đã lưu thành công hồ sơ nghiên cứu.",
  },
  B1: {
    whenToUse: "Sau khi có protocol để tiến hành tìm kiếm bài báo ứng viên từ các nguồn học thuật.",
    preparation: "Kiểm tra chuỗi truy vấn (query), các bộ lọc năm, và trạng thái nguồn học thuật.",
    orderOfButtons: [
      "1. Chọn nguồn thu thập (OpenAlex ưu tiên miễn phí, hoặc Semantic Scholar, File Import)",
      "2. Chọn chuỗi gợi ý hoặc nhập chuỗi tìm kiếm nguyên văn",
      "3. Bấm nút: '🔍 Bắt đầu thu thập bài báo' (hoặc '📂 Nhập tệp mẫu')",
      "4. (Tùy chọn) Bấm '🎯 Thêm bài seed' hoặc '❄️ Snowballing' nếu có bài tham chiếu chuẩn",
      "5. Xem bảng kết quả thu thập theo từng nguồn và bấm '➡️ Sang kiểm tra trùng lặp (V1)'",
    ],
    expectedOutput: "Danh sách bài báo thô (B1) được tải về với đầy đủ metadata ban đầu.",
    troubleshooting:
      "Nếu API báo lỗi hoặc timeout: bấm '🔄 Chạy lại phần lỗi' hoặc chuyển sang '📂 Nhập tệp mẫu' (CSV/BibTeX/RIS). Tiến trình chạy ngầm an toàn trên backend.",
    proceedCondition: "Có ít nhất 1 bài báo hợp lệ trong tập dữ liệu.",
  },
  V1: {
    whenToUse: "Sau khi thu thập từ nhiều nguồn khác nhau để khử các bài trùng lặp.",
    preparation: "Đảm bảo đã thu thập đủ các nguồn cho đợt tìm kiếm hiện tại.",
    orderOfButtons: [
      "1. Bấm nút: '✨ Kiểm tra trùng lặp (Chạy Dedup)'",
      "2. Xem 4 thẻ số liệu: Tổng thô, Trùng DOI chắc chắn, Nghi trùng cần duyệt, Duy nhất",
      "3. Ở khung 'Cặp nghi trùng': bấm 'Gộp bản ghi' hoặc 'Giữ riêng' cho từng cặp",
      "4. Bấm nút: '✓ Xác nhận kết quả bỏ trùng & sang V2'",
    ],
    expectedOutput: "Khử sạch trùng lặp, bảo toàn nguồn gốc provenance, không tự xóa vĩnh viễn bài báo.",
    troubleshooting: "Nếu gộp nhầm: bấm nút 'Hoàn tác' để phục hồi lại trạng thái tách riêng.",
    proceedCondition: "Số bài nghi trùng chưa duyệt = 0.",
  },
  V2: {
    whenToUse: "Sàng lọc sơ bộ dựa trên Tiêu đề (Title) và Tóm tắt (Abstract).",
    preparation: "Đọc kỹ tiêu chí IC/EC đã khai báo trong protocol.",
    orderOfButtons: [
      "1. Bấm nút: '⚡ Tự động quét & Sàng lọc' để hệ thống đối chiếu từ khóa và đưa ra gợi ý",
      "2. Dùng bộ lọc Pill (Chưa xem, Qua vòng toàn văn, Đã loại, Chưa rõ) để duyệt",
      "3. Với mỗi bài, bấm 1 trong 3 nút: 'Qua vòng toàn văn', 'Loại ở V2' (kèm lý do), hoặc 'Chưa rõ'",
      "4. Nếu còn bài Unsure: bấm 'Đưa bài Unsure sang V3 để kiểm tra toàn văn'",
      "5. Bấm nút: '✓ Xác nhận danh sách sang V3'",
    ],
    expectedOutput:
      "Tất cả các bài được phân loại minh bạch: PassToFullText, Exclude hoặc Unsure. TUYỆT ĐỐI không dán nhãn Final Include ở vòng này.",
    troubleshooting:
      "Nếu bài thiếu Abstract: bấm nút '⚡ Quét link' hoặc '📑 Tab' để trích xuất trực tiếp từ trang bài báo.",
    proceedCondition: "Không còn bài ở trạng thái Chưa xem.",
  },
  V3: {
    whenToUse: "Thẩm định chuyên sâu các bài đã vượt qua vòng tiêu đề/tóm tắt.",
    preparation: "Tìm và đọc tài liệu toàn văn (Full-Text PDF).",
    orderOfButtons: [
      "1. Bấm nút: '📑 Tìm toàn văn cho các bài đã chọn' (hệ thống tự tìm qua Unpaywall / OA)",
      "2. Với bài không tìm thấy tự động: bấm '📁 Tải file PDF từ máy' hoặc '📑 Lấy từ Tab đang mở'",
      "3. Đọc bài báo, kiểm tra số trang (>= 4 trang) và trích xuất câu bằng chứng phương pháp",
      "4. Bấm nút: 'Đạt tiêu chí toàn văn' (Include), 'Loại ở V3' (Exclude), hoặc 'Cần bổ sung bằng chứng'",
      "5. Nhập ghi chú thẩm định (lưu tự động, không xóa quyết định)",
      "6. Bấm nút: '✓ Xác nhận danh sách sang Chốt & Xuất'",
    ],
    expectedOutput:
      "Danh sách bài nghiên cứu được thẩm định toàn văn với đầy đủ bằng chứng, số trang và lý do khoa học.",
    troubleshooting:
      "Nếu không tìm thấy PDF: trạng thái là 'Chưa lấy được toàn văn', KHÔNG tự động loại bài trừ khi xác nhận unretrievable.",
    proceedCondition: "Các bài muốn chọn vào nghiên cứu phải có toàn văn và bằng chứng phương pháp.",
  },
  FINAL: {
    whenToUse: "Đối soát và xuất toàn bộ kết quả nghiên cứu theo chuẩn PRISMA 2020.",
    preparation: "Đảm bảo đã hoàn tất các bước trước đó và không còn quyết định thuộc protocol cũ.",
    orderOfButtons: [
      "1. Kiểm tra 5 thẻ trạng thái trong Bảng Đối Soát PRISMA 2020",
      "2. Bấm nút: '📊 Xem Sơ Đồ Luồng PRISMA 2020 (Đối soát)' để kiểm tra cân bằng số học",
      "3. Bấm các nút tương ứng để tải 9 tệp xuất bản chuẩn học thuật:",
      "   - 01_all_records.csv",
      "   - 01_duplicate_log.csv",
      "   - 02_screening_decisions_full.csv",
      "   - 03_final_included.csv",
      "   - prisma-flow.md",
      "   - evidence-table.md",
      "   - 03_references_apa7.txt",
      "   - search-log.md",
      "   - session_backup.json",
    ],
    expectedOutput: "Bộ hồ sơ nghiên cứu SLR hoàn chỉnh, cân bằng số học tuyệt đối, minh bạch và có thể tái lập.",
    troubleshooting:
      "Nếu có cảnh báo 'Lệch số học' hoặc 'Quyết định thuộc protocol cũ': bấm nút cảnh báo để nhảy về V2/V3 thẩm định lại.",
    proceedCondition: "Sơ đồ PRISMA cân bằng số học.",
  },
};

const TROUBLESHOOTING_TABLE_HTML = `
  <div style="margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
    <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px;">📋 Bảng Xử Lý Tình Huống Đặc Biệt:</div>
    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left;">
        <thead>
          <tr style="background: #f1f5f9; color: #334155;">
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Tình huống</th>
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Thao tác</th>
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Nút cần bấm</th>
            <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Bước tiếp theo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>Đổi PICO / Tiêu chí khi đã có kết quả</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Nhập lý do thay đổi, kiểm tra Diff</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">⚙️ Chỉnh sửa Protocol ➔ 💾 Xác nhận</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Đánh giá lại các bài bị ảnh hưởng tại V2 / V3</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>Đóng popup / Đổi tab khi đang chạy</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Mở lại popup, hệ thống tự khôi phục Job</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Xem thanh tiến trình nền trên đầu</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Chờ Job hoàn thành hoặc tạm dừng/hủy</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>API lỗi hoặc hết quota</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Giữ dữ liệu cũ, thử lại hoặc nhập file</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">🔄 Chạy lại phần lỗi / 📂 Nhập tệp mẫu</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Bổ sung kết quả vào tập B1 hiện có</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>Còn bài Unsure ở V2</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Chuyển bài Unsure sang V3 để đọc toàn văn</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Đưa bài Unsure sang V3 để kiểm tra toàn văn</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Thẩm định bài Unsure tại V3</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>Thu thập thêm sau khi đã sang V2/V3</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Bài mới đi qua V1/V2, bài cũ giữ nguyên</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">➕ Thu thập thêm ➔ ➡️ Sang V1</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Xử lý bài mới mà không ảnh hưởng bài đã chốt</td>
          </tr>
          <tr>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;"><b>0 bài Included cuối cùng</b></td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Kiểm tra nguyên nhân, không tự nới tiêu chí</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">📊 Xem Sơ Đồ PRISMA ➔ Hoàn tất 0 Included</td>
            <td style="padding: 5px 6px; border: 1px solid #e2e8f0;">Xuất báo cáo ghi nhận trung thực lý do loại trừ</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
`;

class ScholarExtensionApp {
  private backendUrl: string = DEFAULT_BACKEND_URL;

  // Multi-profile state
  private profiles: ResearchProfile[] = [];
  private activeProfile: ResearchProfile = PRESET_SWT302;
  private currentWizardStep: WizardStep = "B1";
  private currentFramework: FrameworkType = "PICO";

  // Active Session state
  private currentSessionId: string = "";
  private currentSessionQuery: string = "";
  private allRecords: PaperRecord[] = [];
  private uniqueRecords: PaperRecord[] = [];
  private dedupStats: DedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
  private searchSummary: SearchExecutionSummary | null = null;
  private allEvidences: any[] = [];

  // Suspected duplicates state for Step V1
  private suspectedDuplicatePairs: SuspectedDuplicatePair[] = [];
  private mergeHistoryList: Array<{ canonicalId: string; duplicateId: string; timestamp: string }> = [];

  // Source adapter capabilities
  private sourceCapabilities: SourceAdapterCapability[] = [];

  // Filters & Pagination
  private v2CurrentFilter: string = "all";
  private currentPage: number = 1;
  private pageSize: number = 10;
  private selectedRecordId: string | null = null;
  private pendingAnalysisResult: TabAnalysisResult | null = null;

  // Background Job & Auto-Screening
  private activeJobId: string | null = null;
  private jobPollInterval: any = null;
  private isAutoScreening: boolean = false;

  // ==========================================
  // DOM ELEMENTS BINDINGS
  // ==========================================

  // Top Header Bar
  private activeResearchBadge!: HTMLElement;
  private protocolVersionBadge!: HTMLElement;
  private backendStatusBadge!: HTMLElement;
  private quickHelpBtn!: HTMLButtonElement;
  private quickResetBtn!: HTMLButtonElement;

  // Wizard Stepper
  private wizardStepper!: HTMLElement;
  private stepBtns!: NodeListOf<HTMLButtonElement>;

  // Unified Step Header Card
  private stepHeaderCard!: HTMLElement;
  private currentStepBadge!: HTMLElement;
  private currentStepTitle!: HTMLElement;
  private stepGuideBtn!: HTMLButtonElement;
  private editProtocolBtn!: HTMLButtonElement;
  private stepGoalText!: HTMLElement;
  private stepIoText!: HTMLElement;
  private metricPendingCount!: HTMLElement;
  private metricReviewCount!: HTMLElement;
  private metricCompletedCount!: HTMLElement;
  private metricTargetPill!: HTMLElement;
  private metricTargetCount!: HTMLElement;
  private stepPrimaryBtn!: HTMLButtonElement;
  private stepPrimaryBtnIcon!: HTMLElement;
  private stepPrimaryBtnText!: HTMLElement;
  private stepConditionText!: HTMLElement;
  private stepNextGuideText!: HTMLElement;

  // Job Control Banner
  private jobControlBanner!: HTMLElement;
  private jobStageBadge!: HTMLElement;
  private jobMessage!: HTMLElement;
  private jobPauseBtn!: HTMLButtonElement;
  private jobResumeBtn!: HTMLButtonElement;
  private jobCancelBtn!: HTMLButtonElement;
  private jobProgressBar!: HTMLElement;

  // Outdated Protocol Warning Alert
  private protocolOutdatedAlert!: HTMLElement;
  private outdatedPapersCount!: HTMLElement;
  private btnJumpToOutdatedV2!: HTMLButtonElement;
  private btnJumpToOutdatedV3!: HTMLButtonElement;

  // Wizard Panels
  private panelStep0!: HTMLElement;
  private panelStepB1!: HTMLElement;
  private panelStepV1!: HTMLElement;
  private panelStepV2!: HTMLElement;
  private panelStepV3!: HTMLElement;
  private panelStepFinal!: HTMLElement;
  private papersListContainerCard!: HTMLElement;

  // Step 0 Controls
  private btnModeNewResearch!: HTMLButtonElement;
  private btnModeContinueResearch!: HTMLButtonElement;
  private btnModeImportBackup!: HTMLButtonElement;
  private backupFileInput!: HTMLInputElement;
  private continueResearchBox!: HTMLElement;
  private profileSelect!: HTMLSelectElement;
  private btnLoadSelectedProfile!: HTMLButtonElement;
  private btnLoadPresetSwt!: HTMLButtonElement;
  private btnLoadPresetGeneric!: HTMLButtonElement;
  private btnLoadPresetAac!: HTMLButtonElement;
  private setupResearchName!: HTMLInputElement;
  private setupResearchDesc!: HTMLInputElement;
  private setupResearchRq!: HTMLTextAreaElement;
  private frameworkFieldsContainer!: HTMLElement;
  private setupYearStart!: HTMLInputElement;
  private setupYearEnd!: HTMLInputElement;
  private setupLanguage!: HTMLInputElement;
  private setupMinPages!: HTMLInputElement;
  private setupInclusionKeywords!: HTMLInputElement;
  private setupExclusionKeywords!: HTMLInputElement;
  private setupTargetCount!: HTMLInputElement;
  private sourcesStatusTable!: HTMLElement;
  private setupSummaryBox!: HTMLElement;
  private setupSummaryContent!: HTMLElement;
  private btnSaveSetupAndProceed!: HTMLButtonElement;

  // Step B1 Controls
  private sourceSelect!: HTMLSelectElement;
  private queryVersionSelect!: HTMLSelectElement;
  private queryInput!: HTMLInputElement;
  private searchStringsContainer!: HTMLElement;
  private asYloInput!: HTMLInputElement;
  private asYhiInput!: HTMLInputElement;
  private hlInput!: HTMLInputElement;
  private maxPagesInput!: HTMLInputElement;
  private btnStartCollection!: HTMLButtonElement;
  private importFileBtn!: HTMLButtonElement;
  private importFileInput!: HTMLInputElement;
  private btnOpenSeedModal!: HTMLButtonElement;
  private snowballBtn!: HTMLButtonElement;
  private b1ResultsStatsBox!: HTMLElement;
  private btnRerunErrors!: HTMLButtonElement;
  private btnCollectMore!: HTMLButtonElement;
  private btnProceedToV1!: HTMLButtonElement;
  private b1SourceBreakdown!: HTMLElement;

  // Step V1 Controls
  private dedupRawCount!: HTMLElement;
  private dedupExactCount!: HTMLElement;
  private dedupSuspectCount!: HTMLElement;
  private dedupUniqueCount!: HTMLElement;
  private btnRunDedupWorker!: HTMLButtonElement;
  private btnConfirmDedupAndProceedV2!: HTMLButtonElement;
  private suspectedDuplicatesSection!: HTMLElement;
  private suspectPairsCounter!: HTMLElement;
  private suspectDuplicatesContainer!: HTMLElement;

  // Step V2 Controls
  private v2FilterPills!: HTMLElement;
  private v2CountAll!: HTMLElement;
  private v2CountUnseen!: HTMLElement;
  private v2CountPass!: HTMLElement;
  private v2CountExclude!: HTMLElement;
  private v2CountUnsure!: HTMLElement;
  private autoScreenBatchBtn!: HTMLButtonElement;
  private btnProceedToV3!: HTMLButtonElement;
  private unsureResolutionBox!: HTMLElement;
  private unsureRemainingCount!: HTMLElement;
  private btnKeepReviewingV2!: HTMLButtonElement;
  private btnPassUnsureToV3!: HTMLButtonElement;

  // Step V3 Controls
  private btnFindFullTextSelected!: HTMLButtonElement;
  private uploadPdfBtn!: HTMLButtonElement;
  private pdfFileInput!: HTMLInputElement;
  private extractActiveTabBtn!: HTMLButtonElement;
  private btnProceedToFinal!: HTMLButtonElement;

  // Step Final Controls
  private auditEligibleCount!: HTMLElement;
  private auditPendingDecisionCount!: HTMLElement;
  private auditMissingFullTextCount!: HTMLElement;
  private auditMissingEvidenceCount!: HTMLElement;
  private auditOutdatedCount!: HTMLElement;
  private prismaIntegrityStatusBox!: HTMLElement;
  private viewPrismaBtn!: HTMLButtonElement;
  private exportCsvBtn!: HTMLButtonElement;
  private exportDedupLogBtn!: HTMLButtonElement;
  private exportFullCsvBtn!: HTMLButtonElement;
  private exportIncludedCsvBtn!: HTMLButtonElement;
  private exportPrismaBtn!: HTMLButtonElement;
  private exportEvidenceTableBtn!: HTMLButtonElement;
  private exportApa7Btn!: HTMLButtonElement;
  private saveLogBtn!: HTMLButtonElement;
  private exportSessionBtn!: HTMLButtonElement;

  // Records List & Pagination
  private filterInput!: HTMLInputElement;
  private filterDecisionSelect!: HTMLSelectElement;
  private paginationBar!: HTMLElement;
  private paginationInfo!: HTMLElement;
  private prevPageBtn!: HTMLButtonElement;
  private pageIndicator!: HTMLElement;
  private nextPageBtn!: HTMLButtonElement;
  private pageSizeSelect!: HTMLSelectElement;
  private resultsContainer!: HTMLElement;
  private statusDiv!: HTMLElement;

  // Modals
  private stepGuideModal!: HTMLElement;
  private guideModalTitle!: HTMLElement;
  private guideModalBody!: HTMLElement;
  private closeStepGuideBtn!: HTMLButtonElement;
  private closeStepGuideBottomBtn!: HTMLButtonElement;

  private protocolEditModal!: HTMLElement;
  private closeProtocolEditBtn!: HTMLButtonElement;
  private protocolChangeReason!: HTMLInputElement;
  private chkIsScopeChange!: HTMLInputElement;
  private protocolDiffBox!: HTMLElement;
  private protocolDiffContent!: HTMLElement;
  private cancelProtocolEditBtn!: HTMLButtonElement;
  private saveProtocolChangesBtn!: HTMLButtonElement;

  private tabExtractModal!: HTMLElement;
  private modalTitle!: HTMLElement;
  private modalBody!: HTMLElement;
  private confirmTabExtractBtn!: HTMLButtonElement;
  private cancelTabExtractBtn!: HTMLButtonElement;
  private closeModalBtn!: HTMLButtonElement;

  private prismaModal!: HTMLElement;
  private closePrismaModalBtn!: HTMLButtonElement;
  private prismaFlowContainer!: HTMLElement;
  private prismaDrilldownBox!: HTMLElement;
  private drilldownTitle!: HTMLElement;
  private drilldownPaperList!: HTMLElement;
  private modalExportPrismaMdBtn!: HTMLButtonElement;
  private modalExportEvidenceBtn!: HTMLButtonElement;
  private closePrismaModalBottomBtn!: HTMLButtonElement;

  private seedModal!: HTMLElement;
  private closeSeedModalBtn!: HTMLButtonElement;
  private seedDoiInput!: HTMLInputElement;
  private seedTitleInput!: HTMLInputElement;
  private cancelSeedBtn!: HTMLButtonElement;
  private confirmSeedBtn!: HTMLButtonElement;

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async init() {
    this.bindDOMElements();
    this.attachEventListeners();
    await this.runStorageMigration();
    await this.loadProfilesAndRestoreActive();
    await this.checkBackendHealth();
    await this.fetchSourceCapabilities();
    await this.restoreWizardStep();
    await this.checkActiveBackgroundJob();
  }

  private bindDOMElements() {
    // Header
    this.activeResearchBadge = document.getElementById("activeResearchBadge") as HTMLElement;
    this.protocolVersionBadge = document.getElementById("protocolVersionBadge") as HTMLElement;
    this.backendStatusBadge = document.getElementById("backendStatusBadge") as HTMLElement;
    this.quickHelpBtn = document.getElementById("quickHelpBtn") as HTMLButtonElement;
    this.quickResetBtn = document.getElementById("quickResetBtn") as HTMLButtonElement;

    // Stepper
    this.wizardStepper = document.getElementById("wizardStepper") as HTMLElement;
    this.stepBtns = document.querySelectorAll(".wizard-step-btn");

    // Unified Step Header Card
    this.stepHeaderCard = document.getElementById("stepHeaderCard") as HTMLElement;
    this.currentStepBadge = document.getElementById("currentStepBadge") as HTMLElement;
    this.currentStepTitle = document.getElementById("currentStepTitle") as HTMLElement;
    this.stepGuideBtn = document.getElementById("stepGuideBtn") as HTMLButtonElement;
    this.editProtocolBtn = document.getElementById("editProtocolBtn") as HTMLButtonElement;
    this.stepGoalText = document.getElementById("stepGoalText") as HTMLElement;
    this.stepIoText = document.getElementById("stepIoText") as HTMLElement;
    this.metricPendingCount = document.getElementById("metricPendingCount") as HTMLElement;
    this.metricReviewCount = document.getElementById("metricReviewCount") as HTMLElement;
    this.metricCompletedCount = document.getElementById("metricCompletedCount") as HTMLElement;
    this.metricTargetPill = document.getElementById("metricTargetPill") as HTMLElement;
    this.metricTargetCount = document.getElementById("metricTargetCount") as HTMLElement;
    this.stepPrimaryBtn = document.getElementById("stepPrimaryBtn") as HTMLButtonElement;
    this.stepPrimaryBtnIcon = document.getElementById("stepPrimaryBtnIcon") as HTMLElement;
    this.stepPrimaryBtnText = document.getElementById("stepPrimaryBtnText") as HTMLElement;
    this.stepConditionText = document.getElementById("stepConditionText") as HTMLElement;
    this.stepNextGuideText = document.getElementById("stepNextGuideText") as HTMLElement;

    // Job Control Banner
    this.jobControlBanner = document.getElementById("jobControlBanner") as HTMLElement;
    this.jobStageBadge = document.getElementById("jobStageBadge") as HTMLElement;
    this.jobMessage = document.getElementById("jobMessage") as HTMLElement;
    this.jobPauseBtn = document.getElementById("jobPauseBtn") as HTMLButtonElement;
    this.jobResumeBtn = document.getElementById("jobResumeBtn") as HTMLButtonElement;
    this.jobCancelBtn = document.getElementById("jobCancelBtn") as HTMLButtonElement;
    this.jobProgressBar = document.getElementById("jobProgressBar") as HTMLElement;

    // Outdated Alert
    this.protocolOutdatedAlert = document.getElementById("protocolOutdatedAlert") as HTMLElement;
    this.outdatedPapersCount = document.getElementById("outdatedPapersCount") as HTMLElement;
    this.btnJumpToOutdatedV2 = document.getElementById("btnJumpToOutdatedV2") as HTMLButtonElement;
    this.btnJumpToOutdatedV3 = document.getElementById("btnJumpToOutdatedV3") as HTMLButtonElement;

    // Panels
    this.panelStep0 = document.getElementById("panelStep0") as HTMLElement;
    this.panelStepB1 = document.getElementById("panelStepB1") as HTMLElement;
    this.panelStepV1 = document.getElementById("panelStepV1") as HTMLElement;
    this.panelStepV2 = document.getElementById("panelStepV2") as HTMLElement;
    this.panelStepV3 = document.getElementById("panelStepV3") as HTMLElement;
    this.panelStepFinal = document.getElementById("panelStepFinal") as HTMLElement;
    this.papersListContainerCard = document.getElementById("papersListContainerCard") as HTMLElement;

    // Step 0
    this.btnModeNewResearch = document.getElementById("btnModeNewResearch") as HTMLButtonElement;
    this.btnModeContinueResearch = document.getElementById("btnModeContinueResearch") as HTMLButtonElement;
    this.btnModeImportBackup = document.getElementById("btnModeImportBackup") as HTMLButtonElement;
    this.backupFileInput = document.getElementById("backupFileInput") as HTMLInputElement;
    this.continueResearchBox = document.getElementById("continueResearchBox") as HTMLElement;
    this.profileSelect = document.getElementById("profileSelect") as HTMLSelectElement;
    this.btnLoadSelectedProfile = document.getElementById("btnLoadSelectedProfile") as HTMLButtonElement;
    this.btnLoadPresetSwt = document.getElementById("btnLoadPresetSwt") as HTMLButtonElement;
    this.btnLoadPresetGeneric = document.getElementById("btnLoadPresetGeneric") as HTMLButtonElement;
    this.btnLoadPresetAac = document.getElementById("btnLoadPresetAac") as HTMLButtonElement;
    this.setupResearchName = document.getElementById("setupResearchName") as HTMLInputElement;
    this.setupResearchDesc = document.getElementById("setupResearchDesc") as HTMLInputElement;
    this.setupResearchRq = document.getElementById("setupResearchRq") as HTMLTextAreaElement;
    this.frameworkFieldsContainer = document.getElementById("frameworkFieldsContainer") as HTMLElement;
    this.setupYearStart = document.getElementById("setupYearStart") as HTMLInputElement;
    this.setupYearEnd = document.getElementById("setupYearEnd") as HTMLInputElement;
    this.setupLanguage = document.getElementById("setupLanguage") as HTMLInputElement;
    this.setupMinPages = document.getElementById("setupMinPages") as HTMLInputElement;
    this.setupInclusionKeywords = document.getElementById("setupInclusionKeywords") as HTMLInputElement;
    this.setupExclusionKeywords = document.getElementById("setupExclusionKeywords") as HTMLInputElement;
    this.setupTargetCount = document.getElementById("setupTargetCount") as HTMLInputElement;
    this.sourcesStatusTable = document.getElementById("sourcesStatusTable") as HTMLElement;
    this.setupSummaryBox = document.getElementById("setupSummaryBox") as HTMLElement;
    this.setupSummaryContent = document.getElementById("setupSummaryContent") as HTMLElement;
    this.btnSaveSetupAndProceed = document.getElementById("btnSaveSetupAndProceed") as HTMLButtonElement;

    // Step B1
    this.sourceSelect = document.getElementById("sourceSelect") as HTMLSelectElement;
    this.queryVersionSelect = document.getElementById("queryVersionSelect") as HTMLSelectElement;
    this.queryInput = document.getElementById("queryInput") as HTMLInputElement;
    this.searchStringsContainer = document.getElementById("searchStringsContainer") as HTMLElement;
    this.asYloInput = document.getElementById("asYloInput") as HTMLInputElement;
    this.asYhiInput = document.getElementById("asYhiInput") as HTMLInputElement;
    this.hlInput = document.getElementById("hlInput") as HTMLInputElement;
    this.maxPagesInput = document.getElementById("maxPagesInput") as HTMLInputElement;
    this.btnStartCollection = document.getElementById("btnStartCollection") as HTMLButtonElement;
    this.importFileBtn = document.getElementById("importFileBtn") as HTMLButtonElement;
    this.importFileInput = document.getElementById("importFileInput") as HTMLInputElement;
    this.btnOpenSeedModal = document.getElementById("btnOpenSeedModal") as HTMLButtonElement;
    this.snowballBtn = document.getElementById("snowballBtn") as HTMLButtonElement;
    this.b1ResultsStatsBox = document.getElementById("b1ResultsStatsBox") as HTMLElement;
    this.btnRerunErrors = document.getElementById("btnRerunErrors") as HTMLButtonElement;
    this.btnCollectMore = document.getElementById("btnCollectMore") as HTMLButtonElement;
    this.btnProceedToV1 = document.getElementById("btnProceedToV1") as HTMLButtonElement;
    this.b1SourceBreakdown = document.getElementById("b1SourceBreakdown") as HTMLElement;

    // Step V1
    this.dedupRawCount = document.getElementById("dedupRawCount") as HTMLElement;
    this.dedupExactCount = document.getElementById("dedupExactCount") as HTMLElement;
    this.dedupSuspectCount = document.getElementById("dedupSuspectCount") as HTMLElement;
    this.dedupUniqueCount = document.getElementById("dedupUniqueCount") as HTMLElement;
    this.btnRunDedupWorker = document.getElementById("btnRunDedupWorker") as HTMLButtonElement;
    this.btnConfirmDedupAndProceedV2 = document.getElementById("btnConfirmDedupAndProceedV2") as HTMLButtonElement;
    this.suspectedDuplicatesSection = document.getElementById("suspectedDuplicatesSection") as HTMLElement;
    this.suspectPairsCounter = document.getElementById("suspectPairsCounter") as HTMLElement;
    this.suspectDuplicatesContainer = document.getElementById("suspectDuplicatesContainer") as HTMLElement;

    // Step V2
    this.v2FilterPills = document.getElementById("v2FilterPills") as HTMLElement;
    this.v2CountAll = document.getElementById("v2CountAll") as HTMLElement;
    this.v2CountUnseen = document.getElementById("v2CountUnseen") as HTMLElement;
    this.v2CountPass = document.getElementById("v2CountPass") as HTMLElement;
    this.v2CountExclude = document.getElementById("v2CountExclude") as HTMLElement;
    this.v2CountUnsure = document.getElementById("v2CountUnsure") as HTMLElement;
    this.autoScreenBatchBtn = document.getElementById("autoScreenBatchBtn") as HTMLButtonElement;
    this.btnProceedToV3 = document.getElementById("btnProceedToV3") as HTMLButtonElement;
    this.unsureResolutionBox = document.getElementById("unsureResolutionBox") as HTMLElement;
    this.unsureRemainingCount = document.getElementById("unsureRemainingCount") as HTMLElement;
    this.btnKeepReviewingV2 = document.getElementById("btnKeepReviewingV2") as HTMLButtonElement;
    this.btnPassUnsureToV3 = document.getElementById("btnPassUnsureToV3") as HTMLButtonElement;

    // Step V3
    this.btnFindFullTextSelected = document.getElementById("btnFindFullTextSelected") as HTMLButtonElement;
    this.uploadPdfBtn = document.getElementById("uploadPdfBtn") as HTMLButtonElement;
    this.pdfFileInput = document.getElementById("pdfFileInput") as HTMLInputElement;
    this.extractActiveTabBtn = document.getElementById("extractActiveTabBtn") as HTMLButtonElement;
    this.btnProceedToFinal = document.getElementById("btnProceedToFinal") as HTMLButtonElement;

    // Step Final
    this.auditEligibleCount = document.getElementById("auditEligibleCount") as HTMLElement;
    this.auditPendingDecisionCount = document.getElementById("auditPendingDecisionCount") as HTMLElement;
    this.auditMissingFullTextCount = document.getElementById("auditMissingFullTextCount") as HTMLElement;
    this.auditMissingEvidenceCount = document.getElementById("auditMissingEvidenceCount") as HTMLElement;
    this.auditOutdatedCount = document.getElementById("auditOutdatedCount") as HTMLElement;
    this.prismaIntegrityStatusBox = document.getElementById("prismaIntegrityStatusBox") as HTMLElement;
    this.viewPrismaBtn = document.getElementById("viewPrismaBtn") as HTMLButtonElement;
    this.exportCsvBtn = document.getElementById("exportCsvBtn") as HTMLButtonElement;
    this.exportDedupLogBtn = document.getElementById("exportDedupLogBtn") as HTMLButtonElement;
    this.exportFullCsvBtn = document.getElementById("exportFullCsvBtn") as HTMLButtonElement;
    this.exportIncludedCsvBtn = document.getElementById("exportIncludedCsvBtn") as HTMLButtonElement;
    this.exportPrismaBtn = document.getElementById("exportPrismaBtn") as HTMLButtonElement;
    this.exportEvidenceTableBtn = document.getElementById("exportEvidenceTableBtn") as HTMLButtonElement;
    this.exportApa7Btn = document.getElementById("exportApa7Btn") as HTMLButtonElement;
    this.saveLogBtn = document.getElementById("saveLogBtn") as HTMLButtonElement;
    this.exportSessionBtn = document.getElementById("exportSessionBtn") as HTMLButtonElement;

    // List & Pagination
    this.filterInput = document.getElementById("filterInput") as HTMLInputElement;
    this.filterDecisionSelect = document.getElementById("filterDecisionSelect") as HTMLSelectElement;
    this.paginationBar = document.getElementById("paginationBar") as HTMLElement;
    this.paginationInfo = document.getElementById("paginationInfo") as HTMLElement;
    this.prevPageBtn = document.getElementById("prevPageBtn") as HTMLButtonElement;
    this.pageIndicator = document.getElementById("pageIndicator") as HTMLElement;
    this.nextPageBtn = document.getElementById("nextPageBtn") as HTMLButtonElement;
    this.pageSizeSelect = document.getElementById("pageSizeSelect") as HTMLSelectElement;
    this.resultsContainer = document.getElementById("resultsContainer") as HTMLElement;
    this.statusDiv = document.getElementById("status") as HTMLElement;

    // Modals
    this.stepGuideModal = document.getElementById("stepGuideModal") as HTMLElement;
    this.guideModalTitle = document.getElementById("guideModalTitle") as HTMLElement;
    this.guideModalBody = document.getElementById("guideModalBody") as HTMLElement;
    this.closeStepGuideBtn = document.getElementById("closeStepGuideBtn") as HTMLButtonElement;
    this.closeStepGuideBottomBtn = document.getElementById("closeStepGuideBottomBtn") as HTMLButtonElement;

    this.protocolEditModal = document.getElementById("protocolEditModal") as HTMLElement;
    this.closeProtocolEditBtn = document.getElementById("closeProtocolEditBtn") as HTMLButtonElement;
    this.protocolChangeReason = document.getElementById("protocolChangeReason") as HTMLInputElement;
    this.chkIsScopeChange = document.getElementById("chkIsScopeChange") as HTMLInputElement;
    this.protocolDiffBox = document.getElementById("protocolDiffBox") as HTMLElement;
    this.protocolDiffContent = document.getElementById("protocolDiffContent") as HTMLElement;
    this.cancelProtocolEditBtn = document.getElementById("cancelProtocolEditBtn") as HTMLButtonElement;
    this.saveProtocolChangesBtn = document.getElementById("saveProtocolChangesBtn") as HTMLButtonElement;

    this.tabExtractModal = document.getElementById("tabExtractModal") as HTMLElement;
    this.modalTitle = document.getElementById("modalTitle") as HTMLElement;
    this.modalBody = document.getElementById("modalBody") as HTMLElement;
    this.confirmTabExtractBtn = document.getElementById("confirmTabExtractBtn") as HTMLButtonElement;
    this.cancelTabExtractBtn = document.getElementById("cancelTabExtractBtn") as HTMLButtonElement;
    this.closeModalBtn = document.getElementById("closeModalBtn") as HTMLButtonElement;

    this.prismaModal = document.getElementById("prismaModal") as HTMLElement;
    this.closePrismaModalBtn = document.getElementById("closePrismaModalBtn") as HTMLButtonElement;
    this.prismaFlowContainer = document.getElementById("prismaFlowContainer") as HTMLElement;
    this.prismaDrilldownBox = document.getElementById("prismaDrilldownBox") as HTMLElement;
    this.drilldownTitle = document.getElementById("drilldownTitle") as HTMLElement;
    this.drilldownPaperList = document.getElementById("drilldownPaperList") as HTMLElement;
    this.modalExportPrismaMdBtn = document.getElementById("modalExportPrismaMdBtn") as HTMLButtonElement;
    this.modalExportEvidenceBtn = document.getElementById("modalExportEvidenceBtn") as HTMLButtonElement;
    this.closePrismaModalBottomBtn = document.getElementById("closePrismaModalBottomBtn") as HTMLButtonElement;

    this.seedModal = document.getElementById("seedModal") as HTMLElement;
    this.closeSeedModalBtn = document.getElementById("closeSeedModalBtn") as HTMLButtonElement;
    this.seedDoiInput = document.getElementById("seedDoiInput") as HTMLInputElement;
    this.seedTitleInput = document.getElementById("seedTitleInput") as HTMLInputElement;
    this.cancelSeedBtn = document.getElementById("cancelSeedBtn") as HTMLButtonElement;
    this.confirmSeedBtn = document.getElementById("confirmSeedBtn") as HTMLButtonElement;
  }

  private attachEventListeners() {
    // Stepper buttons
    if (this.stepBtns) {
      this.stepBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const step = (btn.getAttribute("data-step") || "SETUP") as WizardStep;
          this.setWizardStep(step);
        });
      });
    }

    // Step Header Card Actions
    if (this.stepPrimaryBtn) {
      this.stepPrimaryBtn.addEventListener("click", () => this.handlePrimaryActionForStep());
    }
    if (this.stepGuideBtn) {
      this.stepGuideBtn.addEventListener("click", () => this.openStepGuideModal());
    }
    if (this.quickHelpBtn) {
      this.quickHelpBtn.addEventListener("click", () => this.openStepGuideModal());
    }
    if (this.quickResetBtn) {
      this.quickResetBtn.addEventListener("click", () => this.handleQuickResetSession());
    }
    if (this.editProtocolBtn) {
      this.editProtocolBtn.addEventListener("click", () => this.openProtocolEditModal());
    }

    // Outdated Alert Jumps
    if (this.btnJumpToOutdatedV2) {
      this.btnJumpToOutdatedV2.addEventListener("click", () => {
        this.setWizardStep("V2");
        this.filterDecisionSelect.value = "Unsure";
        this.renderRecordsList();
      });
    }
    if (this.btnJumpToOutdatedV3) {
      this.btnJumpToOutdatedV3.addEventListener("click", () => {
        this.setWizardStep("V3");
        this.filterDecisionSelect.value = "Unsure";
        this.renderRecordsList();
      });
    }

    // Job Control Banner
    if (this.jobPauseBtn) this.jobPauseBtn.addEventListener("click", () => this.handlePauseJob());
    if (this.jobResumeBtn) this.jobResumeBtn.addEventListener("click", () => this.handleResumeJob());
    if (this.jobCancelBtn) this.jobCancelBtn.addEventListener("click", () => this.handleCancelJob());

    // Step 0 Mode Choices
    if (this.btnModeNewResearch) {
      this.btnModeNewResearch.addEventListener("click", () => this.setStep0Mode("new"));
    }
    if (this.btnModeContinueResearch) {
      this.btnModeContinueResearch.addEventListener("click", () => this.setStep0Mode("continue"));
    }
    if (this.btnModeImportBackup) {
      this.btnModeImportBackup.addEventListener("click", () => this.backupFileInput.click());
    }
    if (this.backupFileInput) {
      this.backupFileInput.addEventListener("change", (e) => this.handleImportBackupFile(e));
    }
    if (this.btnLoadSelectedProfile) {
      this.btnLoadSelectedProfile.addEventListener("click", () => {
        if (this.profileSelect && this.profileSelect.value) {
          this.switchActiveProfile(this.profileSelect.value);
        }
      });
    }

    // Step 0 Presets
    if (this.btnLoadPresetSwt) this.btnLoadPresetSwt.addEventListener("click", () => this.applyPreset(PRESET_SWT302));
    if (this.btnLoadPresetGeneric)
      this.btnLoadPresetGeneric.addEventListener("click", () => this.applyPreset(PRESET_GENERIC));
    if (this.btnLoadPresetAac)
      this.btnLoadPresetAac.addEventListener("click", () => this.applyPreset(PRESET_VISUALLY_IMPAIRED_AAC));

    // Step 0 Framework Radio buttons
    const fwRadios = document.querySelectorAll('input[name="frameworkType"]');
    fwRadios.forEach((r) => {
      r.addEventListener("change", (e) => {
        const val = (e.target as HTMLInputElement).value as FrameworkType;
        this.switchFramework(val);
      });
    });

    // Step 0 Input Live Updates for Summary
    const setupInputs = [
      this.setupResearchName,
      this.setupResearchDesc,
      this.setupResearchRq,
      this.setupYearStart,
      this.setupYearEnd,
      this.setupLanguage,
      this.setupMinPages,
      this.setupInclusionKeywords,
      this.setupExclusionKeywords,
      this.setupTargetCount,
    ];
    setupInputs.forEach((inp) => {
      if (inp) {
        inp.addEventListener("input", () => this.updateStep0SummaryPreview());
      }
    });

    if (this.btnSaveSetupAndProceed) {
      this.btnSaveSetupAndProceed.addEventListener("click", () => this.handleSaveSetupAndProceed());
    }

    // Step B1 Actions
    if (this.btnStartCollection) {
      this.btnStartCollection.addEventListener("click", () => this.handleStartCollection());
    }
    if (this.importFileBtn) {
      this.importFileBtn.addEventListener("click", () => this.importFileInput.click());
    }
    if (this.importFileInput) {
      this.importFileInput.addEventListener("change", (e) => this.handleImportFile(e));
    }
    if (this.btnOpenSeedModal) {
      this.btnOpenSeedModal.addEventListener("click", () => this.openSeedModal());
    }
    if (this.snowballBtn) {
      this.snowballBtn.addEventListener("click", () => this.handleSnowballingPrompt());
    }
    if (this.btnRerunErrors) {
      this.btnRerunErrors.addEventListener("click", () => this.handleStartCollection(true));
    }
    if (this.btnCollectMore) {
      this.btnCollectMore.addEventListener("click", () => {
        this.queryInput.focus();
        this.setStatus("Nhập thêm truy vấn hoặc chọn nguồn khác để thu thập thêm.", "info");
      });
    }
    if (this.btnProceedToV1) {
      this.btnProceedToV1.addEventListener("click", () => this.setWizardStep("V1"));
    }

    // Step V1 Actions
    if (this.btnRunDedupWorker) {
      this.btnRunDedupWorker.addEventListener("click", () => this.handleRunDedupWorker());
    }
    if (this.btnConfirmDedupAndProceedV2) {
      this.btnConfirmDedupAndProceedV2.addEventListener("click", () => this.handleConfirmDedupAndProceedV2());
    }

    // Step V2 Actions
    if (this.v2FilterPills) {
      this.v2FilterPills.querySelectorAll(".pill-btn").forEach((pill) => {
        pill.addEventListener("click", () => {
          this.v2FilterPills.querySelectorAll(".pill-btn").forEach((p) => p.classList.remove("active"));
          pill.classList.add("active");
          this.v2CurrentFilter = pill.getAttribute("data-filter") || "all";
          this.currentPage = 1;
          this.renderRecordsList();
        });
      });
    }
    if (this.autoScreenBatchBtn) {
      this.autoScreenBatchBtn.addEventListener("click", () => this.handleAutoScreenBatch());
    }
    if (this.btnProceedToV3) {
      this.btnProceedToV3.addEventListener("click", () => this.handleProceedToV3());
    }
    if (this.btnKeepReviewingV2) {
      this.btnKeepReviewingV2.addEventListener("click", () => {
        this.v2CurrentFilter = "Unsure";
        const unsurePill = this.v2FilterPills.querySelector('[data-filter="Unsure"]');
        if (unsurePill) {
          this.v2FilterPills.querySelectorAll(".pill-btn").forEach((p) => p.classList.remove("active"));
          unsurePill.classList.add("active");
        }
        this.renderRecordsList();
      });
    }
    if (this.btnPassUnsureToV3) {
      this.btnPassUnsureToV3.addEventListener("click", () => this.handlePassUnsureToV3());
    }

    // Step V3 Actions
    if (this.btnFindFullTextSelected) {
      this.btnFindFullTextSelected.addEventListener("click", () => this.handleFindFullTextSelected());
    }
    if (this.uploadPdfBtn) {
      this.uploadPdfBtn.addEventListener("click", () => this.pdfFileInput.click());
    }
    if (this.pdfFileInput) {
      this.pdfFileInput.addEventListener("change", (e) => this.handleUploadPdfFile(e));
    }
    if (this.extractActiveTabBtn) {
      this.extractActiveTabBtn.addEventListener("click", () => this.handleExtractActiveTab());
    }
    if (this.btnProceedToFinal) {
      this.btnProceedToFinal.addEventListener("click", () => this.setWizardStep("FINAL"));
    }

    // Step Final Exports & PRISMA
    if (this.viewPrismaBtn) this.viewPrismaBtn.addEventListener("click", () => this.openPrismaModal());
    if (this.exportCsvBtn) this.exportCsvBtn.addEventListener("click", () => this.handleExportCsv());
    if (this.exportDedupLogBtn) this.exportDedupLogBtn.addEventListener("click", () => this.handleExportDedupLog());
    if (this.exportFullCsvBtn) this.exportFullCsvBtn.addEventListener("click", () => this.handleExportFullCsv());
    if (this.exportIncludedCsvBtn)
      this.exportIncludedCsvBtn.addEventListener("click", () => this.handleExportIncludedCsv());
    if (this.exportPrismaBtn) this.exportPrismaBtn.addEventListener("click", () => this.handleExportPrismaMarkdown());
    if (this.exportEvidenceTableBtn)
      this.exportEvidenceTableBtn.addEventListener("click", () => this.handleExportEvidenceTable());
    if (this.exportApa7Btn) this.exportApa7Btn.addEventListener("click", () => this.handleExportApa7());
    if (this.saveLogBtn) this.saveLogBtn.addEventListener("click", () => this.handleSaveLog());
    if (this.exportSessionBtn) this.exportSessionBtn.addEventListener("click", () => this.handleExportSessionJson());

    // Search Filter & Pagination in List
    if (this.filterInput) {
      this.filterInput.addEventListener("input", () => {
        this.currentPage = 1;
        this.renderRecordsList();
      });
    }
    if (this.filterDecisionSelect) {
      this.filterDecisionSelect.addEventListener("change", () => {
        this.currentPage = 1;
        this.renderRecordsList();
      });
    }
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderRecordsList();
        }
      });
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => {
        this.currentPage++;
        this.renderRecordsList();
      });
    }
    if (this.pageSizeSelect) {
      this.pageSizeSelect.addEventListener("change", () => {
        this.pageSize = parseInt(this.pageSizeSelect.value, 10) || 10;
        this.currentPage = 1;
        this.renderRecordsList();
      });
    }

    // Modals
    if (this.closeStepGuideBtn) this.closeStepGuideBtn.addEventListener("click", () => this.closeStepGuideModal());
    if (this.closeStepGuideBottomBtn)
      this.closeStepGuideBottomBtn.addEventListener("click", () => this.closeStepGuideModal());

    if (this.closeProtocolEditBtn)
      this.closeProtocolEditBtn.addEventListener("click", () => this.closeProtocolEditModal());
    if (this.cancelProtocolEditBtn)
      this.cancelProtocolEditBtn.addEventListener("click", () => this.closeProtocolEditModal());
    if (this.saveProtocolChangesBtn)
      this.saveProtocolChangesBtn.addEventListener("click", () => this.handleSaveProtocolChanges());

    if (this.closeModalBtn) this.closeModalBtn.addEventListener("click", () => this.closeTabExtractModal());
    if (this.cancelTabExtractBtn) this.cancelTabExtractBtn.addEventListener("click", () => this.closeTabExtractModal());
    if (this.confirmTabExtractBtn) this.confirmTabExtractBtn.addEventListener("click", () => this.confirmTabAnalysis());

    if (this.closePrismaModalBtn) this.closePrismaModalBtn.addEventListener("click", () => this.closePrismaModal());
    if (this.closePrismaModalBottomBtn)
      this.closePrismaModalBottomBtn.addEventListener("click", () => this.closePrismaModal());
    if (this.modalExportPrismaMdBtn)
      this.modalExportPrismaMdBtn.addEventListener("click", () => this.handleExportPrismaMarkdown());
    if (this.modalExportEvidenceBtn)
      this.modalExportEvidenceBtn.addEventListener("click", () => this.handleExportEvidenceTable());

    if (this.closeSeedModalBtn) this.closeSeedModalBtn.addEventListener("click", () => this.closeSeedModal());
    if (this.cancelSeedBtn) this.cancelSeedBtn.addEventListener("click", () => this.closeSeedModal());
    if (this.confirmSeedBtn) this.confirmSeedBtn.addEventListener("click", () => this.handleConfirmSeedPaper());
  }

  // ==========================================
  // WIZARD STEP CONTROLLER
  // ==========================================

  setWizardStep(step: WizardStep) {
    this.currentWizardStep = step;
    chrome.storage.local.set({ [STORAGE_WIZARD_STEP_KEY]: step });

    // Update Stepper active state
    if (this.stepBtns) {
      this.stepBtns.forEach((btn) => {
        if (btn.getAttribute("data-step") === step) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Update Unified Step Header Card
    const cfg = STEP_CONFIGS[step];
    if (cfg) {
      if (this.currentStepBadge) this.currentStepBadge.innerText = cfg.badge;
      if (this.currentStepTitle) this.currentStepTitle.innerText = cfg.title;
      if (this.stepGoalText) this.stepGoalText.innerText = cfg.goal;
      if (this.stepIoText) this.stepIoText.innerText = cfg.io;
      if (this.stepPrimaryBtnIcon) this.stepPrimaryBtnIcon.innerText = cfg.primaryBtnIcon;
      if (this.stepPrimaryBtnText) this.stepPrimaryBtnText.innerText = cfg.primaryBtnText;
      if (this.stepConditionText) this.stepConditionText.innerText = cfg.condition;
      if (this.stepNextGuideText) this.stepNextGuideText.innerText = cfg.nextGuide;
    }

    // Show/Hide step panels
    if (this.panelStep0) this.panelStep0.style.display = step === "SETUP" ? "block" : "none";
    if (this.panelStepB1) this.panelStepB1.style.display = step === "B1" ? "block" : "none";
    if (this.panelStepV1) this.panelStepV1.style.display = step === "V1" ? "block" : "none";
    if (this.panelStepV2) this.panelStepV2.style.display = step === "V2" ? "block" : "none";
    if (this.panelStepV3) this.panelStepV3.style.display = step === "V3" ? "block" : "none";
    if (this.panelStepFinal) this.panelStepFinal.style.display = step === "FINAL" ? "block" : "none";

    // Show/Hide shared papers list
    if (this.papersListContainerCard) {
      // In SETUP: hidden; in B1, V1, V2, V3, FINAL: visible
      this.papersListContainerCard.style.display = step === "SETUP" ? "none" : "block";
    }

    // Refresh metrics & step-specific views
    this.updateStepCounters();

    if (step === "SETUP") {
      this.renderStep0();
    } else if (step === "B1") {
      this.renderStepB1();
    } else if (step === "V1") {
      this.renderStepV1();
    } else if (step === "V2") {
      this.renderStepV2();
    } else if (step === "V3") {
      this.renderStepV3();
    } else if (step === "FINAL") {
      this.renderStepFinal();
    }

    this.renderRecordsList();
    this.setStatus(`Đang ở ${cfg?.badge}: ${cfg?.title}`, "info");
  }

  private async restoreWizardStep() {
    try {
      const data = await chrome.storage.local.get(STORAGE_WIZARD_STEP_KEY);
      const savedStep = data[STORAGE_WIZARD_STEP_KEY] as WizardStep;
      if (savedStep && STEP_CONFIGS[savedStep]) {
        this.setWizardStep(savedStep);
        return;
      }
    } catch {
      // ignore
    }
    // Default: if has records -> B1, else -> SETUP
    if (this.uniqueRecords.length > 0) {
      this.setWizardStep("B1");
    } else {
      this.setWizardStep("SETUP");
    }
  }

  private handlePrimaryActionForStep() {
    switch (this.currentWizardStep) {
      case "SETUP":
        this.handleSaveSetupAndProceed();
        break;
      case "B1":
        this.handleStartCollection();
        break;
      case "V1":
        this.handleRunDedupWorker();
        break;
      case "V2":
        this.handleAutoScreenBatch();
        break;
      case "V3":
        this.handleFindFullTextSelected();
        break;
      case "FINAL":
        this.openPrismaModal();
        break;
    }
  }

  private updateStepCounters() {
    const totalRaw = this.allRecords.length;
    const totalUnique = this.uniqueRecords.length;

    let pending = 0;
    let review = 0;
    let completed = 0;

    const target = this.activeProfile.targetIncludedCount || 15;
    const finalIncludes = this.uniqueRecords.filter((r) => r.finalDecision === "Include").length;

    switch (this.currentWizardStep) {
      case "SETUP":
        pending = 0;
        review = 0;
        completed = (this.activeProfile.criteria || []).length;
        break;
      case "B1":
        pending = 0;
        review = 0;
        completed = totalRaw;
        break;
      case "V1":
        pending = this.suspectedDuplicatePairs.length;
        review = this.dedupStats.potentialDupByTitle || 0;
        completed = totalUnique;
        break;
      case "V2":
        pending = this.uniqueRecords.filter((r) => !r.v2Decision && !r.finalDecision).length;
        review = this.uniqueRecords.filter((r) => r.v2Decision === "Unsure" || r.suggestedDecision === "Unsure").length;
        completed = this.uniqueRecords.filter(
          (r) => r.v2Decision === "PassToFullText" || r.v2Decision === "Exclude",
        ).length;
        break;
      case "V3":
        pending = this.uniqueRecords.filter(
          (r) => r.v2Decision === "PassToFullText" && !r.finalDecision && !r.pdfUrl,
        ).length;
        review = this.uniqueRecords.filter(
          (r) =>
            (r.finalDecision === "Unsure" || !r.finalDecision) && (!!r.pdfUrl || r.fullTextStatus === "downloaded"),
        ).length;
        completed = this.uniqueRecords.filter(
          (r) => r.finalDecision === "Include" || r.finalDecision === "Exclude",
        ).length;
        break;
      case "FINAL":
        pending = this.uniqueRecords.filter((r) => !r.finalDecision).length;
        review = this.uniqueRecords.filter((r) => r.isDecisionOutdated || r.missingEvidence?.length).length;
        completed = finalIncludes;
        break;
    }

    if (this.metricPendingCount) this.metricPendingCount.innerText = String(pending);
    if (this.metricReviewCount) this.metricReviewCount.innerText = String(review);
    if (this.metricCompletedCount) this.metricCompletedCount.innerText = String(completed);
    if (this.metricTargetCount) this.metricTargetCount.innerText = `${finalIncludes} / ${target}`;

    // Outdated alert banner check
    const outdatedCount = this.uniqueRecords.filter((r) => r.isDecisionOutdated).length;
    if (this.protocolOutdatedAlert && this.outdatedPapersCount) {
      if (outdatedCount > 0) {
        this.protocolOutdatedAlert.style.display = "block";
        this.outdatedPapersCount.innerText = String(outdatedCount);
      } else {
        this.protocolOutdatedAlert.style.display = "none";
      }
    }
  }

  // ==========================================
  // STEP 0 — THIẾT LẬP NGHIÊN CỨU
  // ==========================================

  private setStep0Mode(mode: "new" | "continue" | "import") {
    if (this.btnModeNewResearch) this.btnModeNewResearch.classList.toggle("active", mode === "new");
    if (this.btnModeContinueResearch) this.btnModeContinueResearch.classList.toggle("active", mode === "continue");
    if (this.btnModeImportBackup) this.btnModeImportBackup.classList.toggle("active", mode === "import");

    if (this.continueResearchBox) {
      this.continueResearchBox.style.display = mode === "continue" ? "block" : "none";
    }

    if (mode === "new") {
      const newStudyId = `research_${Date.now()}`;
      this.activeProfile = {
        ...PRESET_GENERIC,
        id: newStudyId,
        name: "",
        description: "",
        profileVersion: 1,
        researchQuestions: [],
        criteria: [...PRESET_GENERIC.criteria],
        searchStrings: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.currentSessionId = `session_${Date.now()}`;
      this.allRecords = [];
      this.uniqueRecords = [];
      this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
      this.suspectedDuplicatePairs = [];
      this.mergeHistoryList = [];

      this.setupResearchName.value = "";
      this.setupResearchDesc.value = "";
      this.setupResearchRq.value = "";
      this.setupInclusionKeywords.value = "";
      this.setupExclusionKeywords.value = "";

      this.saveSessionToStorage();
      this.updateActiveResearchDisplay();
      this.updateStepCounters();
      this.updateStep0SummaryPreview();
      this.renderRecordsList();
      this.setStatus("Chế độ tạo mới: Đã khởi tạo đề tài nghiên cứu độc lập mới.", "info");
    }
  }

  private async handleQuickResetSession() {
    if (!confirm("Bạn có chắc chắn muốn xóa sạch toàn bộ dữ liệu phiên làm việc này để bắt đầu lại từ đầu?")) {
      return;
    }
    this.allRecords = [];
    this.uniqueRecords = [];
    this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
    this.suspectedDuplicatePairs = [];
    this.mergeHistoryList = [];
    this.currentSessionId = `session_${Date.now()}`;
    await this.saveSessionToStorage();
    this.setWizardStep("SETUP");
    this.updateStepCounters();
    this.renderRecordsList();
    this.setStatus("✓ Đã xóa sạch dữ liệu phiên làm việc. Hãy bắt đầu từ Bước 0 Thiết lập.", "success");
  }

  private renderStep0() {
    this.populateSetupForm(this.activeProfile);
    this.renderFrameworkFields(this.activeProfile.framework || "PICO", this.activeProfile.frameworkFields);
    this.renderSourcesStatusTable();
    this.updateStep0SummaryPreview();
  }

  private switchFramework(fw: FrameworkType) {
    this.currentFramework = fw;
    this.renderFrameworkFields(fw);
    this.updateStep0SummaryPreview();
  }

  private renderFrameworkFields(fw: FrameworkType, existingFields?: Record<string, { val: string; na: boolean }>) {
    if (!this.frameworkFieldsContainer) return;

    let fieldDefs: Array<{ key: string; label: string; placeholder: string }> = [];
    if (fw === "PICO") {
      fieldDefs = [
        { key: "P", label: "P — Population / Problem", placeholder: "Ví dụ: REST APIs, hệ thống web backend..." },
        {
          key: "I",
          label: "I — Intervention",
          placeholder: "Ví dụ: Kiểm thử tự động với Equivalence Partitioning / BVA...",
        },
        {
          key: "C",
          label: "C — Comparison (Đối chứng)",
          placeholder: "Ví dụ: Kiểm thử thủ công, random testing... (hoặc tích N/A)",
        },
        {
          key: "O",
          label: "O — Outcomes (Kết quả đo lường)",
          placeholder: "Ví dụ: Độ bao phủ coverage, tỉ lệ phát hiện lỗi...",
        },
      ];
    } else if (fw === "PICOS") {
      fieldDefs = [
        { key: "P", label: "P — Population", placeholder: "Đối tượng nghiên cứu..." },
        { key: "I", label: "I — Intervention", placeholder: "Phương pháp áp dụng..." },
        { key: "C", label: "C — Comparison", placeholder: "Phương pháp so sánh (hoặc N/A)..." },
        { key: "O", label: "O — Outcomes", placeholder: "Kết quả mong đợi..." },
        { key: "S", label: "S — Study Design", placeholder: "Thiết kế thực nghiệm (Empirical, SLR, Case Study)..." },
      ];
    } else if (fw === "SPIDER") {
      fieldDefs = [
        { key: "S", label: "S — Sample", placeholder: "Mẫu nghiên cứu..." },
        { key: "PI", label: "PI — Phenomenon of Interest", placeholder: "Hiện tượng quan tâm..." },
        { key: "D", label: "D — Design", placeholder: "Phương pháp thiết kế nghiên cứu..." },
        { key: "E", label: "E — Evaluation", placeholder: "Đánh giá kết quả..." },
        { key: "R", label: "R — Research Type", placeholder: "Loại nghiên cứu (Định lượng, Định tính)..." },
      ];
    } else {
      fieldDefs = [
        { key: "Domain", label: "Lĩnh vực nghiên cứu", placeholder: "Ví dụ: Software Testing..." },
        { key: "Method", label: "Phương pháp trọng tâm", placeholder: "Kỹ thuật phân tích..." },
        { key: "Evaluation", label: "Tiêu chí đánh giá", placeholder: "Chỉ số thực nghiệm..." },
      ];
    }

    this.frameworkFieldsContainer.innerHTML = fieldDefs
      .map((def) => {
        const saved = existingFields ? existingFields[def.key] : null;
        const val = saved ? saved.val : "";
        const isNa = saved ? saved.na : false;

        return `
        <div class="fw-field-item">
          <div class="fw-field-top">
            <span class="fw-field-label">${this.escapeHtml(def.label)}</span>
            <label class="fw-na-label">
              <input type="checkbox" class="fw-na-chk" data-field="${def.key}" ${isNa ? "checked" : ""} />
              <span>N/A</span>
            </label>
          </div>
          <input type="text" class="fw-field-input" data-field="${def.key}" placeholder="${this.escapeHtml(def.placeholder)}" value="${this.escapeHtml(val)}" ${isNa ? "disabled" : ""} />
        </div>
      `;
      })
      .join("");

    this.frameworkFieldsContainer.querySelectorAll(".fw-na-chk").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.getAttribute("data-field");
        const input = this.frameworkFieldsContainer.querySelector(
          `.fw-field-input[data-field="${key}"]`,
        ) as HTMLInputElement;
        if (input) {
          input.disabled = target.checked;
          if (target.checked) input.value = "N/A";
          else if (input.value === "N/A") input.value = "";
        }
        this.updateStep0SummaryPreview();
      });
    });

    this.frameworkFieldsContainer.querySelectorAll(".fw-field-input").forEach((inp) => {
      inp.addEventListener("input", () => this.updateStep0SummaryPreview());
    });
  }

  private getFrameworkFieldValues(): Record<string, { val: string; na: boolean }> {
    const res: Record<string, { val: string; na: boolean }> = {};
    if (!this.frameworkFieldsContainer) return res;

    this.frameworkFieldsContainer.querySelectorAll(".fw-field-item").forEach((item) => {
      const chk = item.querySelector(".fw-na-chk") as HTMLInputElement;
      const inp = item.querySelector(".fw-field-input") as HTMLInputElement;
      if (chk && inp) {
        const key = chk.getAttribute("data-field") || "";
        res[key] = {
          val: inp.value.trim(),
          na: chk.checked,
        };
      }
    });
    return res;
  }

  private async fetchSourceCapabilities() {
    try {
      const res = await fetch(`${this.backendUrl}/api/sources/capabilities`);
      if (res.ok) {
        const data = await res.json();
        this.sourceCapabilities = data.capabilities || [];
        this.renderSourcesStatusTable();
      }
    } catch {
      // ignore
    }
  }

  private renderSourcesStatusTable() {
    if (!this.sourcesStatusTable) return;

    const sources = [
      {
        name: "OpenAlex",
        status: "Sẵn sàng (Miễn phí)",
        statusCls: "badge-green",
        notes: "Nguồn chính, bao quát toàn cầu, không cần API key.",
      },
      {
        name: "Semantic Scholar",
        status: "Sẵn sàng / Khuyên dùng Key",
        statusCls: "badge-blue",
        notes: "Nguồn bổ trợ, tự động fallback nếu không có key.",
      },
      {
        name: "Google Scholar",
        status: "Cần SerpApi Key (Tùy chọn)",
        statusCls: "badge-yellow",
        notes: "Thu thập bài ứng viên bổ trợ ngoài PRISMA.",
      },
      {
        name: "Nhập tệp ngoại vi",
        status: "Sẵn sàng (CSV, BibTeX, RIS)",
        statusCls: "badge-green",
        notes: "Hỗ trợ nhập mẫu từ ACM, IEEE, Scopus ngoại tuyến.",
      },
    ];

    this.sourcesStatusTable.innerHTML = `
      <table class="status-tbl">
        <thead>
          <tr>
            <th>Nguồn Học Thuật</th>
            <th>Trạng Thái Thực Tế</th>
            <th>Ghi Chú Vận Hành</th>
          </tr>
        </thead>
        <tbody>
          ${sources
            .map(
              (s) => `
            <tr>
              <td><b>${this.escapeHtml(s.name)}</b></td>
              <td><span class="badge ${s.statusCls}">${this.escapeHtml(s.status)}</span></td>
              <td><small>${this.escapeHtml(s.notes)}</small></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  private updateStep0SummaryPreview() {
    if (!this.setupSummaryContent) return;

    const name = this.setupResearchName?.value.trim() || "(Chưa đặt tên)";
    const rq = this.setupResearchRq?.value.trim() || "(Chưa có RQ)";
    const yStart = this.setupYearStart?.value || "2020";
    const yEnd = this.setupYearEnd?.value || "2026";
    const lang = this.setupLanguage?.value || "English, Tiếng Việt";
    const minP = this.setupMinPages?.value || "4";
    const incK = this.setupInclusionKeywords?.value.trim() || "(Trống)";
    const excK = this.setupExclusionKeywords?.value.trim() || "(Trống)";
    const target = this.setupTargetCount?.value || "15";

    const fwFields = this.getFrameworkFieldValues();
    const fwSummary = Object.entries(fwFields)
      .map(([k, v]) => `<b>${k}:</b> ${v.na ? "<i>N/A</i>" : v.val || "<i>Chưa điền</i>"}`)
      .join(" | ");

    this.setupSummaryContent.innerHTML = `
      <div><b>Đề tài:</b> ${this.escapeHtml(name)}</div>
      <div><b>Câu hỏi RQ:</b> <pre style="margin: 2px 0; font-size: 10px; font-family: inherit;">${this.escapeHtml(rq)}</pre></div>
      <div><b>Khung phân tích (${this.currentFramework}):</b> ${fwSummary || "Chưa có"}</div>
      <div><b>Bộ lọc:</b> ${yStart} - ${yEnd} | <b>Ngôn ngữ:</b> ${this.escapeHtml(lang)} | <b>Tối thiểu:</b> &ge; ${minP} trang</div>
      <div><b>Từ khóa IC:</b> <code>${this.escapeHtml(incK)}</code></div>
      <div><b>Từ khóa EC:</b> <code>${this.escapeHtml(excK)}</code></div>
      <div><b>Mục tiêu tiến độ:</b> ${target} bài Include (Chỉ theo dõi tiến độ, không ép buộc tiêu chí).</div>
    `;
  }

  private async handleSaveSetupAndProceed() {
    const name = this.setupResearchName.value.trim();
    if (!name) {
      alert("Vui lòng nhập Tên nghiên cứu / Đề tài!");
      this.setupResearchName.focus();
      return;
    }

    const rqText = this.setupResearchRq.value.trim();
    const rqList = rqText ? rqText.split("\n").filter((l) => l.trim().length > 0) : [];

    const fwFields = this.getFrameworkFieldValues();
    const yStart = parseInt(this.setupYearStart.value, 10) || 2020;
    const yEnd = parseInt(this.setupYearEnd.value, 10) || 2026;
    const minPages = parseInt(this.setupMinPages.value, 10) || 4;
    const targetCount = parseInt(this.setupTargetCount.value, 10) || 15;

    const incKeywords = this.setupInclusionKeywords.value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    const excKeywords = this.setupExclusionKeywords.value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // 1. Giữ nguyên các tiêu chí chuyên biệt của đề tài từ preset
    const existingCriteria = Array.isArray(this.activeProfile.criteria) ? [...this.activeProfile.criteria] : [];

    // 2. Cập nhật hoặc bổ sung tiêu chí Khung năm (year_range)
    let yearCriterion = existingCriteria.find((c) => c.evaluator === "year_range" || c.id === "IC-Y");
    if (yearCriterion) {
      yearCriterion.parameters = { ...yearCriterion.parameters, startYear: yStart, endYear: yEnd };
      yearCriterion.description = `Xuất bản từ năm ${yStart} đến ${yEnd}`;
    } else {
      existingCriteria.push({
        id: "IC-Y",
        label: "Khung thời gian xuất bản",
        description: `Xuất bản từ năm ${yStart} đến ${yEnd}`,
        kind: "inclusion",
        required: true,
        stage: "metadata",
        evaluator: "year_range",
        parameters: { startYear: yStart, endYear: yEnd },
      });
    }

    // 3. Cập nhật hoặc bổ sung tiêu chí Dung lượng tối thiểu (page_count)
    let pageCriterion = existingCriteria.find((c) => c.evaluator === "page_count" || c.id === "EC-S");
    if (pageCriterion) {
      pageCriterion.parameters = { ...pageCriterion.parameters, minPages, rejectShortPapers: true };
      pageCriterion.description = `Dung lượng bài báo tối thiểu >= ${minPages} trang (loại trừ bài ngắn/tóm tắt)`;
    } else {
      existingCriteria.push({
        id: "EC-S",
        label: "Dung lượng bài báo tối thiểu",
        description: `Dung lượng bài báo tối thiểu >= ${minPages} trang (loại trừ bài ngắn/tóm tắt)`,
        kind: "exclusion",
        required: true,
        stage: "full_text",
        evaluator: "page_count",
        parameters: { minPages, rejectShortPapers: true },
      });
    }

    // 4. Cập nhật tiêu chí từ khóa người dùng bổ sung theo đúng schema engine
    const finalCriteria = existingCriteria.filter((c) => !c.id.startsWith("IC-KW") && !c.id.startsWith("EC-KW"));

    if (incKeywords.length > 0) {
      finalCriteria.push({
        id: "IC-KW",
        label: "Từ khóa bao hàm bắt buộc",
        description: `Chứa ít nhất một trong các từ khóa: ${incKeywords.join(", ")}`,
        kind: "inclusion",
        required: false,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: { keywords: incKeywords, logic: "OR" },
      });
    }

    if (excKeywords.length > 0) {
      finalCriteria.push({
        id: "EC-KW",
        label: "Từ khóa loại trừ bắt buộc",
        description: `Loại trừ nếu chứa bất kỳ từ khóa nào: ${excKeywords.join(", ")}`,
        kind: "exclusion",
        required: true,
        stage: "title_abstract",
        evaluator: "keyword_group",
        parameters: { keywords: excKeywords, logic: "OR" },
      });
    }

    const updatedProfile: ResearchProfile = {
      ...this.activeProfile,
      name,
      description: this.setupResearchDesc.value.trim(),
      researchQuestions: rqList,
      framework: this.currentFramework,
      frameworkFields: fwFields,
      targetIncludedCount: targetCount,
      minPageCount: minPages,
      yearRange: { start: yStart, end: yEnd, enabled: true },
      minPages: { count: minPages, enabled: true },
      criteria: finalCriteria,
      updatedAt: new Date().toISOString(),
    };

    this.activeProfile = updatedProfile;
    await this.saveProfileToBackend(updatedProfile);
    await this.saveProfilesToStorage();

    this.updateActiveResearchDisplay();
    this.setStatus("✓ Đã lưu thiết lập Protocol thành công! Chuyển sang Bước B1 Thu thập bài báo.", "success");
    this.setWizardStep("B1");
  }

  // ==========================================
  // STEP B1 — THU THẬP BÀI BÁO (IDENTIFICATION)
  // ==========================================

  private renderStepB1() {
    // Populate query inputs from activeProfile
    if (this.asYloInput && this.activeProfile.yearRange) {
      this.asYloInput.value = String(this.activeProfile.yearRange.start);
    }
    if (this.asYhiInput && this.activeProfile.yearRange) {
      this.asYhiInput.value = String(this.activeProfile.yearRange.end);
    }

    // Render suggested search strings
    this.renderSearchStringSuggestions();

    // If already has records, show results stats box
    if (this.allRecords.length > 0) {
      if (this.b1ResultsStatsBox) this.b1ResultsStatsBox.style.display = "block";
      this.renderB1SourceBreakdown();
    }
  }

  private renderSearchStringSuggestions() {
    if (!this.searchStringsContainer) return;
    const rawSearchStrings: any[] = this.activeProfile.searchStrings || [];

    const normalizedStrings: Array<{ name: string; query: string; isDefault: boolean }> = [];
    for (const item of rawSearchStrings) {
      if (typeof item === "string") {
        normalizedStrings.push({ name: item, query: item, isDefault: false });
      } else if (item && typeof item === "object") {
        normalizedStrings.push({
          name: item.name || item.query || "Query",
          query: item.query || item.name || "",
          isDefault: !!item.isDefault,
        });
      }
    }

    if (normalizedStrings.length === 0) {
      const incKeywords = (this.activeProfile.criteria || [])
        .filter((c: any) => c.kind === "inclusion" || c.type === "inclusion")
        .map((c: any) => c.parameters?.keywords?.[0] || c.value || c.label)
        .filter(Boolean);
      if (incKeywords.length > 0) {
        normalizedStrings.push({
          name: "Gợi ý từ từ khóa",
          query: `(${incKeywords.slice(0, 3).join(" OR ")})`,
          isDefault: true,
        });
      }
    }

    if (normalizedStrings.length === 0) {
      this.searchStringsContainer.innerHTML = '<span class="text-muted">Chưa có chuỗi gợi ý</span>';
      return;
    }

    // Auto-select default query if query input is empty
    if (this.queryInput && (!this.queryInput.value || !this.queryInput.value.trim())) {
      const defaultItem = normalizedStrings.find((s) => s.isDefault) || normalizedStrings[0];
      if (defaultItem) {
        this.queryInput.value = defaultItem.query;
      }
    }

    this.searchStringsContainer.innerHTML = normalizedStrings
      .map(
        (item) =>
          `<button class="btn-xs btn-subtle search-string-pill" data-query="${this.escapeHtml(item.query)}" style="cursor: pointer; padding: 2px 6px; font-size: 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: ${item.isDefault ? "#eff6ff" : "#fff"};" title="${this.escapeHtml(item.query)}">${this.escapeHtml(item.name)}${item.isDefault ? " (Mặc định)" : ""}</button>`,
      )
      .join(" ");

    this.searchStringsContainer.querySelectorAll(".search-string-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        const query = (pill as HTMLElement).getAttribute("data-query") || pill.textContent || "";
        this.queryInput.value = query;
        this.setStatus(`Đã chọn chuỗi tìm kiếm: "${query}".`, "info");
      });
    });
  }

  private async handleStartCollection(isRerunError: boolean = false) {
    const query = this.queryInput.value.trim();
    if (!query) {
      alert("Vui lòng nhập Chuỗi tìm kiếm nguyên văn (Search String)!");
      this.queryInput.focus();
      return;
    }

    const source = this.sourceSelect ? this.sourceSelect.value : "OpenAlex";
    const queryVersion = this.queryVersionSelect ? this.queryVersionSelect.value : "Q1";
    const maxPages = parseInt(this.maxPagesInput.value, 10) || 1;

    try {
      this.setStatus(`Đang khởi chạy thu thập qua nguồn ${source} (Query: ${queryVersion})...`, "info");

      const payload = {
        researchId: this.activeProfile.id,
        sessionId: this.currentSessionId || `session_${Date.now()}`,
        stage: "B1",
        profile: this.activeProfile,
        source,
        queryVersion,
        query,
        asYlo: this.asYloInput.value.trim(),
        asYhi: this.asYhiInput.value.trim(),
        maxPages,
        isRerunError,
        records: this.allRecords,
      };

      const res = await fetch(`${this.backendUrl}/api/pipeline/run-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.jobId) {
        this.activeJobId = data.jobId;
        this.showJobBanner({
          stage: "B1",
          status: "running",
          message: `Đang thu thập từ ${source}...`,
          processedItems: 0,
          totalItems: maxPages,
        });
        this.startJobPolling(data.jobId);
        this.setStatus(`Tác vụ B1 đang chạy ngầm trên backend. Bạn có thể chuyển tab thoải mái!`, "info");
      }
    } catch (err: any) {
      this.setStatus(`Lỗi khi khởi chạy thu thập: ${err.message}`, "error");
    }
  }

  private renderB1SourceBreakdown() {
    if (!this.b1SourceBreakdown) return;

    const sourceCounts: Record<string, number> = {};
    for (const r of this.allRecords) {
      const src = r.source || r.discoverySource || "Chưa xác định";
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    }

    const items = Object.entries(sourceCounts)
      .map(
        ([src, count]) => `
      <div class="source-stat-item">
        <span class="source-stat-name">${this.escapeHtml(src)}:</span>
        <b class="source-stat-count">${count} bài</b>
      </div>
    `,
      )
      .join("");

    this.b1SourceBreakdown.innerHTML = items || "<div>Chưa có bài nào.</div>";
  }

  private openSeedModal() {
    if (this.seedModal) this.seedModal.style.display = "flex";
  }

  private closeSeedModal() {
    if (this.seedModal) this.seedModal.style.display = "none";
  }

  private async handleConfirmSeedPaper() {
    const doi = this.seedDoiInput.value.trim();
    const title = this.seedTitleInput.value.trim();

    if (!doi && !title) {
      alert("Vui lòng nhập DOI hoặc Tiêu đề bài seed!");
      return;
    }

    try {
      this.setStatus(`Đang thêm bài seed (${doi || title})...`, "info");
      const res = await fetch(`${this.backendUrl}/api/scholar/add-seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doi,
          title,
          researchId: this.activeProfile.id,
          sessionId: this.currentSessionId || `session_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        // Fallback local creation if endpoint unavailable
        const newRecord: PaperRecord = {
          id: `seed_${Date.now()}`,
          title: title || `Bài seed (DOI: ${doi})`,
          doi: doi || "",
          source: "Seed DOI",
          discoverySource: "Seed Paper",
          url: doi ? `https://doi.org/${doi}` : "",
          suggestedDecision: "PassToFullText",
          screeningReason: "Bài tham chiếu hạt giống (Seed paper) được chỉ định thủ công.",
          retrieval_date: new Date().toISOString(),
        };
        this.allRecords.push(newRecord);
        this.uniqueRecords.push(newRecord);
      } else {
        const data = await res.json();
        if (data.record) {
          this.allRecords.push(data.record);
          this.uniqueRecords.push(data.record);
        }
      }

      await this.saveSessionToStorage();
      this.closeSeedModal();
      this.updateStepCounters();
      this.renderRecordsList();
      this.renderB1SourceBreakdown();
      this.setStatus(`✓ Đã thêm bài seed thành công vào danh sách B1!`, "success");
    } catch (err: any) {
      this.setStatus(`Lỗi khi thêm bài seed: ${err.message}`, "error");
    }
  }

  // ==========================================
  // STEP V1 — KIỂM TRA TRÙNG LẶP (DEDUPLICATION)
  // ==========================================

  private renderStepV1() {
    this.dedupRawCount.innerText = String(this.allRecords.length);
    this.dedupExactCount.innerText = String(this.dedupStats.exactDupByDoi || 0);
    this.dedupSuspectCount.innerText = String(this.suspectedDuplicatePairs.length);
    this.dedupUniqueCount.innerText = String(this.uniqueRecords.length);

    this.renderSuspectedDuplicatesSection();
  }

  private async handleRunDedupWorker() {
    if (this.allRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để kiểm tra trùng lặp.", "warning");
      return;
    }

    try {
      this.setStatus("Đang chạy thuật toán kiểm tra trùng lặp đa nguồn...", "info");
      const res = await fetch(`${this.backendUrl}/api/scholar/dedup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: this.allRecords,
          researchId: this.activeProfile.id,
          sessionId: this.currentSessionId,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      this.uniqueRecords = data.canonicalRecords || data.uniqueRecords || this.allRecords;
      this.dedupStats = data.dedupStats || this.dedupStats;

      // Extract suspect pairs
      this.identifySuspectDuplicatePairs();
      this.renderStepV1();
      this.renderRecordsList();
      await this.saveSessionToStorage();

      this.setStatus(
        `✓ Đã bỏ trùng: Giữ ${this.uniqueRecords.length} bài duy nhất. Tìm thấy ${this.suspectedDuplicatePairs.length} cặp nghi trùng cần xem xét.`,
        "success",
      );
    } catch (err: any) {
      this.setStatus(`Lỗi khi chạy kiểm tra trùng lặp: ${err.message}`, "error");
    }
  }

  private identifySuspectDuplicatePairs() {
    const pairs: SuspectedDuplicatePair[] = [];
    const processedIds = new Set<string>();

    for (const rec of this.uniqueRecords) {
      if (rec.potentialDuplicate && rec.duplicateOfId && !processedIds.has(rec.id)) {
        const canonical = this.uniqueRecords.find((r) => r.id === rec.duplicateOfId);
        if (canonical) {
          pairs.push({
            pairId: `pair_${canonical.id}_${rec.id}`,
            canonicalRecord: canonical,
            suspectRecord: rec,
            similarityScore: 0.92,
            reason: rec.duplicateReason || "Trùng tiêu đề nhưng khác DOI / Nguồn",
          });
          processedIds.add(rec.id);
        }
      }
    }
    this.suspectedDuplicatePairs = pairs;
  }

  private renderSuspectedDuplicatesSection() {
    if (!this.suspectDuplicatesContainer || !this.suspectPairsCounter) return;

    this.suspectPairsCounter.innerText = String(this.suspectedDuplicatePairs.length);

    if (this.suspectedDuplicatePairs.length === 0) {
      this.suspectDuplicatesContainer.innerHTML =
        '<div class="empty-state">✓ Không có cặp nghi trùng nào cần xử lý. Tất cả bản ghi đã được phân loại chuẩn xác.</div>';
      return;
    }

    this.suspectDuplicatesContainer.innerHTML = this.suspectedDuplicatePairs
      .map((pair, idx) => {
        const a = pair.canonicalRecord;
        const b = pair.suspectRecord;

        return `
        <div class="suspect-pair-card" id="suspect_pair_${pair.pairId}">
          <div class="suspect-pair-header">
            <span class="badge badge-yellow">Cặp Nghi Trùng #${idx + 1} (${Math.round(pair.similarityScore * 100)}% Khớp)</span>
            <span style="font-size: 11px; color: #64748b;">${this.escapeHtml(pair.reason)}</span>
          </div>
          <div class="suspect-side-by-side">
            <div class="suspect-item-col">
              <div class="col-title">Bản ghi A (Được ưu tiên giữ lại)</div>
              <div class="col-name">${this.escapeHtml(a.title)}</div>
              <div class="col-meta">
                <span>Nguồn: <b>${this.escapeHtml(a.source || "N/A")}</b></span> | 
                <span>Năm: <b>${a.year || "N/A"}</b></span> | 
                <span>DOI: <code>${a.doi || "Trống"}</code></span>
              </div>
            </div>
            <div class="suspect-item-col">
              <div class="col-title">Bản ghi B (Ứng viên trùng)</div>
              <div class="col-name">${this.escapeHtml(b.title)}</div>
              <div class="col-meta">
                <span>Nguồn: <b>${this.escapeHtml(b.source || "N/A")}</b></span> | 
                <span>Năm: <b>${b.year || "N/A"}</b></span> | 
                <span>DOI: <code>${b.doi || "Trống"}</code></span>
              </div>
            </div>
          </div>
          <div class="suspect-actions-bar">
            <button class="btn-xs btn-primary btn-merge-pair" data-idx="${idx}">🔗 Gộp bản ghi B vào A</button>
            <button class="btn-xs btn-secondary btn-keep-separate" data-idx="${idx}">⚖️ Giữ riêng biệt 2 bài</button>
            <button class="btn-xs btn-subtle btn-inspect-sources" data-idx="${idx}">👁️ Xem nguồn gốc</button>
          </div>
        </div>
      `;
      })
      .join("");

    this.attachSuspectPairListeners();
  }

  private attachSuspectPairListeners() {
    this.suspectDuplicatesContainer.querySelectorAll(".btn-merge-pair").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
        this.handleMergeSuspectPair(idx);
      });
    });

    this.suspectDuplicatesContainer.querySelectorAll(".btn-keep-separate").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
        this.handleKeepSeparatePair(idx);
      });
    });

    this.suspectDuplicatesContainer.querySelectorAll(".btn-inspect-sources").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx") || "0", 10);
        const pair = this.suspectedDuplicatePairs[idx];
        if (pair) {
          alert(
            `Bản ghi A: Nguồn ${pair.canonicalRecord.source || "N/A"} (DOI: ${pair.canonicalRecord.doi || "Trống"})\n` +
              `Bản ghi B: Nguồn ${pair.suspectRecord.source || "N/A"} (DOI: ${pair.suspectRecord.doi || "Trống"})\n` +
              `Lưu ý: Thao tác Gộp sẽ lưu trữ bản ghi B vào lịch sử provenance, không làm mất dữ liệu gốc.`,
          );
        }
      });
    });
  }

  private handleMergeSuspectPair(idx: number) {
    const pair = this.suspectedDuplicatePairs[idx];
    if (!pair) return;

    const canonical = pair.canonicalRecord;
    const suspect = pair.suspectRecord;

    // Track merge history
    this.mergeHistoryList.push({
      canonicalId: canonical.id,
      duplicateId: suspect.id,
      timestamp: new Date().toISOString(),
    });

    // Merge sources & provenance
    const allSources = new Set<string>();
    if (canonical.source) allSources.add(canonical.source);
    if (suspect.source) allSources.add(suspect.source);
    canonical.source = Array.from(allSources).join("; ");

    // Remove suspect from uniqueRecords (retains in allRecords)
    this.uniqueRecords = this.uniqueRecords.filter((r) => r.id !== suspect.id);
    this.suspectedDuplicatePairs.splice(idx, 1);

    this.renderStepV1();
    this.renderRecordsList();
    this.saveSessionToStorage();
    this.setStatus(`✓ Đã gộp bài "${suspect.title.slice(0, 30)}..." vào bản ghi chính.`, "success");
  }

  private handleKeepSeparatePair(idx: number) {
    const pair = this.suspectedDuplicatePairs[idx];
    if (!pair) return;

    // Unset potentialDuplicate so it's treated as independent
    pair.suspectRecord.potentialDuplicate = false;
    this.suspectedDuplicatePairs.splice(idx, 1);

    this.renderStepV1();
    this.renderRecordsList();
    this.saveSessionToStorage();
    this.setStatus(`✓ Đã xác nhận giữ riêng 2 bản ghi.`, "info");
  }

  private handleConfirmDedupAndProceedV2() {
    if (this.suspectedDuplicatePairs.length > 0) {
      if (
        !confirm(
          `Còn ${this.suspectedDuplicatePairs.length} cặp nghi trùng chưa duyệt. Bạn có muốn giữ riêng các cặp này và tiếp tục sang V2?`,
        )
      ) {
        return;
      }
      this.suspectedDuplicatePairs.forEach((p) => {
        p.suspectRecord.potentialDuplicate = false;
      });
      this.suspectedDuplicatePairs = [];
    }
    this.setWizardStep("V2");
  }

  // ==========================================
  // STEP V2 — SÀNG LỌC TIÊU ĐỀ & TÓM TẮT
  // ==========================================

  private renderStepV2() {
    const all = this.uniqueRecords.length;
    const unseen = this.uniqueRecords.filter((r) => !r.v2Decision && !r.finalDecision).length;
    const pass = this.uniqueRecords.filter((r) => r.v2Decision === "PassToFullText").length;
    const exc = this.uniqueRecords.filter((r) => r.v2Decision === "Exclude").length;
    const uns = this.uniqueRecords.filter((r) => r.v2Decision === "Unsure").length;

    if (this.v2CountAll) this.v2CountAll.innerText = String(all);
    if (this.v2CountUnseen) this.v2CountUnseen.innerText = String(unseen);
    if (this.v2CountPass) this.v2CountPass.innerText = String(pass);
    if (this.v2CountExclude) this.v2CountExclude.innerText = String(exc);
    if (this.v2CountUnsure) this.v2CountUnsure.innerText = String(uns);

    // Unsure Resolution box
    if (this.unsureResolutionBox && this.unsureRemainingCount) {
      if (uns > 0) {
        this.unsureResolutionBox.style.display = "block";
        this.unsureRemainingCount.innerText = String(uns);
      } else {
        this.unsureResolutionBox.style.display = "none";
      }
    }
  }

  private async handleAutoScreenBatch() {
    if (this.uniqueRecords.length === 0) {
      this.setStatus("Chưa có bài báo nào để sàng lọc.", "warning");
      return;
    }

    try {
      this.setStatus("⚡ Đang quét tự động tiêu đề & tóm tắt theo tiêu chí IC/EC...", "info");
      const res = await fetch(`${this.backendUrl}/api/scholar/screen-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: this.uniqueRecords,
          profile: this.activeProfile,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.records && Array.isArray(data.records)) {
        // Map suggested decisions safely WITHOUT modifying user's manual finalDecision
        data.records.forEach((scored: PaperRecord) => {
          const rec = this.uniqueRecords.find((r) => r.id === scored.id);
          if (rec) {
            rec.suggestedDecision = scored.suggestedDecision || rec.suggestedDecision;
            rec.screeningReason = scored.screeningReason || rec.screeningReason;
            rec.matchedCriteria = scored.matchedCriteria || rec.matchedCriteria;
            rec.unknownCriteria = scored.unknownCriteria || rec.unknownCriteria;
            rec.criterionResults = scored.criterionResults || rec.criterionResults;
          }
        });
        await this.saveSessionToStorage();
        this.renderStepV2();
        this.renderRecordsList();
        this.setStatus(
          `✓ Đã quét xong gợi ý cho ${data.records.length} bài. Hãy duyệt và bấm quyết định của bạn.`,
          "success",
        );
      }
    } catch (err: any) {
      this.setStatus(`Lỗi khi quét tự động: ${err.message}`, "error");
    }
  }

  private handleProceedToV3() {
    const unreviewed = this.uniqueRecords.filter((r) => !r.v2Decision && !r.finalDecision).length;
    if (unreviewed > 0) {
      if (!confirm(`Còn ${unreviewed} bài chưa có quyết định V2. Bạn có chắc chắn muốn sang V3?`)) {
        return;
      }
    }
    this.setWizardStep("V3");
  }

  private handlePassUnsureToV3() {
    const unsureRecords = this.uniqueRecords.filter((r) => r.v2Decision === "Unsure");
    unsureRecords.forEach((r) => {
      r.v2Decision = "PassToFullText";
      r.userNotes = (r.userNotes ? r.userNotes + " | " : "") + "[V2 Unsure ➔ Chuyển V3 kiểm tra toàn văn]";
    });
    this.saveSessionToStorage();
    this.renderStepV2();
    this.renderRecordsList();
    this.setStatus(`✓ Đã đưa ${unsureRecords.length} bài Chưa rõ (Unsure) sang V3 để tìm toàn văn.`, "info");
    this.setWizardStep("V3");
  }

  // ==========================================
  // STEP V3 — TÌM & THẨM ĐỊNH TOÀN VĂN
  // ==========================================

  private renderStepV3() {
    // V3 step UI updates
  }

  private async handleFindFullTextSelected() {
    // Candidates for full-text search: papers that passed V2
    const candidates = this.uniqueRecords.filter((r) => r.v2Decision === "PassToFullText" && !r.pdfUrl);

    if (candidates.length === 0) {
      this.setStatus("Tất cả các bài qua vòng V2 đã có toàn văn hoặc chưa có bài nào vượt qua V2.", "info");
      return;
    }

    try {
      this.setStatus(`Đang tìm kiếm toàn văn qua Unpaywall & Open Access cho ${candidates.length} bài...`, "info");

      for (const rec of candidates) {
        rec.fullTextStatus = "searching";
      }
      this.renderRecordsList();

      for (const rec of candidates) {
        if (!rec.doi) {
          rec.fullTextStatus = "not_found";
          continue;
        }

        try {
          const res = await fetch(`${this.backendUrl}/api/fulltext/unpaywall?doi=${encodeURIComponent(rec.doi)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.pdfUrl) {
              rec.pdfUrl = data.pdfUrl;
              rec.fullTextStatus = "finding";
              rec.page_count = data.pageCount || rec.page_count;
            } else {
              rec.fullTextStatus = "not_found";
            }
          } else {
            rec.fullTextStatus = "not_found";
          }
        } catch {
          rec.fullTextStatus = "network_error";
        }
      }

      await this.saveSessionToStorage();
      this.renderRecordsList();
      this.setStatus(`✓ Hoàn tất tìm toàn văn. Hãy kiểm tra các bài đã tải và tải thủ công nếu cần.`, "success");
    } catch (err: any) {
      this.setStatus(`Lỗi khi tìm toàn văn: ${err.message}`, "error");
    }
  }

  private async handleUploadPdfFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const targetRec = this.uniqueRecords.find((r) => r.id === this.selectedRecordId) || this.uniqueRecords[0];
    if (!targetRec) {
      alert("Vui lòng chọn bài báo cần gắn tệp PDF trước.");
      return;
    }

    try {
      this.setStatus(`Đang tải lên và trích xuất PDF "${file.name}" cho bài [#${targetRec.id.slice(-6)}]...`, "info");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("paperId", targetRec.id);
      formData.append("researchId", this.activeProfile.id);

      const res = await fetch(`${this.backendUrl}/api/scholar/upload-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      targetRec.pdfUrl = data.fileUrl || `local://${file.name}`;
      targetRec.fullTextStatus = "downloaded";
      targetRec.page_count = data.pageCount || targetRec.page_count;
      if (data.abstract && !targetRec.abstract) targetRec.abstract = data.abstract;

      await this.saveSessionToStorage();
      this.renderRecordsList();
      this.setStatus(`✓ Đã gắn PDF thành công cho bài báo!`, "success");
    } catch (err: any) {
      this.setStatus(`Lỗi khi tải PDF: ${err.message}`, "error");
    } finally {
      input.value = "";
    }
  }

  private async handleExtractActiveTab() {
    try {
      this.setStatus("Đang trích xuất dữ liệu từ tab trình duyệt đang mở...", "info");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error("Không tìm thấy tab đang kích hoạt.");
      }

      const res = await chrome.tabs.sendMessage(tab.id, { action: "ANALYZE_PAGE" });
      if (!res) {
        throw new Error("Không nhận được phản hồi từ trang web.");
      }

      this.pendingAnalysisResult = res;
      this.openTabExtractModal(res);
    } catch (err: any) {
      this.setStatus(`Lỗi trích xuất từ Tab: ${err.message}`, "error");
    }
  }

  private openTabExtractModal(result: TabAnalysisResult) {
    if (!this.tabExtractModal || !this.modalBody) return;
    this.tabExtractModal.style.display = "flex";

    this.modalBody.innerHTML = `
      <div><b>Tiêu đề:</b> ${this.escapeHtml(result.title)}</div>
      <div><b>URL:</b> <a href="${result.url}" target="_blank">${this.escapeHtml(result.url)}</a></div>
      <div><b>DOI:</b> <code>${this.escapeHtml(result.doi || "Không tìm thấy")}</code></div>
      <div><b>Tác giả:</b> ${this.escapeHtml(result.authors?.join(", ") || "N/A")}</div>
      <div><b>Abstract:</b> <pre style="font-size: 10px; max-height: 120px; overflow-y: auto;">${this.escapeHtml(result.abstract || "Không tìm thấy")}</pre></div>
    `;
  }

  private closeTabExtractModal() {
    if (this.tabExtractModal) this.tabExtractModal.style.display = "none";
    this.pendingAnalysisResult = null;
  }

  private async confirmTabAnalysis() {
    if (!this.pendingAnalysisResult) return;

    const targetRec = this.uniqueRecords.find((r) => r.id === this.selectedRecordId) || this.uniqueRecords[0];
    if (targetRec) {
      if (this.pendingAnalysisResult.abstract) targetRec.abstract = this.pendingAnalysisResult.abstract;
      if (this.pendingAnalysisResult.doi && !targetRec.doi) targetRec.doi = this.pendingAnalysisResult.doi;
      targetRec.extracted_url = this.pendingAnalysisResult.url;
      targetRec.user_verified = true;
      targetRec.extraction_method = "Browser Tab";

      await this.saveSessionToStorage();
      this.renderRecordsList();
      this.setStatus("✓ Đã cập nhật dữ liệu từ Tab và lưu nguồn gốc provenance!", "success");
    }

    this.closeTabExtractModal();
  }

  // ==========================================
  // STEP FINAL — CHỐT & XUẤT PRISMA 2020
  // ==========================================

  private renderStepFinal() {
    const finalIncludes = this.uniqueRecords.filter((r) => r.finalDecision === "Include");
    const eligibleCount = finalIncludes.filter(
      (r) => (r.page_count || 0) >= 4 && (r.pdfUrl || r.fullTextStatus === "downloaded"),
    ).length;
    const pendingCount = this.uniqueRecords.filter(
      (r) => !r.isContainer && (!r.finalDecision || (r.finalDecision as string) === "" || r.finalDecision === "Unsure"),
    ).length;
    const missingFullText = finalIncludes.filter((r) => !r.pdfUrl && r.fullTextStatus !== "downloaded").length;
    const missingEvidence = finalIncludes.filter(
      (r) => !r.evidence_snippets || r.evidence_snippets.length === 0,
    ).length;
    const outdatedCount = this.uniqueRecords.filter((r) => r.isDecisionOutdated).length;

    if (this.auditEligibleCount) this.auditEligibleCount.innerText = String(eligibleCount);
    if (this.auditPendingDecisionCount) this.auditPendingDecisionCount.innerText = String(pendingCount);
    if (this.auditMissingFullTextCount) this.auditMissingFullTextCount.innerText = String(missingFullText);
    if (this.auditMissingEvidenceCount) this.auditMissingEvidenceCount.innerText = String(missingEvidence);
    if (this.auditOutdatedCount) this.auditOutdatedCount.innerText = String(outdatedCount);

    if (this.prismaIntegrityStatusBox) {
      if (pendingCount > 0 || missingFullText > 0 || missingEvidence > 0 || outdatedCount > 0) {
        this.prismaIntegrityStatusBox.style.background = "#fffbeb";
        this.prismaIntegrityStatusBox.style.border = "1px solid #fef3c7";
        this.prismaIntegrityStatusBox.style.color = "#92400e";
        const issues: string[] = [];
        if (pendingCount > 0) issues.push(`Còn ${pendingCount} bài chưa có quyết định cuối (Pending/Unsure)`);
        if (missingFullText > 0) issues.push(`${missingFullText} bài thiếu toàn văn`);
        if (missingEvidence > 0) issues.push(`${missingEvidence} bài thiếu trích dẫn bằng chứng`);
        if (outdatedCount > 0) issues.push(`${outdatedCount} bài thuộc phiên bản protocol cũ`);
        this.prismaIntegrityStatusBox.innerHTML = `
          ⚠️ <b>CẢNH BÁO KIỂM TOÁN [INTERIM]:</b> ${issues.join("; ")}. Sơ đồ PRISMA và Evidence Table tạm thời mang nhãn [INTERIM].
        `;
      } else {
        this.prismaIntegrityStatusBox.style.background = "#f0fdf4";
        this.prismaIntegrityStatusBox.style.border = "1px solid #bbf7d0";
        this.prismaIntegrityStatusBox.style.color = "#166534";
        this.prismaIntegrityStatusBox.innerHTML = `
          ✓ <b>HOÀN HẢO [COMPLETE]:</b> Không còn bài chưa quyết định (${pendingCount}), toàn bộ các bài Final Included (${finalIncludes.length}) đều có đủ toàn văn, trích dẫn bằng chứng và thuộc phiên bản protocol hiện hành v${this.activeProfile.profileVersion}. Báo cáo đạt chuẩn [COMPLETE].
        `;
      }
    }
  }

  // ==========================================
  // PROTOCOL EDIT & DIFF MANAGEMENT
  // ==========================================

  private openProtocolEditModal() {
    if (!this.protocolEditModal) return;
    this.protocolEditModal.style.display = "flex";

    const p = this.activeProfile;
    if (this.protocolDiffContent) {
      this.protocolDiffContent.innerHTML = `
        <div style="line-height: 1.6;">
          <div><b>Phiên bản hiện tại:</b> v${p.profileVersion} (Đang áp dụng)</div>
          <div><b>Tên đề tài:</b> ${this.escapeHtml(p.name)}</div>
          <div><b>Khung năm:</b> ${p.yearRange?.start || 2020} - ${p.yearRange?.end || 2026}</div>
          <div><b>Số bài đã thẩm định:</b> ${this.uniqueRecords.filter((r) => r.finalDecision).length} bài</div>
        </div>
      `;
    }
  }

  private closeProtocolEditModal() {
    if (this.protocolEditModal) this.protocolEditModal.style.display = "none";
  }

  private async handleSaveProtocolChanges() {
    const reason = this.protocolChangeReason.value.trim();
    if (!reason) {
      alert("Vui lòng nhập Lý do thay đổi Protocol để ghi nhật ký audit!");
      this.protocolChangeReason.focus();
      return;
    }

    const isScope = this.chkIsScopeChange.checked;
    const oldVersion = this.activeProfile.profileVersion;
    const newVersion = oldVersion + 1;

    // Bump protocol version
    this.activeProfile.profileVersion = newVersion;
    this.activeProfile.updatedAt = new Date().toISOString();

    if (isScope) {
      // Mark all existing decided papers as outdated
      this.uniqueRecords.forEach((r) => {
        if (r.finalDecision || r.v2Decision) {
          r.isDecisionOutdated = true;
          r.outdatedReason = `Protocol thay đổi sang v${newVersion}: ${reason}`;
        }
      });
      this.setStatus(`⚠️ Đã cập nhật Protocol lên v${newVersion}. Các quyết định cũ cần đánh giá lại.`, "warning");
    } else {
      this.setStatus(`✓ Đã cập nhật Protocol lên v${newVersion} (Không ảnh hưởng tiêu chí).`, "success");
    }

    await this.saveProfileToBackend(this.activeProfile);
    await this.saveSessionToStorage();
    this.updateActiveResearchDisplay();
    this.updateStepCounters();
    this.renderRecordsList();
    this.closeProtocolEditModal();
  }

  // ==========================================
  // IN-TOOL STEP GUIDANCE MODAL
  // ==========================================

  private openStepGuideModal() {
    if (!this.stepGuideModal || !this.guideModalBody) return;
    this.stepGuideModal.style.display = "flex";

    const step = this.currentWizardStep;
    const cfg = STEP_CONFIGS[step];
    const guide = STEP_GUIDE_DATA[step];

    if (this.guideModalTitle) {
      this.guideModalTitle.innerText = `ℹ️ Hướng Dẫn: ${cfg?.badge} — ${cfg?.title}`;
    }

    this.guideModalBody.innerHTML = `
      <div class="guide-section">
        <div class="guide-q">1. Khi nào dùng bước này?</div>
        <div class="guide-a">${this.escapeHtml(guide.whenToUse)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">2. Cần chuẩn bị những gì?</div>
        <div class="guide-a">${this.escapeHtml(guide.preparation)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">3. Bấm các nút nào theo thứ tự?</div>
        <div class="guide-a">
          <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
            ${guide.orderOfButtons.map((btn) => `<li>${this.escapeHtml(btn)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div class="guide-section">
        <div class="guide-q">4. Kết quả mong đợi sau bước này là gì?</div>
        <div class="guide-a">${this.escapeHtml(guide.expectedOutput)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">5. Khi gặp lỗi hoặc gián đoạn thì xử lý ra sao?</div>
        <div class="guide-a">${this.escapeHtml(guide.troubleshooting)}</div>
      </div>

      <div class="guide-section">
        <div class="guide-q">6. Điều kiện để chuyển sang bước tiếp theo?</div>
        <div class="guide-a"><b>✓ ${this.escapeHtml(guide.proceedCondition)}</b></div>
      </div>

      ${TROUBLESHOOTING_TABLE_HTML}
    `;
  }

  private closeStepGuideModal() {
    if (this.stepGuideModal) this.stepGuideModal.style.display = "none";
  }

  // ==========================================
  // CARD DECISION BUTTONS & RENDERING
  // ==========================================

  private renderRecordsList() {
    const keyword = this.filterInput?.value.toLowerCase().trim() || "";
    const decisionFilter = this.filterDecisionSelect?.value || "all";
    const step = this.currentWizardStep;

    const filtered = this.uniqueRecords.filter((r) => {
      // Step V2 filter pill
      if (step === "V2" && this.v2CurrentFilter !== "all") {
        if (this.v2CurrentFilter === "unseen" && (r.v2Decision || r.finalDecision)) return false;
        if (this.v2CurrentFilter === "PassToFullText" && r.v2Decision !== "PassToFullText") return false;
        if (this.v2CurrentFilter === "Exclude" && r.v2Decision !== "Exclude") return false;
        if (this.v2CurrentFilter === "Unsure" && r.v2Decision !== "Unsure") return false;
      }

      // Dropdown filter
      const effectiveDecision = r.finalDecision || r.v2Decision || r.suggestedDecision;
      if (decisionFilter !== "all" && effectiveDecision !== decisionFilter) {
        return false;
      }

      if (keyword) {
        const text = `${r.title} ${r.authors} ${r.venue} ${r.year} ${r.doi} ${r.snippet} ${r.abstract}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      if (this.paginationBar) this.paginationBar.style.display = "none";
      this.resultsContainer.innerHTML =
        '<div class="empty-state">Không có bài viết nào khớp với bộ lọc hiện tại.</div>';
      return;
    }

    // Pagination calculations
    if (this.paginationBar) this.paginationBar.style.display = "flex";

    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, filtered.length);
    const pageRecords = filtered.slice(startIdx, endIdx);

    if (this.paginationInfo) {
      this.paginationInfo.innerText = `Hiển thị ${startIdx + 1}-${endIdx} của ${filtered.length} bài`;
    }
    if (this.pageIndicator) {
      this.pageIndicator.innerText = `${this.currentPage} / ${totalPages}`;
    }
    if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage <= 1;
    if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPage >= totalPages;

    this.resultsContainer.innerHTML = pageRecords
      .map((r, pageIdx) => {
        const globalIdx = startIdx + pageIdx;
        const isSelected = r.id === this.selectedRecordId;

        return this.renderPaperCardHtml(r, globalIdx, isSelected, step);
      })
      .join("");

    this.attachCardEventListeners();
  }

  private renderPaperCardHtml(r: PaperRecord, globalIdx: number, isSelected: boolean, step: WizardStep): string {
    const isOutdated = r.isDecisionOutdated;
    const outdatedWarning = isOutdated
      ? `<div class="warning-banner" style="margin-top: 4px; padding: 4px 6px; font-size: 10.5px;">
          ⚠️ Quyết định thuộc protocol cũ: ${this.escapeHtml(r.outdatedReason || "Cần đánh giá lại")}
        </div>`
      : "";

    // Full text status badge
    let fullTextBadge = "";
    if (r.pdfUrl) {
      fullTextBadge = `<span class="badge badge-green">📄 Đã tải PDF (${r.page_count ? r.page_count + " trang" : "sẵn sàng"})</span>`;
    } else if (r.fullTextStatus === "searching") {
      fullTextBadge = `<span class="badge badge-yellow">🔄 Đang tìm...</span>`;
    } else if (r.fullTextStatus === "not_found") {
      fullTextBadge = `<span class="badge badge-gray">❌ Chưa tìm thấy PDF</span>`;
    } else if (r.fullTextStatus === "network_error") {
      fullTextBadge = `<span class="badge badge-red">⚠️ Lỗi mạng (Thử lại)</span>`;
    }

    // Step-specific Decision Buttons
    let decisionControlsHtml = "";

    if (step === "V2") {
      // Step V2: 3 Decisions -> PassToFullText, Exclude, Unsure (NEVER "Include cuối cùng")
      const isPass = r.v2Decision === "PassToFullText";
      const isExc = r.v2Decision === "Exclude";
      const isUns = r.v2Decision === "Unsure";

      decisionControlsHtml = `
        <div class="decision-buttons" data-id="${r.id}">
          <span class="decision-label">Quyết định V2 (Tiêu đề & Tóm tắt):</span>
          <button class="btn-dec ${isPass ? "active-inc" : ""}" data-v2="PassToFullText">✓ Qua vòng toàn văn</button>
          <button class="btn-dec ${isExc ? "active-exc" : ""}" data-v2="Exclude">✗ Loại ở V2</button>
          <button class="btn-dec ${isUns ? "active-uns" : ""}" data-v2="Unsure">? Chưa rõ</button>
        </div>
      `;
    } else if (step === "V3" || step === "FINAL") {
      // Step V3 / FINAL: Full text eligibility -> Include, Exclude, Unsure
      const isInc = r.finalDecision === "Include";
      const isExc = r.finalDecision === "Exclude";
      const isUns = r.finalDecision === "Unsure";

      decisionControlsHtml = `
        <div class="decision-buttons" data-id="${r.id}">
          <span class="decision-label">Quyết định V3 (Thẩm định Toàn văn):</span>
          <button class="btn-dec ${isInc ? "active-inc" : ""}" data-final="Include">✓ Đạt tiêu chí toàn văn</button>
          <button class="btn-dec ${isExc ? "active-exc" : ""}" data-final="Exclude">✗ Loại ở V3</button>
          <button class="btn-dec ${isUns ? "active-uns" : ""}" data-final="Unsure">? Cần bổ sung bằng chứng</button>
        </div>
      `;
    }

    const abstractBox = r.abstract
      ? `<div class="paper-snippet" style="border-left-color: #2563eb; background: #eff6ff; margin-top: 4px;">
          <b>Abstract:</b><br><i>"${this.escapeHtml(r.abstract.slice(0, 280))}${r.abstract.length > 280 ? "..." : ""}"</i>
        </div>`
      : "";

    return `
      <div class="paper-card ${r.potentialDuplicate ? "paper-dup" : ""} ${isSelected ? "is-selected" : ""}" id="paper_${r.id}" data-id="${r.id}">
        <div class="paper-header">
          <div style="display: flex; align-items: flex-start; gap: 6px; flex: 1;">
            <span class="paper-index">#${globalIdx + 1}</span>
            <a href="${r.url || "#"}" target="_blank" class="paper-title">${this.escapeHtml(r.title)}</a>
            ${fullTextBadge}
          </div>
        </div>

        <div class="paper-meta">
          <span>👤 <b>Tác giả:</b> ${this.escapeHtml(r.authors || "N/A")}</span>
          <span>📅 <b>Năm:</b> ${r.year || "N/A"}</span>
          <span>🏛️ <b>Venue:</b> ${this.escapeHtml(r.venue || "N/A")}</span>
          <span>🔗 <b>DOI:</b> ${r.doi ? `<code>${r.doi}</code>` : '<span class="tag-warn">Trống</span>'}</span>
        </div>

        ${abstractBox}

        <div class="screening-panel">
          <div class="screening-header">
            <span><b>Gợi ý hệ thống:</b> <span class="badge ${r.suggestedDecision === "PassToFullText" || r.suggestedDecision === "Include" ? "badge-green" : r.suggestedDecision === "Exclude" ? "badge-red" : "badge-yellow"}">${r.suggestedDecision || "Chưa quét"}</span></span>
          </div>
          <div class="reason-text">${this.escapeHtml(r.screeningReason || "Chưa có lý do sàng lọc.")}</div>
          ${outdatedWarning}

          ${decisionControlsHtml}

          <div class="user-notes-row">
            <input type="text" class="notes-input" data-id="${r.id}" placeholder="Ghi chú thẩm định (nhập tự do, không thay đổi quyết định)..." value="${this.escapeHtml(r.userNotes || "")}" />
          </div>
        </div>
      </div>
    `;
  }

  private attachCardEventListeners() {
    // Select card on click
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

    // V2 Decision Buttons
    this.resultsContainer.querySelectorAll("[data-v2]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLButtonElement;
        const decision = target.getAttribute("data-v2") as "PassToFullText" | "Exclude" | "Unsure";
        const container = target.closest(".decision-buttons");
        const paperId = container?.getAttribute("data-id");
        if (paperId && decision) {
          this.handleV2Decision(paperId, decision);
        }
      });
    });

    // V3 / Final Decision Buttons
    this.resultsContainer.querySelectorAll("[data-final]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLButtonElement;
        const decision = target.getAttribute("data-final") as "Include" | "Exclude" | "Unsure";
        const container = target.closest(".decision-buttons");
        const paperId = container?.getAttribute("data-id");
        if (paperId && decision) {
          this.handleFinalDecision(paperId, decision);
        }
      });
    });

    // Notes Input Live Update (Safe note editing without clearing decisions)
    this.resultsContainer.querySelectorAll(".notes-input").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const target = e.currentTarget as HTMLInputElement;
        const paperId = target.getAttribute("data-id");
        if (paperId) {
          const rec = this.uniqueRecords.find((r) => r.id === paperId);
          if (rec) {
            rec.userNotes = target.value.trim();
            this.saveNoteToBackend(paperId, rec.userNotes);
          }
        }
      });
    });
  }

  private async handleV2Decision(paperId: string, decision: "PassToFullText" | "Exclude" | "Unsure") {
    const rec = this.uniqueRecords.find((r) => r.id === paperId);
    if (!rec) return;

    if (decision === "Exclude" && !rec.userNotes) {
      const reason = prompt("Nhập lý do loại trừ ở V2 (hoặc để trống):", "Tiêu đề / Tóm tắt không liên quan");
      if (reason) rec.userNotes = reason;
    }

    rec.v2Decision = decision;
    rec.isDecisionOutdated = false; // Mark up to date
    await this.updateRecordDecisionOnBackend(paperId, { v2Decision: decision, userNotes: rec.userNotes });
    await this.saveSessionToStorage();
    this.updateStepCounters();
    this.renderStepV2();
    this.renderRecordsList();
  }

  private async handleFinalDecision(paperId: string, decision: "Include" | "Exclude" | "Unsure") {
    const rec = this.uniqueRecords.find((r) => r.id === paperId);
    if (!rec) return;

    if (decision === "Include" && !rec.pdfUrl && rec.fullTextStatus !== "downloaded") {
      if (
        !confirm(
          "CẢNH BÁO: Bài này chưa có toàn văn (Full-Text PDF). Theo PRISMA 2020, chỉ nên chốt Include khi đã thẩm định toàn văn. Bạn có chắc muốn chốt Include?",
        )
      ) {
        return;
      }
    }

    if (decision === "Exclude" && !rec.userNotes) {
      const reason = prompt(
        "Nhập lý do loại trừ ở V3 (ví dụ: < 4 trang, thiếu thực nghiệm, v.v.):",
        "Dưới 4 trang / Không đạt tiêu chí toàn văn",
      );
      if (reason) rec.userNotes = reason;
    }

    rec.finalDecision = decision;
    rec.isDecisionOutdated = false; // Mark up to date
    await this.updateRecordDecisionOnBackend(paperId, { finalDecision: decision, userNotes: rec.userNotes });
    await this.saveSessionToStorage();
    this.updateStepCounters();
    this.renderStepV3();
    this.renderRecordsList();
  }

  private async saveNoteToBackend(paperId: string, notes: string) {
    try {
      const res = await fetch(`${this.backendUrl}/api/records/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchId: this.activeProfile.id, userNotes: notes }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      await this.saveSessionToStorage();
    } catch (err: any) {
      console.warn(`[Notes] Lưu ghi chú thất bại:`, err.message);
      this.setStatus(`⚠️ Không thể lưu ghi chú lên máy chủ: ${err.message}`, "warning");
    }
  }

  private async updateRecordDecisionOnBackend(paperId: string, updates: Partial<PaperRecord>) {
    try {
      const res = await fetch(`${this.backendUrl}/api/records/${paperId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchId: this.activeProfile.id, ...updates }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`[Decision] Cập nhật quyết định lên backend thất bại:`, err.message);
      this.setStatus(`⚠️ Không thể lưu quyết định lên máy chủ: ${err.message}`, "warning");
    }
  }

  // ==========================================
  // BACKGROUND JOB MANAGEMENT
  // ==========================================

  private async checkActiveBackgroundJob() {
    try {
      const res = await fetch(`${this.backendUrl}/api/jobs/active?researchId=${this.activeProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        const job = data.activeJob || data.job || data;
        if (job && job.id && (job.status === "running" || job.status === "paused")) {
          this.activeJobId = job.id;
          this.showJobBanner(job);
          this.startJobPolling(job.id);
        }
      }
    } catch {
      // ignore
    }
  }

  private showJobBanner(job: any) {
    if (!this.jobControlBanner) return;
    this.jobControlBanner.style.display = "block";
    if (this.jobStageBadge) this.jobStageBadge.innerText = `Job: ${job.stage}`;
    if (this.jobMessage) this.jobMessage.innerText = job.message || "Đang xử lý...";
    if (this.jobProgressBar) {
      const pct = job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0;
      this.jobProgressBar.style.width = `${pct}%`;
    }
    if (job.status === "paused") {
      if (this.jobPauseBtn) this.jobPauseBtn.style.display = "none";
      if (this.jobResumeBtn) this.jobResumeBtn.style.display = "inline-block";
    } else {
      if (this.jobPauseBtn) this.jobPauseBtn.style.display = "inline-block";
      if (this.jobResumeBtn) this.jobResumeBtn.style.display = "none";
    }
  }

  private startJobPolling(jobId: string) {
    if (this.jobPollInterval) clearInterval(this.jobPollInterval);
    this.jobPollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this.backendUrl}/api/jobs/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        const job = data.job || data;
        this.showJobBanner(job);

        if (job.status === "completed") {
          clearInterval(this.jobPollInterval);
          this.jobPollInterval = null;
          this.activeJobId = null;
          if (this.jobControlBanner) this.jobControlBanner.style.display = "none";
          this.setStatus(`✓ Tác vụ ${job.stage} đã hoàn thành xuất sắc!`, "success");
          await this.reloadStageData();
        } else if (job.status === "failed") {
          clearInterval(this.jobPollInterval);
          this.jobPollInterval = null;
          this.activeJobId = null;
          if (this.jobControlBanner) this.jobControlBanner.style.display = "none";
          this.setStatus(`❌ Tác vụ ${job.stage} thất bại: ${job.error || "Lỗi không xác định"}`, "error");
        } else if (job.status === "cancelled") {
          clearInterval(this.jobPollInterval);
          this.jobPollInterval = null;
          this.activeJobId = null;
          if (this.jobControlBanner) this.jobControlBanner.style.display = "none";
          this.setStatus(`Đã hủy tác vụ chạy nền ${job.stage}.`, "warning");
        }
      } catch (err) {
        console.warn("Polling job failed:", err);
      }
    }, 1200);
  }

  private async handlePauseJob() {
    if (!this.activeJobId) return;
    try {
      await fetch(`${this.backendUrl}/api/jobs/${this.activeJobId}/pause`, { method: "POST" });
      this.setStatus("Đã tạm dừng tác vụ.", "warning");
    } catch (e: any) {
      this.setStatus(`Lỗi khi tạm dừng: ${e.message}`, "error");
    }
  }

  private async handleResumeJob() {
    if (!this.activeJobId) return;
    try {
      await fetch(`${this.backendUrl}/api/jobs/${this.activeJobId}/resume`, { method: "POST" });
      this.setStatus("Đang tiếp tục tác vụ...", "info");
    } catch (e: any) {
      this.setStatus(`Lỗi khi tiếp tục: ${e.message}`, "error");
    }
  }

  private async handleCancelJob() {
    if (!this.activeJobId) return;
    if (!confirm("Bạn có chắc chắn muốn hủy tác vụ đang chạy?")) return;
    try {
      await fetch(`${this.backendUrl}/api/jobs/${this.activeJobId}/cancel`, { method: "POST" });
      this.setStatus("Đã gửi yêu cầu hủy tác vụ.", "warning");
    } catch (e: any) {
      this.setStatus(`Lỗi khi hủy: ${e.message}`, "error");
    }
  }

  private async reloadStageData() {
    try {
      const res = await fetch(
        `${this.backendUrl}/api/pipeline/stage-data?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`,
      );
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data.rawRecords) ? data.rawRecords : [];
        const canonical = Array.isArray(data.canonicalRecords)
          ? data.canonicalRecords
          : Array.isArray(data.records)
            ? data.records
            : [];
        if (raw.length > 0 || canonical.length > 0) {
          this.allRecords = raw.length > 0 ? raw : canonical;
          this.uniqueRecords = canonical.length > 0 ? canonical : raw;
          if (data.dedupStats) this.dedupStats = data.dedupStats;
          this.updateStepCounters();
          this.renderStepB1();
          this.renderRecordsList();
          await this.saveSessionToStorage();
        }
      }
    } catch (e) {
      console.warn("Reload stage data failed:", e);
    }
  }

  // ==========================================
  // PROFILE PERSISTENCE & MULTI-PROFILE
  // ==========================================

  private async loadProfilesAndRestoreActive() {
    try {
      const stored = await chrome.storage.local.get([STORAGE_PROFILES_KEY, STORAGE_ACTIVE_PROFILE_KEY]);
      let localProfiles: ResearchProfile[] = stored[STORAGE_PROFILES_KEY] || [];
      const activeId: string = stored[STORAGE_ACTIVE_PROFILE_KEY] || "";

      if (localProfiles.length === 0) {
        localProfiles = [PRESET_SWT302, PRESET_GENERIC, PRESET_VISUALLY_IMPAIRED_AAC];
        await chrome.storage.local.set({ [STORAGE_PROFILES_KEY]: localProfiles });
      }

      this.profiles = localProfiles;
      const found = this.profiles.find((p) => p.id === activeId) || this.profiles[0];
      this.activeProfile = found;

      this.populateProfileDropdown();
      this.updateActiveResearchDisplay();
      await this.restoreSessionForActiveProfile();
    } catch (err) {
      console.warn("Load profiles failed:", err);
    }
  }

  private populateProfileDropdown() {
    if (!this.profileSelect) return;
    this.profileSelect.innerHTML = this.profiles
      .map(
        (p) =>
          `<option value="${p.id}" ${p.id === this.activeProfile.id ? "selected" : ""}>${this.escapeHtml(p.name)} (v${p.profileVersion})</option>`,
      )
      .join("");
  }

  private async switchActiveProfile(profileId: string) {
    const p = this.profiles.find((x) => x.id === profileId);
    if (!p) return;

    this.activeProfile = p;
    await chrome.storage.local.set({ [STORAGE_ACTIVE_PROFILE_KEY]: profileId });
    this.updateActiveResearchDisplay();
    await this.restoreSessionForActiveProfile();
    this.setWizardStep(this.currentWizardStep);
    this.setStatus(`Đã chuyển sang đề tài: "${p.name}".`, "info");
  }

  private updateActiveResearchDisplay() {
    if (this.activeResearchBadge) this.activeResearchBadge.innerText = this.activeProfile.name;
    if (this.protocolVersionBadge) this.protocolVersionBadge.innerText = `v${this.activeProfile.profileVersion || 1.0}`;
  }

  private populateSetupForm(p: ResearchProfile) {
    if (this.setupResearchName) this.setupResearchName.value = p.name || "";
    if (this.setupResearchDesc) this.setupResearchDesc.value = p.description || "";
    if (this.setupResearchRq) this.setupResearchRq.value = (p.researchQuestions || []).join("\n");
    if (this.setupYearStart) this.setupYearStart.value = String(p.yearRange?.start || 2020);
    if (this.setupYearEnd) this.setupYearEnd.value = String(p.yearRange?.end || 2026);
    if (this.setupMinPages) this.setupMinPages.value = String(p.minPages?.count || 4);
    if (this.setupTargetCount) this.setupTargetCount.value = String(p.targetIncludedCount || 15);

    const incK = (p.criteria || [])
      .filter((c) => c.type === "inclusion" && c.field === "content")
      .map((c) => c.value)
      .join(", ");
    const excK = (p.criteria || [])
      .filter((c) => c.type === "exclusion" && c.field === "content")
      .map((c) => c.value)
      .join(", ");

    if (this.setupInclusionKeywords) this.setupInclusionKeywords.value = incK;
    if (this.setupExclusionKeywords) this.setupExclusionKeywords.value = excK;
  }

  private applyPreset(preset: ResearchProfile) {
    this.activeProfile = { ...preset, id: `profile_${Date.now()}` };
    this.populateSetupForm(this.activeProfile);
    this.switchFramework(this.activeProfile.framework || "PICO");
    this.updateStep0SummaryPreview();
    this.setStatus(`Đã áp dụng mẫu: "${preset.name}". Hãy kiểm tra và bấm "Lưu thiết lập".`, "info");
  }

  private async saveProfileToBackend(profile: ResearchProfile): Promise<boolean> {
    try {
      const res = await fetch(`${this.backendUrl}/api/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return true;
    } catch (err: any) {
      console.warn(`[Profile] Lưu profile lên backend thất bại:`, err.message);
      this.setStatus(`⚠️ Không thể lưu profile lên máy chủ: ${err.message}`, "warning");
      return false;
    }
  }

  private async saveProfilesToStorage() {
    const idx = this.profiles.findIndex((p) => p.id === this.activeProfile.id);
    if (idx >= 0) {
      this.profiles[idx] = this.activeProfile;
    } else {
      this.profiles.push(this.activeProfile);
    }
    await chrome.storage.local.set({
      [STORAGE_PROFILES_KEY]: this.profiles,
      [STORAGE_ACTIVE_PROFILE_KEY]: this.activeProfile.id,
    });
    this.populateProfileDropdown();
  }

  // ==========================================
  // SESSION PERSISTENCE & RESTORE
  // ==========================================

  private async saveSessionToStorage() {
    try {
      const stored = await chrome.storage.local.get(STORAGE_SESSIONS_KEY);
      const sessions = stored[STORAGE_SESSIONS_KEY] || {};

      sessions[this.activeProfile.id] = {
        sessionId: this.currentSessionId || `session_${Date.now()}`,
        researchId: this.activeProfile.id,
        profileVersion: this.activeProfile.profileVersion,
        allRecords: this.allRecords,
        uniqueRecords: this.uniqueRecords,
        dedupStats: this.dedupStats,
        searchSummary: this.searchSummary,
        allEvidences: this.allEvidences,
      };

      await chrome.storage.local.set({ [STORAGE_SESSIONS_KEY]: sessions });
    } catch (e) {
      console.warn("Save session failed:", e);
    }
  }

  private async restoreSessionForActiveProfile() {
    try {
      const stored = await chrome.storage.local.get(STORAGE_SESSIONS_KEY);
      const sessions = stored[STORAGE_SESSIONS_KEY] || {};
      const state = sessions[this.activeProfile.id];

      if (state) {
        this.currentSessionId = state.sessionId || "";
        this.allRecords = state.allRecords || [];
        this.uniqueRecords = state.uniqueRecords || [];
        this.dedupStats = state.dedupStats || this.dedupStats;
        this.searchSummary = state.searchSummary || null;
        this.allEvidences = state.allEvidences || [];
      } else {
        this.currentSessionId = `session_${Date.now()}`;
        this.allRecords = [];
        this.uniqueRecords = [];
        this.dedupStats = { initialCount: 0, exactDupByDoi: 0, potentialDupByTitle: 0, totalRetained: 0 };
      }
      this.identifySuspectDuplicatePairs();
    } catch (e) {
      console.warn("Restore session failed:", e);
    }
  }

  private async runStorageMigration() {
    try {
      const stored = await chrome.storage.local.get([MIGRATION_VERSION_KEY, LEGACY_STORAGE_KEY]);
      if (!stored[MIGRATION_VERSION_KEY] && stored[LEGACY_STORAGE_KEY]) {
        // Backup legacy
        await chrome.storage.local.set({
          [LEGACY_BACKUP_KEY]: stored[LEGACY_STORAGE_KEY],
          [MIGRATION_VERSION_KEY]: 3,
        });
      }
    } catch {
      // ignore
    }
  }

  private async checkBackendHealth() {
    try {
      const res = await fetch(`${this.backendUrl}/api/health`);
      if (res.ok) {
        if (this.backendStatusBadge) {
          this.backendStatusBadge.className = "badge badge-green";
          this.backendStatusBadge.innerText = "● Backend Sẵn sàng";
        }
      } else {
        throw new Error();
      }
    } catch {
      if (this.backendStatusBadge) {
        this.backendStatusBadge.className = "badge badge-yellow";
        this.backendStatusBadge.innerText = "● Backend Ngoại tuyến";
      }
    }
  }

  // ==========================================
  // EXPORTS & PRISMA MODAL
  // ==========================================

  private async openPrismaModal() {
    if (!this.prismaModal || !this.prismaFlowContainer) return;
    this.prismaModal.style.display = "flex";
    this.prismaFlowContainer.innerHTML =
      '<div style="text-align: center; padding: 20px;">Đang tính toán sơ đồ PRISMA 2020...</div>';

    try {
      const res = await fetch(
        `${this.backendUrl}/api/prisma/flow?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const flow = await res.json();

      let balanceWarning = "";
      if (!flow.isMathematicallyBalanced) {
        balanceWarning = `
          <div class="warning-banner" style="background: #fef2f2; border-color: #fca5a5; color: #991b1b; margin-bottom: 8px;">
            ⚠️ <b>CẢNH BÁO LỆCH SỐ HỌC:</b> Tổng Identification không khớp với (Bỏ trùng + Sàng lọc).
          </div>
        `;
      }

      this.prismaFlowContainer.innerHTML = `
        ${balanceWarning}
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="prisma-box header-box">
            <b>1. Identification (Nhận diện bản ghi)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>Cơ sở dữ liệu (Database searches):</span>
              <span class="prisma-stat-clickable" data-cell="identificationDatabases">${flow.identificationDatabases} bài</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>Nguồn khác / Snowballing:</span>
              <span class="prisma-stat-clickable" data-cell="identificationOther">${flow.identificationOther} bài</span>
            </div>
            <div style="border-top: 1px dashed #cbd5e1; margin-top: 4px; padding-top: 4px; font-weight: bold; display: flex; justify-content: space-between;">
              <span>Tổng nhận diện:</span>
              <span>${flow.totalIdentification} bài</span>
            </div>
          </div>

          <div class="prisma-box">
            <b>2. Deduplication (Loại trùng lặp - V1)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>Bản ghi trùng lặp đã loại bỏ:</span>
              <span class="prisma-stat-clickable" data-cell="duplicatesRemoved" style="color: #dc2626;">-${flow.duplicatesRemoved} bài</span>
            </div>
          </div>

          <div class="prisma-box">
            <b>3. Screening (Sàng lọc Tiêu đề & Tóm tắt - V2)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>Bản ghi đưa vào sàng lọc V2:</span>
              <span class="prisma-stat-clickable" data-cell="screenedV2">${flow.screenedV2} bài</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>Bị loại tại V2:</span>
              <span class="prisma-stat-clickable" data-cell="excludedV2" style="color: #dc2626;">-${flow.excludedV2} bài</span>
            </div>
          </div>

          <div class="prisma-box">
            <b>4. Eligibility (Thẩm định Toàn văn - V3)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px;">
              <span>Bản ghi tìm kiếm toàn văn:</span>
              <span class="prisma-stat-clickable" data-cell="soughtFullText">${flow.soughtFullText} bài</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>Bản ghi đọc và thẩm định toàn văn:</span>
              <span class="prisma-stat-clickable" data-cell="assessedFullText">${flow.assessedFullText} bài</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span>Bị loại tại V3 (Toàn văn không đạt / < 4 trang):</span>
              <span class="prisma-stat-clickable" data-cell="excludedV3" style="color: #dc2626;">-${flow.excludedV3} bài</span>
            </div>
          </div>

          <div class="prisma-box header-box" style="background: #f0fdf4; border-color: #86efac; color: #166534;">
            <b>5. Included (Nghiên cứu đưa vào Tổng quan - Chốt)</b>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px; font-weight: bold;">
              <span>Số nghiên cứu được chọn (Final Included):</span>
              <span class="prisma-stat-clickable" data-cell="includedTotal" style="color: #16a34a; font-size: 14px;">${flow.includedTotal} bài</span>
            </div>
          </div>
        </div>
      `;

      this.prismaFlowContainer.querySelectorAll(".prisma-stat-clickable").forEach((el) => {
        el.addEventListener("click", () => {
          const cellKey = el.getAttribute("data-cell");
          if (cellKey && flow.drilldown && flow.drilldown[cellKey]) {
            this.showPrismaDrilldown(flow.drilldown[cellKey]);
          }
        });
      });
    } catch (e: any) {
      this.prismaFlowContainer.innerHTML = `<div class="error-banner">Lỗi tải sơ đồ PRISMA: ${e.message}</div>`;
    }
  }

  private showPrismaDrilldown(cellData: { cellName: string; count: number; paperIds: string[] }) {
    if (!this.prismaDrilldownBox || !this.drilldownPaperList) return;
    this.prismaDrilldownBox.style.display = "block";
    if (this.drilldownTitle) {
      this.drilldownTitle.innerText = `Danh sách: ${cellData.cellName} (${cellData.count} bài)`;
    }

    if (cellData.paperIds.length === 0) {
      this.drilldownPaperList.innerHTML =
        '<div style="color: #94a3b8; font-style: italic;">Không có bài báo nào trong mục này.</div>';
      return;
    }

    const items = cellData.paperIds.map((id) => {
      const p = this.uniqueRecords.find((r) => r.id === id) || this.allRecords.find((r) => r.id === id);
      const title = p ? p.title : id;
      return `<li style="margin-bottom: 4px;"><b>${this.escapeHtml(id)}</b>: ${this.escapeHtml(title)}</li>`;
    });

    this.drilldownPaperList.innerHTML = `<ul style="padding-left: 18px;">${items.join("")}</ul>`;
  }

  private closePrismaModal() {
    if (this.prismaModal) this.prismaModal.style.display = "none";
    if (this.prismaDrilldownBox) this.prismaDrilldownBox.style.display = "none";
  }

  private async handleExportCsv() {
    if (this.allRecords.length === 0) {
      this.setStatus("Chưa có bản ghi nào để xuất.", "warning");
      return;
    }
    const headers = ["id", "source", "title", "authors", "year", "venue", "doi", "url", "retrieval_date"];
    let csv = "\uFEFF" + headers.join(",") + "\r\n";
    this.allRecords.forEach((r) => {
      csv +=
        [
          this.escapeCsv(r.id),
          this.escapeCsv(r.source),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.url),
          this.escapeCsv(r.retrieval_date),
        ].join(",") + "\r\n";
    });
    this.downloadFile(csv, "01_all_records.csv", "text/csv;charset=utf-8;");
    this.setStatus("✓ Đã tải 01_all_records.csv thành công!", "success");
  }

  private async handleExportDedupLog() {
    try {
      const res = await fetch(
        `${this.backendUrl}/api/export/duplicates?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`,
      );
      if (!res.ok) throw new Error();
      const text = await res.text();
      this.downloadFile(text, "01_duplicate_log.csv", "text/csv;charset=utf-8;");
      this.setStatus("✓ Đã tải 01_duplicate_log.csv thành công!", "success");
    } catch {
      this.setStatus("Không thể tải duplicate log từ backend.", "error");
    }
  }

  private async handleExportFullCsv() {
    const headers = [
      "id",
      "source",
      "title",
      "authors",
      "year",
      "venue",
      "doi",
      "v2Decision",
      "finalDecision",
      "userNotes",
      "retrieval_date",
    ];
    let csv = "\uFEFF" + headers.join(",") + "\r\n";
    this.uniqueRecords.forEach((r) => {
      csv +=
        [
          this.escapeCsv(r.id),
          this.escapeCsv(r.source),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.v2Decision || ""),
          this.escapeCsv(r.finalDecision || ""),
          this.escapeCsv(r.userNotes || ""),
          this.escapeCsv(r.retrieval_date),
        ].join(",") + "\r\n";
    });
    this.downloadFile(csv, "02_screening_decisions_full.csv", "text/csv;charset=utf-8;");
    this.setStatus("✓ Đã tải 02_screening_decisions_full.csv thành công!", "success");
  }

  private async handleExportIncludedCsv() {
    const includes = this.uniqueRecords.filter((r) => r.finalDecision === "Include");
    if (includes.length === 0) {
      alert("Chưa có bài nào được chốt Final Include.");
      return;
    }
    const headers = ["id", "title", "authors", "year", "venue", "doi", "pageCount", "userNotes"];
    let csv = "\uFEFF" + headers.join(",") + "\r\n";
    includes.forEach((r) => {
      csv +=
        [
          this.escapeCsv(r.id),
          this.escapeCsv(r.title),
          this.escapeCsv(r.authors),
          this.escapeCsv(r.year),
          this.escapeCsv(r.venue),
          this.escapeCsv(r.doi),
          this.escapeCsv(r.page_count || ""),
          this.escapeCsv(r.userNotes || ""),
        ].join(",") + "\r\n";
    });
    this.downloadFile(csv, "03_final_included.csv", "text/csv;charset=utf-8;");
    this.setStatus("✓ Đã tải 03_final_included.csv thành công!", "success");
  }

  private async handleExportPrismaMarkdown() {
    try {
      const res = await fetch(
        `${this.backendUrl}/api/prisma/export-md?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`,
      );
      if (!res.ok) throw new Error();
      const text = await res.text();
      this.downloadFile(text, "prisma-flow.md", "text/markdown;charset=utf-8;");
      this.setStatus("✓ Đã tải prisma-flow.md thành công!", "success");
    } catch {
      this.setStatus("Không thể tải PRISMA Markdown.", "error");
    }
  }

  private async handleExportEvidenceTable() {
    try {
      const res = await fetch(
        `${this.backendUrl}/api/evidence-table/export-md?researchId=${this.activeProfile.id}&sessionId=${this.currentSessionId}`,
      );
      if (!res.ok) throw new Error();
      const text = await res.text();
      this.downloadFile(text, "evidence-table.md", "text/markdown;charset=utf-8;");
      this.setStatus("✓ Đã tải evidence-table.md thành công!", "success");
    } catch {
      this.setStatus("Không thể tải evidence-table.md.", "error");
    }
  }

  private async handleExportApa7() {
    try {
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
        if (data.textContent) {
          this.downloadFile(data.textContent, "03_references_apa7.txt", "text/plain;charset=utf-8;");
          this.setStatus("✓ Đã tải 03_references_apa7.txt thành công!", "success");
          return;
        }
      }
    } catch {
      // ignore
    }
  }

  private async handleSaveLog() {
    try {
      const res = await fetch(`${this.backendUrl}/api/scholar/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: this.queryInput?.value.trim() || this.activeProfile.name,
          profile: this.activeProfile,
          recordsCount: this.uniqueRecords.length,
          sessionId: this.currentSessionId,
        }),
      });
      if (res.ok) {
        this.setStatus("✓ Đã ghi nhật ký vào search-log.md thành công!", "success");
      }
    } catch (e: any) {
      this.setStatus(`Lỗi ghi nhật ký: ${e.message}`, "error");
    }
  }

  private async handleExportSessionJson() {
    const backupData = {
      profile: this.activeProfile,
      sessionId: this.currentSessionId,
      allRecords: this.allRecords,
      uniqueRecords: this.uniqueRecords,
      dedupStats: this.dedupStats,
      mergeHistory: this.mergeHistoryList,
      exportedAt: new Date().toISOString(),
      version: "3.0.0",
    };
    this.downloadFile(JSON.stringify(backupData, null, 2), "session_backup.json", "application/json;charset=utf-8;");
    this.setStatus("✓ Đã tải bản sao lưu session_backup.json thành công!", "success");
  }

  private async handleImportBackupFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
      this.setStatus(`Đang đọc tệp sao lưu "${file.name}"...`, "info");
      const text = await file.text();
      const backup = JSON.parse(text);

      if (backup.profile) {
        this.activeProfile = backup.profile;
        await this.saveProfileToBackend(this.activeProfile);
        await this.saveProfilesToStorage();
      }
      if (backup.allRecords && Array.isArray(backup.allRecords)) {
        this.allRecords = backup.allRecords;
      }
      if (backup.uniqueRecords && Array.isArray(backup.uniqueRecords)) {
        this.uniqueRecords = backup.uniqueRecords;
      }
      if (backup.dedupStats) {
        this.dedupStats = backup.dedupStats;
      }

      await this.saveSessionToStorage();
      this.updateActiveResearchDisplay();
      this.setWizardStep("B1");
      this.setStatus(`✓ Đã khôi phục thành công từ bản sao lưu "${file.name}"!`, "success");
    } catch (e: any) {
      this.setStatus(`Lỗi khi nhập bản sao lưu: ${e.message}`, "error");
    } finally {
      input.value = "";
    }
  }

  private async handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    try {
      this.setStatus(`Đang nhập tệp "${file.name}"...`, "info");
      const text = await file.text();
      const res = await fetch(`${this.backendUrl}/api/pipeline/import-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          content: text,
          researchId: this.activeProfile.id,
          sessionId: this.currentSessionId || `session_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const importedRecords =
        data.records && Array.isArray(data.records)
          ? data.records
          : data.preview?.validRecords && Array.isArray(data.preview.validRecords)
            ? data.preview.validRecords
            : [];

      if (importedRecords.length > 0) {
        this.allRecords = [...this.allRecords, ...importedRecords];
        this.uniqueRecords = [...this.uniqueRecords, ...importedRecords];
        await this.saveSessionToStorage();
        this.updateStepCounters();
        this.renderStepB1();
        this.renderRecordsList();
        this.setStatus(`✓ Đã nhập thành công ${importedRecords.length} bài từ "${file.name}"!`, "success");
      } else {
        this.setStatus(`Không tìm thấy bản ghi hợp lệ nào trong tệp "${file.name}".`, "warning");
      }
    } catch (e: any) {
      this.setStatus(`Lỗi khi nhập tệp: ${e.message}`, "error");
    } finally {
      input.value = "";
    }
  }

  private async handleSnowballingPrompt() {
    const selectedRec = this.uniqueRecords.find((r) => r.id === this.selectedRecordId);
    const defaultDoi = selectedRec?.doi || "";
    const seedDoi = prompt("Nhập DOI bài báo hạt giống để Snowballing:", defaultDoi);
    if (!seedDoi || !seedDoi.trim()) return;

    const direction = prompt("Hướng Snowballing: 'backward' (References) hoặc 'forward' (Citations):", "backward");
    const ep = direction === "forward" ? "forward" : "backward";

    try {
      this.setStatus(`Đang chạy Snowballing ${ep} cho DOI: ${seedDoi}...`, "info");
      const res = await fetch(`${this.backendUrl}/api/snowball/${ep}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedDoi: seedDoi.trim(),
          seedTitle: selectedRec?.title || "",
          researchId: this.activeProfile.id,
          sessionId: this.currentSessionId || `session_${Date.now()}`,
          maxRecords: 25,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.records && Array.isArray(data.records)) {
        this.allRecords = [...this.allRecords, ...data.records];
        this.uniqueRecords = [...this.uniqueRecords, ...data.records];
        await this.saveSessionToStorage();
        this.updateStepCounters();
        this.renderStepB1();
        this.renderRecordsList();
        this.setStatus(`✓ Snowballing tìm thấy thêm ${data.records.length} bài mới!`, "success");
      }
    } catch (e: any) {
      this.setStatus(`Lỗi Snowballing: ${e.message}`, "error");
    }
  }

  // ==========================================
  // UTILITIES & SANITIZATION
  // ==========================================

  private escapeCsv(str: unknown): string {
    if (str === null || str === undefined) return '""';
    let s = String(str);
    if (/^[\=\+\-\@\t\r]/.test(s)) {
      s = `'${s}`;
    }
    return `"${s.replace(/"/g, '""')}"`;
  }

  private escapeHtml(text?: unknown): string {
    if (text === null || text === undefined) return "";
    const str = typeof text === "string" ? text : String(text);
    return str
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
    if (!this.statusDiv) return;
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
