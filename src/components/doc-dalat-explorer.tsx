"use client";
import { useEffect, useMemo, useState } from "react";
import type { DocPlaceSuggestion } from "@/content/doc-dalat-suggestions";
const categories = ["Tất cả","Cà phê","Ăn uống","Thắng cảnh","Khu du lịch","Check-in","Ngoài trời","Lưu trú","Văn hóa"] as const;
const favoriteKey="doc:datalat:favorite-leads:v1";
export function DocDaLatExplorer({places}:Readonly<{places:readonly DocPlaceSuggestion[]}>) {
  const [query,setQuery]=useState(""); const [kind,setKind]=useState<string>("Tất cả");
  const [saved,setSaved]=useState<string[]>([]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      try{const data=JSON.parse(localStorage.getItem(favoriteKey)??"[]");if(Array.isArray(data))setSaved(data.filter((v):v is string=>typeof v==="string").slice(0,200));}catch{/* device storage unavailable */}
    },0);
    return()=>window.clearTimeout(timer);
  },[]);
  const visible=useMemo(()=>places.filter(place=>(kind==="Tất cả" || `${place.categoryLabel} ${place.name}`.toLocaleLowerCase("vi").includes(kind.toLocaleLowerCase("vi"))) && `${place.name} ${place.categoryLabel} ${place.teaser}`.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))),[places,kind,query]);
  function toggle(slug:string){setSaved(previous=>{const next=previous.includes(slug)?previous.filter(v=>v!==slug):[...previous,slug];try{localStorage.setItem(favoriteKey,JSON.stringify(next));}catch{/* silent if blocked */}return next;});}
  return <div className="doc-explorer"><div className="doc-explorer-toolbar"><label>Khám phá nơi muốn ghé<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm cà phê, địa điểm check-in, thắng cảnh…"/></label><p role="status">{visible.length} gợi ý · {saved.length} nơi đã đánh dấu trên thiết bị</p></div>
    <div className="doc-explorer-tags" role="group" aria-label="Lọc nhóm địa điểm">{categories.map(cat=><button key={cat} type="button" aria-pressed={kind===cat} onClick={()=>setKind(cat)}>{cat}</button>)}</div>
    <div className="doc-explorer-grid">{visible.map((place,index)=><article className="doc-explorer-card" key={place.slug}><div className="doc-explorer-art"><span>{String(index+1).padStart(2,"0")}</span><span aria-hidden="true">{place.icon}</span><span>DỌC · ĐÀ LẠT</span></div><div className="doc-explorer-content"><p className="doc-overline">{place.categoryLabel}</p><h2>{place.name}</h2><p>{place.teaser}</p><small>Chưa xác minh tọa độ / tình trạng mở cửa; không tự động thêm vào tuyến.</small><div className="doc-explorer-actions"><a href={place.sourceUrl} target="_blank" rel="noopener noreferrer">Tìm nguồn / bản đồ ↗</a><button type="button" aria-pressed={saved.includes(place.slug)} onClick={()=>toggle(place.slug)}>{saved.includes(place.slug)?"Đã ghi nhớ ✓":"Ghi nhớ ♡"}</button></div></div></article>)}</div>
    {!visible.length&&<p className="doc-no-results">Không tìm thấy tên phù hợp. Thử nhóm khác hoặc từ khóa ngắn hơn.</p>}
    <p className="doc-explorer-note">Danh sách này là ý tưởng biên tập để nghiên cứu, không phải bản sao Google Maps. Để lập tuyến, dùng danh mục có nguồn tọa độ hoặc nhập JSON vị trí do bạn xác nhận.</p>
  </div>;
}
