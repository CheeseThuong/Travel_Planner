"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterCatalog, type CatalogPlace } from "@/domain/catalog";

const PAGE_SIZE = 6;
const categoryLabels: Record<string, string> = {
  all: "Tất cả",
  attraction: "Tham quan",
  beach: "Biển",
  culture: "Văn hóa",
  market: "Chợ",
  museum: "Bảo tàng",
  park: "Công viên",
};

export function DestinationCatalog({ destinationSlug, places, attribution }: Readonly<{
  destinationSlug: string;
  places: readonly CatalogPlace[];
  attribution: string;
}>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const categories = useMemo(() => ["all", ...new Set(places.map((place) => place.category))], [places]);
  const filtered = useMemo(() => filterCatalog(places, query, category), [places, query, category]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section aria-labelledby="catalog-title" className="page-shell py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow mb-3 text-[#68745b]">Chọn điểm ghé</p>
          <h2 id="catalog-title" className="display-type text-4xl sm:text-5xl">Danh sách trải nghiệm</h2>
        </div>
        <Link href={`/plan/new?destination=${destinationSlug}`} className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Lập kế hoạch với các điểm đã chọn
        </Link>
      </div>

      <div className="mt-7 grid gap-4 rounded-3xl border border-[#deded0] bg-white/60 p-4 sm:grid-cols-[1fr_14rem] sm:p-5">
        <label className="grid gap-2 text-sm font-semibold">
          Tìm địa điểm
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Ví dụ: bãi biển, chợ, thác..."
            className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Loại trải nghiệm
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-input bg-white px-4 font-normal">
            {categories.map((value) => <option key={value} value={value}>{categoryLabels[value] ?? value}</option>)}
          </select>
        </label>
      </div>

      <p className="mt-5 text-sm text-[#58675b]" aria-live="polite">Tìm thấy {filtered.length} điểm ghé.</p>
      {visible.length ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((place) => (
            <article key={place.id} className="flex min-h-72 flex-col rounded-3xl border border-[#deded0] bg-[#fffdf8] p-5">
              <p className="eyebrow text-[#68745b]">{categoryLabels[place.category] ?? place.category}</p>
              <h3 className="display-type mt-3 text-2xl">{place.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#58675b]">{place.description}</p>
              <div className="mt-auto flex items-end justify-between gap-4 pt-5 text-xs text-[#58675b]">
                <span>Gợi ý {place.durationMinutes} phút</span>
                <a href={place.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold underline" aria-label={`Xem ${place.title} trên OpenStreetMap`}>Xem bản đồ ↗</a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-[#bdc5b4] p-8 text-center">
          <h3 className="font-semibold">Chưa tìm thấy điểm phù hợp</h3>
          <p className="mt-2 text-sm text-[#58675b]">Thử từ khóa ngắn hơn hoặc chọn “Tất cả”.</p>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Phân trang địa điểm" className="mt-7 flex items-center justify-center gap-4">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-11 rounded-full border border-input px-5 font-semibold disabled:opacity-40">Trước</button>
          <span className="text-sm">Trang {currentPage}/{pageCount}</span>
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="min-h-11 rounded-full border border-input px-5 font-semibold disabled:opacity-40">Sau</button>
        </nav>
      )}
      <p className="mt-8 text-xs leading-6 text-[#58675b]">{attribution} Thời lượng là gợi ý biên tập; hãy kiểm tra giờ mở cửa và điều kiện tiếp cận trước khi đi.</p>
    </section>
  );
}
