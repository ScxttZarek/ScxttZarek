import { neon } from "@neondatabase/serverless";
export function databaseReady() { return Boolean(process.env.DATABASE_URL); }
export async function db<T = Record<string, unknown>>(sqlText: string, args: unknown[] = []): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("LUMACALL_DATABASE_NOT_CONFIGURED");
  const sql = neon(url);
  return await sql.query(sqlText, args) as unknown as T[];
}
