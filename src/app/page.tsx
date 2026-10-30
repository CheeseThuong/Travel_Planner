import Image from "next/image";
import { DocWeather } from "@/components/doc-weather";
import Link from "next/link";
import { docDaLatPlaces } from "@/content/doc-dalat-suggestions";

const benefits = [
  { number: "01", title: "Khám phá đúng gu", body: "Chọn những nơi thật sự khiến bạn tò mò: một góc quán nhỏ, đường thông, hay nơi có nắng sớm.", href: "/destinations/da-lat", accent: "compass" },
  { number: "02", title: "Lập tuyến có căn cứ", body: "Xem thời gian, quãng đường ước lượng và những điểm chưa thể xếp — không bỏ sót trong im lặng.", href: "/plan/new", accent: "route" },
  { number: "03", title: "Góp thêm một nơi hay", body: "Dán JSON gTrack, kiểm tra tọa độ, viết lời giới thiệu riêng và gửi kiểm duyệt trước khi công khai.", href: "/contribute", accent: "pin" },
  { number: "04", title: "Giữ lại hành trình", body: "Đặt tên cho chuyến đi và quay lại những cung đường mình đã chọn, theo khả năng lưu kế hoạch hiện có.", href: "/open", accent: "journal" },
] as const;

export default function HomePage() {
  return <>
    <section className="doc-hero atlas-container" aria-labelledby="doc-hero-title">
      <div className="doc-hero-copy">
        <p className="doc-overline">DỌC / THIẾT KẾ HÀNH TRÌNH VIỆT NAM</p>
        <h1 id="doc-hero-title">Đi đâu,<span>đi cho đáng.</span></h1>
        <p className="doc-lead">Một chuyến đi đáng nhớ không cần quá nhiều điểm dừng. Bắt đầu bằng nơi bạn muốn đến, rồi để DỌC giúp nối những ý tưởng thành một hành trình có nhịp điệu.</p>
        <div className="doc-actions"><Link className="doc-button doc-button-primary" href="/plan/new">Bắt đầu vẽ hành trình <span aria-hidden="true">↗</span></Link><Link href="/cau-chuyen" className="doc-textlink">Đọc câu chuyện DỌC</Link></div>
        <div className="doc-hero-steps" aria-label="Ba bước khám phá"><span><b>01</b> Chọn địa điểm</span><span><b>02</b> Sắp xếp lịch trình</span><span><b>03</b> Đi theo cách của bạn</span></div>
      </div>
      <figure className="doc-vietnam-card"><div className="doc-map-head"><span>TỌA ĐỘ / HÀNH TRÌNH</span><span>VIỆT NAM — DỌC</span></div>
        <Image src="/assets/editorial/vietnam-outline.svg" alt="Bản đồ đường nét Việt Nam, đánh dấu Đà Lạt và Nha Trang" width={550} height={760} unoptimized priority />
        <figcaption><span>Hai nơi gặp nhau trên một cung đường.</span><strong>Đà Lạt · Nha Trang</strong></figcaption>
      </figure>
    </section>

    <div className="atlas-container doc-weather-showcase"><DocWeather city="da-lat" /></div>

    <section className="doc-storyband" aria-labelledby="doc-story-heading"><div className="atlas-container doc-storygrid">
      <div className="doc-photo-frame"><Image src="/assets/editorial/hills-scenery.webp" width={960} height={560} alt="Minh họa cung đường núi đón ánh bình minh"/><span>01 — Đường dài và những điều nhỏ bé</span></div>
      <div className="doc-storycopy"><p className="doc-overline">CÂU CHUYỆN THƯƠNG HIỆU</p><h2 id="doc-story-heading">Mỗi chuyến đi,<br/><em>một câu chuyện để kể.</em></h2><p>“Dọc” là những cung đường men theo bờ biển, băng qua cao nguyên và len vào những con phố nhỏ. Với DỌC, điều đáng nhớ không chỉ là nơi đến, mà còn là cách bạn đi qua nơi ấy.</p><blockquote>DỌC theo cung đường.<br/>ĐI theo cách của bạn.</blockquote><Link href="/cau-chuyen" className="doc-textlink">Tìm hiểu về DỌC ↗</Link></div>
    </div></section>

    <section className="atlas-container doc-features" aria-labelledby="doc-feature-heading"><div className="doc-section-header"><div><p className="doc-overline">MỘT ĐƯỜNG ĐI / NHIỀU ĐIỀU ĐÁNG NHỚ</p><h2 id="doc-feature-heading">Từ ý tưởng đến <em>hành trình.</em></h2></div><p>Tập trung vào chuyến đi của bạn, thay vì dành cả tối chỉ để sắp xếp điểm đến.</p></div>
      <div className="doc-featuregrid">{benefits.map(item=><Link key={item.number} href={item.href} className={`doc-feature doc-feature-${item.accent}`}><span className="doc-feature-index">CHẶNG {item.number}</span><span className="doc-feature-signet" aria-hidden="true">{item.accent==="compass"?"✧":item.accent==="route"?"⌁":item.accent==="pin"?"⌾":"✎"}</span><h3>{item.title}</h3><p>{item.body}</p><span className="doc-feature-arrow" aria-hidden="true">↗</span></Link>)}</div>
    </section>

    <section className="doc-discover atlas-container" id="diem-den" aria-labelledby="doc-discover-heading"><div className="doc-section-header"><div><p className="doc-overline">ĐIỂM ĐẾN / CAO NGUYÊN</p><h2 id="doc-discover-heading">Đà Lạt, <em>một chút khác.</em></h2></div><p>Những địa điểm gợi mở để bạn tiếp tục khám phá. Các điểm mới phải được kiểm tra vị trí trước khi đưa vào lịch trình.</p></div>
      <div className="doc-placegrid">{docDaLatPlaces.slice(0,6).map((place,index)=><article key={place.slug} className="doc-placecard"><div className="doc-place-art"><span>{String(index+1).padStart(2,"0")}</span><span aria-hidden="true">{place.icon}</span></div><div className="doc-place-inner"><p className="doc-place-kind">{place.categoryLabel}</p><h3>{place.name}</h3><p>{place.teaser}</p><span className="doc-place-source">Cần xác nhận tọa độ và tình trạng hoạt động</span></div></article>)}</div>
      <div className="doc-actions doc-discover-actions"><Link className="doc-button doc-button-primary" href="/cam-hung/da-lat">Khám phá danh sách mở rộng ↗</Link><Link className="doc-textlink" href="/destinations/da-lat">Xem danh mục có tọa độ nguồn</Link><Link className="doc-textlink" href="/destinations/nha-trang">Khám phá Nha Trang</Link></div>
    </section>

    <section className="doc-ending"><div className="atlas-container doc-ending-grid"><div><p className="doc-overline">NHỮNG CUNG ĐƯỜNG ĐƯỢC VIẾT TIẾP</p><h2>Đi theo nhịp của mình.</h2><p>Có người chọn bình minh giữa đồi thông. Có người muốn ngồi cả chiều trong một quán cà phê. DỌC không định nghĩa chuyến đi hoàn hảo thay bạn.</p></div><div className="doc-ending-actions"><Link href="/plan/new" className="doc-button doc-button-primary">Bắt đầu hành trình ↗</Link><Link href="/contribute" className="doc-textlink">Chia sẻ một địa điểm mới</Link></div></div></section>
  </>;
}
