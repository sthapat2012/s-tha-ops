// type ขั้นต่ำสำหรับ archiver@8 (ESM, ใช้คลาส ZipArchive) เฉพาะที่เราใช้
declare module "archiver" {
  import { Transform } from "node:stream";
  export class Archiver extends Transform {
    file(path: string, opts: { name: string }): this;
    directory(dir: string, dest: string | false): this;
    append(source: Buffer | string, opts: { name: string }): this;
    finalize(): Promise<void>;
  }
  export class ZipArchive extends Archiver {
    constructor(options?: { zlib?: { level?: number } });
  }
  export class TarArchive extends Archiver {
    constructor(options?: { gzip?: boolean });
  }
}
