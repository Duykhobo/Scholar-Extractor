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
    const migrationsDir = path.resolve(__dirname, "./migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.warn("[DB] Khong tim thay thu muc migrations:", migrationsDir);
      return false;
    }

    const sqlFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const sqlFile of sqlFiles) {
      const filePath = path.join(migrationsDir, sqlFile);
      const sqlContent = fs.readFileSync(filePath, "utf-8");
      const request = pool.request();
      await request.query(sqlContent);
      console.log(`[DB] Da chay thanh cong migration: ${sqlFile}`);
    }

    return true;
  } catch (err: any) {
    console.error("[DB] Loi khi chay schema migration:", err.message);
    return false;
  }
}
