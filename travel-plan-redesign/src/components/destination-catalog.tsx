"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterCatalog, type CatalogPlace } from "@/domain/catalog";

const PAGE_SIZE = 6;
const categoryLabels: Record<string, string> = {
  all: "Tất cả", attraction: "Tham quan", beach: "Biển", culture: "Văn hóa",
  market: "Chợ", museum: "Bảo tàng", park: "Công viên",
};

export function DestinationCatalog({ destinationSlug, places, attribution }: Readonly<{
  destinationSlug: string; places: readonly CatalogPlace[]; attribution: string;
}>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const categories = useMemo(() => ["all", ...new Set(places.map((place) => place.category))], [places]);
  const filtered = useMemo(() => filterCatalog(places, query, category), [places, query, category]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return <section className="page-shell catalog-shell" aria-labelledby="catalog-title">
    <header className="catalog-header">
      <div><p className="eyebrow text-[#bd5941]">Mục lục điểm ghé / 01—30</p><h2 className="display-type" id="catalog-title">Những nơi đáng ghi lại</h2></div>
      <Link className="ink-link" href={`/plan/new?destination=${destinationSlug}`}>Lập kế hoạch với các điểm đã chọn <span aria-hidden="true">↗</span></Link>
    </header>
    <div className="catalog-tools">
      <label>Tìm địa điểm<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Thử: Hòn Chồng, chợ, bãi biển…" /></label>
      <label>Loại trải nghiệm<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value] ?? value}</option>)}</select></label>
    </div>
    <p className="catalog-count" aria-live="polite">Tìm thấy {filtered.length} điểm ghé.</p>
    {visible.length > 0 ? <div className="place-ledger">
      {visible.map((place, index) => <article key={place.id}>
        <span className="ledger-num" aria-hidden="true">{String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(2,"0")}</span>
        <div><span className="eyebrow text-[#a8523f]">{categoryLabels[place.category] ?? place.category}</span><h3 className="mt-2">{place.title}</h3><p>{place.description}</p></div>
        <div className="ledger-end"><span>Gợi ý {place.durationMinutes} phút</span><a href={place.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Xem ${place.title} trên OpenStreetMap`}>Xem dữ liệu bản đồ ↗</a></div>
      </article>)}
    </div> : <div className="empty-state" role="status"><h3>Chưa tìm thấy điểm phù hợp</h3><p className="mt-2 text-sm text-[#637268]">Thử từ khóa ngắn hơn hoặc chọn “Tất cả”.</p></div>}
    {pageCount > 1 && <nav className="catalog-pager" aria-label="Phân trang địa điểm"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Trước</button><span className="text-sm">Trang {currentPage}/{pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Sau</button></nav>}
    <p className="mt-5 text-xs leading-7 text-[#637268]">{attribution} Thời lượng chỉ để chuẩn bị. Hãy kiểm tra giờ mở cửa, chi phí và điều kiện đến nơi trước khi đi.</p>
  </section>;
}
