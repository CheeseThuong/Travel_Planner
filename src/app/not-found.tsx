import Link from "next/link";
export default function NotFound() {
  return <section className="page-shell py-20"><p className="eyebrow mb-4">Lạc một chút thôi</p><h1 className="display-type text-5xl">Chưa tìm thấy nơi này.</h1><p className="my-6 text-[#58675b]">Đường dẫn có thể chưa đúng. Mình quay lại chọn điểm đến nhé.</p><Link href="/" className="font-semibold underline">Về trang chủ</Link></section>;
}
