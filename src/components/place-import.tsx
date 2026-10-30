"use client";

import { useEffect, useRef, useState } from "react";
import type { DestinationSlug } from "@/domain/model/destination";
import type { Coordinates } from "@/domain/model/trip";
import type { PlaceResolution } from "@/domain/ports/providers";
import type { DiscoveryPage } from "@/domain/discovery/search";
import { getCityGeo } from "@/domain/discovery/cities";
import { PinMap } from "./pin-map";
import { validCoordinates } from "@/domain/trip-draft";
import { parseGTrackJson, type GTrackPlace } from "@/domain/import/gtrack-json";
import { classifyGeo } from "@/domain/discovery/geo";

export interface ManualPlaceInput { readonly title: string; readonly location: Coordinates; readonly duration: number; readonly address?: string; readonly category?: import("@/domain/discovery/place").PlaceCategory }

export function PlaceImport({ destination, online, onEditorial, onManual }: Readonly<{
  destination: DestinationSlug;
  online: boolean;
  onEditorial: (id: string) => string;
  onManual: (input: ManualPlaceInput) => string;
}>) {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<PlaceResolution | null>(null);
  const [title, setTitle] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [duration, setDuration] = useState("60");
  const [mapOpen, setMapOpen] = useState(false);
  const [gTrackJson, setGTrackJson] = useState("");
  const [gTrackPreview, setGTrackPreview] = useState<GTrackPlace | null>(null);
  const [gTrackFeedback, setGTrackFeedback] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { const controller = pending.current; pending.current = null; controller?.abort(); }, []);

  async function resolve(mode: "url" | "name") {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    setBusy(true); setFailed(false); setMessage(""); setResult(null);
    try {
      const response = await fetch(mode === "url" ? "/api/v1/places/resolve" : "/api/v1/places/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mode === "url" ? { url, destination_slug: destination } : { query, destination_slug: destination, page_size: 10, use_provider: false }), signal: controller.signal });
      if (!response.ok) throw new Error();
      const body = await response.json();
      let resolution: PlaceResolution;
      if (mode === "name") {
        const page = body.data as DiscoveryPage;
        if (!Array.isArray(page.items) || page.items.some(place => typeof place.id !== "string" || typeof place.title_vi !== "string")) throw new Error();
        resolution = { status: page.items.length ? "candidate_selection_required" : "manual_entry_required", candidates: page.items.map(place => ({ provider: "editorial", editorial_place_id: place.id, display_name: place.title_vi, location: place.location, confidence: "medium" })), manual_entry_available: true };
      } else resolution = body.data as PlaceResolution;
      if (pending.current !== controller) return;
      setResult(resolution);
      setMessage(resolution.status === "manual_entry_required" ? "Chưa xác định được địa điểm. Tìm bằng tên/địa chỉ khác, dán liên kết đầy đủ hoặc chọn vị trí nhập tay bên dưới." : "Đây là gợi ý từ catalog độc lập, chưa xác minh bằng Google. Hãy xác nhận đúng địa điểm.");
    } catch {
      if (pending.current === controller) { setFailed(true); setMessage(mode === "url" ? "Không thể nhận diện liên kết lúc này. Bạn có thể thử lại hoặc nhập thủ công; lựa chọn đã có vẫn được giữ." : "Chưa tìm được địa điểm lúc này. Hãy thử lại; nội dung đã nhập và các điểm đã chọn vẫn được giữ."); }
    } finally { clearTimeout(timer); if (pending.current === controller) setBusy(false); }
  }

  function inspectGTrack() {
    setFailed(false); setGTrackPreview(null);
    try {
      const data = parseGTrackJson(gTrackJson);
      const zone = classifyGeo(data.location, getCityGeo(destination));
      if (zone.zone === "remote") {
        setFailed(true); setGTrackFeedback("Vị trí cách quá xa vùng " + destination + ". Kiểm tra lại thành phố hoặc tọa độ; không tự động thêm điểm."); return;
      }
      setGTrackPreview(data);
      setGTrackFeedback("Đã đọc dữ liệu JSON trên máy, chưa gửi và chưa xác minh với Google. Kiểm tra tên và tọa độ trước khi áp dụng.");
    } catch (error) { setFailed(true); setGTrackFeedback(error instanceof Error ? error.message : "Không thể đọc JSON gTrack."); }
  }

  function applyGTrack() {
    const item = gTrackPreview;
    if (!item) return;
    setTitle(item.title); setLat(String(item.location.lat)); setLng(String(item.location.lng)); setDuration("60");
    setFailed(false);
    setMessage(onManual({title:item.title,location:item.location,duration:60,...(item.address ? {address:item.address} : {}),...(item.category ? {category:item.category} : {})}));
  }

  function addManual() {
    setFailed(false);
    const latitude = Number(lat), longitude = Number(lng), minutes = Number(duration);
    if (!title.trim() || title.trim().length > 200 || !lat.trim() || !lng.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isInteger(minutes) || minutes < 15 || minutes > 720) {
      setMessage("Cần tên địa điểm, vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180 và thời lượng từ 15–720 phút."); return;
    }
    setMessage(onManual({ title: title.trim(), location: { lat: latitude, lng: longitude }, duration: minutes }));
  }

  const inputClass = "min-h-11 min-w-0 w-full rounded-xl border border-input bg-white px-3 font-normal";
  const manualPoint = { lat: Number(lat), lng: Number(lng) };
  return <fieldset aria-busy={busy} className="journey-section import-section">
    <legend className="display-type px-2 text-2xl">04 / Điểm ngoài danh mục</legend>
    <section aria-label="Nhập địa điểm từ JSON gTrack" className="mb-5 mt-2 grid gap-3 rounded-xl border border-input bg-white p-4">
      <h3 className="font-semibold">Dán JSON từ gTrack</h3>
      <p className="text-sm leading-6">Sao chép JSON địa điểm từ gTrack. Ứng dụng dùng tên, địa chỉ, nhóm và tọa độ; không tự lấy đánh giá, hình ảnh hay dữ liệu mô tả từ Google. Xác nhận vị trí trước khi gửi đóng góp.</p>
      <label className="grid gap-2 text-sm font-semibold">Dữ liệu gTrack JSON<textarea aria-label="Dán JSON gTrack" rows={6} maxLength={32768} value={gTrackJson} onChange={event => { setGTrackJson(event.target.value); setGTrackPreview(null); setGTrackFeedback(""); setFailed(false); setMessage(""); }} className="w-full rounded-xl border border-input bg-white p-3 font-mono text-xs" placeholder='{"business_info":{"name":"..."},"location":{"coordinates":{"latitude":11.94,"longitude":108.43}}}'/></label>
      <button type="button" onClick={inspectGTrack} disabled={!gTrackJson.trim()} className="min-h-11 rounded-full border border-input px-4">Phân tích JSON gTrack</button>
      {gTrackFeedback && <p role={failed ? "alert" : "status"} className="text-sm leading-6">{gTrackFeedback}</p>}
      {gTrackPreview && <div role="region" aria-label="Xem trước địa điểm gTrack" className="grid gap-2 rounded-lg border border-input p-3 text-sm">
        <strong>{gTrackPreview.title}</strong>
        {gTrackPreview.address && <p>{gTrackPreview.address}</p>}
        <p>Vị trí: {gTrackPreview.location.lat}, {gTrackPreview.location.lng}</p>
        <p>Nhóm: {gTrackPreview.originalCategories.join(", ") || "Chưa xác định"}</p>
        {gTrackPreview.placeId && <p>Place ID: {gTrackPreview.placeId}</p>}
        {gTrackPreview.mapsUrl && <a href={gTrackPreview.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline">Đối chiếu trên Google Maps</a>}
        <p>Chưa xác minh nguồn. Dữ liệu từ JSON do người dùng cung cấp, không phải kết quả tra cứu Google Maps trực tiếp.</p>
        <button type="button" onClick={applyGTrack} className="min-h-11 rounded-full border border-input bg-white px-4">Áp dụng địa điểm từ JSON</button>
      </div>}
    </section>
    <p className="mb-4 text-sm leading-6">Bạn có thể dán liên kết đầy đủ để tìm ứng viên trong danh mục. Liên kết rút gọn chưa thể xác định địa điểm tự động. Tọa độ nhập tay phải được kiểm tra lại trên bản đồ.</p>
    <label className="grid gap-2 text-sm font-semibold">Liên kết Google Maps<input inputMode="url" maxLength={2048} value={url} onChange={(event) => { pending.current?.abort(); pending.current = null; setBusy(false); setFailed(false); setUrl(event.target.value); setResult(null); setMessage(""); }} className={inputClass} /></label>
    {url.startsWith("https://maps.app.goo.gl/") && <p role="note" className="mt-2 text-sm text-[#9b5139]">Đây là liên kết rút gọn: hệ thống không truy cập liên kết để suy đoán địa điểm. Mở địa điểm trong Google Maps, sao chép URL đầy đủ từ thanh địa chỉ hoặc nhập tên và tọa độ.</p>}
    <button type="button" disabled={busy || !url || !online} onClick={() => resolve("url")} className="mt-3 min-h-11 rounded-full border border-input bg-white px-4 disabled:opacity-50">{busy ? "Đang kiểm tra liên kết…" : "Tìm ứng viên"}</button>
    <div className="mt-4 grid gap-2"><label className="grid gap-2 text-sm font-semibold">Tên hoặc địa chỉ cần tìm<input type="search" maxLength={200} value={query} onChange={event => { pending.current?.abort(); pending.current = null; setBusy(false); setFailed(false); setQuery(event.target.value); setResult(null); setMessage(""); }} className={inputClass}/></label><button type="button" disabled={busy || !query.trim() || !online} onClick={() => resolve("name")} className="min-h-11 rounded-full border border-input bg-white px-4 disabled:opacity-50">Tìm theo tên</button><p className="text-sm">Tìm trong dữ liệu độc lập của thành phố, không tự mở URL rút gọn hoặc dùng tọa độ camera Maps.</p></div>
    <div role={failed ? "alert" : "status"} aria-live={failed ? "assertive" : "polite"} className="my-3 text-sm leading-6">{busy ? "Đang tìm trong catalog…" : message}</div>
    {result?.candidates.map((candidate) => <div key={candidate.editorial_place_id} className="my-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-input p-3"><span>{candidate.display_name}</span><button type="button" className="min-h-11 rounded-full border border-input bg-white px-4" onClick={() => setMessage(onEditorial(candidate.editorial_place_id ?? ""))}>Xác nhận {candidate.display_name}</button></div>)}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Tên điểm nhập tay<input maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-semibold">Thời lượng (phút)<input type="number" min={15} max={720} value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass} /></label>
    </div>
    <button type="button" onClick={() => setMapOpen(value => !value)} className="mt-3 min-h-11 rounded-full border border-input bg-white px-4">{mapOpen ? "Đóng bản đồ chọn ghim" : "Chọn vị trí trên bản đồ"}</button>
    {!mapOpen && <p className="mt-2 text-sm">Bản đồ chỉ tải sau khi bạn mở. Vùng đang xem sẽ được gửi tới OpenStreetMap; bạn cũng có thể dùng tọa độ nâng cao.</p>}
    {mapOpen && <PinMap initialLocation={lat.trim() && lng.trim() && validCoordinates(manualPoint) ? manualPoint : getCityGeo(destination).center} online={online} onConfirm={point => { setLat(point.lat.toFixed(6)); setLng(point.lng.toFixed(6)); setFailed(false); setMessage("Đã chọn vị trí. Nhập tên riêng, kiểm tra lối vào rồi thêm điểm nhập tay."); }}/>}
    <details className="mt-3"><summary>Nhập tọa độ nâng cao</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Vĩ độ<input inputMode="decimal" value={lat} onChange={event => setLat(event.target.value)} className={inputClass}/></label><label className="grid gap-2 text-sm font-semibold">Kinh độ<input inputMode="decimal" value={lng} onChange={event => setLng(event.target.value)} className={inputClass}/></label></div></details>
    <button type="button" onClick={addManual} className="mt-3 min-h-11 rounded-full border border-input bg-white px-4">Thêm điểm nhập tay</button>
  </fieldset>;
}
