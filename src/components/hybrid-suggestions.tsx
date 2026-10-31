"use client";

import type { HybridPreview } from "@/application/planning/hybrid";
import type { DiscoveryPlace } from "@/domain/discovery/place";
import { placeCategories } from "@/domain/discovery/place";

function sourceLink(place: DiscoveryPlace) {
  const source=place.coordinate_source;
  const label=source.provider==="openstreetmap"?"OpenStreetMap":source.provider==="user"?"Đóng góp cộng đồng":source.provider==="brave"?"Brave":"Nguồn địa điểm";
  return source.url?.startsWith("https://")?<a href={source.url} target="_blank" rel="noreferrer" className="underline">{label}</a>:label;
}
export function HybridSuggestions({ preview, transient, onConfirm, onClearFilters, onIndependent }: Readonly<{ preview: HybridPreview; transient: readonly DiscoveryPlace[]; onConfirm: () => void; onClearFilters: () => void; onIndependent: () => void }>) {
  const warnings=preview.warnings;
  return <div className="my-5 grid gap-4">
    {preview.empty&&<div className="atlas-empty"><p>Không có điểm mới phù hợp trong dữ liệu độc lập hiện tại. Chọn thêm sở thích, nới khu vực hoặc nhập điểm riêng.</p><button type="button" className="min-h-11 border px-4" onClick={onClearFilters}>Xóa lọc gợi ý</button></div>}
    {warnings.some(code=>code.startsWith("AI_"))&&<p className="text-sm">AI chưa khả dụng cho yêu cầu này; gợi ý đang dùng quy tắc với danh mục có nguồn độc lập.</p>}
    {warnings.some(code=>code.startsWith("DISCOVERY_")&&code.includes("FALLBACK"))&&<p className="text-sm">Tìm mở rộng chưa khả dụng; các điểm đã chọn và gợi ý trong danh mục vẫn được giữ.</p>}
    {warnings.includes("FOOD_SUITABILITY_UNVERIFIED")&&<p className="text-sm">Sở thích ăn uống đã được ghi nhận; thành phần món ăn và độ phù hợp chưa được xác minh.</p>}
    {warnings.includes("ACCOMMODATION_NOT_BOOKED")&&<p className="text-sm">Chưa có đặt chỗ lưu trú. Điểm xuất phát vẫn là tọa độ bạn đang dùng; nơi lưu trú không được tự xếp thành điểm tham quan.</p>}
    {warnings.includes("TIME_OF_DAY_SOFT_PREFERENCE")&&<p className="text-sm">Buổi đi ưu tiên là gợi ý mềm; giờ cụ thể còn phụ thuộc thời gian đến/về và giờ hoạt động chưa xác minh.</p>}
    {warnings.some(code=>code==="SELECTED_OUTSIDE_DISCOVERY_FILTER"||code==="REQUIRED_OUTSIDE_DISCOVERY_FILTER")&&<p className="text-sm">Điểm đã chọn/bắt buộc vẫn được giữ dù nằm ngoài bộ lọc gợi ý.</p>}
    {preview.suggested_places.length>0&&<section aria-label="Các điểm gợi ý" className="border border-input p-4"><h3>{preview.suggested_places.length} điểm gợi ý chưa thêm vào chuyến đi</h3><p className="my-3">Đây là các điểm trong bản thử. Danh sách bạn đã chọn chỉ thay đổi khi bấm xác nhận bên dưới. Giờ, vé và lối vào cần kiểm tra lại.</p><ul>{preview.suggested_places.map(place=><li key={place.id} className="my-3"><strong>{place.title_vi}</strong><p className="text-sm">{place.suggested_duration_min} phút gợi ý · {place.categories.map(category=>placeCategories[category]).join(", ")} · {sourceLink(place)} · {place.coordinate_source.license}</p></li>)}</ul><button type="button" className="min-h-11 border px-4" onClick={onConfirm}>Xác nhận thêm {preview.suggested_places.length} điểm gợi ý</button></section>}
    {preview.external_confirmation_count>0&&<p className="text-sm">Có {preview.external_confirmation_count} kết quả ngoài cần xác nhận nguồn/vị trí độc lập, chưa đưa vào lịch có thể lưu.</p>}
    {transient.length>0&&<section aria-label="Kết quả tìm mở rộng tạm thời" className="border border-input p-4"><h3>Tham khảo từ tìm mở rộng</h3><p className="my-3">Chỉ hiển thị tạm trong trang, không gửi cho AI, không thêm/lưu/xuất cùng lịch. Nếu muốn dùng một điểm, tự viết tên và xác nhận vị trí trên bản đồ độc lập.</p><ul>{transient.map((place,index)=><li key={`${place.id}-${index}`} className="my-3"><strong>{place.title_vi}</strong><p>{place.address??"Chưa có địa chỉ đã xác minh"}</p><p className="text-sm">{sourceLink(place)} · giờ, giá và vị trí chưa xác minh</p></li>)}</ul><button type="button" className="min-h-11 border px-4" onClick={onIndependent}>Nhập độc lập trên bản đồ</button></section>}
  </div>;
}
