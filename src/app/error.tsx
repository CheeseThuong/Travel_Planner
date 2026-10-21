"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="page-shell py-20" role="alert"><h1 className="display-type text-4xl">Có chút trục trặc.</h1><p className="my-6 text-[#58675b]">Trang chưa tải được. Bạn có thể thử lại.</p><Button onClick={reset}>Thử lại</Button></section>;
}
