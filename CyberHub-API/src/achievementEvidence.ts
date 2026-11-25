import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const maxEvidenceFiles = 2;
const maxFileBytes = 5 * 1024 * 1024;
export const evidenceBodyLimit = maxEvidenceFiles * Math.ceil(maxFileBytes / 3) * 4 + 64 * 1024;
const evidenceDirectory = resolve(process.env.ACHIEVEMENT_UPLOAD_DIR ?? "achievement-uploads");
const demoFiles = new Map<string, Buffer>();

export const competitionValuesSchema = z.object({
  activity: z.string().trim().min(1).max(200),
  level: z.string().trim().min(1).max(100),
  competitionType: z.string().trim().min(1).max(100),
  organiser: z.string().trim().min(1).max(200),
  participation: z.enum(["Individual", "Team"]),
  dates: z.string().trim().min(1).max(100),
  venue: z.string().trim().min(1).max(200),
  position: z.string().trim().min(1).max(100),
  prizeMoney: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$|^$/).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  recognition: z.string().trim().max(1000).optional(),
}).refine((values) => !values.prizeMoney || Boolean(values.currency));

const signatures = {
  "application/pdf": Buffer.from("%PDF-"),
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff]),
};

export const evidenceFileSchema = z.object({
  kind: z.enum(["offer-letter", "completion-certificate"]).optional(),
  fileName: z.string().trim().min(1).max(200).regex(/^[^\u0000-\u001f\u007f/\\]+$/),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  content: z.string().max(Math.ceil(maxFileBytes / 3) * 4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
}).transform((file, context) => {
  const bytes = Buffer.from(file.content, "base64");
  const signature = signatures[file.mimeType];
  if (bytes.length > maxFileBytes || !bytes.subarray(0, signature.length).equals(signature) || bytes.toString("base64") !== file.content) {
    context.addIssue({ code: "custom", message: "Attach a valid PDF, PNG or JPG file up to 5 MB." });
    return z.NEVER;
  }
  return { kind: file.kind, fileName: file.fileName, mimeType: file.mimeType, bytes };
});

export const evidenceSchema = z.array(evidenceFileSchema).max(maxEvidenceFiles);

export async function withAchievementEvidence<T>(
  files: z.output<typeof evidenceSchema>,
  demo: boolean,
  save: (documents: { id: string; storageKey: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: Date }[]) => Promise<T>,
) {
  const documents = files.map(({ kind, fileName, mimeType, bytes }) => {
    const token = randomUUID();
    return { id: kind ? `${kind}-${token}` : token, storageKey: `achievement-${token}`, fileName, mimeType, sizeBytes: bytes.length, createdAt: new Date() };
  });
  const written: string[] = [];
  try {
    if (!demo && documents.length) await mkdir(evidenceDirectory, { recursive: true });
    for (const [index, document] of documents.entries()) {
      const { storageKey } = document;
      if (demo) {
        demoFiles.set(storageKey, files[index].bytes);
        written.push(storageKey);
      } else {
        const file = await open(resolve(evidenceDirectory, storageKey), "wx", 0o600);
        written.push(storageKey);
        try {
          await file.writeFile(files[index].bytes);
        } finally {
          await file.close();
        }
      }
    }
    const result = await save(documents);
    if (result !== null) return result;
  } catch (error) {
    await removeWritten();
    throw error;
  }
  await removeWritten();
  return null;

  async function removeWritten() {
    await Promise.allSettled(written.map(async (key) => {
      if (demo) demoFiles.delete(key);
      else await unlink(resolve(evidenceDirectory, key));
    }));
  }
}

export async function readAchievementEvidence(key: string, demo: boolean) {
  if (!/^(?:competition|achievement)-[a-f0-9-]{36}$/.test(key)) return undefined;
  if (demo) return demoFiles.get(key);
  try {
    return await readFile(resolve(evidenceDirectory, key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
