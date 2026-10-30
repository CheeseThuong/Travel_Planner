import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

const beVietnam = localFont({
  src: [
    { path: "./fonts/be-vietnam-pro-400-normal.ttf", weight: "400", style: "normal" },
    { path: "./fonts/be-vietnam-pro-500-normal.ttf", weight: "500", style: "normal" },
    { path: "./fonts/be-vietnam-pro-600-normal.ttf", weight: "600", style: "normal" },
    { path: "./fonts/be-vietnam-pro-700-normal.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-body", display: "swap", preload: false, adjustFontFallback: "Arial",
});
const nunito = localFont({
  src: [
    { path: "./fonts/nunito-600-normal.ttf", weight: "600", style: "normal" },
    { path: "./fonts/nunito-600-italic.ttf", weight: "600", style: "italic" },
  ],
  variable: "--font-display", display: "swap", preload: false, adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: { default: "Đi chơi thôi · Sổ hành trình Việt Nam", template: "%s · Đi chơi thôi" },
  description: "Sổ hành trình tự chuẩn bị cho Nha Trang và Đà Lạt — những điểm dừng, thời gian và ngân sách cần kiểm chứng trước khi đi.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={`${beVietnam.variable} ${nunito.variable}`}>
        <a href="#main-content" className="skip-link">Bỏ qua đến nội dung</a>
        <div aria-hidden="true" className="site-topline" />
        <header className="page-shell site-header">
          <Link href="/" className="site-wordmark" aria-label="Đi chơi thôi — Trang chủ">
            <span className="site-mark" aria-hidden="true"><span>Đ</span></span>
            <span><span className="site-name">đi chơi thôi.</span><span className="site-subname">Sổ hành trình Việt Nam</span></span>
          </Link>
          <nav aria-label="Điều hướng chính" className="site-nav">
            <Link href="/#diem-den">Điểm đến</Link>
            <Link href="/open">Mở kế hoạch</Link>
            <Link className="nav-action" href="/plan/new">Viết hành trình</Link>
          </nav>
        </header>
        <main id="main-content" tabIndex={-1}>{children}</main>
        <footer className="page-shell site-footer">
          <div><strong>Mỗi chuyến đi, một trang ký ức.</strong><span>Đây là bản thử nghiệm. Thông tin địa điểm và lịch trình cần kiểm chứng trước khi di chuyển.</span></div>
          <nav aria-label="Thông tin sử dụng" className="flex gap-6"><Link href="/privacy">Quyền riêng tư</Link><Link href="/terms">Điều khoản</Link></nav>
        </footer>
      </body>
    </html>
  );
}
