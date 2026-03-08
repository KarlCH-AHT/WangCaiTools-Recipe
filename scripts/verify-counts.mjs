import 'dotenv/config';
import mysql from 'mysql2/promise';

const tables = ['users', 'recipes', 'ingredients', 'steps', 'tags', 'recipeImages', 'dailyMenuItems'];
const conn = await mysql.createConnection({ uri: process.env.DATABASE_URL });
try {
  for (const table of tables) {
    const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
    console.log(`${table}: ${rows[0].c}`);
  }
} finally {
  await conn.end();
}
