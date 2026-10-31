"use client";

import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import { geoZoneLabels } from "@/domain/discovery/geo";
import type { DiscoveryPreferences } from "@/domain/discovery/recommendations";

export function PlanningPreferences({ value, onChange, useAi, useProvider, onAi, onProvider }: Readonly<{
  value: DiscoveryPreferences; onChange: (value: DiscoveryPreferences) => void; useAi: boolean; useProvider: boolean; onAi: (value: boolean) => void; onProvider: (value: boolean) => void;
}>) {
  const update = (change: Partial<DiscoveryPreferences>) => onChange({ ...value, ...change });
  const interests = (Object.entries(placeCategories) as [PlaceCategory, string][]).filter(([key]) => key !== "lodging" && key !== "services");
  return <div className="my-5 grid gap-4">
    <fieldset><legend>Sở thích (tùy chọn)</legend><div className="mt-2 flex flex-wrap gap-2">{interests.map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-2 border border-input px-3"><input type="checkbox" aria-label={`Sở thích ${label}`} checked={value.interests.includes(key)} onChange={event => update({ interests: event.target.checked ? [...value.interests, key] : value.interests.filter(category => category !== key) })}/>{label}</label>)}</div><p className="mt-2 text-sm">Chưa biết điểm nào cũng có thể bắt đầu. Không chọn sở thích sẽ dùng danh mục hiện có để gợi ý đa dạng.</p></fieldset>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={value.auto_suggest} onChange={event => update({ auto_suggest: event.target.checked })}/>Gợi ý thêm điểm phù hợp</label>
    <details className="atlas-details"><summary>Tùy chọn gợi ý & dịch vụ ngoài</summary><div className="atlas-fields my-4">
      <label>Khu vực dùng cho gợi ý<select aria-label="Khu vực gợi ý" value={value.zone} onChange={event => update({ zone: event.target.value as DiscoveryPreferences["zone"] })}><option value="all">Tất cả khu vực</option>{Object.entries(geoZoneLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Khoảng cách tối đa từ trung tâm (km)<input type="number" min="0" max="150" step="0.5" value={value.max_distance_km ?? ""} placeholder="Không giới hạn" onChange={event => update({ max_distance_km: event.target.value === "" ? undefined : event.target.valueAsNumber })}/></label>
      <label>Số điểm gợi ý thêm tối đa<input type="number" min="0" max="30" value={value.max_suggestions ?? ""} placeholder="Tự tính theo nhịp và số ngày" onChange={event => update({ max_suggestions: event.target.value === "" ? undefined : event.target.valueAsNumber })}/></label>
      <label>Ăn uống ưu tiên<select value={value.food_preference} onChange={event => update({ food_preference: event.target.value as DiscoveryPreferences["food_preference"] })}><option value="any">Không yêu cầu</option><option value="local_food">Món địa phương</option><option value="seafood">Hải sản</option><option value="vegetarian">Ăn chay</option><option value="vegan">Thuần chay</option></select></label>
      <label>Lưu trú ưu tiên<select value={value.accommodation_preference} onChange={event => update({ accommodation_preference: event.target.value as DiscoveryPreferences["accommodation_preference"] })}><option value="any">Chưa chọn</option><option value="hotel">Khách sạn</option><option value="resort">Resort</option><option value="homestay">Homestay</option><option value="hostel">Hostel</option><option value="villa">Villa</option></select></label>
      <label>Thời điểm ưu tiên (gợi ý mềm)<select value={value.time_of_day} onChange={event => update({ time_of_day: event.target.value as DiscoveryPreferences["time_of_day"] })}><option value="any">Cả ngày</option><option value="morning">Buổi sáng</option><option value="afternoon">Buổi chiều</option><option value="evening">Buổi tối</option></select></label>
    </div><p>Khoảng cách là đường chim bay từ trung tâm quy ước, không phải thời gian đi đường. Khách sạn không tự trở thành điểm tham quan; món ăn phù hợp và giờ mở cửa cần kiểm tra riêng.</p>
      <label className="my-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={useAi} onChange={event => onAi(event.target.checked)}/>Dùng AI xếp hạng gợi ý</label><p className="text-sm">Khi dịch vụ đã được cấu hình, ID danh mục, sở thích, tùy chọn chuyến đi ở mức khái quát và khoảng cách gần đúng được gửi cho Groq; không gửi địa chỉ lưu trú hay ngày đi cụ thể. Không có dịch vụ thì dùng quy tắc trên máy.</p>
      <label className="my-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={useProvider} onChange={event => onProvider(event.target.checked)}/>Tìm mở rộng bằng Brave</label><p className="text-sm">Kết quả ngoài cần xác nhận nguồn/vị trí độc lập trước khi đưa vào lịch có thể lưu. Danh mục hiện có vẫn dùng được khi dịch vụ tắt hoặc lỗi.</p>
    </details>
  </div>;
}
