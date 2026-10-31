"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogPlace } from "@/domain/catalog";
import { placeCategories } from "@/domain/discovery/place";
import { PinMap } from "./pin-map";

/** Mount on an explicit details action; native modal supplies focus trapping and Escape. */
export function PlaceDetails({ place, online, onClose, selected, excluded, onToggleExcluded }: Readonly<{ place: CatalogPlace; online: boolean; onClose: () => void; selected?: boolean; excluded?: boolean; onToggleExcluded?: () => void }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [showMap, setShowMap] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="place-detail-title" onClose={onClose} className="atlas-place-dialog">
    <h2 id="place-detail-title">{place.title}</h2>
    <p>{place.description}</p>
    <p>{place.categories?.map(category => placeCategories[category]).join(" · ")}</p>
    <p>{place.durationMinutes} phút gợi ý; bạn cần tự kiểm tra thời lượng phù hợp.</p>
    <p>Giờ mở cửa, giá vé và khả năng tiếp cận: chưa xác minh.</p>
    <p>{place.coordinateQuality === "geometry_center_not_entrance" ? "Tọa độ là tâm hình học, không phải lối vào đã xác minh." : "Tọa độ cộng đồng, chưa xác minh lối vào."}</p>
    {place.transportConstraint === "manual_transfer" && <p className="atlas-warning">Cần tự xác minh phương tiện trung chuyển riêng. Điểm này không được tự xếp như tuyến đường bộ.</p>}
    {!!place.warnings?.length && <ul className="list-disc pl-5">{place.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    <p>Nguồn: <a href={place.sourceUrl} target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>{place.source && ` · ${place.source.license} · thu thập ${place.source.retrieved_at}`}</p>
    {onToggleExcluded && <div className="my-4"><button type="button" className="min-h-11 border px-4" disabled={selected} onClick={onToggleExcluded}>{excluded?"Gỡ loại trừ khỏi gợi ý":"Loại trừ khỏi gợi ý"}</button>{selected&&<p>Điểm đang có trong danh sách. Bỏ điểm đã chọn trước khi loại trừ.</p>}{excluded&&<p>Điểm này không được tự thêm vào các gợi ý mới.</p>}</div>}
    {!showMap ? <button type="button" className="min-h-11 border px-4" onClick={() => setShowMap(true)}>Xem vị trí trên bản đồ</button> : <PinMap initialLocation={{ lat: place.lat, lng: place.lng }} online={online} readOnly/>}
    <form method="dialog" className="mt-4"><button className="min-h-11 border px-4">Đóng thông tin</button></form>
  </dialog>;
}
