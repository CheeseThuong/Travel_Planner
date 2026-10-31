"use client";
import { useState } from "react";
type Snapshot = {contributions:string;privatePlanCloud:string;note?:string};
export function DocContributionHealth() {
  const [data,setData]=useState<Snapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function inspect(){setBusy(true);setError("");setData(null);try{const response=await fetch("/api/v1/doc-status",{cache:"no-store"});if(!response.ok)throw new Error();const result:{data:Snapshot}=await response.json();setData(result.data);}catch{setError("Không kết nối được trang kiểm tra máy chủ hoặc cấu hình không hợp lệ.");}finally{setBusy(false);}}
  return <section className="doc-contrib-health" aria-label="Chẩn đoán chức năng gửi đóng góp"><h2>Vì sao chưa gửi được địa điểm?</h2><p>Đóng góp chỉ được gửi khi Supabase đã bật, có phiên người dùng và đã tạo bảng/quyền. Nhập JSON hoặc lưu nháp trên máy không tự công khai địa điểm.</p><button type="button" disabled={busy} onClick={()=>void inspect()}>{busy?"Đang kiểm tra…":"Kiểm tra cấu hình máy chủ"}</button>
    {data&&<p role="status">Gửi đóng góp: <strong>{data.contributions==="disabled"?"Chưa bật trên máy chủ":data.contributions==="configured_not_verified"?"Có cấu hình, cần thử phiên đăng nhập":"Cấu hình lỗi"}</strong>. {data.note}</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
