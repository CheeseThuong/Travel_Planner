import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return <section className="page-shell py-20"><div className="max-w-2xl"><p className="eyebrow mb-4 text-[#68745b]">Hẹn bạn sớm nhé</p><h1 className="display-type text-5xl sm:text-6xl">{title}</h1><p className="mt-6 max-w-xl text-base leading-8 text-[#58675b]">{description}</p><Button asChild className="mt-8"><Link href="/">Về trang chủ <span aria-hidden="true">↗</span></Link></Button></div></section>;
}
