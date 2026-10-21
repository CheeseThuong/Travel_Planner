# Dự thảo chính sách dữ liệu — chưa công bố

Ngày dự thảo 2026-10-21. Đây là yêu cầu nội dung P00-03, không phải chính sách của một dịch vụ đang chạy. Danh tính bên vận hành, địa chỉ liên hệ, khu vực xử lý, thời hạn lưu cụ thể và quy trình yêu cầu dữ liệu cần chủ dự án hoàn thiện trước G8.

Ứng dụng dự kiến lưu ngày đi, địa điểm chọn, nơi lưu trú do bạn nhập, lựa chọn phương tiện và lịch trình để lập/lưu chuyến đi. Không mặc định thu GPS, giấy tờ hoặc số điện thoại. Nếu có tính năng cần GPS, ứng dụng chỉ xin quyền khi bạn chọn dùng tính năng đó.

Bản nháp được lưu trên thiết bị bằng IndexedDB; bạn có thể xóa bộ nhớ cục bộ. Xóa local không đồng nghĩa xóa cloud. Khi Save, ứng dụng dùng phiên Supabase xác thực và lưu chuyến đi riêng theo owner. Phiên khách không phải tài khoản phục hồi vĩnh viễn: đăng xuất/xóa dữ liệu trình duyệt/đổi thiết bị có thể mất quyền sửa. Mã chia sẻ chỉ phục hồi khả năng xem khi còn hiệu lực.

Bạn chủ động tạo mã chia sẻ chỉ xem và có thể thu hồi. Người biết mã có thể xem những trường được chia sẻ; hãy coi mã là thông tin riêng tư. Không gửi mã, vị trí chính xác hoặc tên khách sạn vào analytics/log. Thông tin owner/ghi chú riêng không nằm trong shared response. Xóa chuyến đi cloud phải thu hồi shares liên quan; copies/screenshots do người khác giữ không được tự động thu hồi.

Next.js/Vercel dự kiến phục vụ ứng dụng; Supabase xử lý Auth và cloud storage. Live Google Places/Routes mặc định tắt. Nếu bật sau review, dữ liệu tối thiểu cần thiết được gửi cho nhà cung cấp, có provenance/attribution và tuân theo điều khoản tương ứng; dữ liệu Google không mặc định được tải vào bản nháp offline. Outbound Google Maps mở dịch vụ bên ngoài khi bạn chọn liên kết. Xem [Google Privacy Policy](https://policies.google.com/privacy) khi dùng dịch vụ đó; liên kết này phục vụ nội dung thông báo, không tuyên bố đã review toàn bộ policy trong P00.

Trước công bố, phải ghi rõ thời hạn giữ trip/guest account/log/backup, cách thực thi quyền truy cập/xóa và xử lý khi mất session, liên hệ hỗ trợ và các chuyển dữ liệu liên quan. Không tự hứa xóa tức thì backup khi chưa có quy trình đã thử nghiệm. P08 phải kiểm chứng xóa/revoke/restore và redaction thực tế trước launch.
