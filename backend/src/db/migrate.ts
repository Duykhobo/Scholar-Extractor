import fs from "fs";
import path from "path";
import { getDbPool } from "./connection";

/**
 * Chay migrations khoi tao bang tren SQL Server
 */
export async function runMigrations(): Promise<boolean> {
  const pool = await getDbPool();
  if (!pool) {
    return false;
  }

  try {
    const migrationPath = path.resolve(__dirname, "./migrations/001_init.sql");
    if (!fs.existsSync(migrationPath)) {
      console.warn("[DB] Khong tim thay file migration:", migrationPath);
      return false;
    }

    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    // Tách các lệnh bằng batch hoặc chạy trực tiếp
    const request = pool.request();
    await request.query(sqlContent);
    console.log("[DB] Da chay thanh cong schema migration tren SQL Server.");
    return true;
  } catch (err: any) {
    console.error("[DB] Loi khi chay schema migration:", err.message);
    return false;
  }
}
