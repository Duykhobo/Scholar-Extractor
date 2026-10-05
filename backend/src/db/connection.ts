import sql from "mssql";

export interface DbConfig {
  server: string;
  port: number;
  database: string;
  user?: string;
  password?: string;
  connectionString?: string;
  trustServerCertificate: boolean;
}

let pool: sql.ConnectionPool | null = null;
let isConnected = false;
let connectionAttempted = false;

export function getDbConfig(): DbConfig {
  return {
    server: process.env.DB_SERVER || "localhost",
    port: parseInt(process.env.DB_PORT || "1433", 10),
    database: process.env.DB_NAME || "ScholarExtractorDB",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionString: process.env.SQL_CONNECTION_STRING || process.env.MSSQL_CONNECTION_STRING,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
  };
}

/**
 * Khoi tao ket noi SQL Server pool.
 * Neu khong the ket noi (vi du SQL Server chua chay hoac chua cau hinh password),
 * he thong tu dong chuyen sang che do fallback offline ma khong crash app.
 */
export async function getDbPool(): Promise<sql.ConnectionPool | null> {
  if (pool && isConnected) return pool;
  if (connectionAttempted && !isConnected) return null;

  connectionAttempted = true;
  const dbConf = getDbConfig();

  // Neu khong co password va khong co connection string thi khong thu connect de tranh timeout
  if (!dbConf.connectionString && !dbConf.password && !process.env.DB_SERVER) {
    console.log("[DB] SQL Server chua duoc cau hinh trong .env. Chay o che do Local Fallback.");
    return null;
  }

  try {
    let sqlConfig: sql.config;

    if (dbConf.connectionString) {
      pool = await sql.connect(dbConf.connectionString);
    } else {
      sqlConfig = {
        server: dbConf.server,
        port: dbConf.port,
        database: dbConf.database,
        user: dbConf.user || "sa",
        password: dbConf.password || "",
        options: {
          trustServerCertificate: dbConf.trustServerCertificate,
          enableArithAbort: true,
          connectTimeout: 5000, // 5 giay timeout de khong lam treo ung dung
        },
      };
      pool = await new sql.ConnectionPool(sqlConfig).connect();
    }

    isConnected = true;
    console.log(`[DB] Ket noi thanh cong toi SQL Server: ${dbConf.server}/${dbConf.database}`);
    return pool;
  } catch (err: any) {
    console.warn(`[DB] Khong the ket noi SQL Server (${err.message}). Tiep tuc chay o che do Memory/File Fallback.`);
    pool = null;
    isConnected = false;
    return null;
  }
}

export function isDbOnline(): boolean {
  return isConnected;
}
