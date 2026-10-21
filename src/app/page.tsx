import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DestinationScene } from "@/components/illustrations/destination-scene";
import { destinations } from "@/domain/model/destination";

export default function HomePage() {
  return (
    <>
      <section className="page-shell grid items-center gap-10 py-14 lg:grid-cols-[1.03fr_1fr] lg:gap-16 lg:py-20" aria-labelledby="hero-title">
        <div>
          <p className="eyebrow mb-6 flex items-center gap-2 text-[#53674d]"><span aria-hidden="true" className="size-2 rounded-full bg-[#bd654a]" /> Từ phố biển đến đồi thông</p>
          <h1 id="hero-title" className="display-type max-w-xl text-[clamp(3.3rem,7vw,5.7rem)] leading-[1.07]">Chuyến đi nhỏ.<br />Kỷ niệm <span className="italic text-[#a54f3d]">thật to.</span></h1>
          <p className="mt-7 max-w-md text-base leading-8 text-[#58675b]">Một nơi để gom những điểm muốn ghé, dành chỗ cho phút ngẫu hứng và chuẩn bị chuyến đi theo nhịp của riêng bạn.</p>
          <Button asChild size="lg" className="mt-8"><Link href="#diem-den">Chọn một nơi để bắt đầu <span aria-hidden="true">↗</span></Link></Button>
          <p className="mt-5 text-xs leading-6 text-[#58675b]">Đang chuẩn bị những hành trình đầu tiên. Bạn có thể xem các điểm đến bên dưới.</p>
        </div>
        <div className="relative pb-8 pt-4">
          <div className="absolute right-1 top-0 z-10 rotate-6 rounded-full border border-[#e3cf9f] bg-[#ffe4a6] px-5 py-3 text-xs font-semibold shadow-sm">Chừa một chút thảnh thơi ☀</div>
          <DestinationScene theme="ocean" className="w-full -rotate-2 rounded-[2rem] border-8 border-white shadow-[0_18px_50px_-30px_#385b51]" />
          <div className="absolute -bottom-1 left-4 flex -rotate-3 items-center gap-3 rounded-2xl border border-[#dfdfce] bg-[#fffdf7] px-5 py-4 shadow-sm">
            <span aria-hidden="true" className="text-2xl">✳</span><div><p className="text-sm font-bold">Không cần đi thật nhiều.</p><p className="mt-1 text-xs text-[#58675b]">Chỉ cần đi thật vui.</p></div>
          </div>
        </div>
      </section>

      <section id="diem-den" className="page-shell scroll-mt-8 py-7" aria-labelledby="destinations-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="eyebrow mb-3 text-[#68745b]">Hôm nay, mình đi đâu?</p><h2 id="destinations-title" className="display-type text-4xl sm:text-5xl">Một nơi hợp với bạn.</h2></div>
          <p className="max-w-xs text-sm leading-7 text-[#58675b]">Hai sắc màu, hai nhịp sống.<br />Chọn cảm hứng cho chuyến đi sắp tới.</p>
        </div>
        <div className="grid gap-7 md:grid-cols-2">
          {destinations.map((destination) => (
            <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="group overflow-hidden rounded-[1.6rem] border border-[#deded0] bg-[#fffdf8] transition-shadow hover:shadow-lg">
              <DestinationScene theme={destination.theme} className="aspect-[1.9/1] w-full object-cover" />
              <div className="p-6 sm:p-7">
                <p className="eyebrow mb-3 text-[#68745b]">{destination.eyebrow}</p>
                <div className="flex items-center justify-between gap-4"><h3 className="display-type text-4xl">{destination.name}</h3><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full border border-[#bdc5b4] text-xl group-hover:bg-[#f6e5cf]">↗</span></div>
                <p className="mt-3 text-sm leading-7 text-[#58675b]">{destination.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="page-shell mt-10 rounded-[1.6rem] bg-[#edf0e4] px-7 py-10 text-center" aria-labelledby="pace-title">
        <p className="eyebrow mb-3 text-[#68745b]">Để chuyến đi vừa vặn</p><h2 id="pace-title" className="display-type text-3xl sm:text-4xl">Ít vội vàng. Nhiều trải nghiệm.</h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#58675b]">Những khoảng nghỉ cũng là một phần của hành trình. Mình đang chuẩn bị không gian để bạn tự sắp xếp chuyến đi thật thoải mái.</p>
      </section>
    </>
  );
}
