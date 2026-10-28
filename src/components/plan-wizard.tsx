"use client";

import { useMemo, useState, type FormEvent } from "react";
import { MAX_VND_INPUT, summarizeTripBudget } from "@/domain/budget";
import type { CatalogPlace } from "@/domain/catalog";
import type { Pace, PlanningMode, TransportMode } from "@/domain/model/trip";
import { PlaceImport, type ManualPlaceInput } from "./place-import";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const paceStops: Record<Pace, number> = { relaxed: 2, balanced: 3, active: 4 };

function inclusiveDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const days = Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
  return Number.isFinite(days) ? days : 0;
}

export function PlanWizard({ initialDestination, catalogs }: Readonly<{
  initialDestination: "nha-trang" | "da-lat";
  catalogs: Readonly<Record<"nha-trang" | "da-lat", readonly CatalogPlace[]>>;
}>) {
  const [destination, setDestination] = useState(initialDestination);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [budget, setBudget] = useState(6_000_000);
  const [lodging, setLodging] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [transportMode, setTransportMode] = useState<TransportMode>("motorbike");
  const [pace, setPace] = useState<Pace>("balanced");
  const [planningMode, setPlanningMode] = useState<PlanningMode>("assisted");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualPlaces, setManualPlaces] = useState<(ManualPlaceInput & { id: string })[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const places = catalogs[destination];
  const dayCount = inclusiveDays(startDate, endDate);
  const selected = useMemo(() => places.filter((place) => selectedIds.includes(place.id)), [places, selectedIds]);
  const selectedCount = selected.length + manualPlaces.length;
  const validMoney = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= MAX_VND_INPUT;
  const valid = dayCount >= 1 && dayCount <= 7 && Number.isInteger(partySize) && partySize >= 1 && partySize <= 30 && validMoney(budget) && validMoney(lodging) && validMoney(transportCost);
  const summary = valid ? summarizeTripBudget(
    { currency: "VND", total_vnd: budget, known_costs_vnd: { lodging, transport: transportCost, meals: 0, other: 0 } },
    partySize,
    dayCount,
    Array.from({ length: selectedCount }, () => ({ provenance: "unknown" as const })),
  ) : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
  }

  function changeDestination(value: "nha-trang" | "da-lat") {
    setDestination(value);
    setSelectedIds([]);
    setManualPlaces([]);
    setSubmitted(false);
  }

  function confirmEditorial(id: string): string {
    if (!places.some((place) => place.id === id)) return "Điểm này không thuộc catalog của chuyến đi.";
    if (selectedIds.includes(id)) return "Điểm này đã được chọn.";
    if (selectedCount >= 30) return "Mỗi chuyến đi tối đa 30 điểm.";
    setSelectedIds((ids) => [...ids, id]); setSubmitted(false);
    return "Đã thêm điểm từ catalog. Giờ hoạt động và chi phí vẫn chưa xác minh.";
  }

  function addManual(input: ManualPlaceInput): string {
    if (selectedCount >= 30) return "Mỗi chuyến đi tối đa 30 điểm.";
    if (manualPlaces.some((place) => place.title.toLocaleLowerCase("vi") === input.title.toLocaleLowerCase("vi") && place.location.lat === input.location.lat && place.location.lng === input.location.lng)) return "Điểm này đã được chọn.";
    setManualPlaces((current) => [...current, { ...input, id: crypto.randomUUID() }]); setSubmitted(false);
    return "Đã thêm điểm nhập tay. Giờ hoạt động, chi phí và khả năng tiếp cận chưa xác minh.";
  }

  return (
    <div className="page-shell py-12">
      <div className="max-w-3xl"><p className="eyebrow mb-3 text-[#68745b]">P03-02 · Bản nháp cục bộ</p><h1 className="display-type text-4xl sm:text-6xl">Lên kế hoạch theo cách của bạn</h1><p className="mt-5 text-base leading-8 text-[#58675b]">Nhập giới hạn thực tế trước. Hệ thống tính phần ngân sách còn lại và mức tải điểm ghé; chế độ cá nhân giữ nguyên lựa chọn để bạn tự sắp xếp.</p></div>

      <form onSubmit={submit} className="mt-9 grid gap-7 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-7">
          <fieldset className="grid gap-5 rounded-3xl border border-[#deded0] bg-white/60 p-5 sm:grid-cols-2 sm:p-7">
            <legend className="display-type px-2 text-2xl">1. Chuyến đi</legend>
            <label className="grid gap-2 text-sm font-semibold">Điểm đến<select value={destination} onChange={(event) => changeDestination(event.target.value as typeof destination)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal"><option value="nha-trang">Nha Trang</option><option value="da-lat">Đà Lạt</option></select></label>
            <label className="grid gap-2 text-sm font-semibold">Số người<input aria-label="Số người" type="number" min="1" max="30" required value={partySize} onChange={(event) => setPartySize(event.target.valueAsNumber)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">Ngày bắt đầu<input aria-label="Ngày bắt đầu" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">Ngày kết thúc<input aria-label="Ngày kết thúc" type="date" required min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">Phương tiện<select value={transportMode} onChange={(event) => setTransportMode(event.target.value as TransportMode)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal"><option value="walk">Đi bộ</option><option value="motorbike">Xe máy</option><option value="drive">Ô tô</option></select></label>
            <label className="grid gap-2 text-sm font-semibold">Nhịp chuyến đi<select value={pace} onChange={(event) => setPace(event.target.value as Pace)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal"><option value="relaxed">Thư thả</option><option value="balanced">Cân bằng</option><option value="active">Nhiều trải nghiệm</option></select></label>
          </fieldset>

          <fieldset className="grid gap-5 rounded-3xl border border-[#deded0] bg-white/60 p-5 sm:grid-cols-3 sm:p-7">
            <legend className="display-type px-2 text-2xl">2. Ngân sách nhóm</legend>
            <label className="grid gap-2 text-sm font-semibold">Tổng ngân sách (VND)<input aria-label="Tổng ngân sách" type="number" min="0" max="1000000000000" step="1000" required value={budget} onChange={(event) => setBudget(event.target.valueAsNumber)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">Chỗ ở đã biết<input aria-label="Chi phí chỗ ở" type="number" min="0" step="1000" value={lodging} onChange={(event) => setLodging(event.target.valueAsNumber)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal" /></label>
            <label className="grid gap-2 text-sm font-semibold">Di chuyển đã biết<input aria-label="Chi phí di chuyển" type="number" min="0" step="1000" value={transportCost} onChange={(event) => setTransportCost(event.target.valueAsNumber)} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal" /></label>
          </fieldset>

          <fieldset className="rounded-3xl border border-[#deded0] bg-white/60 p-5 sm:p-7">
            <legend className="display-type px-2 text-2xl">3. Cách lập kế hoạch</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex gap-3 rounded-2xl border border-input bg-white p-4"><input type="radio" name="planning-mode" value="assisted" checked={planningMode === "assisted"} onChange={() => setPlanningMode("assisted")} /><span><strong>Hệ thống gợi ý</strong><small className="mt-1 block text-[#58675b]">Chuẩn bị đầu vào để bộ lập lịch P04 sắp xếp.</small></span></label>
              <label className="flex gap-3 rounded-2xl border border-input bg-white p-4"><input type="radio" name="planning-mode" value="manual" checked={planningMode === "manual"} onChange={() => setPlanningMode("manual")} /><span><strong>Tôi tự lên kế hoạch</strong><small className="mt-1 block text-[#58675b]">Không tự đổi thứ tự hoặc loại điểm đã chọn.</small></span></label>
            </div>
            <div className="mt-6 grid max-h-80 gap-3 overflow-auto pr-1 sm:grid-cols-2" aria-label="Chọn điểm ghé">
              {places.slice(0, 12).map((place) => <label key={place.id} className="flex gap-3 rounded-2xl border border-[#deded0] bg-[#fffdf8] p-4"><input type="checkbox" checked={selectedIds.includes(place.id)} disabled={!selectedIds.includes(place.id) && selectedCount >= 30} onChange={(event) => { setSelectedIds((ids) => event.target.checked ? [...ids, place.id] : ids.filter((id) => id !== place.id)); setSubmitted(false); }} /><span><strong>{place.title}</strong><small className="mt-1 block text-[#58675b]">{place.durationMinutes} phút</small></span></label>)}
            </div>
            <ul aria-label="Các điểm đã thêm" className="mt-4 grid gap-2 text-sm">
              {selected.map((place) => <li key={place.id} className="flex flex-wrap items-center justify-between gap-2"><span>{place.title}</span><button type="button" aria-label={`Bỏ ${place.title}`} className="min-h-11 px-3" onClick={() => { setSelectedIds((ids) => ids.filter((id) => id !== place.id)); setSubmitted(false); }}>Bỏ chọn</button></li>)}
              {manualPlaces.map((place) => <li key={place.id} className="flex flex-wrap items-center justify-between gap-2"><span>{place.title} · nhập tay · chưa xác minh</span><button type="button" aria-label={`Bỏ ${place.title}`} className="min-h-11 px-3" onClick={() => { setManualPlaces((current) => current.filter((item) => item.id !== place.id)); setSubmitted(false); }}>Bỏ chọn</button></li>)}
            </ul>
          </fieldset>
          <PlaceImport key={destination} destination={destination} onEditorial={confirmEditorial} onManual={addManual} />
        </div>

        <aside className="h-fit rounded-3xl bg-[#edf0e4] p-6 lg:sticky lg:top-5">
          <h2 className="display-type text-2xl">Tóm tắt tức thì</h2>
          <dl className="mt-5 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt>Số ngày</dt><dd className="font-semibold">{dayCount > 0 ? dayCount : "—"}</dd></div><div className="flex justify-between gap-4"><dt>Số người</dt><dd className="font-semibold">{partySize || "—"}</dd></div><div className="flex justify-between gap-4"><dt>Điểm đã chọn</dt><dd className="font-semibold">{selectedCount}</dd></div><div className="flex justify-between gap-4"><dt>Mức tải gợi ý</dt><dd className="font-semibold">{paceStops[pace]} điểm/ngày</dd></div></dl>
          {summary && <div className="mt-5 border-t border-[#bdc5b4] pt-5 text-sm"><p>Còn lại sau chi phí đã biết</p><p className="mt-1 text-xl font-bold">{money.format(summary.remaining_known_budget_vnd ?? 0)}</p><p className="mt-2 text-[#58675b]">Khoảng {money.format(summary.available_per_person_day_vnd ?? 0)}/người/ngày. Chi phí tại {summary.unknown_cost_count} điểm vẫn chưa biết.</p></div>}
          {!valid && submitted && <p role="alert" className="mt-5 rounded-xl bg-[#f6e5cf] p-3 text-sm">Ngày đi phải từ 1–7 ngày; số người từ 1–30 và ngân sách không âm.</p>}
          <button type="submit" className="mt-6 min-h-11 w-full rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">Xem kết quả chuẩn bị</button>
          {submitted && valid && <div role="status" className="mt-5 rounded-2xl bg-white p-4 text-sm leading-6"><strong>{planningMode === "manual" ? "Kế hoạch cá nhân đã sẵn sàng" : "Đầu vào gợi ý đã sẵn sàng"}</strong><p className="mt-1 text-[#58675b]">{planningMode === "manual" ? "Hệ thống sẽ giữ nguyên danh sách để bạn tự xếp lịch." : `Có thể phân bổ khoảng ${Math.min(selected.length, paceStops[pace] * dayCount)} điểm trong ${dayCount} ngày trước khi kiểm tra tuyến đường.`}</p></div>}
        </aside>
      </form>
    </div>
  );
}
