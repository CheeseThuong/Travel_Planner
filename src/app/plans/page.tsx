import type { Metadata } from "next";
import { DocPlansLibrary } from "@/components/doc-plans-library";
export const metadata:Metadata={title:"Kế hoạch đã lưu",description:"Lưu lịch trình DỌC trên thiết bị; chuyển máy bằng file hoặc mã truy cập đã đồng bộ."};
export default function SavedPlansPage(){return <DocPlansLibrary/>;}
