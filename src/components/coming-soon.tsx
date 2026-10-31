import Link from "next/link";
export function ComingSoon({title,description}:{title:string;description:string}){
 return <section className="atlas-container atlas-system-page"><div><p className="atlas-kicker">CHƯA CÓ TUYẾN ĐƯỜNG Ở ĐÂY / DỌC</p><h1>{title}<span>.</span></h1><p>{description}</p><Link href="/plan/new" className="atlas-primary-link">THỬ LẬP TUYẾN MỚI ↗</Link></div><aside aria-hidden="true"><span>—</span><strong>CHƯA<br/>MỞ</strong><small>DỊCH VỤ ĐANG XÂY DỰNG</small></aside></section>
}
