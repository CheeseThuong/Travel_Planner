"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {filterCatalogDiscovery,type CatalogPlace} from "@/domain/catalog";
import {placeCategories,type PlaceCategory} from "@/domain/discovery/place";
import type {GeoZone} from "@/domain/discovery/geo";
import {DiscoveryFilters} from "./discovery-filters";
import {PlaceDetails} from "./place-details";
import {useOnline} from "./use-online";
const label:Record<string,string>={all:"Tất cả",attraction:"Tham quan",beach:"Biển",culture:"Văn hóa",market:"Chợ",museum:"Bảo tàng",park:"Công viên"};
const PAGE_SIZE=8;
export function DestinationCatalog({destinationSlug,places,attribution}:Readonly<{destinationSlug:string;places:readonly CatalogPlace[];attribution:string}>) {
 const [search,setSearch]=useState("");const [category,setCategory]=useState<PlaceCategory|"all">("all");const [page,setPage]=useState(1);
 const [zone,setZone]=useState<GeoZone|"all">("all"),[detailsPlace,setDetailsPlace]=useState<CatalogPlace|null>(null);
 const online=useOnline();
 const matched=useMemo(()=>filterCatalogDiscovery(places,search,category,zone,destinationSlug),[places,search,category,zone,destinationSlug]);
 const pages=Math.max(1,Math.ceil(matched.length/PAGE_SIZE)), current=Math.min(page,pages);const visible=matched.slice((current-1)*PAGE_SIZE,current*PAGE_SIZE);
 return <section className="atlas-container atlas-catalog" aria-labelledby="catalog-title"><div className="atlas-section-title"><span>DANH MỤC ĐIỂM GHÉ / {destinationSlug.toUpperCase()}</span><h2 id="catalog-title">Chọn điểm. Rồi đi.</h2><p>Đây là danh mục từ dữ liệu nguồn mở. Giờ hoạt động, chi phí và khả năng tiếp cận có thể chưa chính xác.</p></div>
  {detailsPlace&&<PlaceDetails key={detailsPlace.id} place={detailsPlace} online={online} onClose={()=>setDetailsPlace(null)}/>}
  <div className="atlas-catalog-tools"><label>Tìm địa điểm<input aria-label="Tìm địa điểm" type="search" placeholder="Nhập tên địa điểm…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><span aria-live="polite">Tìm thấy {matched.length} điểm ghé.</span></div>
  <DiscoveryFilters category={category} zone={zone} onCategory={value=>{setCategory(value);setPage(1);}} onZone={value=>{setZone(value);setPage(1);}}/>
  <div className="atlas-catalog-list">{visible.length?visible.map((place,i)=><article key={place.id}><span className="atlas-index">{String((current-1)*PAGE_SIZE+i+1).padStart(2,"0")}</span><div><span className="atlas-overline">{place.categories?.map(c=>placeCategories[c]).join(", ")??label[place.category]??place.category}</span><h3>{place.title}</h3><p>{place.description}</p></div><div className="atlas-catalog-actions"><span>{place.durationMinutes} PHÚT GỢI Ý</span><button type="button" className="min-h-11 border px-3" aria-label={`Thông tin ${place.title}`} onClick={()=>setDetailsPlace(place)}>THÔNG TIN</button><a href={place.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Xem ${place.title} trên OpenStreetMap`}>NGUỒN BẢN ĐỒ ↗</a></div></article>):<div className="atlas-empty"><h3>Không thấy điểm này trong sổ.</h3><p>Thử tìm ngắn hơn hoặc trở về loại “Tất cả”.</p></div>}</div>
  <div className="atlas-catalog-footer">{pages>1&&<nav className="atlas-pagination" aria-label="Phân trang địa điểm"><button type="button" disabled={current===1} onClick={()=>setPage(x=>Math.max(1,x-1))}>TRƯỚC</button><span>TRANG {current} / {pages}</span><button type="button" disabled={current===pages} onClick={()=>setPage(x=>Math.min(pages,x+1))}>SAU</button></nav>}<Link href={`/plan/new?destination=${destinationSlug}`} className="atlas-primary-link">CHỌN ĐIỂM CHO LỊCH TRÌNH ↗</Link></div><p className="atlas-attribution">{attribution}</p></section>;
}
