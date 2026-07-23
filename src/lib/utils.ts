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

export function compressImageFile(
  file: File,
  quality = 0.7,
  maxWidth = 1000,
): Promise<{ base64: string; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = String(reader.result);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth * height) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("ไม่สามารถประมวลผลรูปภาพได้"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          base64: canvas.toDataURL("image/jpeg", quality),
          name: file.name,
        });
      };
      img.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
  });
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
