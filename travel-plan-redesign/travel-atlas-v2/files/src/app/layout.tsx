import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

const beVietnam = localFont({
  src: [
    {path:"./fonts/be-vietnam-pro-400-normal.ttf",weight:"400",style:"normal"},
    {path:"./fonts/be-vietnam-pro-500-normal.ttf",weight:"500",style:"normal"},
    {path:"./fonts/be-vietnam-pro-600-normal.ttf",weight:"600",style:"normal"},
    {path:"./fonts/be-vietnam-pro-700-normal.ttf",weight:"700",style:"normal"},
  ],variable:"--atlas-body",display:"swap",preload:false,adjustFontFallback:"Arial"
});
const nunito = localFont({src:[{path:"./fonts/nunito-600-normal.ttf",weight:"600",style:"normal"},{path:"./fonts/nunito-600-italic.ttf",weight:"600",style:"italic"}],variable:"--atlas-accent-font",display:"swap",preload:false,adjustFontFallback:"Arial"});
export const metadata:Metadata={title:{default:"DỌC · Lập lịch trình Việt Nam",template:"%s · DỌC"},description:"Lập tuyến du lịch Nha Trang và Đà Lạt theo ngày, điểm dừng, giờ tham quan và giới hạn quỹ đường.",robots:{index:false,follow:false}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="vi"><body className={`${beVietnam.variable} ${nunito.variable}`}>
  <a href="#main-content" className="atlas-skip">Bỏ qua đến nội dung</a>
  <header className="atlas-siteheader"><div className="atlas-container atlas-headerinner"><Link href="/" className="atlas-wordmark" aria-label="DỌC — Trang chủ"><span className="atlas-wordmark-emblem">D.</span><span>DỌC<small>CHUYẾN ĐI CỦA BẠN</small></span></Link><nav aria-label="Điều hướng chính"><Link href="/#diem-den">ĐIỂM ĐẾN</Link><Link href="/open">MỞ KẾ HOẠCH</Link><Link href="/plan/new" className="atlas-navcta">LẬP TUYẾN ↗</Link></nav></div></header>
  <main id="main-content" tabIndex={-1}>{children}</main>
  <footer className="atlas-sitefooter"><div className="atlas-container"><strong>DỌC / VIỆT NAM</strong><p>Sản phẩm đang thử nghiệm. Địa điểm, giờ hoạt động, chi phí và đường đi cần được xác minh trước khi khởi hành.</p><div><Link href="/privacy">Quyền riêng tư</Link><Link href="/terms">Điều khoản</Link></div></div></footer>
</body></html>}
