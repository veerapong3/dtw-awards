export function formatThaiDate(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** Parse record start/end dates for sorting (supports YYYY-MM-DD and DD/MM/YYYY). */
export function parseRecordDate(dateString: string): number {
  if (!dateString) return 0;
  const value = dateString.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(value).getTime();
  }

  const thaiSlash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (thaiSlash) {
    let year = Number(thaiSlash[3]);
    if (year > 2400) year -= 543;
    const iso = `${year}-${String(thaiSlash[2]).padStart(2, "0")}-${String(thaiSlash[1]).padStart(2, "0")}`;
    return new Date(iso).getTime();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export const IMAGE_UPLOAD = {
  maxBytes: 3_500_000,
  maxEdge: 4096,
  qualities: [0.95, 0.92, 0.88, 0.84],
  fallbackEdges: [3072, 2560, 2048, 1600],
} as const;

export const MAX_ACTIVITY_IMAGES = 5;

const KEEP_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export function fitWithin(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function extensionForMime(mime: string, fallbackName = "") {
  if (mime.includes("pdf") || /\.pdf$/i.test(fallbackName)) return ".pdf";
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  const match = fallbackName.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : ".jpg";
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function isHeic(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type);
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(decodeError(file)));
    };
    img.src = url;
  });
}

function decodeError(file: File) {
  if (isHeic(file)) {
    return `ไม่รองรับไฟล์ ${file.name} (HEIC) กรุณาบันทึกเป็น JPG หรือ PNG`;
  }
  return `อ่านไฟล์รูปไม่สำเร็จ: ${file.name}`;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to HTMLImageElement
    }
  }
  return loadHtmlImage(file);
}

function encodeJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("ไม่สามารถประมวลผลรูปภาพได้"));
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("แปลงไฟล์รูปไม่สำเร็จ"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function toJpegFile(blob: Blob, originalName: string) {
  const name = originalName.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

/** Keep the original file when possible; recompress only if it cannot be uploaded as-is. */
export async function prepareImageFile(
  file: File,
  maxBytes: number = IMAGE_UPLOAD.maxBytes,
): Promise<File> {
  if (!isImageFile(file)) {
    throw new Error(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
  }

  if (KEEP_TYPES.has(file.type) && file.size <= maxBytes && !isHeic(file)) {
    return file;
  }

  const source = await loadBitmap(file);
  try {
    const edges = [Math.min(Math.max(source.width, source.height), IMAGE_UPLOAD.maxEdge), ...IMAGE_UPLOAD.fallbackEdges];
    let last: Blob | null = null;

    for (const edge of edges) {
      const { width, height } = fitWithin(source.width, source.height, edge);
      for (const quality of IMAGE_UPLOAD.qualities) {
        last = await encodeJpeg(source, width, height, quality);
        if (last.size <= maxBytes) {
          return toJpegFile(last, file.name);
        }
      }
    }

    if (!last) {
      throw new Error(`แปลงไฟล์รูปไม่สำเร็จ: ${file.name}`);
    }
    return toJpegFile(last, file.name);
  } finally {
    if ("close" in source) source.close();
  }
}

export async function prepareCertificateFile(
  file: File,
  maxBytes: number = IMAGE_UPLOAD.maxBytes,
): Promise<File> {
  if (isPdfFile(file)) {
    if (file.size > maxBytes) {
      throw new Error("ไฟล์เกียรติบัตร PDF ใหญ่เกินไป (ไม่เกิน 3.5MB)");
    }
    return file.type === "application/pdf"
      ? file
      : new File([file], file.name, { type: "application/pdf" });
  }
  return prepareImageFile(file, maxBytes);
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
