/** Editorial research queue, NOT an approved or navigable production POI catalog.
 * Location data must pass source, licensing, deduplication and access verification before promotion.
 */
export interface DocPlaceSuggestion {
  readonly slug: string;
  readonly name: string;
  readonly categoryLabel: string;
  readonly icon: string;
  readonly teaser: string;
  readonly sourceUrl: string;
  readonly verification: "needs_coordinates_and_current_status";
}
const source = "https://lamdong.gov.vn/sites/dalat/gioithieu/Shared%20Documents/DUTHAOQUYCHE_02112023.pdf";
export const docDaLatPlaces: readonly DocPlaceSuggestion[] = [
  {slug:"ga-da-lat",name:"Ga Đà Lạt",categoryLabel:"Di sản & kiến trúc",icon:"⌂",teaser:"Một lát cắt của thành phố qua kiến trúc nhà ga và câu chuyện đường sắt.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"nha-tho-con-ga",name:"Nhà thờ Chính tòa Đà Lạt",categoryLabel:"Văn hóa",icon:"✦",teaser:"Một điểm dừng để nhìn lại dấu ấn kiến trúc giữa phố cao nguyên.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"dinh-bao-dai-1",name:"Dinh Bảo Đại 1",categoryLabel:"Di sản",icon:"▣",teaser:"Khám phá những lớp lịch sử đô thị và biệt thự cao nguyên.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"dinh-bao-dai-2",name:"Dinh Bảo Đại 2",categoryLabel:"Di sản",icon:"◇",teaser:"Một địa điểm gợi ý cho hành trình khám phá kiến trúc thời kỳ trước.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"thac-cam-ly",name:"Thác Cam Ly",categoryLabel:"Thắng cảnh",icon:"≈",teaser:"Khám phá địa danh tự nhiên gắn với ký ức và cảnh quan Đà Lạt.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"khach-san-dalat-palace",name:"Dalat Palace",categoryLabel:"Kiến trúc & lưu trú",icon:"✧",teaser:"Một điểm tham khảo để tìm hiểu di sản kiến trúc khách sạn.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"du-parc-dalat",name:"Du Parc Dalat",categoryLabel:"Kiến trúc & lưu trú",icon:"⌂",teaser:"Gợi ý ghi dấu nét kiến trúc lịch sử trong hành trình đi bộ.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"biet-thu-hung-vuong",name:"Biệt thự đường Hùng Vương",categoryLabel:"Kiến trúc",icon:"◇",teaser:"Tìm hiểu không gian biệt thự và cảnh quan đô thị cao nguyên.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"biet-thu-tran-hung-dao",name:"Biệt thự Trần Hưng Đạo",categoryLabel:"Kiến trúc",icon:"▣",teaser:"Một tuyến khảo sát cảnh quan kiến trúc mang hơi thở Đà Lạt.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"tuyen-duong-sat-rang-cua",name:"Dấu tích đường sắt răng cưa",categoryLabel:"Lịch sử",icon:"⌁",teaser:"Lần theo câu chuyện giao thông trên những con dốc cao nguyên.",sourceUrl:source,verification:"needs_coordinates_and_current_status"},
  {slug:"thac-datanla-doc",name:"Thác Datanla",categoryLabel:"Khu du lịch / thác nước",icon:"≈",teaser:"Tham khảo điểm đến thiên nhiên và các hoạt động trải nghiệm gần đèo Prenn.",sourceUrl:"https://visitlamdong.vn/vi/thacdatanla",verification:"needs_coordinates_and_current_status"},
  {slug:"ho-tuyen-lam-doc",name:"Hồ Tuyền Lâm",categoryLabel:"Cảnh quan / ngoài trời",icon:"≈",teaser:"Một ngày dành cho hồ, rừng thông và những khoảng nghỉ chậm.",sourceUrl:"https://visitlamdong.vn/vi/hotuyenlam",verification:"needs_coordinates_and_current_status"},
  {slug:"thung-lung-tinh-yeu-doc",name:"Thung lũng Tình Yêu",categoryLabel:"Khu du lịch / check-in",icon:"✦",teaser:"Lưu ý thời gian di chuyển, vé và giới hạn giờ trước khi đưa vào tuyến.",sourceUrl:"https://visitlamdong.vn/vi/thunglungtinhyeu",verification:"needs_coordinates_and_current_status"},
  {slug:"rung-hoa-doc",name:"Rừng Hoa Đà Lạt",categoryLabel:"Điểm tham quan / check-in",icon:"✧",teaser:"Không gian trưng bày hoa và tiểu cảnh, phù hợp các tuyến khám phá ngắn.",sourceUrl:"https://visitlamdong.vn/vi/runghoadl",verification:"needs_coordinates_and_current_status"},
  {slug:"ca-phe-tung-doc",name:"Cà phê Tùng",categoryLabel:"Cà phê",icon:"☕",teaser:"Một điểm dừng trong khu Hòa Bình dành cho người thích không gian cà phê lâu đời.",sourceUrl:"https://visitlamdong.vn/vi/caphetungdl",verification:"needs_coordinates_and_current_status"},
  {slug:"doc-thi-cafe-doc",name:"Tiệm cà phê Dốc Thị",categoryLabel:"Cà phê / check-in",icon:"☕",teaser:"Gợi ý quán cà phê ở khu Hùng Vương, cần kiểm tra thời gian hoạt động.",sourceUrl:"https://visitlamdong.vn/vi/docthidalat",verification:"needs_coordinates_and_current_status"},
  {slug:"hanh-lau-ga-la-e-doc",name:"Quán Hạnh Lẩu Gà Lá É",categoryLabel:"Ăn uống / nhà hàng",icon:"◉",teaser:"Gợi ý món nóng cho buổi tối cao nguyên; kiểm tra thực đơn và giá khi đến.",sourceUrl:"https://visitlamdong.vn/vi/hanhlaugalae",verification:"needs_coordinates_and_current_status"},
  {slug:"banh-can-le-doc",name:"Bánh căn Lệ",categoryLabel:"Ăn uống địa phương",icon:"◉",teaser:"Quán bánh căn là gợi ý cho bữa sáng hoặc bữa nhẹ, xác minh lối vào.",sourceUrl:"https://visitlamdong.vn/vi/banhcanle/bookingres",verification:"needs_coordinates_and_current_status"},
  {slug:"lau-ga-tao-ngo-doc",name:"Lẩu gà lá é Tao Ngộ 2",categoryLabel:"Ẩm thực / nhà hàng",icon:"◉",teaser:"Thêm lựa chọn ẩm thực từ cổng du lịch địa phương, chưa xác nhận dữ liệu hiện tại.",sourceUrl:"https://visitlamdong.vn/en/taongobtx/bookingres",verification:"needs_coordinates_and_current_status"},
];
