import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { getDbPool } from "./connection";
import { DbRepository } from "./repository";

export async function resetDatabase(): Promise<boolean> {
  console.log("=========================================");
  console.log("   BẮT ĐẦU RESET TOÀN BỘ CƠ SỞ DỮ LIỆU   ");
  console.log("=========================================");

  // 1. Reset SQL Server nếu đang kết nối
  const pool = await getDbPool();
  if (pool) {
    try {
      console.log("[DB] Đang xóa dữ liệu trong các bảng SQL Server...");

      const tablesToClear = [
        "PaperEvidence",
        "ScreeningCriterionResults",
        "ResearchPaperLinks",
        "ResearchSessions",
        "BackgroundJobs",
        "SourceProvenances",
        "DuplicateGroups",
        "PipelineSnapshots",
        "SnowballSeeds",
        "FullTextReports",
        "Papers",
        "ResearchProfiles",
      ];

      for (const table of tablesToClear) {
        try {
          const req = pool.request();
          await req.query(`IF OBJECT_ID('dbo.${table}', 'U') IS NOT NULL DELETE FROM dbo.${table};`);
          console.log(`[DB] ✓ Đã xóa sạch dữ liệu bảng: ${table}`);
        } catch (tblErr: any) {
          console.warn(`[DB] Cảnh báo khi xóa bảng ${table}:`, tblErr.message);
        }
      }

      // Re-seed default builtin profiles
      console.log("[DB] Đang nạp lại 3 hồ sơ nghiên cứu mẫu (Builtin Presets)...");
      const seeded = await DbRepository.seedBuiltinProfiles();
      console.log(`[DB] ✓ Đã nạp thành công ${seeded} hồ sơ mẫu sạch vào SQL Server.`);
    } catch (err: any) {
      console.error("[DB] Lỗi khi reset SQL Server:", err.message);
    }
  } else {
    console.log("[DB] SQL Server không kết nối được. Chạy chế độ làm sạch tệp.");
  }

  // 2. Xóa các tệp snapshot cục bộ trong backend/data/snapshots/
  try {
    const snapshotsDir = path.resolve(__dirname, "../../data/snapshots");
    if (fs.existsSync(snapshotsDir)) {
      const files = fs.readdirSync(snapshotsDir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(snapshotsDir, file);
          fs.unlinkSync(filePath);
          console.log(`[Snapshot] ✓ Đã xóa tệp snapshot: ${file}`);
        }
      }
    }
    console.log("[Snapshot] ✓ Thư mục data/snapshots/ đã được làm sạch hoàn toàn.");
  } catch (snapErr: any) {
    console.warn("[Snapshot] Cảnh báo khi xóa snapshot:", snapErr.message);
  }

  console.log("=========================================");
  console.log("   ✓ RESET CƠ SỞ DỮ LIỆU HOÀN TẤT 100%   ");
  console.log("=========================================");
  return true;
}

// Chạy trực tiếp nếu file được gọi từ CLI
if (require.main === module) {
  resetDatabase().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error("Lỗi:", err);
    process.exit(1);
  });
}
