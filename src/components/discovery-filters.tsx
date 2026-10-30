"use client";

import { placeCategories, type PlaceCategory } from "@/domain/discovery/place";
import { geoZoneLabels, type GeoZone } from "@/domain/discovery/geo";

export function DiscoveryFilters({ category, zone, onCategory, onZone }: Readonly<{
  category: PlaceCategory | "all"; zone: GeoZone | "all";
  onCategory: (value: PlaceCategory | "all") => void; onZone: (value: GeoZone | "all") => void;
}>) {
  return <div className="atlas-fields my-4">
    <label>Loại trải nghiệm<select aria-label="Loại trải nghiệm" value={category} onChange={event => onCategory(event.target.value as PlaceCategory | "all")}>
      <option value="all">Tất cả loại</option>{Object.entries(placeCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>Khu vực<select aria-label="Khu vực khám phá" value={zone} onChange={event => onZone(event.target.value as GeoZone | "all")}>
      <option value="all">Tất cả khu vực</option>{Object.entries(geoZoneLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <p className="text-sm">Khu vực được chia theo khoảng cách và tọa độ quy ước; không phải ranh giới hành chính hay thời gian đi đường.</p>
  </div>;
}
