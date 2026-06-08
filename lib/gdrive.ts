import jwt from "jsonwebtoken";

// อัปโหลดไฟล์ขึ้น Google Drive ด้วย Service Account (ไม่ต้องล็อกอินแบบโต้ตอบ)
// ต้องตั้ง env:
//   GOOGLE_SERVICE_ACCOUNT_JSON = เนื้อหาไฟล์ key ของ service account (ทั้ง JSON)
//   GDRIVE_FOLDER_ID            = id ของโฟลเดอร์ Drive ที่แชร์ให้ service account แล้ว

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function isDriveConfigured(): boolean {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !!process.env.GDRIVE_FOLDER_ID;
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("ยังไม่ได้ตั้งค่า GOOGLE_SERVICE_ACCOUNT_JSON");
  const sa = JSON.parse(raw) as ServiceAccount;
  // private_key อาจมี \n เป็นตัวอักษร (จาก env) — แปลงกลับเป็นบรรทัดจริง
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

/** ขอ access token จาก Google ผ่าน JWT ของ service account */
async function getAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
    { algorithm: "RS256" }
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error("ขอสิทธิ์ Google ไม่สำเร็จ: " + (await res.text()));
  }
  return (await res.json()).access_token as string;
}

/** อัปโหลดไฟล์ขึ้นโฟลเดอร์ Drive ที่กำหนด คืน id + ลิงก์เปิดดู */
export async function uploadToDrive(
  filename: string,
  buffer: Buffer,
  mimeType = "application/zip"
): Promise<{ id: string; link: string }> {
  const folderId = process.env.GDRIVE_FOLDER_ID;
  if (!folderId) throw new Error("ยังไม่ได้ตั้งค่า GDRIVE_FOLDER_ID");
  const token = await getAccessToken();

  const boundary = "stha-" + Math.random().toString(36).slice(2);
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const head =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(head, "utf8"), buffer, Buffer.from(tail, "utf8")]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(body),
    }
  );
  if (!res.ok) {
    throw new Error("อัปโหลดขึ้น Drive ไม่สำเร็จ: " + (await res.text()));
  }
  const data = await res.json();
  return { id: data.id, link: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view` };
}
