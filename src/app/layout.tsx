import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
export const metadata:Metadata={title:{default:"DỌC · Lập lịch trình Việt Nam",template:"%s · DỌC"},description:"Lập tuyến du lịch Nha Trang và Đà Lạt theo ngày, điểm dừng, giờ tham quan và giới hạn quỹ đường.",robots:{index:false,follow:false},icons:{icon:[{url:"/assets/favicon/favicon.svg",type:"image/svg+xml"},{url:"/favicon.ico",sizes:"any"}],shortcut:"/favicon.ico",apple:"/apple-icon.png"},manifest:"/assets/site.webmanifest",openGraph:{title:"DỌC · Lập lịch trình Việt Nam",description:"Thiết kế chuyến đi theo nhịp của bạn.",images:[{url:"/assets/social/og-image-1200x630.png",width:1200,height:630,alt:"DỌC - Lập lịch trình Việt Nam"}]}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="vi"><body className={`${beVietnam.variable} ${nunito.variable}`}>
  <a href="#main-content" className="atlas-skip">Bỏ qua đến nội dung</a>
  <header className="atlas-siteheader"><div className="atlas-container atlas-headerinner"><Link href="/" className="atlas-wordmark" aria-label="DỌC — Trang chủ"><Image src="/assets/logo/doc-logo-full-color.svg" alt="DỌC" width={146} height={67} priority className="atlas-brand-logo"/></Link><nav aria-label="Điều hướng chính"><Link href="/#diem-den">ĐIỂM ĐẾN</Link><Link href="/open">MỞ KẾ HOẠCH</Link><Link href="/plan/new" className="atlas-navcta">LẬP TUYẾN ↗</Link></nav></div></header>
  <main id="main-content" tabIndex={-1}>{children}</main>
  <footer className="atlas-sitefooter"><div className="atlas-container"><Image src="/assets/logo/doc-logo-for-dark-background.svg" alt="DỌC Việt Nam" width={146} height={67} className="atlas-brand-footer"/><p>Sản phẩm đang thử nghiệm. Địa điểm, giờ hoạt động, chi phí và đường đi cần được xác minh trước khi khởi hành.</p><div><Link href="/privacy">Quyền riêng tư</Link><Link href="/terms">Điều khoản</Link></div></div></footer>
</body></html>}
