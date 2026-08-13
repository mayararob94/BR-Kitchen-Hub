import fs from "node:fs";
import path from "node:path";
import { getDb, getDbPath, resetDb } from "./index";

const BACKUP_DIR = process.env.MEALZINHA_BACKUP_DIR || path.join(process.cwd(), "backups");

export function backupDir(): string {
  return BACKUP_DIR;
}

/** Timestamped filename: mealzinha-backup-2026-08-10-2200.db */
function backupFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
  return `mealzinha-backup-${stamp}.db`;
}

export interface BackupFile {
  name: string;
  sizeBytes: number;
  createdAt: string;
}

export function listBackups(): BackupFile[] {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((name) => {
      const st = fs.statSync(path.join(BACKUP_DIR, name));
      return { name, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Create a consistent backup using SQLite's online backup API (safe with WAL).
 * Never overwrites: if the timestamped name exists, a numeric suffix is added.
 */
export async function createBackup(): Promise<BackupFile> {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  let name = backupFilename();
  let dest = path.join(BACKUP_DIR, name);
  let i = 1;
  while (fs.existsSync(dest)) {
    name = backupFilename().replace(/\.db$/, `-${i}.db`);
    dest = path.join(BACKUP_DIR, name);
    i++;
  }
  await getDb().backup(dest);
  const st = fs.statSync(dest);
  return { name, sizeBytes: st.size, createdAt: st.mtime.toISOString() };
}

export function backupPath(name: string): string {
  // Guard against path traversal — only allow plain filenames in the backup dir.
  const safe = path.basename(name);
  return path.join(BACKUP_DIR, safe);
}

/**
 * Restore a backup file over the live database. The current DB is first backed
 * up to a safety copy so a restore is never destructive without a fallback.
 */
export async function restoreBackup(name: string): Promise<{ safetyCopy: string }> {
  const src = backupPath(name);
  if (!fs.existsSync(src)) throw new Error("Backup file not found");

  // Snapshot current state first.
  const safety = await createBackup();

  const db = getDb();
  // Checkpoint & close WAL so we can swap the file cleanly.
  db.pragma("wal_checkpoint(TRUNCATE)");
  db.close();

  const livePath = getDbPath();
  for (const suffix of ["-wal", "-shm"]) {
    const f = livePath + suffix;
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  fs.copyFileSync(src, livePath);

  // Force a fresh connection on next access.
  resetDb();
  getDb(); // re-open immediately so schema/pragmas are applied
  return { safetyCopy: safety.name };
}
