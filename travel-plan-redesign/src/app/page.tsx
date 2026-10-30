import Link from "next/link";
import { destinations } from "@/domain/model/destination";
import { DestinationScene } from "@/components/illustrations/destination-scene";
import { TravelPostcard } from "@/components/motion/travel-postcard";

export default function HomePage() {
  return (
    <>
      <section aria-labelledby="hero-title" className="page-shell story-hero">
        <div>
          <p className="eyebrow hero-number">Tập san du hành · 01 / Việt Nam</p>
          <h1 id="hero-title" className="display-type story-title mt-7">Chuyến đi nhỏ.<br/><em>Nhớ cả một miền.</em></h1>
          <p className="story-deck">Từ góc chợ Đà Lạt đến gió biển Nha Trang: thu thập những nơi muốn ghé, tính lại quỹ thời gian và ghi thành một hành trình của riêng bạn.</p>
          <Link className="ink-link mt-9" href="#diem-den">Lật trang chọn điểm đến <span aria-hidden="true">↗</span></Link>
          <p className="hero-smallprint">Sổ thử nghiệm · Chưa lưu hoặc chia sẻ được chuyến đi · Không tự xác minh giờ hoạt động.</p>
        </div>
        <div className="hero-art">
          <div className="postcard">
            <TravelPostcard />
            <div className="postcard-under"><strong>Qua miền ký ức</strong><small>01 — 02 / Tuyển tập</small></div>
          </div>
          <span className="postcard-badge" aria-hidden="true">Đã ghé qua nơi này?</span>
        </div>
      </section>

      <section id="diem-den" className="page-shell scroll-mt-8" aria-labelledby="destinations-title">
        <div className="section-rule"><span>CHƯƠNG 01</span> HAI MIỀN, HAI NHỊP</div>
        <div className="chapter-head"><h2 id="destinations-title" className="display-type chapter-title">Chọn nơi sẽ ghi vào sổ.</h2><p className="chapter-caption">Hai bộ sưu tập địa điểm có dẫn nguồn. Đánh dấu từng nơi, rồi chuẩn bị lịch trình theo quỹ thời gian thực tế.</p></div>
        <div className="destination-list">
          {destinations.map((destination, index) => <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="destination-feature">
            <figure><DestinationScene theme={destination.theme} className="w-full" /></figure>
            <div className="destination-meta"><div><span className="destination-index">{String(index + 1).padStart(2,"0")} / BƯU THIẾP</span><h3>{destination.name}</h3><p>{destination.description}</p></div><span aria-hidden="true" className="text-3xl text-[#bd5941]">↗</span></div>
          </Link>)}
        </div>
      </section>

      <section className="page-shell travel-note" aria-labelledby="note-title">
        <div><p className="eyebrow mb-4 text-[#bd5941]">Ghi chú bên lề</p><h2 id="note-title"><strong>Đường đi đẹp nhất vẫn cần được kiểm tra.</strong></h2></div>
        <div><p>Những giờ mở cửa, chi phí và đoạn đường không chắc chắn sẽ được đánh dấu là chưa xác minh. Sổ hành trình hiện hỗ trợ chuẩn bị thông tin, chưa tự động sinh và lưu lịch trình hoàn chỉnh.</p><Link className="ink-link ink-outline mt-5" href="/plan/new">Mở sổ kế hoạch <span aria-hidden="true">↗</span></Link></div>
      </section>
    </>
  );
}
