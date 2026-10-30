"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Coordinates } from "@/domain/model/trip";
import { mapPixel, moveMap, projectMap, unprojectMap, visibleMapTiles } from "@/domain/discovery/map-viewport";

/** Mount only after a user opens the map; no tile prefetch or offline tile cache. */
export function PinMap({ initialLocation, online, onConfirm, readOnly = false }: Readonly<{ initialLocation: Coordinates; online: boolean; onConfirm?: (point: Coordinates) => void; readOnly?: boolean }>) {
  const [center, setCenter] = useState(initialLocation), [pin, setPin] = useState(initialLocation);
  const [zoom, setZoom] = useState(14), [width, setWidth] = useState(0), [failed, setFailed] = useState(false);
  const viewport = useRef<HTMLDivElement>(null), instructions = useId();
  useEffect(() => {
    const node = viewport.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(512, entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const tiles = online ? visibleMapTiles(center, zoom, width, 320) : [], marker = mapPixel(pin, center, zoom, width, 320);
  function pan(dx: number, dy: number) { setCenter(point => moveMap(point, zoom, dx, dy)); }
  function keys(event: KeyboardEvent<HTMLDivElement>) {
    if (!online) return;
    const directions: Record<string, readonly [number, number]> = { ArrowLeft: [-64, 0], ArrowRight: [64, 0], ArrowUp: [0, -64], ArrowDown: [0, 64] };
    if (Object.hasOwn(directions, event.key)) { event.preventDefault(); pan(...directions[event.key]); }
    if (!readOnly && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setPin(center); }
  }
  return <section aria-label={readOnly ? "Vị trí trong danh mục" : "Chọn ghim trên bản đồ"} className="my-4 grid min-w-0 gap-3">
    <p id={instructions} className="text-sm leading-6">{readOnly ? "Ghim từ nguồn danh mục. Phím mũi tên dịch khung nhìn; phóng to để xem vị trí. Ghim vẫn giữ nguyên." : "Bấm lên bản đồ để đặt ghim. Phím mũi tên dịch khung nhìn; Enter hoặc Space đặt ghim ở giữa. Xác nhận vị trí riêng sau khi kiểm tra."}</p>
    <div ref={viewport} role="button" tabIndex={0} aria-label={readOnly ? "Xem bản đồ danh mục" : "Đặt ghim trên bản đồ"} aria-describedby={instructions} onKeyDown={keys}
      onClick={event => { if (readOnly || !online || !width) return; const rect = event.currentTarget.getBoundingClientRect(), origin = projectMap(center, zoom); setPin(unprojectMap({ x: origin.x + event.clientX - rect.left - event.currentTarget.clientLeft - width / 2, y: origin.y + event.clientY - rect.top - event.currentTarget.clientTop - 160 }, zoom)); }}
      style={{ position: "relative", boxSizing: "border-box", height: 322, width: "100%", maxWidth: 514, overflow: "hidden", background: "#e8eee9", border: "1px solid #b4c7be", cursor: "crosshair" }}>
      {tiles.map(tile => <Image key={tile.key} src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} alt="" width={256} height={256} unoptimized loading="eager" referrerPolicy="strict-origin-when-cross-origin" draggable={false} onError={() => setFailed(true)} style={{ position: "absolute", left: tile.left, top: tile.top, maxWidth: "none", pointerEvents: "none" }}/>) }
      {width > 0 && <svg width="28" height="36" viewBox="0 0 28 36" role="img" aria-label="Ghim được chọn" style={{ position: "absolute", left: marker.x - 14, top: marker.y - 34, pointerEvents: "none" }}><path d="M14 35C10 28 1 20 1 13a13 13 0 0 1 26 0c0 7-9 15-13 22Z" fill="#9a3f2c" stroke="#fffaf0" strokeWidth="2"/><circle cx="14" cy="13" r="4" fill="#fffaf0"/></svg>}
    </div>
    <p className="text-xs leading-5">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer" className="underline">Báo lỗi bản đồ</a>. Vùng đang xem được gửi đến OpenStreetMap; không gửi tên điểm riêng.</p>
    <div className="flex flex-wrap gap-2" aria-label="Điều khiển bản đồ">
      <button type="button" disabled={!online || zoom >= 18} onClick={() => setZoom(value => Math.min(18, value + 1))} className="min-h-11 border border-input bg-white px-3" aria-label="Phóng to bản đồ">+</button>
      <button type="button" disabled={!online || zoom <= 8} onClick={() => setZoom(value => Math.max(8, value - 1))} className="min-h-11 border border-input bg-white px-3" aria-label="Thu nhỏ bản đồ">−</button>
      {([{ name: "Bắc", dx: 0, dy: -64 }, { name: "Nam", dx: 0, dy: 64 }, { name: "Tây", dx: -64, dy: 0 }, { name: "Đông", dx: 64, dy: 0 }]).map(direction => <button key={direction.name} type="button" disabled={!online} onClick={() => pan(direction.dx, direction.dy)} className="min-h-11 border border-input bg-white px-3" aria-label={`Dịch bản đồ về ${direction.name}`}>{direction.name}</button>)}
    </div>
    <output aria-label="Tọa độ ghim đã chọn" className="text-sm">Vị trí đã chọn: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)} · mức phóng {zoom}</output>
    {!online && <p role="status" className="text-sm">Đang ngoại tuyến, nền bản đồ tạm dừng. Các điểm và ghim hiện có vẫn được giữ{readOnly ? "." : "; bạn có thể nhập tọa độ nâng cao."}</p>}
    {failed && <p role="status" className="text-sm">Không tải được nền bản đồ. Giữ nguyên ghim và nội dung; {readOnly ? "thử dịch/phóng lại bản đồ." : "dùng tọa độ nâng cao hoặc thử dịch/phóng lại bản đồ."}</p>}
    {!readOnly && <button type="button" disabled={!online} onClick={() => onConfirm?.(pin)} className="min-h-11 border border-input bg-white px-4">Xác nhận vị trí</button>}
    <p className="text-sm">{readOnly ? "Ghim từ danh mục; chưa xác minh lối vào, giờ hoạt động hoặc phương tiện tiếp cận." : "Ghim do bạn chọn, chưa xác minh lối vào, giờ hoạt động hoặc phương tiện tiếp cận."}</p>
  </section>;
}
