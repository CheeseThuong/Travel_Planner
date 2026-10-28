"use client";

import { useEffect, useRef, useState } from "react";
import type { DestinationSlug } from "@/domain/model/destination";
import type { Coordinates } from "@/domain/model/trip";
import type { PlaceResolution } from "@/domain/ports/providers";

export interface ManualPlaceInput { readonly title: string; readonly location: Coordinates; readonly duration: number }

export function PlaceImport({ destination, onEditorial, onManual }: Readonly<{
  destination: DestinationSlug;
  onEditorial: (id: string) => string;
  onManual: (input: ManualPlaceInput) => string;
}>) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<PlaceResolution | null>(null);
  const [title, setTitle] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [duration, setDuration] = useState("60");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { const controller = pending.current; pending.current = null; controller?.abort(); }, []);

  async function resolve() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    setBusy(true); setMessage(""); setResult(null);
    try {
      const response = await fetch("/api/v1/places/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url, destination_slug: destination }), signal: controller.signal });
      if (!response.ok) throw new Error();
      const body: { data: PlaceResolution } = await response.json();
      if (pending.current !== controller) return;
      setResult(body.data);
      setMessage(body.data.status === "manual_entry_required" ? "Chưa xác định được địa điểm. Dán liên kết đầy đủ hoặc nhập thủ công bên dưới." : "Đây là gợi ý từ catalog độc lập, chưa xác minh bằng Google. Hãy xác nhận đúng địa điểm.");
    } catch {
      if (pending.current === controller) setMessage("Không thể nhận diện liên kết lúc này. Bạn có thể thử lại hoặc nhập thủ công; lựa chọn đã có vẫn được giữ.");
    } finally { clearTimeout(timer); if (pending.current === controller) setBusy(false); }
  }

  function addManual() {
    const latitude = Number(lat), longitude = Number(lng), minutes = Number(duration);
    if (!title.trim() || title.trim().length > 200 || !lat.trim() || !lng.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isInteger(minutes) || minutes < 15 || minutes > 720) {
      setMessage("Cần tên địa điểm, vĩ độ từ -90 đến 90, kinh độ từ -180 đến 180 và thời lượng từ 15–720 phút."); return;
    }
    setMessage(onManual({ title: title.trim(), location: { lat: latitude, lng: longitude }, duration: minutes }));
  }

  const inputClass = "min-h-11 min-w-0 w-full rounded-xl border border-input bg-white px-3 font-normal";
  return <fieldset className="min-w-0 rounded-3xl border border-[#deded0] bg-white/60 p-5 sm:p-7">
    <legend className="display-type px-2 text-2xl">Thêm từ Maps hoặc nhập tay</legend>
    <p className="mb-4 text-sm leading-6">Không tự mở liên kết rút gọn. Dữ liệu catalog và thông tin bạn nhập có thể chưa xác minh giờ, chi phí hoặc đường đến.</p>
    <label className="grid gap-2 text-sm font-semibold">Liên kết Google Maps<input inputMode="url" maxLength={2048} value={url} onChange={(event) => { pending.current?.abort(); pending.current = null; setBusy(false); setUrl(event.target.value); setResult(null); setMessage(""); }} className={inputClass} /></label>
    <button type="button" disabled={busy || !url} onClick={resolve} className="mt-3 min-h-11 rounded-full border border-input bg-white px-4 disabled:opacity-50">{busy ? "Đang kiểm tra liên kết…" : "Tìm ứng viên"}</button>
    <div role="status" aria-live="polite" className="my-3 text-sm leading-6">{busy ? "Đang tìm trong catalog…" : message}</div>
    {result?.candidates.map((candidate) => <div key={candidate.editorial_place_id} className="my-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-input p-3"><span>{candidate.display_name}</span><button type="button" className="min-h-11 rounded-full border border-input bg-white px-4" onClick={() => setMessage(onEditorial(candidate.editorial_place_id ?? ""))}>Xác nhận {candidate.display_name}</button></div>)}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Tên điểm nhập tay<input maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-semibold">Vĩ độ<input inputMode="decimal" value={lat} onChange={(event) => setLat(event.target.value)} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-semibold">Kinh độ<input inputMode="decimal" value={lng} onChange={(event) => setLng(event.target.value)} className={inputClass} /></label>
      <label className="grid gap-2 text-sm font-semibold">Thời lượng (phút)<input type="number" min={15} max={720} value={duration} onChange={(event) => setDuration(event.target.value)} className={inputClass} /></label>
    </div>
    <button type="button" onClick={addManual} className="mt-3 min-h-11 rounded-full border border-input bg-white px-4">Thêm điểm nhập tay</button>
  </fieldset>;
}
