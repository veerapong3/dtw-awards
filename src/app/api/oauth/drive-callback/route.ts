import { NextResponse } from "next/server";
import { google } from "googleapis";

const REDIRECT_URI = "https://dtw-awards.vercel.app/api/oauth/drive-callback";

function html(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    code, pre { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; word-break: break-all; }
    pre { padding: 1rem; overflow-x: auto; }
    .ok { color: #047857; } .err { color: #b91c1c; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const err = searchParams.get("error");
  const code = searchParams.get("code");

  if (err) {
    return new NextResponse(
      html(
        "OAuth ไม่สำเร็จ",
        `<h1 class="err">OAuth ไม่สำเร็จ</h1><p>${err}</p>
         <p>ถ้าเป็น redirect_uri_mismatch ให้เพิ่มใน Google Cloud:</p>
         <pre>${REDIRECT_URI}</pre>`,
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (!code) {
    return new NextResponse(
      html("OAuth", "<h1>ไม่มี authorization code</h1>"),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      html(
        "ยังไม่ตั้งค่า",
        `<h1 class="err">ยังไม่มี GOOGLE_OAUTH_CLIENT_ID / SECRET บน Vercel</h1>
         <p>รัน: <code>node scripts/push-vercel-env.mjs</code> แล้ว redeploy</p>`,
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  try {
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        html(
          "ไม่ได้ refresh token",
          `<h1 class="err">ไม่ได้ refresh token</h1>
           <p>ไปที่ <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>
           ลบสิทธิ์แอป แล้ว authorize ใหม่</p>`,
        ),
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }

    const token = tokens.refresh_token;

    return new NextResponse(
      html(
        "OAuth สำเร็จ",
        `<h1 class="ok">✅ Authorize สำเร็จ</h1>
         <p>คัดลอก refresh token ด้านล่าง แล้วบอก developer หรือใส่ใน <code>.env.local</code>:</p>
         <pre>GOOGLE_OAUTH_REFRESH_TOKEN=${token}</pre>
         <p>จากนั้นรัน:</p>
         <pre>node scripts/push-vercel-env.mjs
npm run test:drive-upload</pre>
         <p><small>ปิดหน้านี้ได้ — token แสดงครั้งเดียว</small></p>`,
      ),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(
      html("Error", `<h1 class="err">Error</h1><pre>${msg}</pre>`),
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}
