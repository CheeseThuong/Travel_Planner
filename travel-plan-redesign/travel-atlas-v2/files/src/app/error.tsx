"use client";
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <section className="atlas-container atlas-system-page" role="alert"><div><p className="atlas-kicker">TẠM DỪNG / 500</p><h1>Đường này <span>đang tắc.</span></h1><p>Trang gặp sự cố khi tải. Bạn có thể thử lại; dữ liệu chưa được lưu trực tuyến nên đừng đóng tab khi còn đang nhập.</p><button type="button" className="atlas-primary-link" onClick={reset}>THỬ LẠI ↻</button></div><aside aria-hidden="true"><span>500</span></aside></section>
}
