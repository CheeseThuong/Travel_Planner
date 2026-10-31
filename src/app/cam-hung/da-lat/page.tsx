import { DocDaLatExplorer } from "@/components/doc-dalat-explorer";
import { docDaLatDirectory } from "@/content/doc-dalat-directory";
import Link from "next/link";
export const metadata = { title: "Đà Lạt — Những điểm dừng gợi mở" };
export default function DaLatInspiration() {return <section className="atlas-container doc-inspiration"><p className="doc-overline">DỌC / THƯ VIỆN Ý TƯỞNG</p><h1>Đà Lạt không chỉ có <em>những nơi nổi tiếng.</em></h1><p className="doc-lead">Danh sách nghiên cứu dưới đây là ý tưởng để xác minh, không phải dữ liệu đã đủ điều kiện lập tuyến. Chúng tôi không tự suy đoán tọa độ, giờ hoạt động, chi phí hoặc khả năng tiếp cận.</p><DocDaLatExplorer places={docDaLatDirectory}/><div className="doc-actions"><Link href="/contribute?destination=da-lat" className="doc-button doc-button-primary">Gửi địa điểm đã kiểm tra ↗</Link><Link href="/destinations/da-lat" className="doc-textlink">Xem danh mục hiện có</Link></div></section>}
