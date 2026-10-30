"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { MAX_VND_INPUT, summarizeTripBudget } from "@/domain/budget";
import { filterCatalog, type CatalogPlace } from "@/domain/catalog";
import type { Pace, PlanningMode, TransportMode, TripDraft, TripStop } from "@/domain/model/trip";
import { draftIssues, localTripDates } from "@/domain/trip-draft";
import { PlaceImport, type ManualPlaceInput } from "./place-import";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const paceStops: Record<Pace, number> = { relaxed: 2, balanced: 3, active: 4 };

function subscribeOnline(notify: () => void) {
  window.addEventListener("online", notify); window.addEventListener("offline", notify);
  return () => { window.removeEventListener("online", notify); window.removeEventListener("offline", notify); };
}
const onlineSnapshot = () => navigator.onLine;
const serverOnlineSnapshot = () => true;

export function PlanWizard({ initialDestination, catalogs }: Readonly<{
  initialDestination: "nha-trang" | "da-lat";
  catalogs: Readonly<Record<"nha-trang" | "da-lat", readonly CatalogPlace[]>>;
}>) {
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnlineSnapshot);
  const [destination, setDestination] = useState(initialDestination);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [budget, setBudget] = useState<number | null>(6_000_000);
  const [arrival, setArrival] = useState("10:00");
  const [departure, setDeparture] = useState("16:00");
  const [baseLabel, setBaseLabel] = useState("");
  const [baseLat, setBaseLat] = useState("");
  const [baseLng, setBaseLng] = useState("");
  const [temporaryBase, setTemporaryBase] = useState(true);
  const [lodging, setLodging] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [transportMode, setTransportMode] = useState<TransportMode>("motorbike");
  const [pace, setPace] = useState<Pace>("balanced");
  const [planningMode, setPlanningMode] = useState<PlanningMode>("assisted");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualPlaces, setManualPlaces] = useState<(ManualPlaceInput & { id: string })[]>([]);
  const [requiredIds, setRequiredIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [preparedDraft, setPreparedDraft] = useState<TripDraft | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const places = catalogs[destination];
  const dayCount = localTripDates(startDate, endDate).length;
  const visiblePlaces = useMemo(() => filterCatalog(places, query, "all"), [places, query]);
  const selectedStops: TripStop[] = selectedIds.flatMap((id) => {
    const editorial = places.find((place) => place.id === id), manual = manualPlaces.find((place) => place.id === id);
    if (!editorial && !manual) return [];
    return [{ id, destination_slug: destination, user_title: editorial?.title ?? manual!.title,
      ...(editorial ? { catalog_place_id: id } : {}),
      location: editorial ? { lat: editorial.lat, lng: editorial.lng } : manual!.location,
      coordinate_provenance: editorial ? "editorial" as const : "user_entered" as const,
      requested_duration_min: editorial?.durationMinutes ?? manual!.duration, is_required: requiredIds.includes(id),
      hours: editorial?.hours ?? { state: "hours_unknown" as const }, transport_constraint: editorial?.transportConstraint ?? "access_unverified" as const, cost_estimate: { provenance: "unknown" as const } }];
  });
  const selectedCount = selectedStops.length;
  const validMoney = (value: number) => Number.isSafeInteger(value) && value >= 0 && value <= MAX_VND_INPUT;
  const validBudget = dayCount >= 1 && Number.isInteger(partySize) && partySize >= 1 && partySize <= 30 && (budget === null || validMoney(budget)) && validMoney(lodging) && validMoney(transportCost);
  const summary = validBudget ? summarizeTripBudget(
    { currency: "VND", total_vnd: budget, known_costs_vnd: { lodging, transport: transportCost, meals: 0, other: 0 } },
    partySize,
    dayCount,
    Array.from({ length: selectedCount }, () => ({ provenance: "unknown" as const })),
  ) : null;
  const candidate: TripDraft = { id: "local-draft", version: 1, title: `Chuyến đi ${destination === "da-lat" ? "Đà Lạt" : "Nha Trang"}`, destination_slug: destination, timezone: "Asia/Ho_Chi_Minh", start_date: startDate, end_date: endDate, arrival_local_time: arrival, departure_local_time: departure,
    base_location: { label: baseLabel.trim(), lat: baseLat.trim() ? Number(baseLat) : NaN, lng: baseLng.trim() ? Number(baseLng) : NaN, temporary: temporaryBase }, transport_mode: transportMode, pace, party_size: partySize, planning_mode: planningMode,
    budget: { currency: "VND", total_vnd: budget, known_costs_vnd: { lodging, transport: transportCost, meals: 0, other: 0 } }, preferences: { day_start: "08:00", day_end: "21:00", lunch_buffer_minutes: 60, rest_buffer_minutes: 15, return_to_base: true }, stops: selectedStops };
  const valid = draftIssues(candidate).length === 0;

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setPreparedDraft(valid ? { ...candidate, id: crypto.randomUUID() } : null);
  }

  function changeDestination(value: "nha-trang" | "da-lat") {
    setDestination(value);
    setSelectedIds([]);
    setManualPlaces([]);
    setRequiredIds([]); setQuery(""); setBaseLabel(""); setBaseLat(""); setBaseLng(""); setPreparedDraft(null);
    setSubmitted(false);
  }

  function confirmEditorial(id: string): string {
    if (!places.some((place) => place.id === id)) return "Điểm này không thuộc catalog của chuyến đi.";
    if (selectedIds.includes(id)) return "Điểm này đã được chọn.";
    if (selectedCount >= 30) return "Mỗi chuyến đi tối đa 30 điểm.";
    setSelectedIds((ids) => [...ids, id]); setSubmitted(false); setPreparedDraft(null);
    return "Đã thêm điểm từ catalog. Giờ hoạt động và chi phí vẫn chưa xác minh.";
  }

  function addManual(input: ManualPlaceInput): string {
    if (selectedCount >= 30) return "Mỗi chuyến đi tối đa 30 điểm.";
    if (manualPlaces.some((place) => place.title.toLocaleLowerCase("vi") === input.title.toLocaleLowerCase("vi") && place.location.lat === input.location.lat && place.location.lng === input.location.lng)) return "Điểm này đã được chọn.";
    const id = crypto.randomUUID();
    setManualPlaces((current) => [...current, { ...input, id }]); setSelectedIds((ids) => [...ids, id]); setSubmitted(false); setPreparedDraft(null);
    return "Đã thêm điểm nhập tay. Giờ hoạt động, chi phí và khả năng tiếp cận chưa xác minh.";
  }

  return (
    <div className="page-shell">
      <header className="journey-hero">
        <div>
          <p className="eyebrow text-[#bd5941]">Sổ kế hoạch / Bản nháp chưa lưu</p>
          <h1 className="display-type">Viết lịch cho {destination === "da-lat" ? "Đà Lạt" : "Nha Trang"}.</h1>
          <p>Chọn nơi, ghi ngày đến và ngân sách của nhóm. Những điểm chưa rõ giờ mở cửa hoặc chi phí sẽ được đánh dấu để bạn kiểm tra trước chuyến đi.</p>
        </div>
        <aside><strong>Một trang sổ, một chuyến đi.</strong>Đây là công cụ chuẩn bị dữ liệu, chưa tạo lịch trình tự động hoặc lưu kế hoạch. Đừng dùng bản nháp như lịch đặt dịch vụ đã xác nhận.</aside>
      </header>
      {!online && <p role="status" className="offline-banner">Bạn đang ngoại tuyến. Có thể chọn điểm trong phiên hiện tại nhưng dữ liệu chưa được lưu; tải lại trang có thể mất nội dung.</p>}
      <form className="journey" onSubmit={submit} onChange={() => { setPreparedDraft(null); setSubmitted(false); }}>
        <div className="journey-fields">
          <fieldset className="journey-section">
            <legend><b>01 /</b> Chặng đường</legend>
            <p className="section-intro">Ghi lại thời gian bạn thực sự có. Chuyến đi hiện hỗ trợ từ một đến bảy ngày; giờ đến và giờ rời đi có thể giới hạn thời gian tham quan.</p>
            <div className="journey-grid">
              <label>Điểm đến<select value={destination} onChange={(event) => changeDestination(event.target.value as typeof destination)}><option value="nha-trang">Nha Trang</option><option value="da-lat">Đà Lạt</option></select></label>
              <label>Số người<input aria-label="Số người" type="number" min="1" max="30" required value={partySize} onChange={(event) => setPartySize(event.target.valueAsNumber)} /></label>
              <label>Ngày bắt đầu<input aria-label="Ngày bắt đầu" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label>Ngày kết thúc<input aria-label="Ngày kết thúc" type="date" required min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
              <label>Giờ đến<input type="time" required value={arrival} onChange={(event) => setArrival(event.target.value)} /></label>
              <label>Giờ rời đi<input type="time" required value={departure} onChange={(event) => setDeparture(event.target.value)} /></label>
              <label className="wide">Tên nơi lưu trú hoặc điểm gốc<input maxLength={200} placeholder="Ví dụ: khách sạn gần chợ Đà Lạt" required value={baseLabel} onChange={(event) => setBaseLabel(event.target.value)} /></label>
              <label>Vĩ độ điểm gốc<input inputMode="decimal" placeholder="Ví dụ: 11.9400" required value={baseLat} onChange={(event) => setBaseLat(event.target.value)} /></label>
              <label>Kinh độ điểm gốc<input inputMode="decimal" placeholder="Ví dụ: 108.4400" required value={baseLng} onChange={(event) => setBaseLng(event.target.value)} /></label>
              <label className="check-line wide"><input type="checkbox" checked={temporaryBase} onChange={(event) => setTemporaryBase(event.target.checked)} />Đây là điểm gốc tạm; cần kiểm tra lại trước khi đi.</label>
              <label>Phương tiện<select value={transportMode} onChange={(event) => setTransportMode(event.target.value as TransportMode)}><option value="walk">Đi bộ</option><option value="motorbike">Xe máy</option><option value="drive">Ô tô</option></select></label>
              <label>Nhịp chuyến đi<select value={pace} onChange={(event) => setPace(event.target.value as Pace)}><option value="relaxed">Thư thả</option><option value="balanced">Cân bằng</option><option value="active">Nhiều trải nghiệm</option></select></label>
            </div>
          </fieldset>
          <fieldset className="journey-section">
            <legend><b>02 /</b> Quỹ đường</legend>
            <p className="section-intro">Ngân sách tính cho toàn nhóm. Số còn lại chỉ trừ những khoản bạn đã nhập, chưa bao gồm vé tham quan, ăn uống và chi phí chưa biết.</p>
            <div className="journey-grid three">
              <label>Tổng ngân sách (VND, để trống nếu chưa biết)<input aria-label="Tổng ngân sách" type="number" min="0" max="1000000000000" step="1" value={budget ?? ""} onChange={(event) => setBudget(event.target.value === "" ? null : event.target.valueAsNumber)} /></label>
              <label>Chỗ ở đã biết<input aria-label="Chi phí chỗ ở" type="number" min="0" max="1000000000000" step="1" value={lodging} onChange={(event) => setLodging(event.target.valueAsNumber)} /></label>
              <label>Di chuyển đã biết<input aria-label="Chi phí di chuyển" type="number" min="0" max="1000000000000" step="1" value={transportCost} onChange={(event) => setTransportCost(event.target.valueAsNumber)} /></label>
            </div>
          </fieldset>
          <fieldset className="journey-section">
            <legend><b>03 /</b> Những điểm sẽ ghé</legend>
            <p className="section-intro">Tối đa 30 điểm. Dữ liệu catalog có thể thiếu giờ mở cửa hoặc đường tiếp cận. Điểm được đánh dấu “Bắt buộc” không nên bị tự ý bỏ khi lập lịch.</p>
            <div className="choice-grid">
              <label className="choice-ticket"><input type="radio" name="planning-mode" value="assisted" checked={planningMode === "assisted"} onChange={() => setPlanningMode("assisted")} /><span><strong>Hệ thống gợi ý</strong><small>Chuẩn bị đầu vào để bộ lập lịch xử lý ở phiên bản sau.</small></span></label>
              <label className="choice-ticket"><input type="radio" name="planning-mode" value="manual" checked={planningMode === "manual"} onChange={() => setPlanningMode("manual")} /><span><strong>Tôi tự lên kế hoạch</strong><small>Giữ nguyên danh sách; không tự thay đổi hoặc xóa điểm.</small></span></label>
            </div>
            <label className="mb-4">Tìm trong catalog<input type="search" placeholder="Tên địa điểm bạn muốn đến" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="selection-list" aria-label="Chọn điểm ghé">
              {visiblePlaces.map((place) => <label key={place.id} className="selection-card"><input type="checkbox" checked={selectedIds.includes(place.id)} disabled={!selectedIds.includes(place.id) && selectedCount >= 30} onChange={(event) => { setSelectedIds((ids) => event.target.checked ? [...ids, place.id] : ids.filter((id) => id !== place.id)); setSubmitted(false); }} /><span><strong>{place.title}</strong><small>{place.durationMinutes} phút</small></span></label>)}
            </div>
            {visiblePlaces.length === 0 && <p role="status" className="text-sm mt-3">Không có điểm phù hợp. Thử từ khóa khác; các điểm đã chọn vẫn được giữ.</p>}
            {selectedCount === 0 && <p className="text-sm mt-3">Chưa chọn điểm ghé. Chọn trong catalog hoặc nhập tay bên dưới.</p>}
            <ul aria-label="Các điểm đã thêm" className="selection-picked">
              {selectedStops.map((place) => <li key={place.id}><span>{place.user_title}{place.coordinate_provenance === "user_entered" ? " · nhập tay · chưa xác minh" : ""}</span><div className="pick-actions"><label className="check-line"><input type="checkbox" aria-label={`Bắt buộc ${place.user_title}`} checked={place.is_required} onChange={(event) => setRequiredIds((ids) => event.target.checked ? [...ids, place.id] : ids.filter((id) => id !== place.id))} />Bắt buộc</label><button type="button" aria-label={`Bỏ ${place.user_title}`} onClick={() => { setSelectedIds((ids) => ids.filter((id) => id !== place.id)); setManualPlaces((current) => current.filter((item) => item.id !== place.id)); setRequiredIds((ids) => ids.filter((id) => id !== place.id)); setSubmitted(false); setPreparedDraft(null); }}>Bỏ chọn</button></div></li>)}
            </ul>
          </fieldset>
          <PlaceImport key={destination} destination={destination} online={online} onEditorial={confirmEditorial} onManual={addManual} />
        </div>
        <aside className="journey-summary" aria-label="Tóm tắt chuyến đi">
          <h2>Nhật ký chuyến đi</h2>
          <dl><div><dt>Số ngày</dt><dd>{dayCount > 0 ? dayCount : "—"}</dd></div><div><dt>Số người</dt><dd>{partySize || "—"}</dd></div><div><dt>Điểm đã chọn</dt><dd>{selectedCount}</dd></div><div><dt>Nhịp gợi ý</dt><dd>{paceStops[pace]} điểm/ngày</dd></div></dl>
          {summary && <div className="summary-budget"><p>Còn lại sau chi phí đã biết</p><p className="money-value">{summary.remaining_known_budget_vnd === null ? "Chưa đặt ngân sách" : money.format(summary.remaining_known_budget_vnd)}</p><p className="summary-caveat">{summary.available_per_person_day_vnd === null ? "Chưa có mức chi/người/ngày." : `Khoảng ${money.format(summary.available_per_person_day_vnd)}/người/ngày.`} Chi phí tại {summary.unknown_cost_count} điểm vẫn chưa biết.</p></div>}
          {!valid && submitted && <p role="alert" className="journey-alert">Kiểm tra ngày đi 1–7 ngày, giờ đến/rời, tọa độ điểm gốc, số người 1–30 và ngân sách không âm.</p>}
          <button type="submit" className="journey-submit">Xem kết quả chuẩn bị</button>
          {preparedDraft && <section aria-label="Thông tin đã kiểm tra" className="journey-review"><p role="status"><strong>Đã kiểm tra thông tin sơ bộ</strong></p><p>Chưa tạo lịch trình và chưa lưu. Tải lại trang có thể mất dữ liệu.</p><p>{preparedDraft.planning_mode === "manual" ? "Hệ thống sẽ giữ nguyên danh sách để bạn tự xếp lịch." : "Lựa chọn đã được giữ để xem xét tính khả thi; chưa có ước tính tuyến đường."}</p><p>{preparedDraft.start_date} · {preparedDraft.arrival_local_time} → {preparedDraft.end_date} · {preparedDraft.departure_local_time}</p><p>{preparedDraft.base_location.label}: {preparedDraft.base_location.lat}, {preparedDraft.base_location.lng}{preparedDraft.base_location.temporary ? " · Điểm gốc tạm, cần kiểm tra lại." : ""}</p><ol>{preparedDraft.stops.map((stop) => <li key={stop.id}>{stop.user_title}{stop.is_required ? " · bắt buộc" : " · tùy chọn"}</li>)}</ol><p>Giờ hoạt động, chi phí và khả năng tiếp cận của các điểm chưa xác minh.</p></section>}
        </aside>
      </form>
    </div>
  );
}
