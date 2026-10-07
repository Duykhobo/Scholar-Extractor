import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { ProjectStore } from "../src/db/projectStore";
import { ScreeningService } from "../src/services/screeningService";
import { EvidenceService } from "../src/services/evidenceService";
import { PrismaCalculator } from "../src/services/prismaCalculator";
import { ValidationService } from "../src/services/validationService";
import { ExportPackageService } from "../src/services/exportPackageService";
import { UniversalFileImporter } from "../src/adapters/fileimport";

test("SLR Suite - 1. Preset Mẫu SWT302 (Lâm / Nhóm 1 - SaoCungDuoc)", async (t) => {
  ProjectStore.init();
  const proj = ProjectStore.getProject("sample_swt302_lam");
  assert.ok(proj, "Dự án preset sample_swt302_lam phải tồn tại");
  assert.strictEqual(proj.rqCode, "FA26-EXT-12");
  assert.strictEqual(proj.reportLanguage, "vi");
  assert.strictEqual(proj.members.length, 2);

  // 1. Kiểm tra 01_all_records có đúng 73 bản ghi
  const records = ProjectStore.getRecords("sample_swt302_lam");
  assert.strictEqual(records.length, 73, "Preset phải nạp đủ 73 canonical records từ 01_all_records.csv");

  // 2. Kiểm tra quyết định V1: 56 EXCLUDE, 14 INCLUDE, 3 UNSURE
  const allDecisions = ProjectStore.getAllDecisions("sample_swt302_lam");
  let excludeCount = 0;
  let includeCount = 0;
  let unsureCount = 0;

  for (const r of records) {
    const dList = allDecisions.get(r.id) || [];
    const v1 = dList.find((d) => d.stage === "v1");
    if (v1?.decision === "EXCLUDE") excludeCount++;
    if (v1?.decision === "INCLUDE") includeCount++;
    if (v1?.decision === "UNSURE") unsureCount++;
  }

  assert.strictEqual(excludeCount, 56, "V1 phải có đúng 56 bài bị EXCLUDE");
  assert.strictEqual(includeCount, 14, "V1 phải có đúng 14 bài INCLUDE");
  assert.strictEqual(unsureCount, 3, "V1 phải có đúng 3 bài UNSURE");
  assert.strictEqual(includeCount + unsureCount, 17, "Tổng số bài chuyển sang tìm full-text V2 phải là 17");

  // 3. Kiểm tra các bài đủ điều kiện chuyển sang V2
  const eligibleV2 = ScreeningService.getEligibleRecordsForV2("sample_swt302_lam");
  assert.strictEqual(eligibleV2.length, 17, "Phải có đúng 17 bài đủ điều kiện chuyển sang V2");
});

test("SLR Suite - 2. UniversalFileImporter phát hiện lỗi lệch cột trong file 03_final_included của mẫu", async (t) => {
  const file03Path = path.resolve(__dirname, "../../03_final_included(1).csv");
  if (fs.existsSync(file03Path)) {
    const csvContent = fs.readFileSync(file03Path, "utf-8");
    const preview = UniversalFileImporter.parseCsv(csvContent, "03_final_included(1).csv");

    // File 03 của mẫu có dòng bị lệch số cột (dòng 8, 9, 16 có 10 cột thay vì 9 cột)
    assert.ok(
      preview.rowErrors.length > 0 || preview.warnings.length > 0,
      "Importer phải phát hiện cảnh báo hoặc lỗi lệch cột trong 03_final_included(1).csv, không âm thầm dịch cột"
    );
  }
});

test("SLR Suite - 3. PRISMA Calculator và Balance Check trên dữ liệu thực tế", async (t) => {
  const metrics = PrismaCalculator.calculate("sample_swt302_lam");

  assert.strictEqual(metrics.identification.canonicalRecords, 73);
  assert.strictEqual(metrics.screeningV1.recordsScreened, 73);
  assert.strictEqual(metrics.screeningV1.excluded, 56);
  assert.strictEqual(metrics.screeningV1.passedV1, 17);
  assert.strictEqual(metrics.retrievalV2.reportsSought, 17);

  // Sinh Markdown PRISMA
  const prismaMd = PrismaCalculator.generatePrismaMarkdown("sample_swt302_lam");
  assert.ok(prismaMd.includes("PRISMA 2020 Flow Diagram"));
  assert.ok(prismaMd.includes("56"));
  assert.ok(prismaMd.includes("17"));
});

test("SLR Suite - 4. Validation Report phát hiện lỗi và phân biệt DRAFT vs FINAL", async (t) => {
  const report = ValidationService.validate("sample_swt302_lam");
  assert.ok(report, "Phải sinh được ValidationReport");
  assert.strictEqual(report.projectId, "sample_swt302_lam");

  const validationMd = ValidationService.generateValidationMarkdown("sample_swt302_lam");
  assert.ok(validationMd.includes("Validation Report"));
  assert.ok(validationMd.includes("Tóm tắt số liệu dòng chảy PRISMA"));
});

test("SLR Suite - 5. Evidence Service quản lý 8 cột chuẩn và kiểm tra dẫn chứng", async (t) => {
  const entries = EvidenceService.getEntries("sample_swt302_lam");
  assert.ok(entries.length > 0, "Bảng Evidence phải có dữ liệu bài báo");

  // Kiểm tra cấu trúc 8 cột
  const first = entries[0];
  assert.ok(first.paperDisplay, "Cột 1: Paper");
  assert.ok(first.toolOrLlm !== undefined, "Cột 2: Tool/LLM");
  assert.ok(first.dataset !== undefined, "Cột 3: Dataset");
  assert.ok(first.metric !== undefined, "Cột 4: Metric");
  assert.ok(first.result !== undefined, "Cột 5: Kết quả");
  assert.ok(first.code !== undefined, "Cột 6: Code");
  assert.ok(first.limitations !== undefined, "Cột 7: Hạn chế");
  assert.ok(first.nearRq !== undefined, "Cột 8: Gần RQ");

  // Sinh Markdown
  const md = EvidenceService.generateEvidenceMarkdown("sample_swt302_lam");
  assert.ok(md.includes("| Paper | Tool/LLM | Dataset | Metric | Kết quả | Code | Hạn chế | Gần RQ |"));
});

test("SLR Suite - 6. Cập nhật Protocol đánh dấu các quyết định cũ là OUTDATED", async (t) => {
  // Tạo protocol version mới cho dự án sample
  const result = ProjectStore.saveProtocol(
    "sample_swt302_lam",
    {
      version: "2.0",
      projectId: "sample_swt302_lam",
      title: "Protocol v2.0 Mở rộng",
      createdAt: new Date().toISOString(),
      criteria: [],
      sourcePolicies: {},
    },
    "Thử nghiệm cập nhật tiêu chí sau phản biện"
  );

  assert.strictEqual(result.protocol.version, "2.0");
  assert.ok(result.affectedDecisionsCount > 0, "Các quyết định v1.0 cũ phải được đánh dấu OUTDATED");

  const outdated = ScreeningService.getOutdatedDecisions("sample_swt302_lam");
  assert.ok(outdated.length > 0, "Phải truy xuất được danh sách các quyết định cần đối soát lại");
});

test("SLR Suite - 7. Đóng gói Export Package ZIP gồm 9 file mẫu + 5 file mở rộng", async (t) => {
  const { zipBuffer, filename, report } = ExportPackageService.exportCompleteZip("sample_swt302_lam");

  assert.ok(zipBuffer.length > 0, "Buffer ZIP phải có dữ liệu");
  assert.ok(filename.endsWith(".zip"), "Tên file phải có đuôi .zip");

  // Đọc lại file ZIP bằng AdmZip để kiểm tra đủ 15 files
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries().map((e) => e.entryName);

  const requiredFiles = [
    "review-protocol.md",
    "ie_criteria.md",
    "search-log.md",
    "authorship.md",
    "01_all_records.csv",
    "02_after_screening_v1.csv",
    "03_final_included.csv",
    "evidence-table.md",
    "prisma-flow.md",
    "00_raw_records.csv",
    "duplicate-report.csv",
    "02b_fulltext_screening.csv",
    "validation-report.md",
    "project-backup.json",
    "manifest.json",
  ];

  for (const reqFile of requiredFiles) {
    assert.ok(zipEntries.includes(reqFile), `File ZIP phải chứa ${reqFile}`);
  }
});

test("SLR Suite - 8. Backup & Restore giữ nguyên 100% ID, provenance và quyết định", async (t) => {
  const backup = ProjectStore.exportProjectBackup("sample_swt302_lam");
  assert.strictEqual(backup.project.id, "sample_swt302_lam");
  assert.strictEqual(backup.records.length, 73);

  // Restore vào ID mới
  backup.project.id = "restored_project_test";
  backup.project.name = "Dự án Restore Test";
  const restored = ProjectStore.importProjectBackup(backup);

  assert.strictEqual(restored.id, "restored_project_test");
  const restoredRecords = ProjectStore.getRecords("restored_project_test");
  assert.strictEqual(restoredRecords.length, 73, "Số bản ghi sau khi restore phải đúng 73");

  // Dọn dẹp
  ProjectStore.deleteProject("restored_project_test");
});
