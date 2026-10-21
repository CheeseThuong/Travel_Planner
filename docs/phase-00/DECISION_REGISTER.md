# Phase 00 — Decisions, conflicts and ownership

Ngày: 2026-10-21. Owner là vai trò, chưa phải chữ ký người chịu trách nhiệm. `PROPOSED` không cho phép tự đổi baseline.

| ID | Sources / vấn đề | Owner | Đề xuất hoặc default có sẵn | Status / blocking milestone |
|---|---|---|---|---|
| GOV-001 | AGENTS task DONE requires gate; WORK_ITEMS G0 needs completed tasks; tasks have dependencies | Project owner | DONE sau task AC/tests PASS; phase transition vẫn cần gate PASS | ACCEPTED bởi user trong chat 2026-10-21; ADR-0000 |
| SCOPE-001 | Master 2.2 đưa required/optional vào P1; 3.2/FR-005/12 yêu cầu must-visit ở MVP | Product | Required-first P0; P1 chỉ preferences mở rộng | ACCEPTED user 2026-10-21; ADR-0011 |
| API-001 | Master 10 trip mutations liệt kê 400, test T-002/T-003 yêu cầu 422 validation | Backend | Malformed JSON=400, parsed schema/semantic validation=422; update OpenAPI/tests khi triển khai | ACCEPTED user 2026-10-21; ADR-0011 |
| API-002 | Master 3.1 nói giải mã token ở client; 7/10.5 dùng opaque token + server hash resolution | Security | Client chỉ parse fragment, server resolve opaque token; không decrypt trip client-side | ACCEPTED user 2026-10-21; ADR-0011 |
| ENGINE-001 | Master 13.1 hỗ trợ hours overnight; 23 chưa chốt lịch qua đêm/tàu | Domain | Normalize overnight hours thành local-day windows; không auto-route overnight/boat tour | ACCEPTED user 2026-10-21; ADR-0011 |
| COST-001 | Master 23 chưa có spending cap | Operations | Mặc định live provider OFF, chi phí API ngoài bằng 0; chưa cho staging live tới khi cap/account quotas được duyệt | DEFAULT DISABLED; cap cần owner trước P08-02 |
| MAP-001 | Master 23 map UI | Product | Catalog/timeline + outbound Maps; không embedded map mặc định | BASELINE DEFAULT; review P00-02 |
| HOTEL-001 | Master 23 lodging autocomplete | Product | Nhập tay đủ cho MVP; optional provider | BASELINE DEFAULT; review P00-02 |
| ACCOUNT-001 | Master 2.2/7 anonymous owner recovery | Product | Upgrade account P1; share chỉ xem; cảnh báo mất credentials | BASELINE DEFAULT; review P00-02 |
| RIGHTS-001 | Baseline chưa có nguồn nội dung/ảnh | Content / project owner | Nha Trang 30 + Đà Lạt 30 independent OSM-derived drafts; source/license evidence; original symbolic SVGs; no Google/synthetic substitutions | ACCEPTED user G0 confirmation 2026-10-21; ADR-0012/0013; runtime publication still gated |
| POLICY-001 | Master links là baseline, không phải compliance sign-off | Privacy / operations | Primary policies reviewed; technical checklist signed Codex; legal identity/account-specific review required before live/release | TECHNICAL REVIEW COMPLETE P00-03; P08 live/legal remains pending |

## Governance resolution

User đã chấp thuận GOV-001 trong chat sau khi được chỉ rõ vòng phụ thuộc. [ADR-0000](../adr/ADR-0000.md) sửa task/gate bookkeeping. User tiếp tục duyệt cả bốn làm rõ scope/contract tại [ADR-0011](../adr/ADR-0011.md); MASTER_PLANNER đã cập nhật. RIGHTS-001/POLICY-001 vẫn cần bằng chứng riêng.
