"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CatalogPlace } from "@/domain/catalog";
import { filterCatalogDiscovery, legacySummaryDiscovery } from "@/domain/catalog";
import { discoveryPreferences, type DiscoveryPreferences } from "@/domain/discovery/recommendations";
import type { HybridPreview } from "@/application/planning/hybrid";
import { workbenchPreview } from "@/adapters/planning/workbench-preview";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import type { GeoZone } from "@/domain/discovery/geo";
import type { DestinationSlug } from "@/domain/model/destination";
import type { Pace, PlanningMode, TransportMode, TripDraft, TripStop } from "@/domain/model/trip";
import { localTripDates, draftIssues } from "@/domain/trip-draft";
import { summarizeTripBudget } from "@/domain/budget";
import { ApproximateRoutingProvider } from "@/adapters/routing/approximate";
import { routingInputForDraft, type EngineCandidate } from "@/domain/planning/engine";
import { validateManualPlan, type ManualConflict } from "@/domain/planning/manual";
import { DocWeather } from "./doc-weather";
import { RouteSketch } from "./route-sketch";
import { DocLodgingInput } from "./doc-lodging-input";
import { DocCommunityPicker } from "./doc-community-picker";
import { saveLocalPlan } from "@/lib/doc/local-vault";
import { generatePlanCode, validatedSavedPlan } from "@/lib/doc/saved-plan";
import { PlaceImport, type ManualPlaceInput } from "./place-import";
import { DiscoveryFilters } from "./discovery-filters";
import { PlaceDetails } from "./place-details";
import { useOnline } from "./use-online";
import { PlanningPreferences } from "./planning-preferences";
import { HybridSuggestions } from "./hybrid-suggestions";
import type { DiscoveryPlace } from "@/domain/discovery/place";

const centers: Record<DestinationSlug, { label: string; lat: number; lng: number }> = {
  "nha-trang": { label: "Trung tâm Nha Trang (tạm)", lat: 12.2388, lng: 109.1967 },
  "da-lat": { label: "Trung tâm Đà Lạt (tạm)", lat: 11.9404, lng: 108.4583 },
};
const formatMoney = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value) + " đ";
const humanDate = (value: string) => { const parts=value.split("-"); return parts.length===3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value; };
const paceStops: Record<Pace, number> = { relaxed: 2, balanced: 3, active: 4 };
const unscheduledLabels: Record<string,string> = {
  CAPACITY:"Quá số điểm dự kiến trong ngày", TIME_WINDOW:"Không đủ khung giờ", TRAVEL_TOO_LONG:"Thời gian di chuyển quá dài",
  UNREACHABLE:"Chưa có tuyến di chuyển khả dụng", CLOSED:"Địa điểm không có giờ tham quan phù hợp",
  LOCK_CONFLICT:"Xung đột giờ đã khóa", OUT_OF_AREA:"Ngoài khu vực chuyến đi", DUPLICATE:"Địa điểm bị trùng", UNKNOWN:"Chưa tìm được vị trí phù hợp",
};
const errorLabels: Record<string,string> = {
  DATES: "Chọn khoảng ngày từ 1 đến 7 ngày.", EDGE_TIMES: "Kiểm tra giờ đến và giờ rời đi.",
  BASE_OR_TITLE: "Kiểm tra điểm xuất phát và tọa độ.", PARTY_OR_BUDGET: "Kiểm tra số người và số tiền nhập.",
  STOP_COUNT_OR_IDENTITY: "Số điểm ghé không hợp lệ.", STOP_INPUT: "Có địa điểm hoặc thời lượng chưa hợp lệ.",
};
const conflictLabels: Record<ManualConflict["code"], string> = {
  DUPLICATE_ASSIGNMENT: "Điểm được xếp trùng.", UNKNOWN_STOP: "Điểm không có trong chuyến đi.",
  DAY_BOUNDS: "Ngoài giờ của ngày này.", OVERLAP: "Trùng giờ với điểm trước.",
  OPENING_HOURS: "Ngoài giờ hoạt động dự kiến.", BREAK: "Vướng giờ nghỉ trưa.",
  TRAVEL: "Không đủ thời gian di chuyển.", RETURN_TO_BASE: "Không kịp trở về điểm xuất phát.",
  LOCK_CONFLICT: "Xung đột với điểm đã khóa.", CAPACITY: "Vượt quá số điểm gợi ý trong ngày.",
  MANUAL_TRANSFER_REQUIRED: "Cần tự xác minh phương tiện trung chuyển.", ASSIGNMENT_TIME: "Giờ bắt đầu không hợp lệ.",
};
type Assignment = { date: string; time: string };
type ManualResult = ReturnType<typeof validateManualPlan>;
type Preview = { mode: "assisted"; result: EngineCandidate; unscheduled: EngineCandidate["unscheduled"]; hybrid: HybridPreview } | { mode: "manual"; result: ManualResult };

export function TravelWorkbench({ initialDestination, catalogs, localDraftId }: Readonly<{
  initialDestination: DestinationSlug;
  catalogs: Readonly<Record<DestinationSlug, readonly CatalogPlace[]>>;
  localDraftId: string;
}>) {
  const online=useOnline();
  const router=useRouter();
  const [destination, setDestination] = useState<DestinationSlug>(initialDestination);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [budget, setBudget] = useState<number | null>(null);
  const [arrival, setArrival] = useState("10:00");
  const [departure, setDeparture] = useState("17:00");
  const [mode, setMode] = useState<PlanningMode>("assisted");
  const [transport, setTransport] = useState<TransportMode>("motorbike");
  const [pace, setPace] = useState<Pace>("balanced");
  const [baseLabel, setBaseLabel] = useState(centers[initialDestination].label);
  const [baseLat, setBaseLat] = useState(String(centers[initialDestination].lat));
  const [baseLng, setBaseLng] = useState(String(centers[initialDestination].lng));
  const [baseTemporary, setBaseTemporary] = useState(true);
  const [lodgingCost, setLodgingCost] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualPlaces, setManualPlaces] = useState<Array<ManualPlaceInput & {id:string}>>([]);
  const [requiredIds, setRequiredIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<Record<string,Assignment>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [zone, setZone] = useState<GeoZone | "all">("all");
  const [detailsPlace, setDetailsPlace] = useState<CatalogPlace | null>(null);
  const [discoveryPrefs, setDiscoveryPrefs] = useState<DiscoveryPreferences>(()=>discoveryPreferences());
  const [useAi, setUseAi] = useState(false), [useProvider, setUseProvider] = useState(false);
  const [transientPlaces,setTransientPlaces]=useState<readonly DiscoveryPlace[]>([]);
  const [preview, setPreview] = useState<Preview|null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeDay, setActiveDay] = useState(0);
  const revision = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const importPanel=useRef<HTMLDetailsElement>(null);
  useEffect(()=>()=>pending.current?.abort(),[]);
  useEffect(()=>{if(!transientPlaces.length)return;const clear=()=>setTransientPlaces([]),hidden=()=>{if(document.hidden)clear();};const timer=setTimeout(clear,300_000);window.addEventListener("pagehide",clear);document.addEventListener("visibilitychange",hidden);return()=>{clearTimeout(timer);window.removeEventListener("pagehide",clear);document.removeEventListener("visibilitychange",hidden);};},[transientPlaces]);
  const places = catalogs[destination];
  const discoveryCatalog = useMemo(()=>places.flatMap(place=>{const projected=legacySummaryDiscovery(place);return projected?[projected]:[];}),[places]);
  const dayDates = localTripDates(startDate, endDate);
  const visiblePlaces = useMemo(() => filterCatalogDiscovery(places, query, category, zone, destination).slice(0, 30), [places, query, category, zone, destination]);
  const selected: TripStop[] = selectedIds.flatMap((id) => {
    const p = places.find((place) => place.id === id);
    const m = manualPlaces.find((place) => place.id === id);
    if (!p && !m) return [];
    return [{id, destination_slug: destination, user_title: p?.title ?? m!.title,
      ...(p ? {catalog_place_id: id} : {}),
      location: p ? {lat:p.lat,lng:p.lng} : m!.location,
      coordinate_provenance: p ? "editorial" as const : "user_entered" as const,
      requested_duration_min: p?.durationMinutes ?? m!.duration,
      is_required: requiredIds.includes(id), hours:p?.hours??{state:"hours_unknown" as const},
      transport_constraint:p?.transportConstraint??"access_unverified" as const,cost_estimate:{provenance:"unknown" as const} }];
  });
  const draft: TripDraft = {
    id:localDraftId, version:1,destination_slug:destination,
    title:`Lịch trình ${destination === "da-lat" ? "Đà Lạt":"Nha Trang"}`,
    timezone:"Asia/Ho_Chi_Minh",start_date:startDate,end_date:endDate,
    arrival_local_time:arrival,departure_local_time:departure,
    base_location:{label:baseLabel.trim(),lat:baseLat.trim()?Number(baseLat):NaN,lng:baseLng.trim()?Number(baseLng):NaN,temporary:baseTemporary},
    transport_mode:transport,pace,party_size:partySize,planning_mode:mode,
    budget:{currency:"VND",total_vnd:budget,known_costs_vnd:{lodging:lodgingCost,transport:0,meals:0,other:0}},
    preferences:{day_start:"08:00",day_end:"21:00",lunch_buffer_minutes:60,rest_buffer_minutes:15,return_to_base:true},stops:selected,
  };
  const budgetStops=preview?.mode==="assisted"?preview.hybrid.candidate_draft.stops:selected;
  const budgetSummary = dayDates.length && Number.isInteger(partySize) && partySize>=1 && partySize<=30 && (budget===null || (Number.isSafeInteger(budget) && budget>=0 && budget<=1000000000000))
    ? summarizeTripBudget(draft.budget,partySize,dayDates.length,budgetStops.map(s=>s.cost_estimate)):null;
  const clearPreview = () => {pending.current?.abort();pending.current=null;setWorking(false);revision.current+=1;setPreview(null);setTransientPlaces([]);setErrors([]);setNotice("");setActiveDay(0);};
  const preferenceInput = () => discoveryPreferences(discoveryPrefs);
  function changeDestination(next:DestinationSlug) {
    if(next===destination)return;
    if((selectedIds.length || preview) && !window.confirm("Đổi điểm đến sẽ xóa các điểm đã chọn và bản lịch trình hiện tại. Bạn muốn tiếp tục?"))return;
    setDestination(next);setBaseLabel(centers[next].label);setBaseLat(String(centers[next].lat));setBaseLng(String(centers[next].lng));setBaseTemporary(true);setLodgingCost(0);
    setSelectedIds([]);setManualPlaces([]);setRequiredIds([]);setAssignments({});setQuery("");setCategory("all");setZone("all");setDetailsPlace(null);setDiscoveryPrefs(previous=>({...previous,excluded_place_ids:[]}));clearPreview();
  }
  function choose(id:string) {
    setSelectedIds(list=>list.includes(id)?list.filter(x=>x!==id):list.length>=30?list:[...list,id]);
    setRequiredIds(list=>list.filter(x=>x!==id));
    setAssignments(a=>{const next={...a};delete next[id];return next;});clearPreview();
  }
  function addCatalog(id:string):string {
    if(!places.some(p=>p.id===id))return "Địa điểm không thuộc thành phố này.";
    if(discoveryPrefs.excluded_place_ids.includes(id))return "Điểm này đang bị loại trừ khỏi gợi ý. Gỡ loại trừ trong thông tin địa điểm trước khi thêm.";
    if(selectedIds.includes(id))return "Điểm này đã có trong danh sách.";
    if(selectedIds.length>=30)return "Chỉ chọn tối đa 30 điểm.";
    setSelectedIds(ids=>[...ids,id]);clearPreview();return "Đã thêm điểm vào tuyến dự kiến.";
  }
  function addManual(input:ManualPlaceInput):string {
    if(selectedIds.length>=30)return "Chỉ chọn tối đa 30 điểm.";
    if(manualPlaces.some(p=>p.title.toLocaleLowerCase("vi")===input.title.toLocaleLowerCase("vi")&&p.location.lat===input.location.lat&&p.location.lng===input.location.lng))return "Điểm này đã có trong danh sách.";
    const id=crypto.randomUUID();setManualPlaces(items=>[...items,{...input,id}]);setSelectedIds(ids=>[...ids,id]);clearPreview();return "Đã thêm điểm thủ công; cần xác minh tọa độ trước khi đi.";
  }
  function changeAssignment(id:string,key:keyof Assignment,value:string) {
    setAssignments(previous=>({...previous,[id]:{date:previous[id]?.date??"",time:previous[id]?.time??"",[key]:value}}));
    clearPreview();
  }
  async function buildPlan() {
    if(working)return;
    setErrors([]);
    const issues=draftIssues(draft);
    if(issues.length){setErrors(issues.map(issue=>errorLabels[issue]??`Dữ liệu chưa hợp lệ: ${issue}`));return;}
    if(!selected.length && (mode==="manual" || !discoveryPrefs.auto_suggest)){setErrors(["Chọn ít nhất một điểm ghé hoặc bật gợi ý thêm điểm phù hợp."]);return;}
    const version=revision.current;
    const controller=new AbortController();pending.current=controller;
    setWorking(true);
    try {
      const clock={now:()=>new Date()};
      if(mode==="assisted"){
        const response=await workbenchPreview(draft,preferenceInput(),discoveryCatalog,{online,useAi,useProvider,signal:controller.signal});
        if(revision.current!==version)return;
        const result=response.preview.planning;
        if(result.status==="conflict"){setErrors(result.conflicts.map(c=>`${selected.find(s=>s.id===c.stop_id)?.user_title??c.stop_id}: ${c.message}`));return;}
        setPreview({mode:"assisted",result:result.candidate,unscheduled:result.unscheduled,hybrid:response.preview});
        setTransientPlaces(response.transient?.places??[]);
        setNotice(response.preview.empty?"Chưa có điểm độc lập khớp sở thích/khu vực để lập lịch. Hãy nới bộ lọc hoặc thêm điểm riêng.":`Đã lập lịch thử bằng dữ liệu tọa độ và thời gian ước tính.${response.source==="offline"?" Đang dùng danh mục cục bộ khi ngoại tuyến.":response.source==="local_fallback"?" Dịch vụ chưa khả dụng; đã dùng danh mục và thuật toán trên máy.":""} Đây chưa phải xác nhận đặt chỗ hoặc chỉ đường.`);
      }else{
        const matrix=await new ApproximateRoutingProvider().estimateMatrix(routingInputForDraft(draft),controller.signal);
        if(revision.current!==version)return;
        const complete=selected.filter(s=>assignments[s.id]?.date && assignments[s.id]?.time).map(s=>({stop_id:s.id,plan_date:assignments[s.id].date,start_local:assignments[s.id].time}));
        if(!complete.length){setErrors(["Để tự xếp lịch, hãy gán ngày và giờ bắt đầu cho ít nhất một điểm."]);return;}
        const entries=complete.sort((a,b)=>a.plan_date.localeCompare(b.plan_date)||a.start_local.localeCompare(b.start_local));
        const result=validateManualPlan(draft,entries,matrix,clock);
        setPreview({mode:"manual",result});
        setNotice(result.valid?"Đã kiểm tra các mốc giờ bạn đặt. Chưa xác minh tuyến đường và giờ mở cửa thực tế.":"Có xung đột trong lịch tự xếp. Hãy xem cảnh báo và sửa giờ.");
      }
      setActiveDay(0);
    } catch(error) {
      if(revision.current!==version)return;
      setErrors([error instanceof Error ? `Không thể tạo lịch: ${error.message}` : "Không thể tạo lịch. Hãy kiểm tra thông tin đầu vào."]);
    }finally{if(pending.current===controller){pending.current=null;setWorking(false);}}
  }
  function confirmSuggestions() {
    if(preview?.mode!=="assisted")return;
    const additions=preview.hybrid.suggested_places.filter(place=>!selectedIds.includes(place.id));
    if(additions.some(place=>!places.some(known=>known.id===place.id))){setErrors(["Một gợi ý chưa có nguồn danh mục trên máy. Hãy kiểm tra và nhập độc lập trước khi thêm."]);return;}
    const required=new Set(preview.hybrid.candidate_draft.stops.filter(stop=>stop.is_required).map(stop=>stop.id));
    setSelectedIds(ids=>[...ids,...additions.map(place=>place.id)]);setRequiredIds(ids=>[...new Set([...ids,...additions.filter(place=>required.has(place.id)).map(place=>place.id)])]);
    clearPreview();setNotice(`Đã xác nhận thêm ${additions.length} gợi ý. Xếp lịch lại để xem bản mới.`);
  }
  async function docConfirmAndSave() {
    if (!preview) return;
    if (preview.mode === "manual" && !preview.result.valid) { setErrors(["Hãy sửa các xung đột trước khi xác nhận lưu."]); return; }
    if (preview.mode === "assisted" && (preview.result.unfulfilled_required.length > 0 || preview.hybrid.suggested_places.length > 0)) { setErrors(["Hãy xác nhận các điểm gợi ý và xếp lại lịch; tất cả điểm bắt buộc phải có trong lịch trước khi lưu."]); return; }
    if (!window.confirm("Lưu bản lịch trình dự kiến trên THIẾT BỊ NÀY? Đây không phải đơn đặt chỗ hoặc thời gian đi lại Google Maps.")) return;
    try {
      const content = validatedSavedPlan({ schemaVersion:1, code:generatePlanCode(), createdAt:new Date().toISOString(),
        draft, days:scheduledDays.map(item=>({date:item.date,stops:item.stops.map(stop=>({id:stop.id,start:stop.start,end:stop.end,travel:stop.travel})),...(item.returnTime?{returnTime:item.returnTime}:{})})),
        warnings:["Khoảng thời gian đi lại chỉ là ước lượng, không phải Google Maps ETA.","Giờ mở cửa và chi phí chưa được xác minh.", ...(preview.mode==="assisted"?preview.result.warnings:[])],
        status:"confirmed_preview" });
      await saveLocalPlan(content); try{sessionStorage.setItem("doc-last-created-code",content.code);}catch{window.prompt("Lưu mã kế hoạch này để mở lại:",content.code);} router.push("/plans");
    } catch(error) { setErrors([error instanceof Error?error.message:"Không lưu được bản kế hoạch trên trình duyệt này."]); }
  }
  function exportJson() {
    if(!preview)return;
    const data={preview_only:true,exported_at:new Date().toISOString(),assumptions:["Approximate straight-line routing, not road ETA","Opening hours and entry prices are unverified","Departure location uses an approximate temporary reference"],draft,discovery_preferences:preferenceInput(),preview};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`lo-trinh-${destination}.json`;anchor.click();URL.revokeObjectURL(url);
  }
  const scheduledDays = preview?.mode==="assisted" ? preview.result.days.map(day=>({date:day.date,stops:day.stops.map(stop=>({id:stop.stop_id,start:stop.start_local,end:stop.end_local,travel:stop.travel_from_previous_minutes})),returnTime:day.return_leg?.arrival_local}))
    : preview?.mode==="manual" ? dayDates.map(date=>({date,stops:preview.result.entries.filter(entry=>entry.plan_date===date).map(entry=>({id:entry.stop_id,start:entry.start_local,end:"",travel:null})),returnTime:undefined})) : [];
  const day = scheduledDays[activeDay] ?? scheduledDays[0];
  const displayStops=preview?.mode==="assisted"?preview.hybrid.candidate_draft.stops:selected;
  const routePoints = day?.stops.flatMap(s=>{const item=displayStops.find(p=>p.id===s.id);return item?[{id:item.id,name:item.user_title,location:item.location}]:[];})??[];

  return <div className="atlas-container">
    {detailsPlace && <PlaceDetails key={detailsPlace.id} place={detailsPlace} online={online} selected={selectedIds.includes(detailsPlace.id)} excluded={discoveryPrefs.excluded_place_ids.includes(detailsPlace.id)} onToggleExcluded={()=>{setDiscoveryPrefs(previous=>({...previous,excluded_place_ids:previous.excluded_place_ids.includes(detailsPlace.id)?previous.excluded_place_ids.filter(id=>id!==detailsPlace.id):[...previous.excluded_place_ids,detailsPlace.id]}));clearPreview();}} onClose={()=>setDetailsPlace(null)}/>}
    <section className="atlas-workhead" aria-labelledby="workbench-title"><div><span className="atlas-kicker">BỘ LẬP LỊCH / BẢN THỬ TRÊN MÁY</span><h1 id="workbench-title">Tuyến đường<br/><i>của bạn.</i></h1><p>Chọn địa điểm. Chốt ngày đi. Xem lịch trình được xếp theo thời gian — hoặc tự đặt từng chặng. Không cần điền 20 ô trước khi bắt đầu.</p></div><div className="atlas-workindex"><span>01</span><p>CHỌN ĐIỂM</p><span>02</span><p>XẾP LỊCH</p><span>03</span><p>SOÁT LẠI</p></div></section>
    {!online&&<p className="atlas-offline" role="status">Bạn đang ngoại tuyến. Chọn điểm và xếp lịch cục bộ vẫn dùng được; Google Maps không khả dụng và dữ liệu chưa được lưu.</p>}
    <div className="atlas-workgrid">
      <div className="atlas-workmain">
        <section className="atlas-panel" aria-labelledby="settings-heading" onChange={event=>{if((event.target as HTMLElement).getAttribute("aria-label")!=="Điểm đến")clearPreview();}}><div className="atlas-section-title"><span>01 / KHỞI HÀNH</span><h2 id="settings-heading">Ngày & người đồng hành</h2></div>
          <div className="atlas-fields">
            <label>Điểm đến<select aria-label="Điểm đến" value={destination} onChange={e=>changeDestination(e.target.value as DestinationSlug)}><option value="nha-trang">Nha Trang</option><option value="da-lat">Đà Lạt</option></select></label>
            <label>Đi cùng mấy người?<input aria-label="Số người" type="number" min="1" max="30" value={partySize} onChange={e=>setPartySize(e.target.valueAsNumber)}/></label>
            <label>Ngày đến<input aria-label="Ngày bắt đầu" type="date" value={startDate} onChange={e=>{setStartDate(e.target.value);if(endDate && endDate<e.target.value)setEndDate(e.target.value);}}/></label>
            <label>Ngày về<input aria-label="Ngày kết thúc" type="date" min={startDate||undefined} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>
            <label>Ngân sách cả nhóm (VND)<input aria-label="Tổng ngân sách" type="number" min="0" max="1000000000000" value={budget??""} onChange={e=>setBudget(e.target.value===""?null:e.target.valueAsNumber)}/></label>
          </div>
          <div className="atlas-pace" role="group" aria-label="Nhịp chuyến đi"><span>NHỊP ĐI</span>{([{value:"relaxed",label:"Thong thả"},{value:"balanced",label:"Vừa đủ"},{value:"active",label:"Đi nhiều"}] as const).map(option=><button type="button" key={option.value} aria-pressed={pace===option.value} className={pace===option.value?"active":""} onClick={()=>{setPace(option.value);clearPreview();}}>{option.label}</button>)}</div>
          <PlanningPreferences value={discoveryPrefs} onChange={setDiscoveryPrefs} useAi={useAi} useProvider={useProvider} onAi={setUseAi} onProvider={setUseProvider}/>
          <details className="atlas-details"><summary>Giờ đến/đi & phương tiện</summary><p>Mặc định đến lúc 10:00, rời lúc 17:00 và đi xe máy; đổi khi bạn đã có giờ thực tế.</p><div className="atlas-fields"><label>Đến lúc<input aria-label="Giờ đến" type="time" value={arrival} onChange={e=>setArrival(e.target.value)}/></label><label>Rời lúc<input aria-label="Giờ rời đi" type="time" value={departure} onChange={e=>setDeparture(e.target.value)}/></label><label>Phương tiện<select aria-label="Phương tiện" value={transport} onChange={e=>setTransport(e.target.value as TransportMode)}><option value="motorbike">Xe máy</option><option value="drive">Ô tô</option><option value="walk">Đi bộ</option></select></label></div></details>
          <DocLodgingInput destination={destination} onChoose={hotel=>{setBaseLabel(hotel.title);setBaseLat(String(hotel.lat));setBaseLng(String(hotel.lng));setBaseTemporary(false);clearPreview();setNotice("Đã dùng chỗ ở làm điểm xuất phát. Hãy tự xác minh lối vào.");}}/>
          <label className="atlas-search">Dự kiến chi phí chỗ ở cho cả nhóm (VND)<input type="number" min="0" max="1000000000000" value={lodgingCost} onChange={e=>{setLodgingCost(e.target.valueAsNumber);clearPreview();}}/></label>
          <details className="atlas-details"><summary>Chỉnh điểm xuất phát (nâng cao)</summary><p>Đang dùng tọa độ trung tâm thành phố làm điểm xuất phát tạm. Nếu ở khách sạn khác, hãy thay bằng tọa độ thực tế.</p><div className="atlas-fields"><label>Tên điểm xuất phát<input aria-label="Tên nơi lưu trú hoặc điểm gốc" value={baseLabel} onChange={e=>setBaseLabel(e.target.value)}/></label><label>Vĩ độ<input aria-label="Vĩ độ điểm gốc" value={baseLat} onChange={e=>setBaseLat(e.target.value)}/></label><label>Kinh độ<input aria-label="Kinh độ điểm gốc" value={baseLng} onChange={e=>setBaseLng(e.target.value)}/></label></div></details>
        </section>
        <section className="atlas-panel" aria-labelledby="places-heading"><div className="atlas-section-title"><span>02 / BẠN MUỐN GHÉ ĐÂU?</span><h2 id="places-heading">Gom các điểm dừng</h2><p>Chọn tối đa 30 điểm. Chưa có giờ mở cửa, vé vào cổng hoặc dữ liệu đường đi được xác minh.</p></div>
          <label className="atlas-search">Tìm trong danh mục<input aria-label="Tìm trong catalog" type="search" placeholder="Ví dụ: chợ, biển, thác, vườn…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
          <DiscoveryFilters category={category} zone={zone} onCategory={setCategory} onZone={setZone}/>
          <p aria-live="polite">Tìm thấy {visiblePlaces.length} điểm trong danh mục hiện tại.</p>
          <div className="atlas-place-list" aria-label="Chọn điểm ghé">{visiblePlaces.map((place,index)=>{const chosen=selectedIds.includes(place.id);return <div key={place.id} className="atlas-place-row"><button type="button" className={`atlas-place ${chosen?"chosen":""}`} aria-pressed={chosen} disabled={!chosen && (selectedIds.length>=30 || discoveryPrefs.excluded_place_ids.includes(place.id))} onClick={()=>choose(place.id)}><span className="atlas-place-num">{String(index+1).padStart(2,"0")}</span><span><strong>{place.title}</strong><small>{place.durationMinutes} phút · {place.categories?.map(c=>placeCategories[c]).join(", ")??place.category}</small></span><span className="atlas-place-add" aria-hidden="true">{chosen?"ĐÃ THÊM":"THÊM +"}</span></button><button type="button" className="atlas-place-info" aria-label={`Thông tin ${place.title}`} onClick={()=>setDetailsPlace(place)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></svg></button></div>;})}</div>
          {visiblePlaces.length===0&&<div className="atlas-empty">Chưa có địa điểm khớp từ khóa. Thử tìm ngắn hơn nhé.</div>}
          <div className="atlas-selected"><h3>Điểm trong túi <span>{selected.length}/30</span></h3>{selected.length?<ol aria-label="Các điểm đã thêm">{selected.map((stop,i)=><li key={stop.id}><span className="atlas-queue-no">{i+1}</span><strong>{stop.user_title}</strong><label className="atlas-required"><input type="checkbox" aria-label={`Bắt buộc ${stop.user_title}`} checked={requiredIds.includes(stop.id)} onChange={e=>{setRequiredIds(list=>e.target.checked?[...list,stop.id]:list.filter(id=>id!==stop.id));clearPreview();}}/>Phải ghé</label><button type="button" aria-label={`Bỏ ${stop.user_title}`} onClick={()=>choose(stop.id)}>Bỏ</button></li>)}</ol>:<p>Chưa chọn điểm ghé. Bắt đầu với hai hoặc ba nơi bạn thực sự muốn đến.</p>}</div>
          <details ref={importPanel} className="atlas-details atlas-import"><summary>Thêm điểm từ Google Maps / nhập tay</summary><PlaceImport key={destination} destination={destination} online={online} onEditorial={addCatalog} onManual={addManual}/></details>
          <DocCommunityPicker key={destination} destination={destination} onAdd={addManual}/>
          <Link href={`/contribute?destination=${destination}`} className="mt-4 inline-flex min-h-11 items-center underline">Đóng góp địa điểm cho cộng đồng</Link>
        </section>
        <section className="atlas-panel" aria-labelledby="plan-heading"><div className="atlas-section-title"><span>03 / XẾP TUYẾN</span><h2 id="plan-heading">Bạn muốn đi theo cách nào?</h2></div>
          <div className="atlas-mode" role="group" aria-label="Chế độ lập lịch"><button type="button" aria-pressed={mode==="assisted"} className={mode==="assisted"?"active":""} onClick={()=>{setMode("assisted");clearPreview();}}><strong>Tự động xếp lịch</strong><span>Hệ thống thử phân bổ điểm theo giờ và khoảng cách ước tính</span></button><button type="button" aria-pressed={mode==="manual"} className={mode==="manual"?"active":""} onClick={()=>{setMode("manual");clearPreview();}}><strong>Tôi tự xếp</strong><span>Bạn quyết định ngày và giờ, hệ thống báo xung đột</span></button></div>
          {mode==="manual"&&<div className="atlas-manual"><h3>Tự đặt giờ cho từng điểm</h3>{!dayDates.length&&<p>Chọn ngày đi hợp lệ ở bước 01 để mở danh sách ngày.</p>}{selected.map(stop=><div key={stop.id} className="atlas-assignment"><strong>{stop.user_title}</strong><label>Ngày<select aria-label={`Ngày ${stop.user_title}`} value={assignments[stop.id]?.date??""} onChange={e=>changeAssignment(stop.id,"date",e.target.value)}><option value="">Chưa xếp</option>{dayDates.map(date=><option value={date} key={date}>{humanDate(date)}</option>)}</select></label><label>Giờ bắt đầu<input aria-label={`Giờ ${stop.user_title}`} type="time" value={assignments[stop.id]?.time??""} onChange={e=>changeAssignment(stop.id,"time",e.target.value)}/></label></div>)}</div>}
          <button className="atlas-generate" type="button" disabled={working} onClick={buildPlan}>{working?"ĐANG TÍNH TUYẾN…":mode==="assisted"?"XẾP LỊCH TRÌNH →":"KIỂM TRA LỊCH CỦA TÔI →"}</button>
          {errors.length>0&&<div className="atlas-errors" role="alert"><strong>Chưa thể lập lịch</strong><ul>{errors.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
        </section>
        <section className="atlas-panel atlas-results" id="ket-qua" aria-labelledby="results-heading"><div className="atlas-section-title"><span>04 / BẢN LỊCH TRÌNH</span><h2 id="results-heading">Lịch đi theo ngày</h2></div>
          {!preview&&notice&&<p role="status">{notice}</p>}
          {!preview?<div className="atlas-empty atlas-empty-results"><span>CHƯA CÓ LỘ TRÌNH</span><p>Kết quả theo từng ngày sẽ xuất hiện tại đây sau khi bạn xếp lịch. Các điểm không xếp được cũng sẽ được liệt kê — không biến mất âm thầm.</p></div>:<div className="atlas-result-body" aria-live="polite"><div className="atlas-result-note" role="status">{notice}</div><div className="atlas-daytabs" role="tablist" aria-label="Ngày trong lịch trình">{scheduledDays.map((item,index)=><button type="button" key={item.date} role="tab" aria-selected={index===activeDay} className={index===activeDay?"active":""} onClick={()=>setActiveDay(index)}>NGÀY {index+1}<small>{humanDate(item.date)}</small></button>)}</div>
            {preview.mode==="assisted"&&<HybridSuggestions preview={preview.hybrid} transient={transientPlaces} onConfirm={confirmSuggestions} onClearFilters={()=>{setDiscoveryPrefs(previous=>({...previous,interests:[],zone:"all",max_distance_km:undefined}));clearPreview();}} onIndependent={()=>{if(importPanel.current){importPanel.current.open=true;importPanel.current.querySelector("summary")?.focus();importPanel.current.scrollIntoView({block:"start",behavior:"instant"});}}}/>}
            {day&&<div className="atlas-day"><div className="atlas-dayhead"><strong>{humanDate(day.date)}</strong><span>{day.stops.length} điểm ghé</span></div>{day.stops.length?<ol>{day.stops.map((stop,index)=><li key={stop.id}><span className="atlas-time">{stop.start}</span><span className="atlas-time-mark">{String(index+1).padStart(2,"0")}</span><div><strong>{displayStops.find(item=>item.id===stop.id)?.user_title??"Địa điểm"}</strong><p>{stop.end?`Kết thúc ${stop.end} · `:""}{stop.travel===null?"Giờ do bạn đặt":`Di chuyển ước lượng ${stop.travel} phút`}{!selectedIds.includes(stop.id)&&" · Gợi ý chưa thêm"}</p></div></li>)}</ol>:<p className="atlas-empty">Chưa có điểm nào trong ngày này.</p>}{preview.mode==="assisted"&&preview.result.days.find(item=>item.date===day.date)?.breaks.map((pause,index)=><p className="atlas-return" key={index}>Nghỉ trưa dự kiến {pause.start_local}–{pause.end_local}; nghỉ giữa điểm {draft.preferences.rest_buffer_minutes} phút.</p>)}{day.returnTime&&<p className="atlas-return">Về điểm xuất phát khoảng {day.returnTime} (ước lượng).</p>}</div>}
            {preview.mode==="assisted"&&<div className="atlas-unscheduled"><h3>Điểm chưa xếp được <span>{preview.unscheduled.length}</span></h3>{preview.unscheduled.length?<ul>{preview.unscheduled.map(stop=><li key={stop.stop_id}><strong>{displayStops.find(s=>s.id===stop.stop_id)?.user_title??stop.stop_id}</strong> — {stop.message==="MANUAL_TRANSFER_REQUIRED" ? conflictLabels.MANUAL_TRANSFER_REQUIRED : unscheduledLabels[stop.reason]??stop.reason}</li>)}</ul>:<p>Mọi điểm đã chọn đều có mặt trong bản thử.</p>}{preview.result.unfulfilled_required.length>0&&<p className="atlas-warning">Có điểm “phải ghé” chưa sắp xếp được. Lịch này chưa đạt yêu cầu.</p>}</div>}
            {preview.mode==="manual"&&<div className="atlas-unscheduled"><h3>Kiểm tra xung đột</h3>{preview.result.conflicts.length?<ul>{preview.result.conflicts.map((conflict,i)=><li key={`${conflict.stop_id}-${i}`}><strong>{selected.find(s=>s.id===conflict.stop_id)?.user_title??conflict.stop_id}</strong> — {conflictLabels[conflict.code]}</li>)}</ul>:<p>Chưa phát hiện xung đột trong các điểm đã được gán giờ.</p>}{preview.result.unscheduled.length>0&&<p>{preview.result.unscheduled.length} điểm chưa gán ngày/giờ và sẽ không tự động được thêm.</p>}</div>}
            <div className="atlas-export"><button type="button" onClick={exportJson}>TẢI BẢN NHÁP JSON</button><p>Chỉ tải trên máy, không lưu vào tài khoản hay chia sẻ công khai.</p></div>
            <div className="doc-saved-confirm"><button type="button" onClick={()=>void docConfirmAndSave()}>XÁC NHẬN & LƯU KẾ HOẠCH ↗</button><p>Kế hoạch sau xác nhận sẽ hiện trong “Kế hoạch đã lưu”. Có thể đồng bộ máy chủ sau nếu bạn chủ động chọn.</p></div>
          </div>}
        </section>
      </div>
      <aside className="atlas-rail"><div className="atlas-rail-top"><span>THÔNG TIN TUYẾN / {destination==="da-lat"?"ĐÀ LẠT":"NHA TRANG"}</span><strong>{selected.length.toString().padStart(2,"0")}<small> điểm đã chọn</small></strong><div><span>{dayDates.length||"—"} ngày</span><span>{paceStops[pace]} điểm/ngày (gợi ý)</span></div></div>
        <DocWeather city={destination} compact />
        <RouteSketch base={draft.base_location} points={preview?routePoints:selected.slice(0,7).map(item=>({id:item.id,name:item.user_title,location:item.location}))}/>
        <div className="atlas-budget"><span>QUỸ DỰ KIẾN</span><strong>{budget===null?"Chưa nhập ngân sách":Number.isSafeInteger(budget)&&budget>=0?formatMoney(budget):"Chưa hợp lệ"}</strong><p>{budgetSummary ? budgetSummary.available_per_person_day_vnd===null?"Chưa có ngân sách để chia cho từng ngày.":`${formatMoney(budgetSummary.available_per_person_day_vnd)} mỗi người / ngày nếu chia đều toàn bộ ngân sách.` : "Nhập ngày và số người để xem mức chia ngân sách."}</p><p className="atlas-caveat">Chưa trừ vé, ăn uống, chỗ ở, di chuyển và {budgetStops.length} điểm có chi phí chưa biết. Không phải giá tour.</p></div>
        <div className="atlas-rail-foot">TỌA ĐỘ ĐIỂM GỐC: {baseLat}, {baseLng}<p>Điểm xuất phát tạm. Khoảng thời gian đi lại sử dụng ước lượng đường chim bay, không phải ETA điều hướng.</p></div>
      </aside>
    </div>
  </div>;
}
