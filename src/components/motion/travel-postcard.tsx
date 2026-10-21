"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { DestinationScene } from "@/components/illustrations/destination-scene";

const ThreePostcard = dynamic(() => import("./three-postcard"), { ssr: false });
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener("change", callback);
  return () => preference.removeEventListener("change", callback);
}

export function TravelPostcard({ initialTheme = "ocean" }: { initialTheme?: "ocean" | "forest" }) {
  const root = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"ocean" | "forest">(initialTheme);
  const [tour, setTour] = useState(false);
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState("Tấm bưu thiếp nhỏ, một chút cảm hứng cho chuyến đi.");
  // Browser tests found the library hook did not rerender after preference changes.
  // Subscribe to the native setting so canvas and Motion use the same live policy.
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => true);

  useEffect(() => {
    let cancelled = false;
    let revert: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (cancelled || !root.current) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo("[data-postcard-note]", { y: 8, opacity: 0.5 }, { y: 0, opacity: 1, duration: 0.55, ease: "power2.out", clearProps: "transform,opacity" });
      }, root.current);
      revert = () => media.revert();
    }).catch((error: unknown) => {
      if (!cancelled) console.warn("Optional postcard entrance unavailable:", error instanceof Error ? error.name : "UnknownError");
    });
    const preference = window.matchMedia(motionQuery);
    const stopForPreference = () => { if (preference.matches) setRequested(false); };
    preference.addEventListener("change", stopForPreference);
    return () => { cancelled = true; revert?.(); preference.removeEventListener("change", stopForPreference); };
  }, []);

  function toggle3d() {
    if (requested) { setRequested(false); setStatus("Đã trở về minh họa tĩnh."); return; }
    const capability = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || capability.connection?.saveData || (capability.deviceMemory !== undefined && capability.deviceMemory < 4) || navigator.hardwareConcurrency < 4) {
      setStatus("Giữ minh họa tĩnh để phù hợp cài đặt hoặc thiết bị của bạn."); return;
    }
    setStatus("Đang mở tấm bưu thiếp 3D…"); setRequested(true);
  }

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}><LazyMotion features={domAnimation} strict>
      <div ref={root} className="relative pb-8 pt-4">
        <div data-postcard-note className="absolute right-1 top-0 z-10 rotate-6 rounded-full border border-[#e3cf9f] bg-[#ffe4a6] px-5 py-3 text-xs font-semibold shadow-sm">Chừa một chút thảnh thơi ☀</div>
        <div className="overflow-hidden rounded-[2rem] border-8 border-white bg-[#fffdf7] shadow-[0_18px_50px_-30px_#385b51]">
          <div className="relative aspect-[560/340] overflow-hidden" data-testid="postcard-scene">
            <DestinationScene theme={theme} className="absolute inset-0 h-full w-full" />
            {requested && !reducedMotion && <ThreePostcard key={theme} theme={theme} tour={tour} onReady={() => setStatus("Bưu thiếp 3D đang mở. Bạn có thể đổi khung cảnh hoặc tắt 3D.")} onUnavailable={() => { setRequested(false); setStatus("Thiết bị chưa mở được 3D. Minh họa tĩnh vẫn sẵn sàng."); }} />}
          </div>
          {requested && !reducedMotion && <button type="button" aria-pressed={tour} onClick={() => setTour(!tour)} className="min-h-11 w-full border-t border-[#deded0] px-4 py-2 text-xs font-semibold hover:bg-[#edf0e4]">{tour ? "Dừng xoay khung cảnh" : "Xoay ngắm khung cảnh"}</button>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#deded0] px-4 py-3">
            <div role="group" aria-label="Khung cảnh bưu thiếp" className="flex gap-1">
              {([['ocean', 'Biển xanh'], ['forest', 'Đồi thông']] as const).map(([value, label]) => <m.button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} whileTap={reducedMotion ? undefined : { scale: 0.96 }} className={`min-h-11 rounded-full px-3 text-xs font-semibold ${theme === value ? 'bg-[#edf0e4]' : 'hover:bg-[#f6e5cf]'}`}>{label}</m.button>)}
            </div>
            <m.button type="button" onClick={toggle3d} aria-pressed={requested && !reducedMotion} disabled={!!reducedMotion} whileHover={reducedMotion ? undefined : { scale: 1.03 }} whileTap={reducedMotion ? undefined : { scale: 0.97 }} className="min-h-11 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60">{requested && !reducedMotion ? "Tắt 3D" : "Bật 3D"}</m.button>
          </div>
        </div>
        <p aria-live="polite" className="mt-3 min-h-10 px-3 text-xs leading-5 text-[#58675b]">{reducedMotion ? "Chế độ tĩnh theo cài đặt giảm chuyển động của bạn." : status}</p>
      </div>
    </LazyMotion></MotionConfig>
  );
}
