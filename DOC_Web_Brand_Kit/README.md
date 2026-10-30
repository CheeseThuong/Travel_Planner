# DỌC — Bộ nhận diện cho website

Bộ tệp được **trích xuất và dựng lại từ bảng thiết kế PNG do người dùng cung cấp**. Các tệp SVG được vector hóa từ đường viền trong ảnh nguồn; đây không phải file vector gốc do nhà thiết kế xuất. Font trong SVG đã được chuyển thành đường nét (path), không cần cài font ngoài.

## Cấu trúc

- `logo/doc-logo-full-color.svg` và `.png`: logo chính gồm biểu tượng DỌC và dòng mô tả, dùng trên nền sáng.
- `logo/doc-logo-wordmark.svg` và `.png`: chỉ chữ/biểu tượng DỌC, không có dòng mô tả.
- `logo/doc-logo-symbol.svg` và `.png`: riêng biểu tượng chữ D + ghim vị trí.
- `logo/doc-logo-tagline.svg` và `.png`: dòng mô tả độc lập.
- `logo/doc-logo-for-dark-background.svg` và `.png`: toàn bộ logo màu sáng cho nền tối.
- `logo/doc-logo-wordmark-for-dark.svg` và `.png`: phiên bản chữ DỌC màu sáng.
- `logo/doc-logo-symbol-white.svg` và `.png`: phiên bản biểu tượng màu sáng.
- `logo/doc-logo-monochrome.svg` và `.png`: logo đơn sắc.
- `logo/doc-logo-source-texture.png`: bản PNG nền trong suốt giữ chất liệu/màu trong hình gốc.
- `favicon/favicon.ico`: favicon đa kích thước 16, 32, 48, 64, 128, 256.
- `favicon/favicon.svg`: favicon vector.
- `favicon/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `favicon-64x64.png`: PNG kích thước thật.
- `app-icons/apple-touch-icon.png`: icon Apple 180×180.
- `app-icons/android-chrome-192x192.png`, `android-chrome-512x512.png`: icon Android/PWA.
- `app-icons/maskable-icon-512x512.png`: icon maskable cho PWA.
- `app-icons/app-icon.svg`, `app-icon-256x256.png`, `512x512.png`, `1024x1024.png`: icon ứng dụng.
- `app-icons/doc-symbol-transparent-512x512.png`: biểu tượng riêng có nền trong suốt.
- `social/og-image-1200x630.png`: ảnh xem trước khi chia sẻ liên kết.
- `site.webmanifest`: manifest mẫu với đường dẫn `/assets/`.
- `source/`: bảng thiết kế gốc và hình phiên bản nền tối để tham chiếu.

## Triển khai mẫu

Chép tất cả thư mục/tệp (trừ `source/` nếu không cần) vào thư mục `public/assets/` của frontend. Dùng logo trong header:

```html
<img src="/assets/logo/doc-logo-wordmark.svg" alt="DỌC — Lên kế hoạch du lịch" width="180" />
```

Thêm vào phần `<head>` của HTML:

```html
<link rel="icon" type="image/svg+xml" href="/assets/favicon/favicon.svg" />
<link rel="icon" type="image/x-icon" href="/assets/favicon/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/assets/app-icons/apple-touch-icon.png" />
<link rel="manifest" href="/assets/site.webmanifest" />
<meta property="og:image" content="https://TEN-MIEN-CUA-BAN/assets/social/og-image-1200x630.png" />
```

Thay `TEN-MIEN-CUA-BAN` bằng domain thực tế. Nếu bạn đặt tài nguyên ở một thư mục khác, sửa đường dẫn trong HTML và manifest.

## Màu thương hiệu

| Màu | Hex |
| --- | --- |
| Xanh rừng | `#183A3A` |
| Xanh nhạt | `#7FA19A` |
| Cam đất | `#D56A4F` |
| Kem sáng | `#FBF6ED` |

## Ghi chú chất lượng

PNG logo đã xuất độ phân giải lớn, với nền trong suốt; favicon và icon app có nền xanh bo góc theo bản thiết kế. SVG vector được trace từ raster nên có thể có sai số rất nhỏ ở các nét mảnh so với file vector gốc. Nên dùng SVG cho logo trên web, PNG cho những nơi yêu cầu ảnh raster, và favicon ICO cho trình duyệt đời cũ.
