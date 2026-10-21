# P00-01 — Baseline phạm vi MVP

Ngày: 2026-10-21. Nguồn chuẩn: [MASTER_PLANNER](../MASTER_PLANNER.md), mục 0–5, 7–14, 18, 23.
Tài liệu này là bản truy vết baseline v1.0, không chứng nhận tính năng đã triển khai.
Owner dưới đây là vai trò chịu trách nhiệm; chưa có cá nhân được chỉ định. Acceptance PASS ở P00-01 chỉ có nghĩa là đặc tả đủ, không phải runtime test đã PASS.

## Phạm vi và non-goals

P0: Nha Trang, tiếng Việt, catalog 30–50 địa điểm có quyền dữ liệu/ảnh; trip 1–7 ngày; tối đa 30 điểm chọn và 8 điểm/ngày; timeline, nhập địa điểm thủ công, Maps import an toàn, planner deterministic, local draft, cloud owner save, chia sẻ chỉ xem và thu hồi. Generate tạo candidate; apply cần user xác nhận và atomic version check. Anonymous session mất có thể mất quyền sửa; share không khôi phục quyền owner.

P1 chỉ sau P0: PWA/offline pack, PDF/export/lịch, chi phí tự nhập, lịch sử phiên bản, đa tỉnh, account upgrade, preferences nâng cao. Must-visit/required-first thuộc P0; user đã duyệt làm rõ SCOPE-001 tại ADR-0011, Master 2.2 đã đồng bộ.

P2 ngoài MVP: đặt vé/phòng, thanh toán, realtime collaboration, nội dung/lịch AI không kiểm chứng, live weather, scraping Google Maps, 3D nặng, tối ưu đa thành phố/đa khách sạn, native mobile. Dùng outbound Maps, lodging nhập tay, không tối ưu tàu/đảo; không mô tả approximate duration là ETA chính xác. Đây là defaults mục 23, không đổi kiến trúc.

## Maps URL: giới hạn cam kết

Chỉ parse HTTPS trên allowlist chính xác trong mục 7; không substring-match host. URL chỉ là đầu vào tìm ứng viên, không bảo đảm luôn lấy được Place ID, tên, tọa độ hay route. Full URL không rõ/shortlink không phân giải an toàn phải trả manual-entry fallback và cho user xác nhận. Không scrape HTML Google hoặc fetch arbitrary URL. Redirect cần kiểm soát từng hop và network/DNS; nếu không bảo đảm, không fetch và yêu cầu expanded URL/nhập tay. API key thiếu hoặc quota/lỗi provider không ngăn tạo draft và planner approximate có nhãn. Không gán tọa độ camera viewport thành tọa độ POI đã xác minh. Kiểm tra policies thực tế thuộc P00-03.

## Truy vết FR

| Requirement | Owner role | Acceptance IDs | Verification task | Kỳ vọng kiểm chứng |
|---|---|---|---|---|
| FR-001 | Frontend | BASE-001, AC-014 | P03-01 | Landing chọn Nha Trang; route catalog đúng |
| FR-002 | Content | BASE-002 | P00-04, P02-01, P03-01 | 30–50 record đủ metadata/quyền; filter/search hoạt động |
| FR-003 | Frontend | AC-001, BASE-003 | P03-02 | Ngày/giờ/timezone/pace/mode hợp lệ; date bounds |
| FR-004 | Frontend | BASE-004, AC-005 | P03-02 | Lodging nhập tay/catalog; base tạm có warning |
| FR-005 | Frontend | BASE-005, AC-002 | P03-02 | Thêm/xóa/priority không mất điểm; chống duplicate |
| FR-006 | Security | AC-006, AC-007 | P03-03 | Candidate confirmation; SSRF reject; manual fallback |
| FR-007 | Domain | AC-002, AC-003, AC-004, AC-005 | P04-01, P04-02, P04-03 | Bounds/hours/travel/buffer; no silent drops |
| FR-008 | Frontend | BASE-006, AC-002 | P04-04 | Timeline cùng unscheduled reason rõ ràng |
| FR-009 | Domain | BASE-007 | P05-03 | Sửa/kéo thả/keyboard; giữ locks và hiện conflict |
| FR-010 | Persistence | AC-008 | P05-01 | Reload khôi phục draft/version |
| FR-011 | Backend | AC-011, AC-013, BASE-008 | P02-03, P05-02 | Owner save/load; atomic update; stale version rejected |
| FR-012 | Security | AC-009, AC-010, BASE-009 | P06-01, P06-02, P06-03 | CSPRNG >=128 bit, hash only, read-only, revoke |
| FR-013 | Frontend | BASE-010, AC-014 | P03-01, P07-03 | Outbound Maps từng điểm và mobile usable |
| FR-014 | Frontend | BASE-011, AC-015 | P03-04, P05-04 | Tiếng Việt; loading/empty/error/offline; reduced motion |
| FR-015 | QA | BASE-012, AC-012 | P01-02, P04-02 | Fixture/demo không key; CI không live API |

## Truy vết BR

| Requirement | Owner role | Acceptance IDs | Verification task | Kỳ vọng kiểm chứng |
|---|---|---|---|---|
| BR-01 | Domain | AC-001, BASE-003 | P03-02, P04-01 | 1–7 local days; end trước start bị reject |
| BR-02 | Domain | BASE-013 | P04-01, P04-03 | Reject 31 selected; max 8 scheduled/ngày và pace cap |
| BR-03 | Domain | AC-004, BASE-014 | P04-01, P04-03 | Partial days + transfer buffers; return before departure |
| BR-04 | Domain | AC-001, BASE-015 | P04-01 | IANA trip timezone; UTC execution timestamps; DST fixture |
| BR-05 | Content | AC-003, BASE-016 | P00-04, P04-03 | Verified hours honored; unknown tentative warning |
| BR-06 | Domain | BASE-017 | P04-03 | Pace intensity + breaks; toggle break kiểm tra lại feasibility |
| BR-07 | Domain | BASE-005 | P03-02, P03-03 | ID trùng không tự thêm; near duplicate cần xác nhận |
| BR-08 | Domain | BASE-007 | P04-03, P05-03 | Lock conflict giữ nguyên locked stop |
| BR-09 | Domain | BASE-018 | P04-01, P04-03 | Out-of-area warning và infeasible reason khi cần |
| BR-10 | Adapters | AC-012, BASE-012 | P04-02 | Missing key/429/5xx fallback có estimate_source |
| BR-11 | Security | AC-009, AC-010, AC-011 | P06-02, P06-03 | Share không cho owner access; revoke không xóa trip |
| BR-12 | Privacy | BASE-019 | P03-02, P08-03 | Không xin GPS mặc định; chỉ xin cho action rõ ràng |

## Acceptance bổ sung (đặc tả, runtime NOT RUN)

AC-001..AC-015 giữ nguyên nghĩa tại MASTER_PLANNER mục 4. BASE bổ sung khoảng thiếu, không thay AC gốc.

- BASE-001: Chọn Nha Trang từ landing mở catalog Nha Trang, không quảng cáo city khác đã hỗ trợ.
- BASE-002: Catalog published có 30–50 record với category, description, valid coordinates/duration, image, provenance/license, hours state và verified date trung thực.
- BASE-003: Reject end<start, 0/>7 ngày, invalid local times/mode/pace/timezone; không tạo trip sai.
- BASE-004: Lodging nhập tay có label/coordinates hợp lệ; base tạm có cảnh báo; đổi base tính lại matrix khi generate.
- BASE-005: Add/remove/priority cập nhật selection; cùng catalog/provider ID không duplicate tự động; tên/tọa độ gần cần confirmation.
- BASE-006: Timeline hiển thị local day, visit/travel provenance, warnings và tất cả unscheduled reason; tổng accounting khớp input.
- BASE-007: Edit/drag/keyboard giữ locks; vi phạm hiện conflict; regenerate không âm thầm đổi locked day/order/time.
- BASE-008: Save và load qua verified owner/RLS; atomic trip+stops; anonymous-ownership warning; idempotency không duplicate mutation.
- BASE-009: Code CSPRNG >=128 bit, stored hash only; list/log không plaintext; invalid/revoked/expired không rò trip; rate limit verified.
- BASE-010: Mỗi điểm có outbound Maps URL an toàn; các điều khiển landing/wizard/timeline dùng được ở 360px.
- BASE-011: Các trạng thái loading/empty/error/offline có hành động tiếng Việt; reconnect không mất draft; reduced motion giảm animation lớn.
- BASE-012: CI/demo không gọi live Google; missing key/quota/provider error chuyển approximate hoặc manual, giữ input và gắn uncertainty.
- BASE-013: 31 selected bị reject; <=30 selected vẫn accounting đầy đủ; scheduled <=min(8, pace cap) mỗi ngày.
- BASE-014: Ngày đầu/cuối và same-day không xếp ngoài bounds sau transfer buffer; leg về base/khởi hành được tính.
- BASE-015: Tính theo local calendar IANA, không UTC-day slicing; UTC audit timestamps; future DST boundary không off-by-one.
- BASE-016: Hours unknown không coi là chắc chắn mở; multiple/overnight windows và stale verification có warning/constraint phù hợp.
- BASE-017: Pace hạn chế fatigue/outdoor; default lunch/rest buffer không overlap; tắt break phải revalidate.
- BASE-018: Ngoài city envelope hiện xa trung tâm; không feasible được unscheduled explicit, không biến mất.
- BASE-019: Journey mặc định không gọi geolocation API; GPS chỉ sau user chọn tính năng cần GPS và có consent.

## Điều chưa chốt và trách nhiệm

Xem [decision register](DECISION_REGISTER.md). PRD freeze ở mức phạm vi tham chiếu; các ambiguity có owner/blocking task, không được ngầm quyết định khi triển khai. Mọi thay đổi contract/security/engine cần ADR theo AGENTS.md.
