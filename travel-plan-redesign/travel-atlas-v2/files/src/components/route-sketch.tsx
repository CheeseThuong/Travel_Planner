import type { Coordinates } from "@/domain/model/trip";

type RoutePoint = Readonly<{ id: string; name: string; location: Coordinates }>;

/** A coordinate-relative diagram, deliberately not an actual road map or ETA. */
export function RouteSketch({ base, points }: Readonly<{ base: Coordinates; points: readonly RoutePoint[] }>) {
  const safeBase = Number.isFinite(base.lat) && Number.isFinite(base.lng) ? base : { lat: 12.2388, lng: 109.1967 };
  const all = [{ id: "base", name: "Điểm xuất phát", location: safeBase }, ...points];
  const latitudes = all.map((p) => p.location.lat), longitudes = all.map((p) => p.location.lng);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
  const projection = (p: RoutePoint) => ({
    x: 54 + ((p.location.lng - minLng) / Math.max(maxLng - minLng, 0.025)) * 410,
    y: 267 - ((p.location.lat - minLat) / Math.max(maxLat - minLat, 0.02)) * 216,
  });
  const projected = all.map(projection);
  const line = projected.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  return <div className="atlas-map" aria-label="Sơ đồ vị trí các điểm đã chọn">
    <div className="atlas-map-heading"><span>PHÁC ĐỒ / 01</span><span>KHÔNG PHẢI BẢN ĐỒ ĐƯỜNG ĐI</span></div>
    <svg viewBox="0 0 520 315" role="img" aria-label={`Phác đồ vị trí tương đối của ${points.length} điểm ghé và một điểm xuất phát`}>
      <defs><pattern id="atlas-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#d3d5c9" strokeWidth=".7" /></pattern></defs>
      <rect width="520" height="315" fill="#e8eee9"/><rect width="520" height="315" fill="url(#atlas-grid)" />
      <path d="M0 240C75 199 103 247 170 210S286 230 341 171 432 161 520 80" fill="none" stroke="#becfc7" strokeWidth="26" />
      <path d="M-8 286C96 255 147 290 230 266S369 270 528 221" fill="none" stroke="#baccc4" strokeWidth="2" strokeDasharray="6 7" />
      {points.length > 0 ? <><polyline points={line} fill="none" stroke="#c0583e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="7 6" />{projected.map((p,i)=><g key={all[i].id}><circle cx={p.x} cy={p.y} r={i===0?12:14} fill={i===0?"#162f3a":"#c0583e"} stroke="#fffaf0" strokeWidth="3"/><text x={p.x} y={p.y+4.5} fontSize="12" textAnchor="middle" fontWeight="700" fill="#fffaf0">{i===0?"•":i}</text></g>)}</> : <g><circle cx="260" cy="157" r="37" fill="none" stroke="#c0583e" strokeWidth="2" strokeDasharray="3 7" /><circle cx="260" cy="157" r="5" fill="#c0583e"/></g>}
      <text x="18" y="30" fontSize="10" letterSpacing="2" fill="#57746d">BẮC ↑</text><text x="18" y="295" fontSize="10" fill="#57746d">TỌA ĐỘ TƯƠNG ĐỐI</text>
    </svg>
    <p>Đường nối chỉ thể hiện thứ tự và vị trí tương đối. Không thay thế chỉ đường, quãng đường hoặc thời gian di chuyển thực tế.</p>
  </div>;
}
