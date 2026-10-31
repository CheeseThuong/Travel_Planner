import { docDaLatPlaces, type DocPlaceSuggestion } from "./doc-dalat-suggestions";
import { docExtraDaLatPlaces } from "./doc-dalat-additional";

/** Research leads, not verified geocoded records. No scraping or copied Google reviews. */
const entries: ReadonlyArray<readonly [string,string,string,string,string]> = [
["quang-truong-lam-vien","Quảng trường Lâm Viên","Check-in","Quảng trường bên hồ; dễ kết hợp dạo bộ và ngắm cảnh.","quảng trường lâm viên đà lạt"],
["ho-xuan-huong","Hồ Xuân Hương","Thắng cảnh","Hành trình đi bộ quanh hồ và không gian trung tâm thành phố.","hồ xuân hương đà lạt"],
["doi-thien-phuc-duc","Đồi Thiên Phúc Đức","Ngoài trời","Gợi ý dành cho người thích bình minh, cần xác minh đường và điều kiện đi.","đồi thiên phúc đức"],
["doi-che-cau-dat","Đồi chè Cầu Đất","Ngoài trời","Dành thời gian di chuyển ra vùng đồi chè; kiểm tra đường đi trước.","đồi chè cầu đất"],
["langbiang","Núi Langbiang","Khu du lịch","Điểm tham khảo cho hoạt động núi, thời tiết và phương tiện trung chuyển.","khu du lịch langbiang"],
["vuon-hoa-thanh-pho","Vườn hoa thành phố","Khu du lịch","Điểm tham quan hoa, kiểm tra lịch hoạt động và vé thực tế.","vườn hoa thành phố đà lạt"],
["chua-linh-phuoc","Chùa Linh Phước","Văn hóa","Khám phá kiến trúc khảm và không gian tôn giáo, tôn trọng quy tắc tham quan.","chùa linh phước"],
["nha-tho-domaine-de-marie","Nhà thờ Domaine de Marie","Văn hóa","Điểm tham khảo kiến trúc và lịch sử đô thị Đà Lạt.","Domaine de Marie Dalat"],
["crazy-house","Biệt thự Hằng Nga (Crazy House)","Check-in","Công trình kiến trúc độc đáo; xác minh giờ và giá vé.","crazy house đà lạt"],
["thac-pongour","Thác Pongour","Thắng cảnh","Nằm ngoài trung tâm; cần một quỹ thời gian di chuyển riêng.","thác pongour lâm đồng"],
["thac-prenn","Thác Prenn","Thắng cảnh","Xác minh tình trạng mở cửa trước khi đưa vào lịch.","thác prenn đà lạt"],
["lang-cu-lat","Làng Cù Lần","Khu du lịch","Chuyến đi ngoại ô; cần kiểm tra an toàn tuyến và phương tiện.","làng cù lần đà lạt"],
["tuyet-tinh-coc","Tuyệt Tình Cốc","Check-in","Cần kiểm tra quyền tiếp cận và an toàn đường vào.","tuyệt tình cốc đà lạt"],
["vuon-dau-tay","Vườn dâu tây (chọn cơ sở phù hợp)","Trải nghiệm","Không coi tên nhóm địa điểm là một doanh nghiệp cụ thể; xác nhận cơ sở trước.","vườn dâu tây đà lạt"],
["cho-dem-da-lat","Chợ đêm Đà Lạt","Ăn uống","Tìm món ăn đường phố; chú ý thời điểm đông khách và thông tin vệ sinh.","chợ đêm đà lạt"],
["banh-trang-nuong","Bánh tráng nướng (tìm quán)","Ăn uống","Nhóm món ăn, chưa phải địa điểm cụ thể; hãy chọn một quán trước khi thêm.","bánh tráng nướng đà lạt"],
["lau-bo-ba-toa","Lẩu bò Ba Toa (tìm quán)","Ăn uống","Có nhiều tên và địa chỉ tương tự; phải kiểm tra doanh nghiệp cụ thể.","lẩu bò ba toa đà lạt"],
["kem-bo-da-lat","Kem bơ Đà Lạt (tìm quán)","Ăn uống","Khám phá đặc sản; lựa chọn quán theo địa chỉ và giờ thực tế.","kem bơ đà lạt"],
["banh-mi-xiu-mai","Bánh mì xíu mại (tìm quán)","Ăn uống","Một gợi ý bữa sáng, cần xác định địa điểm thực khi sử dụng.","bánh mì xíu mại đà lạt"],
["cafe-me-linh","Mê Linh Coffee Garden","Cà phê","Gợi ý tuyến cà phê vùng ngoại ô, cân nhắc thời gian di chuyển.","mê linh coffee garden đà lạt"],
["cafe-an","An Café (kiểm tra chi nhánh)","Cà phê","Một điểm dừng chậm giữa hành trình, cần kiểm tra cơ sở.","an cafe đà lạt"],
["cafe-lau","Là Việt Coffee","Cà phê","Tìm hiểu cà phê địa phương; xác định cửa hàng cụ thể trước khi đến.","là việt coffee đà lạt"],
["homestay-kupid","The Kupid Homestay","Lưu trú","Gợi ý lưu trú; giá, vị trí, tình trạng đặt phòng chưa được xác minh.","the kupid homestay đà lạt"],
["terracotta-hotel","Terracotta Hotel & Resort Dalat","Lưu trú","Lựa chọn tham khảo khu vực hồ, cần xác minh địa chỉ và giá.","terracotta resort dalat"],
["cloud-hill-hotel","Cloud Hill Hotel","Lưu trú","Ví dụ JSON gTrack đã được người dùng cung cấp; vị trí cần tự đối chiếu.","cloud hill hotel dalat"],
];
function record(entry:typeof entries[number]):DocPlaceSuggestion {
  const [slug,name,categoryLabel,teaser,query]=entry;
  return {slug,name,categoryLabel,teaser,icon:"✦",sourceUrl:`https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`,verification:"needs_coordinates_and_current_status"};
}
const combined=[...docDaLatPlaces,...docExtraDaLatPlaces,...entries.map(record)];
export const docDaLatDirectory:readonly DocPlaceSuggestion[] = combined.filter((item,index)=>combined.findIndex(row=>row.slug===item.slug)===index);
