"use client";
import { useState } from "react";
import type { DestinationSlug } from "@/domain/model/destination";
import type { ManualPlaceInput } from "./place-import";
import { validCoordinates } from "@/domain/trip-draft";
import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";

type Place={id:string;title:string;description:string;address:string|null;location:{lat:number;lng:number};categories:PlaceCategory[];suggested_duration_min:number};
export function DocCommunityPicker({destination,onAdd}:Readonly<{destination:DestinationSlug;onAdd:(place:ManualPlaceInput)=>string}>){
  const [places,setPlaces]=useState<Place[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  async function refresh(){setBusy(true);setMessage("");try{
    const response=await fetch(`/api/v1/community-places?destination_slug=${destination}&offset=0`,{cache:"no-store"});
    const json=await response.json();if(!response.ok)throw new Error(json.error?.message??"Chưa tải được đóng góp cộng đồng.");
    const data=Array.isArray(json.data?.items)?json.data.items:[];
    const valid=data.filter((row:Place)=>typeof row.title==="string" && row.location && validCoordinates(row.location));
    setPlaces(valid);setMessage(valid.length?`Đã tải ${valid.length} điểm được kiểm duyệt.`:"Chưa có địa điểm cộng đồng được duyệt cho thành phố này.");
  }catch(e){setMessage(e instanceof Error?e.message:"Không thể tải danh sách.");}finally{setBusy(false);}}
  return <section className="doc-community" aria-label="Địa điểm do cộng đồng đóng góp"><div className="doc-community-heading"><div><p className="doc-overline">THÊM ĐIỂM CỘNG ĐỒNG</p><h3>Những nơi người khác muốn kể</h3><p>Chỉ hiển thị đóng góp đã qua kiểm duyệt. Giờ, chi phí và độ chính xác lối vào vẫn cần tự xác minh.</p></div><button type="button" disabled={busy} onClick={()=>void refresh()}>{busy?"Đang tải…":"Tải điểm cộng đồng"}</button></div>
    <p role="status">{message}</p><ul>{places.map(p=><li key={p.id}><div><strong>{p.title}</strong><small>{p.categories.map(cat=>placeCategories[cat]??cat).join(", ")}</small><p>{p.address}</p></div><button type="button" onClick={()=>setMessage(onAdd({title:p.title,location:p.location,duration:p.suggested_duration_min, ...(p.address?{address:p.address}:{}), ...(p.categories[0]?{category:p.categories[0]}:{})}))}>Thêm vào lịch +</button></li>)}</ul>
  </section>;
}
