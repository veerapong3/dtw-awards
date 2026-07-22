import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "ระบบผลงานครูและนักเรียน - โรงเรียนดอนตาลวิทยา",
  description: "ทำเนียบผลงานและความภาคภูมิใจ โรงเรียนดอนตาลวิทยา สพม.มุกดาหาร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 font-sans antialiased">
        <SiteNav />
        <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="bg-slate-800 text-slate-400 text-center py-4 mt-8 text-xs">
          © โรงเรียนดอนตาลวิทยา สพม.มุกดาหาร · ระบบโชว์ผลงานครูและนักเรียน
        </footer>
      </body>
    </html>
  );
}
