import { notFound } from "next/navigation";
import { TravelPostcard } from "@/components/motion/travel-postcard";
import { destinations, findDestination } from "@/domain/model/destination";

export function generateStaticParams() {
  return destinations.map(({ slug }) => ({ slug }));
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = findDestination(slug);
  if (!destination) notFound();
  return <section className="page-shell grid items-center gap-9 py-16 md:grid-cols-2"><div><p className="eyebrow mb-4 text-[#68745b]">{destination.eyebrow}</p><h1 className="display-type text-6xl">{destination.name}</h1><p className="mt-6 text-lg leading-8 text-[#58675b]">{destination.description}</p><div className="mt-8 rounded-2xl border border-[#deded0] bg-white/50 p-5"><h2 className="font-semibold">Những điểm ghé đang được chuẩn bị</h2><p className="mt-2 text-sm leading-7 text-[#58675b]">Danh sách tham quan và công cụ lập lịch chưa mở. Hẹn bạn quay lại để cùng chọn một hành trình vừa vặn.</p></div></div><TravelPostcard initialTheme={destination.theme} /></section>;
}
