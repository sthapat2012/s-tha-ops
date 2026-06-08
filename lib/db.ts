import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { DATA_DIR, DB_PATH } from "./paths";

// ───────────────────────────────────────────────────────────────────
// การเชื่อมต่อฐานข้อมูล SQLite (singleton กันเปิดซ้ำตอน dev hot-reload)
// ───────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __sthaDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export const db: Database.Database =
  global.__sthaDb ?? (global.__sthaDb = createConnection());

// ───────────────────────────────────────────────────────────────────
// สร้างตารางทั้งหมด (idempotent) — ครอบคลุมทุกเฟสของแอป
// ───────────────────────────────────────────────────────────────────
function migrate(db: Database.Database) {
  db.exec(`
    -- ผู้ใช้: role = owner | admin | worker | sales
    --        status = pending | active | suspended
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      email           TEXT UNIQUE,
      phone           TEXT,
      password_hash   TEXT NOT NULL,
      name            TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'worker',
      status          TEXT NOT NULL DEFAULT 'pending',
      can_documents   INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      approved_at     TEXT,
      approved_by     INTEGER
    );

    -- โครงการ / หน้างาน
    CREATE TABLE IF NOT EXISTS projects (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT NOT NULL,
      description     TEXT,
      cover_image     TEXT,
      status          TEXT NOT NULL DEFAULT 'active',  -- active | completed
      progress        INTEGER NOT NULL DEFAULT 0,      -- 0-100
      lat             REAL,
      lng             REAL,
      geofence_radius INTEGER NOT NULL DEFAULT 200,    -- เมตร
      due_date        TEXT,
      delivered_date  TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- สิทธิ์เข้าถึงโครงการรายบัญชี (ถ้าไม่มีแถว = เห็นทุกโครงการตาม role)
    CREATE TABLE IF NOT EXISTS user_projects (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, project_id)
    );

    -- แผนงานตามเฟส (ไทม์ไลน์)
    CREATE TABLE IF NOT EXISTS phases (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      start_date  TEXT,
      end_date    TEXT,
      status      TEXT NOT NULL DEFAULT 'pending',  -- done | in_progress | pending
      progress    INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    -- ฟีดความคืบหน้าหน้างาน
    CREATE TABLE IF NOT EXISTS updates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      text        TEXT,
      image_path  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- เอกสารโครงการ (เปิดดูเฉพาะ admin/owner)
    CREATE TABLE IF NOT EXISTS documents (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      file_path   TEXT NOT NULL,
      kind        TEXT,                              -- quote | receipt | invoice | other
      drive_id    TEXT,                              -- id บน Google Drive (เฟสถัดไป)
      uploaded_by INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- การลงเวลา (เข้า/ออก) — บังคับมีพิกัด + รูปยืนยันตัวตน
    CREATE TABLE IF NOT EXISTS time_entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id),
      project_id      INTEGER REFERENCES projects(id),
      kind            TEXT NOT NULL,                 -- in | out
      lat             REAL NOT NULL,
      lng             REAL NOT NULL,
      accuracy        REAL,
      place_name      TEXT,
      photo_path      TEXT,
      within_geofence INTEGER,                       -- 1 ในรัศมี, 0 นอกรัศมี, NULL ไม่มีพิกัดหน้างาน
      distance_m      REAL,
      client_time     TEXT,                          -- เวลาจากเครื่อง (ตอนออฟไลน์)
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- สินค้า / ผลิตภัณฑ์
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      price       REAL,
      category    TEXT,
      image_path  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ผลงานบริษัท (portfolio)
    CREATE TABLE IF NOT EXISTS portfolio (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      description TEXT,
      image_path  TEXT,
      order_index INTEGER NOT NULL DEFAULT 0
    );

    -- บันทึกการตรวจสอบย้อนหลัง (audit log)
    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id    INTEGER REFERENCES users(id),
      action      TEXT NOT NULL,
      target_id   INTEGER,
      detail      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ค่าตั้งค่าระบบแบบ key/value (โปรไฟล์บริษัท, token Google Drive ฯลฯ)
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_updates_project ON updates(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_time_user ON time_entries(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id, order_index);
  `);
}

// helper สำหรับ settings
export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function audit(
  actorId: number | null,
  action: string,
  targetId?: number | null,
  detail?: unknown
) {
  db.prepare(
    "INSERT INTO audit_log (actor_id, action, target_id, detail) VALUES (?, ?, ?, ?)"
  ).run(actorId, action, targetId ?? null, detail ? JSON.stringify(detail) : null);
}
