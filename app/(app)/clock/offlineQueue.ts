// คิวลงเวลาออฟไลน์ — เก็บใน IndexedDB (รองรับ Blob รูปภาพ) แล้วซิงค์เมื่อกลับมาออนไลน์
const DB_NAME = "stha-clock";
const STORE = "queue";

export interface QueuedEntry {
  id?: number;
  kind: "in" | "out";
  project_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  place_name: string | null;
  client_time: string;
  photo: Blob | null;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(entry: QueuedEntry): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueue(): Promise<QueuedEntry[]> {
  const db = await openDB();
  const items = await new Promise<QueuedEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedEntry[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items;
}

export async function dequeue(id: number): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** ส่งคิวที่ค้างขึ้นเซิร์ฟเวอร์ คืนจำนวนที่ซิงค์สำเร็จ */
export async function flushQueue(): Promise<number> {
  const items = await getQueue();
  let synced = 0;
  for (const item of items) {
    try {
      const fd = new FormData();
      fd.set("kind", item.kind);
      if (item.project_id) fd.set("project_id", item.project_id);
      fd.set("lat", String(item.lat));
      fd.set("lng", String(item.lng));
      if (item.accuracy != null) fd.set("accuracy", String(item.accuracy));
      if (item.place_name) fd.set("place_name", item.place_name);
      fd.set("client_time", item.client_time);
      if (item.photo) fd.set("photo", item.photo, "selfie.jpg");

      const res = await fetch("/api/time", { method: "POST", body: fd });
      if (res.ok) {
        if (item.id != null) await dequeue(item.id);
        synced++;
      }
    } catch {
      break; // ยังออฟไลน์อยู่ หยุดไว้ก่อน
    }
  }
  return synced;
}
