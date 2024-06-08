import Logger from "./logger.js"
import { COLOR } from "./logger.js"
import mysql from "mysql2/promise";
import { readFile } from "fs/promises";

export const config = await readFile("./config.json", { encoding: "utf-8" }).then(JSON.parse);

const logger = new Logger("MySQL", COLOR.DARK_AQUA)
logger.log("Starting MySQL")
// export let db = await mysql.createConnection({
//   host: config.mysql.host,
//   user: config.mysql.user,
//   password: config.mysql.password,
//   database: config.mysql.database
// });
export let db;
logger.log("Connected to MySQL")
// createTables();

export async function createTables() {
  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) NOT NULL,
    guild VARCHAR(100) NOT NULL,
    points INT NOT NULL)`)
}
