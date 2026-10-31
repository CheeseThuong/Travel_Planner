# Kiến trúc, dữ liệu và chất lượng — DỌC Upgrade

## Phạm vi đã có trong gói

- Homepage brand-first, câu chuyện thương hiệu, UI responsive với motion tối giản và reduced-motion.
- Trang `/cau-chuyen` và `/cam-hung/da-lat`.
- SVG bản đồ Việt Nam có hình dạng địa lý theo Natural Earth **low-res** (không phải bản đồ hành chính chính thức, không chứa tất cả đảo/biên giới chi tiết). Overlay dấu mốc Đà Lạt/Nha Trang là tọa độ tham khảo.
- 10 đề xuất Đà Lạt với nguồn văn bản công khai, trạng thái `needs_coordinates_and_current_status`. **Không tự chèn vào danh mục định tuyến hoặc tự tạo tọa độ.**
- `DocGTrackBatch` đọc tệp JSON tối đa 2 MB/100 địa điểm, báo lỗi và trùng, cho chuyển từng bản ghi vào biểu mẫu đã có bằng nút **Dùng điểm này**. Không upload dữ liệu thô lên máy chủ và không tự submit hàng loạt.
- Lưu nháp bản ghi trên thiết bị **chỉ khi người dùng chọn đồng ý**.
- Kiểm tra kế toán điểm tuyến: điểm được xếp/không được xếp phải khớp tập đầu vào, không chồng chéo hoặc trùng.
- Sửa một lỗi `gTrackJson`, `gTrackPreview`, `gTrackFeedback` lặp lại ở component.

## Phạm vi chưa triển khai

- Không sửa thuật toán định tuyến sản xuất `src/domain/planning/engine.ts` vì chưa có test chứng minh bug. Có thể bổ sung `auditRouteAccounting` vào đường hiển thị preview trong một PR riêng sau khi test.
- Không thay thế Supabase hiện hữu. `CLOUD_ENABLED`, Anonymous Sign-ins, RLS, migrations và quyền kiểm duyệt phải được test trên staging trước production.
- Không nhập hàng loạt trực tiếp vào Supabase: mỗi bản ghi phải qua xác minh, đồng ý và kiểm duyệt; quy mô lớn cần một API import + job queue + rate-limit + immutable provenance riêng.
- Không gọi live Google Maps, không sao chép ảnh, rating hoặc review vào database.
- Không sửa schema dữ liệu sản xuất hoặc đóng gói migrations có thể làm hỏng dữ liệu thực.

## Kiểm tra trên máy Windows

```
cd D:\Projects\travel_plan
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
npm.cmd run test:contributions
```

`test:contributions` phụ thuộc database local đã cấu hình. Không chạy reset trên Supabase Production. Chạy các e2e phù hợp sau khi build.

## Kiểm tra UI trước release

1. Desktop 1440, 1024, mobile 390, 320 px — không tràn ngang; logo, CTA, chữ Việt không bị cắt.
2. `prefers-reduced-motion: reduce` — không có chuyển động bắt buộc.
3. Bản đồ không hứa hẹn chỉ đường hoặc biên giới pháp lý.
4. Gửi JSON gTrack mẫu -> xem trước -> chọn điểm -> viết mô tả -> tạo phiên -> xác nhận -> gửi -> hiện hàng đợi -> duyệt -> công khai.
5. HTTP 401/403/422/429/503 từ API có thông điệp và thao tác khôi phục; không mất nội dung đã nhập.
6. Nguồn quyền: không dùng Google ratings, Google imagery, metadata như dữ liệu được phép lưu lâu dài nếu chưa có thỏa thuận phù hợp.
7. Kiểm thử planner: locked appointments, opening hours, pause, budget, travel source labels, unscheduled reasons, city selection, 0/1/100 điểm, chống trùng ID.

## Kịch bản release

Không force push, không auto deploy từ script. Xác nhận `git status`, `git fetch`, các test PASS, Vercel env, Supabase RLS, rollback, kiểm tra branch deployment trước khi merge `main`. Tất cả git push có xác nhận riêng của người vận hành.
