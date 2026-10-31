"use client";
import { useState } from "react";
import { parseGTrackJson } from "@/domain/import/gtrack-json";
import { classifyGeo } from "@/domain/discovery/geo";
import { getCityGeo } from "@/domain/discovery/cities";
import type { DestinationSlug } from "@/domain/model/destination";

type Lodging = { readonly title:string;readonly lat:number;readonly lng:number; readonly address:string|null };
export function DocLodgingInput({destination,onChoose}:ReadOnlyProps) {
  const [json,setJson]=useState("");
  const [preview,setPreview]=useState<Lodging|null>(null);
  const [error,setError]=useState("");
  function parse(){try{
    const p=parseGTrackJson(json);
    if(p.category && p.category!=="lodging") throw new Error("Dữ liệu đang thuộc nhóm khác lưu trú. Hãy chọn một khách sạn hoặc homestay.");
    const zone=classifyGeo(p.location,getCityGeo(destination));
    if(zone.zone==="remote") throw new Error("Vị trí nằm xa khu vực đang lập lịch. Kiểm tra lại thành phố.");
    setPreview({title:p.title,lat:p.location.lat,lng:p.location.lng,address:p.address});setError("");
  }catch(e){setError(e instanceof Error?e.message:"Không đọc được JSON.");setPreview(null);}}
  return <section className="doc-lodging" aria-label="Địa điểm lưu trú từ JSON gTrack">
    <h3>Chỗ ở / Điểm xuất phát mỗi ngày</h3>
    <p>DỌC sử dụng khách sạn hoặc homestay làm điểm xuất phát tính đường. Dán JSON gTrack để nhập tọa độ chính xác hơn; ghim có thể là tâm tòa nhà, không phải lối vào.</p>
    <label>JSON khách sạn hoặc homestay<textarea value={json} maxLength={32768} rows={3} onChange={e=>{setJson(e.target.value);setPreview(null);}} placeholder='{"business_info":{"name":"Khách sạn..."},"location":{"coordinates":{"latitude":11.94,"longitude":108.43}},"categories":["Khách sạn"]}'/></label>
    <button type="button" onClick={parse} disabled={!json.trim()}>Kiểm tra chỗ ở</button>
    {error&&<p role="alert">{error}</p>}
    {preview&&<div className="doc-lodging-preview"><strong>{preview.title}</strong><p>{preview.address}</p><small>{preview.lat}, {preview.lng}</small><button type="button" onClick={()=>{onChoose(preview);setError("Đã áp dụng tọa độ chỗ ở. Hãy xác minh lối vào thực tế.");}}>Áp dụng làm điểm xuất phát</button></div>}
  </section>;
}
type ReadOnlyProps=Readonly<{destination:DestinationSlug;onChoose:(hotel:Lodging)=>void}>;
