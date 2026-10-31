import Link from "next/link";

const areas = [
  {slug:"nha-trang",code:"12.2388° N / 109.1967° E",name:"Nha Trang",sub:"Chạm biển từ những con đường nhỏ",index:"01",tag:"PHỐ BIỂN"},
  {slug:"da-lat",code:"11.9404° N / 108.4583° E",name:"Đà Lạt",sub:"Qua đèo, tìm một buổi sáng se lạnh",index:"02",tag:"CAO NGUYÊN"},
];

export default function HomePage(){return <>
  <section className="atlas-homehero atlas-container" aria-labelledby="hero-title">
    <div className="atlas-home-intro"><p className="atlas-kicker">THIẾT KẾ CHUYẾN ĐI / VIỆT NAM</p><h1 id="hero-title">Đi đâu,<br/><i>đi cho đáng.</i></h1><p>Đừng bắt đầu với một danh sách dài vô tận. Chọn nơi muốn ghé, xác định quỹ thời gian, rồi xếp từng chặng thành lịch đi rõ ràng.</p><Link href="/plan/new" className="atlas-primary-link">BẮT ĐẦU XẾP LỊCH <span aria-hidden="true">↗</span></Link><small>BẢN THỬ · TÍNH TOÁN TUYẾN ĐƯỜNG ƯỚC LƯỢNG · KHÔNG ĐẶT DỊCH VỤ</small></div>
    <div className="atlas-home-art" aria-label="Minh họa sơ đồ tuyến đường Việt Nam"><div className="atlas-home-arttop"><span>TỌA ĐỘ / HÀNH TRÌNH</span><span>VIETNAM — 2026</span></div><svg viewBox="0 0 540 600" role="img" aria-label="Minh họa hai điểm Nha Trang và Đà Lạt trên một sơ đồ trừu tượng">
      <defs><pattern id="paper-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#d1d9d3" strokeWidth="1"/></pattern></defs>
      <rect width="540" height="600" fill="#e5ede7"/><rect width="540" height="600" fill="url(#paper-grid)" />
      <path d="M220-30Q410 140 318 272T380 510L290 660" stroke="#b4c7be" strokeWidth="95" fill="none"/>
      <path d="M220-30Q410 140 318 272T380 510L290 660" stroke="#f7f3e7" strokeWidth="4" strokeDasharray="15 18" fill="none"/>
      <path d="M-30 427C118 370 147 463 264 386S418 314 578 344" stroke="#b6c9c0" strokeWidth="22" fill="none"/>
      <path d="M205 210Q307 294 353 392" stroke="#c45b41" strokeWidth="5" strokeDasharray="9 10" strokeLinecap="round" fill="none"/>
      <circle cx="205" cy="210" r="22" fill="#c45b41" stroke="#fffdf4" strokeWidth="6"/><circle cx="353" cy="392" r="22" fill="#172f3b" stroke="#fffdf4" strokeWidth="6"/>
      <text x="205" y="217" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fffdf4">1</text><text x="353" y="399" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fffdf4">2</text>
      <g fill="#172f3b" fontFamily="Arial,sans-serif"><text x="66" y="173" fontSize="14" letterSpacing="2">CAO NGUYÊN</text><text x="61" y="199" fontSize="28" fontWeight="700">ĐÀ LẠT</text><text x="359" y="439" fontSize="14" letterSpacing="2">PHỐ BIỂN</text><text x="359" y="465" fontSize="28" fontWeight="700">NHA TRANG</text></g>
      <text x="20" y="573" fill="#4f726b" fontSize="11" letterSpacing="3">BẢN ĐỒ Ý NIỆM — KHÔNG ĐÚNG TỈ LỆ</text>
    </svg><div className="atlas-home-artfoot"><span>Không vội đi thật xa.</span><strong>Đi theo nhịp của mình.</strong></div></div>
    <div className="atlas-home-vertical" aria-hidden="true">TỪ VỊ TRÍ ĐẾN KỶ NIỆM / 01 — 02</div>
  </section>
  <section className="atlas-container atlas-home-places" id="diem-den"><div className="atlas-home-divider"><span>01 / CHỌN THÀNH PHỐ</span><span>GHI LẠI NHỮNG NƠI MUỐN GHÉ</span></div><div className="atlas-home-placesheader"><h2>Hai thành phố.<br/><i>Nhiều ngã rẽ.</i></h2><p>Khởi đầu với hai bộ dữ liệu 30 địa điểm có nguồn. Lịch trình được tính bằng logic riêng; những gì chưa biết sẽ được ghi rõ thay vì đoán.</p></div><div className="atlas-area-list">{areas.map(area=><Link href={`/destinations/${area.slug}`} key={area.slug} className="atlas-area"><span className="atlas-area-index">{area.index}</span><span className="atlas-area-main"><small>{area.tag}</small><strong>{area.name}</strong><em>{area.sub}</em></span><span className="atlas-area-end"><small>{area.code}</small><span aria-hidden="true">↗</span></span></Link>)}</div></section>
  <section className="atlas-home-last"><div className="atlas-container"><span className="atlas-kicker">DỮ LIỆU PHẢI CÓ NGUỒN GỐC</span><h2>Lịch trình đẹp là lịch trình <i>đi được.</i></h2><p>Đường đi hiện tính gần đúng từ tọa độ, không phải thời gian Google Maps. Bạn sẽ thấy điểm nào chưa xếp được, lý do và phần chi phí còn thiếu.</p><Link href="/plan/new" className="atlas-primary-link">TẠO TUYẾN THỬ →</Link></div></section>
</>}
