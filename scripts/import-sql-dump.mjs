import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const inputFile = process.argv[2] || "KlWlsASUqCPhMuAy.sql";
const sqlPath = path.resolve(process.cwd(), inputFile);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const originalSql = await fs.readFile(sqlPath, "utf8");
const safeSql = originalSql.replace(/\bINSERT\s+INTO\b/g, "INSERT IGNORE INTO");

const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: true,
  charset: "utf8mb4",
});

try {
  await connection.query(safeSql);
  console.log(`Import finished: ${path.basename(sqlPath)}`);
} finally {
  await connection.end();
}
