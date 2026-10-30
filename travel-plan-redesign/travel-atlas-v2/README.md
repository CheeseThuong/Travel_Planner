# DỌC / Atlas v2 — thay giao diện và bật bộ lập lịch cục bộ

## Phạm vi

Thay thế giao diện tập san / bưu thiếp bằng sản phẩm kiểu **bản đồ hành trình**: chàm, trắng vôi, đỏ gạch; chữ Be Vietnam Pro / Nunito đã có trong repository (không thêm font); lưới bất đối xứng; sơ đồ tọa độ; nút lớn duy nhất để xếp lịch. **Không có** gradient màu neon, glassmorphism, stock photos, emoji hay 3D trang trí.

Các tệp: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/destinations/[slug]/page.tsx`, `src/app/plan/new/page.tsx`, `src/components/destination-catalog.tsx`, `src/components/travel-workbench.tsx`, `src/components/route-sketch.tsx`, các trang trạng thái (404/loading/error/privacy/open) và bộ test `tests/demo/*.mjs`, `tests/typography/vietnamese.spec.mjs`.

### Những chức năng chạy cục bộ

1. Chọn thành phố, ngày đi, giờ đến/rời, số người, tổng ngân sách, phương tiện và nhịp đi.
2. Chọn/loại tối đa 30 địa điểm từ hai bộ dữ liệu địa phương. Gắn nhãn điểm bắt buộc. Nhập Google Maps đầy đủ hoặc địa điểm thủ công qua mục tùy chọn; shortlink vẫn không tự mở vì SSRF/an toàn.
3. **Tự động xếp lịch:** `ApproximateRoutingProvider.estimateMatrix()` → `generatePlan()` → lịch từng ngày với thời gian, di chuyển ước lượng, cảnh báo điểm chưa xếp được và điểm bắt buộc không được đáp ứng.
4. **Tôi tự xếp:** gán ngày và giờ từng địa điểm → `validateManualPlan()` → hiện lịch và xung đột. Không tự động sắp lại hoặc thêm các điểm chưa được gán giờ.
5. Xuất JSON bản nháp trên máy sau khi lập lịch. Không có lưu trên cloud, đặt dịch vụ, đồng bộ hay đảm bảo vị trí/giờ mở cửa. Dữ liệu người dùng mất khi tải lại trang.

**Cảnh báo:** Tuyến được ước tính bằng khoảng cách đường chim bay với hệ số; sơ đồ không phải bản đồ giao thông và thời gian di chuyển không phải ETA. Điểm xuất phát mặc định là tọa độ trung tâm thành phố **tạm**, không phải khách sạn hoặc vị trí đã được xác minh. Ngân sách hiển thị là tổng nhập, **chưa trừ** chi phí chưa biết.

## Áp dụng trên Windows

Giải nén gói ZIP vào `D:\Projects\travel_plan\travel-plan-redesign\travel-atlas-v2` (thư mục này chứa `tools`, `files` và `README.md`). Script chỉ thay file UI được liệt kê và test mới, không sửa db, thuật toán, khóa, `.env`, Git refs.

```powershell
cd "D:\Projects\travel_plan\travel-plan-redesign\travel-atlas-v2"
python tools\apply-atlas.py "D:\Projects\travel_plan" --dry-run
python tools\apply-atlas.py "D:\Projects\travel_plan" --apply
cd "D:\Projects\travel_plan"
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:typography
npm.cmd run dev
```

Sau đó mở `http://127.0.0.1:3000/plan/new?destination=da-lat`.

**Backup:** Script tạo thư mục tự động tại `D:\Projects\travel_plan_atlas_backups\<timestamp>` trước khi ghi file, có `manifest.json` và bản gốc. Dùng `python tools\apply-atlas.py "D:\Projects\travel_plan" --restore "D:\Projects\travel_plan_atlas_backups\<timestamp>"` để hoàn nguyên.

## Chưa xác minh / tồn tại

- Các tệp đã được kiểm tra cú pháp TSX bằng TypeScript `transpileModule` và đã kiểm tra thử luồng dry-run/apply/restore. **Chưa chạy** typecheck, lint, build hay Playwright trong workspace Windows của bạn do connector chỉ cấp quyền đọc.
- Các test E2E/typography phụ thuộc UI đã được **viết lại phù hợp yêu cầu thay đổi** (gồm kiểm tra xếp lịch, tự xếp, trạng thái nhập Maps, hydration, font tiếng Việt, responsive, giảm chuyển động). Không sửa test unit của thuật toán. 3D bưu thiếp không còn thuộc trải nghiệm mặc định; các assertion 3D cũ được thay bằng kiểm tra sơ đồ tọa độ. Test code đã được kiểm tra cú pháp, **chưa được chạy trong repo thực**, vì vậy không khẳng định test pass. Nếu có lỗi khi chạy, cần điều tra nguyên nhân thay vì tắt test.
- Dữ liệu giờ mở cửa/giá tham quan/đường giao thông thực tế chưa có; Supabase/API cloud vẫn cần cấu hình và nghiệm thu riêng. Chưa phù hợp triển khai production.
- Font gốc có sẵn trong dự án; gói này không phân phối font mới.

## Ba nguồn tham khảo về cấu trúc (không sao chép hình ảnh/code)

- Roadtrippers: `https://support.roadtrippers.com/hc/en-us/articles/203322709-Website-Getting-Started` — mô hình giao diện map/itinerary cùng lúc, thêm và sắp xếp điểm dừng.
- Wanderlog: `https://help.wanderlog.com/hc/en-us/sections/5154228681883--Daily-itinerary` — lịch trình ngày, thời gian tại địa điểm và tuyến đến điểm tiếp theo.
- Atlas Obscura: `https://www.atlasobscura.com/` — hierarchy typography và nội dung điểm đến mang tính biên tập, không sao chép hình ảnh hay bố cục.

## Không thay đổi / để lại cho giai đoạn tiếp

- Các tệp `src/domain/**`, `src/adapters/**`, `src/lib/api/**`, migration và schema đang có **không bị chỉnh sửa** bởi bản UI v2. Endpoint generate/apply hiện yêu cầu cloud/owner; màn hình này gọi trực tiếp engine cục bộ để kiểm chứng chức năng mà không giả vờ đã có lưu cloud.
- Nội dung thư mục `travel-plan-redesign` cũ không bị xóa; gói này dùng thư mục con `travel-atlas-v2`.
- Từ đây cần kiểm tra build, E2E trên Windows thực và kiểm tra logic lịch trình thực địa. Không được coi chạy được demo là đủ để triển khai sản phẩm public.
