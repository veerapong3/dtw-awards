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
