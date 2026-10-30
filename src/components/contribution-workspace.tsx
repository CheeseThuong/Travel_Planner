"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DestinationSlug } from "@/domain/model/destination";
import { contributionLabels, type CommunityPlace, type SubmissionSummary } from "@/domain/discovery/contribution";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import { contributionSchema } from "@/lib/validation/contribution";
import { PlaceImport, type ManualPlaceInput } from "./place-import";
import { useOnline } from "./use-online";

class ContributionRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, body?: unknown, key?: string): Promise<T> {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }), headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) }, cache: "no-store", signal: AbortSignal.timeout(18_000) });
  const result = await response.json();
  if (!response.ok) throw new ContributionRequestError(typeof result.error?.message === "string" ? result.error.message : "Chưa xử lý được thao tác. Nội dung bạn nhập vẫn được giữ.", response.status);
  return result.data as T;
}
const button = "min-h-11 border border-input bg-white px-4 py-2 disabled:opacity-50";
const field = "min-h-11 min-w-0 w-full border border-input bg-white px-3 py-2";

export function ContributionWorkspace({ initialDestination, enabled }: Readonly<{ initialDestination: DestinationSlug; enabled: boolean }>) {
  const [destination, setDestination] = useState(initialDestination);
  return <div className="atlas-container py-8"><h1 className="text-3xl">Đóng góp địa điểm</h1><p className="my-4">Chia sẻ nội dung do bạn tự viết và vị trí bạn đã kiểm tra. Đóng góp được lưu riêng, chỉ công khai sau kiểm duyệt; giờ mở cửa, giá và lối vào vẫn chưa xác minh.</p>
    <label className="grid max-w-sm gap-2">Thành phố đóng góp<select className={field} value={destination} onChange={event => { const next = event.target.value as DestinationSlug; if (next !== destination && window.confirm("Đổi thành phố sẽ xóa nội dung đóng góp chưa gửi. Tiếp tục?")) setDestination(next); }}><option value="da-lat">Đà Lạt</option><option value="nha-trang">Nha Trang</option></select></label>
    <ContributionPanel key={destination} destination={destination} enabled={enabled}/>
    <Link href={`/plan/new?destination=${destination}`} className="my-6 inline-flex min-h-11 items-center underline">Trở về lập lịch trình</Link>
  </div>;
}

function ContributionPanel({ destination, enabled }: Readonly<{ destination: DestinationSlug; enabled: boolean }>) {
  const online = useOnline();
  const [session, setSession] = useState<{ moderator: boolean } | null>(null);
  const [point, setPoint] = useState<ManualPlaceInput | null>(null), [description, setDescription] = useState(""), [address, setAddress] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("landmarks"), [tags, setTags] = useState(""), [transfer, setTransfer] = useState(false), [rights, setRights] = useState(false);
  const [scope, setScope] = useState<"mine" | "review">("mine"), [rows, setRows] = useState<SubmissionSummary[]>([]), [publicRows, setPublicRows] = useState<CommunityPlace[] | null>(null);
  const [offset, setOffset] = useState(0), [publicOffset, setPublicOffset] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const attempt = useRef<{ body: string; key: string } | null>(null);
  const contributionReady = Boolean(session && online && enabled && point && description.trim() && rights && !busy);
  const formProgress = [Boolean(point), Boolean(description.trim()), Boolean(rights)];
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    void fetch("/api/v1/contributions/session", { cache: "no-store", signal: abort.signal }).then(async response => { if (!response.ok) return; const result = await response.json(); if (!abort.signal.aborted) setSession(result.data); }).catch(() => {});
    return () => abort.abort();
  }, [enabled]);
  async function load(currentScope = scope, currentOffset = offset) {
    const result = await request<{ items: SubmissionSummary[] }>(`/api/v1/contributions?destination_slug=${destination}&scope=${currentScope}&offset=${currentOffset}`); setRows(result.items); setOffset(currentOffset);
  }
  async function loadPublic(currentOffset = publicOffset) {
    const result = await request<{ items: CommunityPlace[] }>(`/api/v1/community-places?destination_slug=${destination}&offset=${currentOffset}`); setPublicRows(result.items); setPublicOffset(currentOffset);
  }
  async function operation(action: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (failure) { if (failure instanceof ContributionRequestError && failure.status === 401) setSession(null); setError(failure instanceof Error ? failure.message : "Không thể xử lý lúc này. Nội dung đã nhập vẫn được giữ."); }
    finally { setBusy(false); }
  }
  function docSaveContributionDraft() {try {
    if(!point) {setMessage("Chọn vị trí trước khi lưu nháp.");return;}
    localStorage.setItem("doc-contribution-draft-"+destination,JSON.stringify({point,description,address,category,tags,transfer}));
    setMessage("Đã lưu bản nháp đóng góp trên trình duyệt này (chưa gửi máy chủ).");
   } catch {setError("Thiết bị không cho lưu bản nháp. Hãy sao chép nội dung ra nơi an toàn.");}}
  function docRestoreContributionDraft() {try {
    const raw=localStorage.getItem("doc-contribution-draft-"+destination);if(!raw){setMessage("Chưa có bản nháp đóng góp trên máy này.");return;}
    const p=JSON.parse(raw) as {point?:ManualPlaceInput;description?:string;address?:string;category?:PlaceCategory;tags?:string;transfer?:boolean};
    if(!p.point||typeof p.point.title!=="string"||!p.point.location||!Number.isFinite(p.point.location.lat)||!Number.isFinite(p.point.location.lng))throw Error();
    setPoint(p.point);setDescription(typeof p.description==="string"?p.description.slice(0,1000):"");setAddress(typeof p.address==="string"?p.address.slice(0,300):"");
    if(p.category && Object.hasOwn(placeCategories,p.category))setCategory(p.category);
    setTags(typeof p.tags==="string"?p.tags.slice(0,329):"");setTransfer(Boolean(p.transfer));setRights(false);setMessage("Đã khôi phục bản nháp. Cần xác nhận lại quyền chia sẻ.");
  }catch {setError("Bản nháp trên trình duyệt không hợp lệ.");}}
  async function submit() {
    const parsed = contributionSchema.safeParse({ destination_slug: destination, title: point?.title, description, address: address.trim() || null, location: point?.location, categories: [category], tags: tags.split(",").map(value => value.trim()).filter(Boolean), suggested_duration_min: point?.duration, transport_constraint: transfer ? "manual_transfer" : "access_unverified", source: "original_user_contribution", rights_confirmed: rights });
    if (!parsed.success) { const fields = [...new Set(parsed.error.issues.map(issue => String(issue.path[0] ?? "thông tin")))]; setError(`Dữ liệu chưa hợp lệ (${fields.join(", ")}). Kiểm tra tên/vị trí, mô tả tự viết, loại địa điểm, thẻ và quyền chia sẻ trước khi gửi.`); return; }
    const body = JSON.stringify(parsed.data);
    if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };
    const result = await request<{ status: string }>("/api/v1/contributions", parsed.data, attempt.current!.key);
    setMessage(result.status === "duplicate" || result.status === "replayed" ? "Đóng góp này đã được nhận trước đó; không tạo bản trùng." : "Đã gửi đóng góp riêng, đang chờ kiểm duyệt. Chưa công khai.");
    try { await load(); } catch { setMessage("Máy chủ đã nhận đóng góp, nhưng chưa tải được danh sách. Dùng nút Tải đóng góp của tôi để kiểm tra lại."); }
  }
  async function transition(row: SubmissionSummary, action: string) {
    await request(`/api/v1/contributions/${row.id}`, { expected_version: row.version, action, note: notes[row.id] ?? "" });
    setMessage("Đã cập nhật trạng thái đóng góp."); await load();
    if (publicRows) await loadPublic();
  }
  return <div className="my-6 grid min-w-0 gap-6" aria-busy={busy}>
    {!enabled && <p role="status">Đóng góp chưa được cấu hình trên môi trường này. Bạn vẫn có thể tìm/chọn ghim và lập lịch cục bộ; chưa có nội dung nào được gửi.</p>}
    {!online && <p role="status">Đang ngoại tuyến. Nội dung đang nhập vẫn được giữ trong trang này; gửi và kiểm duyệt cần kết nối.</p>}
    <section className="atlas-panel" aria-label="Phiên đóng góp"><h2 className="text-xl">Quyền quản lý đóng góp</h2><p className="my-3">Phiên ẩn danh chỉ thuộc trình duyệt hiện tại, hết hạn sau khoảng một giờ. Đóng trình duyệt hoặc mất thông tin phiên có thể mất quyền quản lý; đây chưa phải tài khoản có thể khôi phục.</p>
      {session ? <p>Phiên đã xác thực{session.moderator ? " · Có quyền kiểm duyệt" : " · Người đóng góp"}.</p> : <button type="button" className={button} disabled={!enabled || !online || busy} onClick={() => void operation(async () => { setSession(await request("/api/v1/contributions/session", {})); setMessage("Đã tạo phiên đóng góp trên trình duyệt này."); })}>Tạo phiên đóng góp</button>}
    </section>
    <section className="atlas-panel" aria-label="Nội dung đóng góp"><h2 className="text-xl">Chọn vị trí & viết nội dung</h2><ol className="atlas-contribute-steps" aria-label="Tiến độ đóng góp"><li className={formProgress[0] ? "done" : ""}><strong>01 / Địa điểm</strong>Dán JSON gTrack hoặc chọn ghim.</li><li className={formProgress[1] ? "done" : ""}><strong>02 / Nội dung</strong>Viết mô tả bằng lời của bạn.</li><li className={formProgress[2] ? "done" : ""}><strong>03 / Xác nhận</strong>Kiểm tra thông tin và quyền chia sẻ.</li></ol><p className="my-3">Tìm tên hoặc dán Maps để kiểm tra điểm đã có. Với điểm mới, nhập tên riêng, chọn ghim và xác nhận. Không chép mô tả, đánh giá, giờ mở cửa hoặc giá từ Google/Brave.</p>
      <PlaceImport destination={destination} online={online} onEditorial={() => "Điểm đã có trong danh mục độc lập. Bạn có thể dùng điểm này khi lập lịch; không cần gửi bản trùng."} onManual={value => { setPoint(value); if (value.address) setAddress(value.address); if (value.category) setCategory(value.category); setMessage("Đã chọn vị trí cho đóng góp. Viết mô tả và xác nhận quyền chia sẻ trước khi gửi."); return "Đã chọn tên/vị trí cho đóng góp; chưa gửi và chưa công khai."; }}/>
      {point && <output aria-label="Vị trí đóng góp" className="my-4 block">{point.title} · {point.location.lat}, {point.location.lng} · {point.duration} phút gợi ý</output>}
      <div className="atlas-fields my-4"><label>Mô tả do bạn tự viết<textarea className={field} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)}/></label><label>Địa chỉ (tùy chọn)<input className={field} maxLength={300} value={address} onChange={event => setAddress(event.target.value)}/></label>
        <label>Nhóm địa điểm<select className={field} value={category} onChange={event => setCategory(event.target.value as PlaceCategory)}>{Object.entries(placeCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Thẻ, cách nhau bằng dấu phẩy (tùy chọn)<input className={field} maxLength={329} value={tags} onChange={event => setTags(event.target.value)}/></label></div>
      <label className="my-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={transfer} onChange={event => setTransfer(event.target.checked)}/>Cần trung chuyển riêng (tàu, thuyền…)</label>
      <label className="my-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={rights} onChange={event => setRights(event.target.checked)}/>Tôi tự viết nội dung, đã kiểm tra ghim và có quyền cho phép công khai đóng góp này.</label>
      <p className="atlas-form-note" role="status">{!enabled ? "Chức năng gửi chưa bật trên máy chủ (kiểm tra CLOUD_ENABLED và Supabase)." : !session ? "Bước bắt buộc: tạo phiên đóng góp ở mục Quyền quản lý trước khi gửi." : !point ? "Chưa chọn hoặc xác nhận địa điểm." : !description.trim() ? "Chưa nhập mô tả tự viết." : !rights ? "Cần tích xác nhận quyền chia sẻ." : !online ? "Đang ngoại tuyến; nội dung chưa thể gửi." : "Sẵn sàng gửi để kiểm duyệt. Địa điểm chưa được công khai ngay."}</p><button type="button" className={button} disabled={!contributionReady} onClick={() => void operation(submit)}>Gửi đóng góp để kiểm duyệt</button>
      <div className="doc-contribution-save"><button type="button" onClick={docSaveContributionDraft}>LƯU NHÁP TRÊN MÁY</button><button type="button" onClick={docRestoreContributionDraft}>KHÔI PHỤC NHÁP</button><p>Nháp chỉ ở trình duyệt này. Địa điểm được người khác nhìn thấy sau khi bạn gửi và người kiểm duyệt chấp thuận.</p></div>
    </section>
    {(error || message) && <section aria-label="Thông báo đóng góp">{error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}</section>}
    {session && <section className="atlas-panel" aria-label="Quản lý đóng góp"><h2 className="text-xl">Theo dõi & xử lý</h2><div className="my-4 flex flex-wrap gap-3"><button type="button" className={button} disabled={busy || !online} onClick={() => void operation(async () => { await load("mine",0); setScope("mine"); })}>Tải đóng góp của tôi</button>{session.moderator && <button type="button" className={button} disabled={busy || !online} onClick={() => void operation(async () => { await load("review",0); setScope("review"); })}>Tải hàng đợi kiểm duyệt</button>}</div>
      <p>Trang {offset / 20 + 1}, tối đa 20 mục theo thời điểm gửi. Nếu gặp xung đột phiên bản, tải lại trước khi xử lý.</p>
      <ul aria-label={scope === "review" ? "Hàng đợi kiểm duyệt" : "Đóng góp của tôi"}>{rows.map(row => <li key={row.id} className="my-4 border border-input p-4"><h3>{row.payload.title}</h3><p>{contributionLabels[row.state]} · phiên bản {row.version}</p><p>{row.payload.description}</p><p>{row.payload.location.lat}, {row.payload.location.lng} · {row.payload.categories.map(value => placeCategories[value]).join(", ")}</p><p>Giờ, giá và khả năng tiếp cận chưa xác minh. Nguồn: nội dung người dùng có xác nhận quyền chia sẻ.</p>{row.duplicate_hints.length > 0 && <p>Có {row.duplicate_hints.length} nghi vấn trùng với điểm công khai; cần kiểm tra riêng, chưa tự gộp.</p>}{row.latest_note && <p>Ghi chú gần nhất: {row.latest_note}</p>}
        {scope === "review" && <label className="my-3 grid gap-2">Ghi chú kiểm duyệt {row.payload.title}<input className={field} maxLength={1000} value={notes[row.id] ?? ""} onChange={event => setNotes(previous => ({ ...previous, [row.id]: event.target.value }))}/></label>}
        <div className="mt-3 flex flex-wrap gap-3">{(scope === "mine" ? row.state === "withdrawn" || row.state === "rejected" ? [{ action: "restore", label: "Gửi lại để duyệt" }] : [{ action: "withdraw", label: "Rút đóng góp" }] : [
          ...(row.state === "submitted" ? [{ action: "verify", label: "Bắt đầu kiểm duyệt" }] : []), ...(row.state === "verification" ? [{ action: "approve", label: "Duyệt đóng góp" }] : []),
          ...(["submitted", "verification", "approved"].includes(row.state) ? [{ action: "reject", label: "Từ chối / thu hồi duyệt" }] : []), ...(row.state === "rejected" ? [{ action: "restore", label: "Khôi phục để duyệt lại" }] : []),
        ]).map(action => <button key={action.action} type="button" className={button} disabled={busy || !online} onClick={() => void operation(() => transition(row, action.action))}>{action.label}</button>)}</div>
      </li>)}</ul>
      <nav aria-label="Phân trang đóng góp riêng" className="flex flex-wrap gap-3"><button type="button" className={button} disabled={busy || !online || offset === 0} onClick={()=>void operation(()=>load(scope,offset-20))}>Trang trước</button><button type="button" className={button} disabled={busy || !online || rows.length<20 || offset>=1000} onClick={()=>void operation(()=>load(scope,offset+20))}>Trang sau</button></nav>
    </section>}
    <section className="atlas-panel" aria-label="Đóng góp công khai"><h2 className="text-xl">Địa điểm cộng đồng đã duyệt</h2><button type="button" className={`${button} my-4`} disabled={!enabled || !online || busy} onClick={() => void operation(()=>loadPublic())}>Xem đóng góp đã duyệt</button>
      {publicRows && (publicRows.length ? <ul>{publicRows.map(place => <li key={place.id} className="my-3"><h3>{place.title}</h3><p>{place.description}</p><p>Nguồn: đóng góp người dùng đã qua kiểm duyệt. Tọa độ do người dùng xác nhận; giờ mở cửa, giá và khả năng tiếp cận chưa xác minh.</p></li>)}</ul> : <p>Chưa có đóng góp được duyệt cho thành phố này.</p>)}
      {publicRows && <nav aria-label="Phân trang đóng góp công khai" className="flex flex-wrap gap-3"><button type="button" className={button} disabled={busy || !online || publicOffset===0} onClick={()=>void operation(()=>loadPublic(publicOffset-20))}>Trang trước</button><span>Trang {publicOffset/20+1}</span><button type="button" className={button} disabled={busy || !online || publicRows.length<20 || publicOffset>=1000} onClick={()=>void operation(()=>loadPublic(publicOffset+20))}>Trang sau</button></nav>}
    </section>
  </div>;
}
