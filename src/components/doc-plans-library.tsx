"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { downloadPlanFile, findLocalPlan, listLocalPlans, removeLocalPlan, saveLocalPlan } from "@/lib/doc/local-vault";
import { codeSchema, validatedSavedPlan, type SavedPlan } from "@/lib/doc/saved-plan";

async function cloud(action: "publish" | "open" | "remove", data: SavedPlan | string): Promise<{plan?: SavedPlan;ok?:boolean;error?:string}> {
  const payload=action==="publish"?{action,plan:data}:{action,code:data};
  const response=await fetch("/api/v1/doc-plans",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
  const body=await response.json() as {plan?:SavedPlan;ok?:boolean;error?:string};
  if(!response.ok)throw new Error(body.error??`Lỗi đồng bộ ${response.status}`);
  return body;
}
export function DocPlansLibrary(){
  const [items,setItems]=useState<SavedPlan[]>([]),[code,setCode]=useState(""),[opened,setOpened]=useState<SavedPlan|null>(null);
  const [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  const [justCreatedCode,setJustCreatedCode]=useState("");
  const reload=async()=>{setItems(await listLocalPlans());setLoaded(true);};
  useEffect(()=>{
    let active=true;
    const timer=window.setTimeout(()=>{
      if(!active)return;
      try{const fresh=sessionStorage.getItem("doc-last-created-code");if(fresh){setJustCreatedCode(fresh);sessionStorage.removeItem("doc-last-created-code");}}catch{/* Optional session storage */}
    },0);
    void listLocalPlans().then(plans=>{if(active){setItems(plans);setLoaded(true);}}).catch(()=>{if(active){setLoaded(true);setMessage("Thiết bị không cho phép mở kho IndexedDB. Có thể nhập/xuất file JSON.");}});
    return()=>{active=false;window.clearTimeout(timer);};
  },[]);
  async function run(work:()=>Promise<void>){setBusy(true);setMessage("");try{await work();}catch(e){setMessage(e instanceof Error?e.message:"Có lỗi khi xử lý kế hoạch.");}finally{setBusy(false);}}
  async function open(){const value=code.trim();if(!codeSchema.safeParse(value).success){setMessage("Mã phải có dạng DOC- gồm 32 ký tự ngẫu nhiên.");return;}
    await run(async()=>{let plan=await findLocalPlan(value);if(!plan){const response=await cloud("open",value);if(!response.plan)throw new Error("Không có dữ liệu kế hoạch.");plan=validatedSavedPlan(response.plan);await saveLocalPlan(plan);await reload();}setOpened(plan);setMessage("Đã mở kế hoạch. Lưu ý đây là lịch trình dự kiến, không phải đặt chỗ.");});}
  async function upload(plan:SavedPlan){if(!window.confirm("Bạn có đồng ý tải lịch trình và tọa độ của mình lên máy chủ trong tối đa 90 ngày? Ai có mã kế hoạch sẽ đọc được dữ liệu này."))return;
    await run(async()=>{await cloud("publish",plan);setMessage("Đã đồng bộ lên máy chủ. Giữ kín mã DOC; người có mã có thể mở trên thiết bị khác.");});}
  async function remove(plan:SavedPlan){if(!window.confirm("Xóa bản kế hoạch trên THIẾT BỊ NÀY? Bản trên máy chủ (nếu có) không tự bị xóa."))return;
    await run(async()=>{await removeLocalPlan(plan.code);if(opened?.code===plan.code)setOpened(null);await reload();setMessage("Đã xóa bản cục bộ.");});}
  async function importFile(file:File|null){if(!file)return;await run(async()=>{if(file.size>70_000)throw new Error("Tệp JSON quá lớn.");const data=JSON.parse(await file.text());const plan=validatedSavedPlan(data);await saveLocalPlan(plan);await reload();setMessage(`Đã nhập kế hoạch ${plan.draft.title} trên thiết bị này.`);});}
  return <div className="atlas-container doc-vault-page">
    <header className="doc-vault-hero"><p className="doc-overline">TỦ KÝ ỨC / DỌC</p><h1>Những chuyến đi <em>đã lên kế hoạch.</em></h1><p>Mỗi chuyến đi là một chương mới. Kế hoạch bạn xác nhận được lưu trên trình duyệt này. Bạn cần mã DOC để mở chi tiết kế hoạch, kể cả trên trình duyệt đã lưu. Chỉ người có mã mới mở được bản trên máy chủ.</p>
      <Link className="doc-button doc-button-primary" href="/plan/new">Lên kế hoạch mới ↗</Link></header>
    {justCreatedCode&&<section className="doc-vault-panel" aria-label="Mã kế hoạch mới"><h2>Sao chép mã kế hoạch ngay</h2><p>Đây là mã vừa tạo. DỌC chỉ hiện một lần sau khi xác nhận; hãy lưu ở nơi riêng tư.</p><code>{justCreatedCode}</code><button type="button" onClick={()=>void navigator.clipboard.writeText(justCreatedCode).then(()=>setMessage("Đã sao chép mã kế hoạch."),()=>setMessage("Hãy sao chép mã thủ công."))}>Sao chép mã</button><button type="button" onClick={()=>setJustCreatedCode("")}>Đã lưu mã</button></section>}
    <section className="doc-vault-panel"><h2>Kế hoạch trên thiết bị <small>({loaded?items.length:"…"})</small></h2>
      {loaded && items.length===0&&<p>Chưa có kế hoạch đã xác nhận trên thiết bị này. Tạo mới hoặc nhập file từ thiết bị khác.</p>}
      <div className="doc-vault-list">{items.map(plan=><article key={plan.code} className="doc-vault-card"><span className="doc-overline">{plan.draft.destination_slug==="da-lat"?"ĐÀ LẠT":"NHA TRANG"} · {plan.days.length} NGÀY</span>
        <h3>{plan.draft.title}</h3><p>{plan.draft.start_date} → {plan.draft.end_date} · {plan.days.reduce((n,d)=>n+d.stops.length,0)} điểm xếp lịch</p>
        <code>DOC-••••••••••••••••••••••••••••{plan.code.slice(-4)}</code><div className="doc-vault-actions"><button type="button" onClick={()=>setMessage("Để mở hoặc thao tác với kế hoạch, hãy nhập mã DOC tại mục bên dưới.")}>Nhập mã để mở</button></div></article>)}</div>
    </section>
    <section className="doc-vault-panel"><h2>Mở bằng mã kế hoạch</h2><p>Trên thiết bị khác, mã chỉ mở được sau khi bản kế hoạch đã được đồng bộ máy chủ. Nếu không có mã, bạn không thể đọc kế hoạch riêng tư của người khác.</p>
      <div className="doc-code-row"><label>Mã DOC<input type="text" value={code} maxLength={36} autoComplete="off" placeholder="DOC-..." onChange={e=>setCode(e.target.value.trim())}/></label><button type="button" disabled={busy} onClick={()=>void open()}>Mở kế hoạch</button></div>
      <label className="doc-file-choose">Nhập bản sao kế hoạch từ file JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>void importFile(e.target.files?.[0]??null)}/></label>
    </section>
    {message&&<p className="doc-vault-message" role="status">{message}</p>}
    {opened&&<section className="doc-vault-panel doc-opened"><div className="doc-section-header"><div><p className="doc-overline">KẾ HOẠCH ĐÃ XÁC NHẬN (DỰ KIẾN)</p><h2>{opened.draft.title}</h2></div><button type="button" onClick={()=>downloadPlanFile(opened)}>Tải bản sao JSON</button></div>
      <p>Mã truy cập: <code>{opened.code}</code></p><div className="doc-vault-actions"><button type="button" disabled={busy} onClick={()=>void upload(opened)}>Đồng bộ máy chủ</button><button type="button" disabled={busy} onClick={()=>void remove(opened)}>Xóa trên máy</button></div><p>Chỗ ở / điểm xuất phát: <strong>{opened.draft.base_location.label}</strong></p>
      {opened.days.map((d,i)=><div className="doc-vault-day" key={d.date}><h3>Chặng {String(i+1).padStart(2,"0")} · {d.date}</h3><ol>{d.stops.map(s=><li key={s.id}><span>{s.start}</span><strong>{opened.draft.stops.find(stop=>stop.id===s.id)?.user_title??"Địa điểm"}</strong><small>{s.travel===null?"Giờ tự chọn":`${s.travel} phút di chuyển ước lượng`}</small></li>)}</ol></div>)}
      {opened.warnings.length>0&&<details><summary>Các giả định và cảnh báo</summary><ul>{opened.warnings.map((w,i)=><li key={`${i}-${w}`}>{w}</li>)}</ul></details>}
    </section>}
    <p className="doc-vault-footnote">Mã DOC là quyền truy cập cho bất kỳ ai sở hữu nó. Không chia sẻ công khai. Dữ liệu cục bộ có thể mất khi xóa dữ liệu trình duyệt; hãy xuất bản sao. Cloud không phải bản sao lưu vĩnh viễn.</p>
  </div>;
}
