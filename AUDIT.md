# AUDIT — Vietnam Playful Travel Planner

## Current baseline review — 2026-10-28 (supersedes historical status below)

Inspected local HEAD `33beb14` on `fix/audit-and-upgrade`, including the pre-existing dirty Git state before editing. Latest external evidence is `D:\Projects\travel_plan_audit_evidence_20261027-110421`; directory and logs were readable without escalation. The old MCP-only access/branch blocker below no longer applies. Full scope, raw log locations and verification: [baseline recovery report](docs/reports/AUDIT-BASELINE-20261028.md).

### Confirmed defects / corrective baseline work

- **B-01:** `npm.cmd run lint` historically exited 1 and reproduced locally: ESLint scans `.agent-skills/` examples despite Git ignoring the clones. A failing regression test proves the boundary; exclude only the external clones, keep project checks active.
- **B-02:** `npm.cmd run test:integration` historically exited 1 and reproduced locally: smoke expected the pre-P03-02 heading. Change the specific expected heading to current source copy; keep HTTP/language/health assertions.
- **A-05:** Wizard limits selection to the first 12 records although each catalog has 30. Confirmed source limitation requiring a P03 correction, not evidence that planner drops scheduled stops.
- **A-07:** Manual wizard claims a personal plan is ready when only inputs were checked. Confirmed misleading copy; must distinguish input validation from generated/saved itinerary.
- **A-11:** README and tracker summaries disagree. Tracker records G2 PASS and P03-01/02 DONE; README still describes them as unimplemented. Historical reports are not fresh verification.

### Incomplete features (not reproduced algorithm/security defects)

P03-03 URL parser/resolver/candidate confirmation/manual entry and P03-04 complete UI states are absent. P03-02 is recorded DONE but lacks arrival/departure, base coordinates and required controls needed for G3's accurate draft; this conflict must be corrected before G3. A-01/02/03/06/08/09/14 describe missing P04–P06 engine/API/editor/persistence/share behavior. A-04 is incomplete wizard input. A-10 is missing async states. These do not prove an existing scheduler miscalculates, loses locks or violates RLS.

### Historical evidence / environment failures

External CSV actual results on 2026-10-27: strict install **0**, lint **1**, typecheck **0**, unit **0** (30 tooling +30 Vitest), integration **1**, build **0**, demo E2E **0** (22/22), typography **1** (24/72 passed;48 failed;0 skipped). JSON confirms every failed typography test could not launch a missing browser:24 Firefox1555 and24 WebKit2370. All24 Chromium cases passed. No typography assertion failure is recorded. Install warnings concern deprecated OpenTelemetry and unapproved unrs-resolver install script; no project security finding is established by those warnings.

G0/G1/G2 PASS are retained **historical tracker decisions**, not newly run DB/CI checks. The external browser results cover scaffold/catalog/wizard preview only, not planning/save/share. A-15 was already addressed by the user's `.gitignore` edit and three local clones; preserve them and do not commit clones.

### Unverified assumptions / remaining risks

A-12 editorial hours/access/prices are unverified. A-13 physical-device performance, full WCAG and G7 acceptance remain unverified; existing browser passes do not establish those. No proven planner route error, data leak, hydration defect or GPU regression is inferred. Live Maps, production and database verification were not run in this review. Network sandbox initially blocked missing-browser download with `connect EACCES ...:443`; an escalated download to ignored `.tools/ms-playwright` is in progress. Package/lock OpenAI additions were reviewed as unrelated existing edits; security/bundle/adoption approval is not established and they remain untouched and unstaged.

**Fresh verification:** baseline corrections DONE. `npm.cmd run lint`, `typecheck`, `test:unit` (31 tooling +30 Vitest), `build`, `test:integration` (12 HTTP), `test:e2e` (22) and `test:typography` (72) all exited0. Existing `.tools/browsers` contains the exact Firefox/WebKit revisions; full tests passed with `PLAYWRIGHT_BROWSERS_PATH` set there. Stalled download cancelled and test-owned server cleaned up; details and command logs in the report. No production/DB/live-provider claim.

**P03-03 completed:** safe no-fetch parser/resolver/API, editorial confirmation, manual entry, duplicate/capacity protection. [Exact files and results](docs/reports/P03-03.md): lint/typecheck/build/integration/unit (31 tooling +51 Vitest)/E2E28 all exit0. Shortlinks remain opaque and use manual fallback; no Google resolution or new verified provider data claimed. The earlier statement that P03-03 was absent describes the audited baseline.

**Dependency order:** P03-02-CORRECT → P03-04 → G3 review → P04. G3–G8 remain NOT VERIFIED. The original audit below is retained as historical material.

---

## Historical static audit — 2026-10-27

**Repository:** `CheeseThuong/Travel_Planner`

**Source inspected:** MCP workspace `travel_plan`, branch `codex/recovery-foundation`, commit `33beb14` (working tree dirty)

**Date:** 2026-10-27

**Status:** PARTIAL STATIC AUDIT / REMEDIATION NOT STARTED / RELEASE NOT READY

## 1. Phương pháp và giới hạn bằng chứng

Đã đọc trực tiếp `README.md`, `AGENTS.md`, `docs/MASTER_PLANNER.md`, `docs/WORK_ITEMS.md`, `docs/KNOWN_LIMITATIONS.md`, cây thư mục `src/` và `tests/`, các file domain, wizard, route/API, Supabase adapter, các trang open/shared/trips, cấu hình Playwright, CSS/motion, fixture và unit/E2E hiện có. Đã đọc README và SKILL.md tiêu biểu của 3 repository kỹ năng từ GitHub.

**Chưa thực hiện được:** `npm ci`, `lint`, `typecheck`, `build`, Vitest, Playwright, thử giao diện trực tiếp, mạng/Supabase thật, đo Lighthouse mới. MCP `travel_plan` hiện chỉ cung cấp đọc file/trạng thái; công cụ GitHub `create_branch` trả HTTP 403 `Resource not accessible by integration`. Các trạng thái PASS trong docs là bằng chứng lịch sử, **không phải** kết quả chạy lại ngày 2026-10-27.

**Giới hạn phạm vi:** File source đã kiểm tra phản ánh working tree hiện tại, gồm các thay đổi chưa commit ở `package.json` và `package-lock.json`, và thư mục không được theo dõi `scripts/docker-loopback/obj/`. Không ghi đè các thay đổi này. Không kiểm tra credential hoặc đọc file `.env`.

## 2. Tổng quan sản phẩm và luồng dữ liệu hiện có

- `src/app/page.tsx` -> `/destinations/[slug]` -> `/plan/new`: giới thiệu thành phố, catalog và wizard chuẩn bị đầu vào.
- `src/app/plan/new/page.tsx`: chuyển JSON seed Nha Trang/Đà Lạt thành `CatalogPlace[]`, truyền vào client `PlanWizard`.
- `src/components/plan-wizard.tsx`: giữ input bằng React state; tính số ngày và gọi `summarizeTripBudget`; submit chỉ đặt `submitted=true` rồi hiện thông báo chuẩn bị, không tạo `TripDraft`, không gọi planner hay API.
- `src/domain/model/trip.ts`: có model input/output `TripDraft`, `TripStop`, `PlanCandidate`; `src/domain/ports/providers.ts`: có interface route matrix và place resolver; `src/adapters/testing/fixture-routing.ts`: mock routing phục vụ test.
- `src/adapters/supabase/owner-drafts.server.ts`: đã có server adapter cho owner draft sử dụng Supabase auth/RPC. Tuy nhiên `src/app/api/v1` hiện chỉ có `/health`; chưa có UI/API sử dụng adapter để hoàn thiện user journey.
- `/trips/[tripId]`, `/open`, `/shared`: đều trả `ComingSoon`; chưa có editor, save/reload/share thực tế.
- `src/components/motion/*`: đã có Motion/GSAP, lazy Three.js, SVG fallback và reduced-motion handling. Không nên thay toàn bộ khi chưa đo lại hiệu năng.

## 3. Danh mục phát hiện — theo độ ưu tiên

| ID | Severity | Phát hiện / bằng chứng | Root cause | Hướng xử lý | Trạng thái |
|---|---|---|---|---|---|
| A-01 | **Critical** | Wizard không tạo lịch trình; `submit()` chỉ gọi `setSubmitted(true)`; không có domain planner trong `src/domain/`. | Bộ lập lịch P04 chưa được triển khai, không phải lỗi 2-opt đang chạy. | Hoàn tất G3, sau đó triển khai pure deterministic planner: calendar/time windows, directed routing, feasible insertion required-first, diagnostics, scoring, unscheduled. | **OPEN** |
| A-02 | **Critical** | `src/app/api/v1/` chỉ có `health/route.ts`; không có generate/apply endpoints. | Thiếu lớp hợp đồng API, xác thực, version checks, orchestration. | API validate Zod, auth owner, rate limit, candidate vs apply tách biệt, expected_version; test contract/integration. | **OPEN** |
| A-03 | **Critical** | `/trips/[tripId]`, `/open`, `/shared` đều `ComingSoon`; không thể mở/chỉnh/lưu/chia sẻ kế hoạch. | Phase 05–06 chưa được triển khai mặc dù adapter/schema nền đã có. | Local draft, owner CRUD, version concurrency, editor và share read-only CSPRNG/token-hash/RLS. Không sửa schema trừ khi test cho thấy thật sự cần. | **OPEN** |
| A-04 | **High** | Wizard không hỏi giờ đến/rời, điểm xuất phát/khách sạn, time windows, locked/required stop. | UI hiện chưa thu thập đủ `TripDraft` để tính tính khả thi. | Bổ sung input bắt buộc/optional cùng validation, timezone và partial-day bounds; không tự giả định hotel tọa độ. | **OPEN** |
| A-05 | **High** | Danh sách lựa chọn render bằng `places.slice(0, 12)` dù catalog lớn hơn và specification hỗ trợ tối đa 30 điểm. | Giới hạn demo hard-coded ở UI, không có chọn toàn catalog/filter/select tray. | Search/filter/pagination có lựa chọn/persist 30 điểm; test không mất lựa chọn qua filter/pagination. | **OPEN** |
| A-06 | **High** | `planningMode='manual'` chỉ đổi thông điệp; chưa có trình soạn lịch hoặc bộ kiểm tra conflict. | UI mode chưa nối vào mô hình lịch và validator. | Manual mode KHÔNG chạy optimizer; cho gán ngày/giờ, reorder và validate overlap/lock/hours; giữ nguyên dữ liệu nếu conflict. | **OPEN** |
| A-07 | **High** | Wizard thông báo “Kế hoạch cá nhân đã sẵn sàng” dù thực tế mới có thông số đầu vào. | Trạng thái UI chưa phân biệt prepared inputs với feasible/generated/saved. | Đổi thành “Đã kiểm tra thông tin sơ bộ”, chỉ công bố “Có lịch trình” khi có output hợp lệ; hiển thị chưa xác minh giờ/chi phí. | **OPEN** |
| A-08 | **High** | Các unit/E2E hiện kiểm tra budget, boundaries và wizard preview, không kiểm tra lịch trình thực với open hours, directed travel, locks, deterministic output. | P04 planner chưa tồn tại. | Red-first test suite cho 13 edge cases trong Master Planner, property/invariant checks không trùng lịch, không silent drop. | **OPEN** |
| A-09 | **High** | Không có hồi phục sau reload/offline/cùng lúc hai tab cho planning wizard; persistence chỉ là adapter server tách rời. | G5 local-first chưa triển khai. | IndexedDB draft + debounce; optimistic concurrency; offline/pending UI; ownership isolation. | **OPEN** |
| A-10 | **Medium** | Wizard không có các state hoàn chỉnh loading/empty/error/offline sau generate/save; hiện chỉ `submitted` và invalid alert. | Chưa có async request/retry/cancel/resume contract. | Accessible status messages, disabled during submit, retry, preserving input, server/request ID. | **OPEN** |
| A-11 | **Medium** | `README.md` phần Current state cũ nêu G2 chưa hoàn tất, trong khi `docs/WORK_ITEMS.md` ghi G2 PASS. | Tài liệu trạng thái chưa đồng bộ theo commit. | Cập nhật README theo tracker; vẫn kiểm lại logs/CI trước khi xác nhận PASS mới. | **OPEN** |
| A-12 | **Medium** | 60 bản ghi POI được docs ghi là editorial draft, chưa xác minh giờ mở cửa/truy cập/giá thực. | Thiếu content verification; thuật toán không thể giả định giờ hoạt động chính xác. | `hours_unknown`, warn tentative, source + verified_at; yêu cầu xác minh POI thực tế trước khi công bố. | **OPEN** |
| A-13 | **Medium** | 3D/GSAP đã có fallback và reduced-motion, nhưng chưa có số đo G7 hiện tại; hiệu ứng scroll-world thiên về video nặng/có chi phí. | Chưa có benchmark thực tế mới; mở rộng animation lúc này tăng rủi ro perf. | Giữ visual progressive enhancement, đo FPS/INP/LCP/CLS trên 360/768/1440, lazy import, dừng canvas nền, WebGL fallback. | **OPEN / MEASURE** |
| A-14 | **Medium** | UI mới cho chọn `places.slice(0,12)`, không cho xem lý do unscheduled/route source/duration hay sửa lịch sau generate. | Thiếu timeline, route map và diagnostics. | Prioritize timeline + editable stops + warnings + map links trước trang trí 3D. | **OPEN** |
| A-15 | **Low** | `.gitignore` chưa có `.agent-skills/`. | Skills chưa được clone theo quy trình người dùng yêu cầu. | Thêm đúng một ignore rule, clone shallow vào thư mục này, không thêm source repo. | **OPEN** |

### Không coi là lỗi khi chưa có bằng chứng

- Không được kết luận đã có sai số Haversine, nearest-neighbor, 2-opt hay lịch trùng: **chưa có engine thực thi được để tái hiện**.
- Không kết luận Supabase RLS bị lộ: docs đã có G2/pass lịch sử và adapter owner; cần kiểm chứng trực tiếp bằng auth/RLS test mới.
- Không khẳng định hydration error, responsive break, WCAG violation hay FPS thấp nếu chưa chạy browser và thiết bị mục tiêu.

## 4. Skills tham khảo — đã đọc README và SKILL.md tiêu biểu

| Repo | Giá trị | Áp dụng | Rủi ro/giới hạn |
|---|---|---|---|
| `oso95/scroll-world` | Scroll-scrub pre-rendered seamless video chain, camera flight, engine vanilla JS. | Chỉ cân nhắc storytelling landing tùy chọn, KHÔNG ở wizard/planner. | Yêu cầu video-generation provider, CLI, credits; nặng trên mobile. Cần lựa chọn ngân sách, không tự phát sinh chi phí. |
| `CloudAI-X/threejs-skills` | API Three.js r186, scene/geometry/React/interaction/performance/WebGL fallback. | Rà lại `three-postcard.tsx`; renderer lifecycle, memory disposal, draw calls, frame-time. | Tránh thêm GPU work khi chưa đo. |
| `greensock/gsap-skills` | React `gsap.context()` cleanup, timelines/ScrollTrigger, motion performance. | `travel-postcard.tsx`, transitions nhẹ và accessible. | Reduced-motion và cleanup bắt buộc; không dùng animation che content. |

**Cần làm trên máy local:** clone cả ba repo vào `.agent-skills/`, đọc toàn bộ `SKILL.md` liên quan trước khi chỉnh animation. Chưa clone được qua read-only MCP.

## 5. Bài toán thuật toán đề xuất — sau G3

### Input contract

`TripDraft` gồm destination/tz, ngày + giờ đến/rời, tọa độ nơi lưu trú, transport/pace, party-size/budget, user preferences, selected stops (tọa độ, duration, giờ mở cửa có provenance, required/optional, locks, transport constraints). `RoutingProvider` cung cấp directed matrix; phải tôn trọng `unreachable`; không gọi thời gian Haversine là ETA thực.

### Deterministic pipeline

1. Validate và chuẩn hóa ngày địa phương, HH:mm, lat/lng, stop IDs, budget/party/duration.
2. Tạo các day windows theo arrival/departure, optional lunch/rest và reserve return-to-base.
3. Chuẩn hóa giờ mở cửa (multi-interval/overnight), đánh dấu hours unknown, tách out-of-area/manual-transfer/duplicate.
4. Precluster theo Haversine và nút lodging/base; request bounded matrix có provenance; fallback approximate rõ ràng.
5. Đặt locked stops trước và trả conflict nếu không feasible; sau đó required-first best feasible insertion qua tất cả ngày/vị trí.
6. Chèn optional bằng lexicographic ordering `(required_satisfied, optional_served, preference, travel, wait, uncertainty)` với deterministic tie-break bằng IDs.
7. Local search relocate/swap/2-opt **chỉ nhận thay đổi nếu mọi hard constraints vẫn đạt**; directed routing means 2-opt phải tính lại từng cạnh theo hướng mới.
8. Revalidate toàn bộ lịch và return leg; mọi stop đúng 1 trong scheduled/unscheduled; emit exact reason `CLOSED`, `TIME_WINDOW`, `UNREACHABLE`, `CAPACITY`, `LOCK_CONFLICT`...
9. Budget summary: biết/không biết tách biệt, over-budget chỉ hard-block nếu preference thực sự yêu cầu; không tự coi unknown cost là 0.
10. Manual mode chỉ validate, không tự chuyển điểm/ngày/giờ hay loại điểm đã xếp.

### Test bắt buộc trước khi triển khai

- 1 ngày arrival 17:00 / departure 19:00: không nhét 4 stops.
- Opening 09–12, 14–17: không cho xuyên qua interval nghỉ; weekday filter; closed reason.
- A→B 12 phút và B→A 40 phút: kiểm tra directed, không lấy trung bình.
- Bất khả thi do vị trí cách 100 km hoặc matrix unreachable: report, không drop âm thầm.
- Locked time bị overlap: conflict, không sửa lock.
- Must-visit infeasible: unscheduled + unfulfilled required reason.
- Duplicate IDs và cùng tọa độ: không trùng, không NaN.
- Same fixture + seed + version: byte-identical normalized result.
- 30 stops, 7 days, pace cap và ngân sách người/nhóm.
- Null budget/unknown price vs zero, user-entered cost provenance.
- Partial-day boundaries và return-to-base.
- Manual mode invariant: danh sách/giờ không thay đổi.

## 6. Quy trình thực thi và acceptance gates

**Bắt buộc tôn trọng `docs/WORK_ITEMS.md` hiện có:** G0/G1/G2 ghi PASS theo bằng chứng trước; G3–G8 chưa được xác nhận. Không được bỏ G3 rồi triển khai một planner tích hợp thiếu import/fallback và validation.

| Giai đoạn người dùng | Task IDs / phạm vi ưu tiên | Điều kiện chấp nhận |
|---|---|---|
| 0 | Clone skills và `.gitignore`; isolate branch | `.agent-skills/` ignored; không lộ secret, Git dirty-state preserved |
| 1 | Audit static + runtime/browser evidence | `lint`, `typecheck`, `build`, unit, E2E, console, hydration, API; cập nhật AUDIT |
| 2 | G3 rồi P04-01..05 | Test RED trước fix, deterministic feasible engine và full G4 pass |
| 3 | G5 editor UX | Reload/reorder/manual/locks/error/offline regression pass |
| 4 | G7 motion/Three | Measured mobile perf, reduced motion, a11y, fallback |
| 5 | G6 sharing, user-visible core features | Auth/RLS, share read-only, atomic apply, E2E cross-device; no silent data loss |

**Lưu ý thứ tự:** Thứ tự kỹ thuật đúng theo dependency graph là **G3 → G4 → G5 → G6 → G7 → G8**. Các giai đoạn UI/đồ họa trong yêu cầu người dùng có thể được audit trước, nhưng không được đánh dấu DONE nếu phụ thuộc chưa đạt.

Mỗi task phải chạy lệnh tương ứng và ghi exit code; riêng mỗi giai đoạn của yêu cầu cần lint, typecheck, build và các test liên quan **trước khi commit**. Không commit/push trên `main` và không đẩy `.env`, keys, `.agent-skills/`, artifact test lớn. Sau khi pass, mỗi giai đoạn commit riêng; ưu tiên PR review, không auto merge.

## 7. Bằng chứng kiểm thử tính đến hiện tại

| Lệnh / kiểm tra | Trạng thái ngày 2026-10-27 |
|---|---|
| Static source and Git status | **INSPECTED** |
| `npm run lint` | **NOT RUN** — MCP không hỗ trợ command execution |
| `npm run typecheck` | **NOT RUN** |
| `npm run build` | **NOT RUN** |
| `npm run test:unit` | **NOT RUN** |
| `npm run test:integration` | **NOT RUN** |
| `npm run test:e2e` | **NOT RUN** |
| Local Supabase/pgTAP | **NOT RUN** — không thay schema |
| Browser console/hydration/responsive manual | **NOT RUN** |
| New branch created | **BLOCKED** — GitHub create-branch API returned 403; local CLI access needed |
| Code patches / commits | **NOT STARTED** — quality gates và branch not yet available |

## 8. Giả định, rủi ro, tồn đọng

- Baseline là `codex/recovery-foundation` (không phải main) vì đây là nhánh local hiện tại và upstream cùng commit; branch mới nên được tạo từ đây để tránh mất thay đổi đang xây dựng.
- Không đưa `package.json`/`package-lock.json` dirty vào commit nếu chưa review diff.
- Không có route keys/Supabase secrets sẵn trong phiên audit; chạy mock/local test, không dùng production.
- Dữ liệu hours/entrance/route không đủ xác minh cho lịch thực tế; lịch demo phải ghi tentative/approximate.
- Khi cần thay đổi schema Supabase phải có ADR + migration mới, pgTAP và rollback; bản audit không thực hiện schema mutation.

## 9. Hành động tiếp theo, đúng thứ tự

1. Chạy `RUN_AUDIT.ps1` trong PowerShell của máy sở hữu repo; nó sẽ tạo/checkout `fix/audit-and-upgrade` (giữ dirty files), thêm ignore và clone skills, rồi thu exit codes vào evidence ngoài repo.
2. Gửi các log `gate-summary.csv`, stderr/stdout của các lệnh fail và `git status` (không gửi `.env`/secret).
3. Phân tích lỗi runtime & E2E có bằng chứng, cập nhật file AUDIT này vào root repository bằng cách copy bản đã phát hành.
4. Chỉ sau khi gate Phase 0/1 đạt, làm P03-03/P03-04 và P04 test-first; commit từng phần sau verification.
