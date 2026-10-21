import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Đi chơi thôi — Một chuyến đi của riêng bạn", template: "%s · Đi chơi thôi" },
  description: "Không gian chuẩn bị chuyến đi Nha Trang và Đà Lạt, theo nhịp của riêng bạn.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a href="#main-content" className="skip-link">Bỏ qua đến nội dung</a>
        <header className="page-shell flex flex-wrap items-center justify-between gap-4 border-b border-[#deded0] py-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="Đi chơi thôi — Trang chủ">
            <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-[#f9c75f] text-lg">↗</span>
            Đi chơi thôi<span aria-hidden="true" className="text-[#b75943]">.</span>
          </Link>
          <nav aria-label="Điều hướng chính" className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/#diem-den" className="py-2 hover:underline">Điểm đến</Link>
            <Link href="/open" className="py-2 hover:underline">Mở kế hoạch</Link>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="page-shell mt-20 flex flex-wrap items-center justify-between gap-5 border-t border-[#deded0] py-7 text-xs leading-6 text-[#58675b]">
          <p>Đi một chút. Nhớ thật nhiều.</p>
          <nav aria-label="Thông tin sử dụng" className="flex gap-5">
            <Link href="/privacy" className="hover:underline">Quyền riêng tư</Link>
            <Link href="/terms" className="hover:underline">Điều khoản</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
