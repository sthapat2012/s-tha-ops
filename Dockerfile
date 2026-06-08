# ───────── S-THA · Dockerfile (Next.js 16 standalone + better-sqlite3) ─────────
# Stage 1: ติดตั้ง dependencies (มี build tools สำหรับ compile better-sqlite3)
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: build
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: runner (image เล็ก รันจริง)
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATA_DIR=/data

# จุด mount ของ persistent volume (Railway mount /data ทับตรงนี้)
# รันเป็น root (ค่าเริ่มต้น) เพื่อให้เขียนไฟล์ลง Railway volume ที่ /data ได้
RUN mkdir -p /data

# คัดลอกผลลัพธ์ standalone (รวม node_modules ที่จำเป็น เช่น better-sqlite3)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
# หมายเหตุ: ไม่ใช้ VOLUME ของ Docker — Railway จัดการ persistent volume ที่ /data เอง
CMD ["node", "server.js"]
