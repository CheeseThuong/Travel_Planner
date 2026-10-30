# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: states.spec.mjs >> offline and reduced-motion keep selection and local planning available
- Location: tests\demo\states.spec.mjs:18:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Bạn đang ngoại tuyến.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Bạn đang ngoại tuyến.') with timeout 5000ms
  - waiting for getByText('Bạn đang ngoại tuyến.')

```

```yaml
- link "Bỏ qua đến nội dung":
  - /url: "#main-content"
- banner:
  - link "DỌC — Trang chủ":
    - /url: /
    - text: D. DỌC CHUYẾN ĐI CỦA BẠN
  - navigation "Điều hướng chính":
    - link "ĐIỂM ĐẾN":
      - /url: /#diem-den
    - link "MỞ KẾ HOẠCH":
      - /url: /open
    - link "LẬP TUYẾN ↗":
      - /url: /plan/new
- main:
  - region "Tuyến đường của bạn.":
    - text: BỘ LẬP LỊCH / BẢN THỬ TRÊN MÁY
    - heading "Tuyến đường của bạn." [level=1]
    - paragraph: Chọn địa điểm. Chốt ngày đi. Xem lịch trình được xếp theo thời gian — hoặc tự đặt từng chặng. Không cần điền 20 ô trước khi bắt đầu.
    - text: "01"
    - paragraph: CHỌN ĐIỂM
    - text: "02"
    - paragraph: XẾP LỊCH
    - text: "03"
    - paragraph: SOÁT LẠI
  - region "Ngày & người đồng hành":
    - text: 01 / KHỞI HÀNH
    - heading "Ngày & người đồng hành" [level=2]
    - text: Điểm đến
    - combobox "Điểm đến":
      - option "Nha Trang"
      - option "Đà Lạt" [selected]
    - text: Đi cùng mấy người?
    - spinbutton "Số người": "2"
    - text: Ngày đến
    - textbox "Ngày bắt đầu"
    - text: Ngày về
    - textbox "Ngày kết thúc"
    - text: Đến lúc
    - textbox "Giờ đến": 10:00
    - text: Rời lúc
    - textbox "Giờ rời đi": 17:00
    - text: Ngân sách cả nhóm (VND)
    - spinbutton "Tổng ngân sách"
    - text: Phương tiện
    - combobox "Phương tiện":
      - option "Xe máy" [selected]
      - option "Ô tô"
      - option "Đi bộ"
    - group "Nhịp chuyến đi":
      - text: NHỊP ĐI
      - button "Thong thả"
      - button "Vừa đủ" [pressed]
      - button "Đi nhiều"
    - group: Chỉnh điểm xuất phát (nâng cao)
  - region "Gom các điểm dừng":
    - text: 02 / BẠN MUỐN GHÉ ĐÂU?
    - heading "Gom các điểm dừng" [level=2]
    - paragraph: Chọn tối đa 30 điểm. Chưa có giờ mở cửa, vé vào cổng hoặc dữ liệu đường đi được xác minh.
    - text: Tìm trong danh mục
    - searchbox "Tìm trong catalog"
    - button "01 Chợ Đà Lạt 60 phút · market":
      - text: "01"
      - strong: Chợ Đà Lạt
      - text: 60 phút · market
    - button "02 Bảo tàng Lâm Đồng 90 phút · museum":
      - text: "02"
      - strong: Bảo tàng Lâm Đồng
      - text: 90 phút · museum
    - button "03 Thác Datanla 120 phút · attraction":
      - text: "03"
      - strong: Thác Datanla
      - text: 120 phút · attraction
    - button "04 Thác Voi 90 phút · attraction":
      - text: "04"
      - strong: Thác Voi
      - text: 90 phút · attraction
    - button "05 Thác Prenn 90 phút · attraction":
      - text: "05"
      - strong: Thác Prenn
      - text: 90 phút · attraction
    - button "06 XQ Đà Lạt 90 phút · museum":
      - text: "06"
      - strong: XQ Đà Lạt
      - text: 90 phút · museum
    - button "07 Đường hầm điêu khắc 120 phút · attraction":
      - text: "07"
      - strong: Đường hầm điêu khắc
      - text: 120 phút · attraction
    - button "08 Dinh III Bảo Đại 75 phút · culture":
      - text: "08"
      - strong: Dinh III Bảo Đại
      - text: 75 phút · culture
    - button "09 Ga Đà Lạt 60 phút · culture":
      - text: "09"
      - strong: Ga Đà Lạt
      - text: 60 phút · culture
    - button "10 Vườn hoa Cẩm Tú Cầu 75 phút · park":
      - text: "10"
      - strong: Vườn hoa Cẩm Tú Cầu
      - text: 75 phút · park
    - button "11 Mongo Land Đà Lạt 120 phút · attraction":
      - text: "11"
      - strong: Mongo Land Đà Lạt
      - text: 120 phút · attraction
    - button "12 Điểm ngắm Hồ Tuyền Lâm 45 phút · attraction":
      - text: "12"
      - strong: Điểm ngắm Hồ Tuyền Lâm
      - text: 45 phút · attraction
    - button "13 Vườn hoa thành phố Đà Lạt 90 phút · park":
      - text: "13"
      - strong: Vườn hoa thành phố Đà Lạt
      - text: 90 phút · park
    - button "14 Đồi trà Cầu Đất 90 phút · park":
      - text: "14"
      - strong: Đồi trà Cầu Đất
      - text: 90 phút · park
    - button "15 Khu vực Suối Vàng 60 phút · park":
      - text: "15"
      - strong: Khu vực Suối Vàng
      - text: 60 phút · park
    - button "16 Công viên Ánh Sáng 30 phút · park":
      - text: "16"
      - strong: Công viên Ánh Sáng
      - text: 30 phút · park
    - button "17 Vườn hoa Hữu nghị Việt-Nhật 30 phút · park":
      - text: "17"
      - strong: Vườn hoa Hữu nghị Việt-Nhật
      - text: 30 phút · park
    - button "18 Chùa Linh Quang 45 phút · culture":
      - text: "18"
      - strong: Chùa Linh Quang
      - text: 45 phút · culture
    - button "19 Nhà thờ Domaine de Marie 60 phút · culture":
      - text: "19"
      - strong: Nhà thờ Domaine de Marie
      - text: 60 phút · culture
    - button "20 Chùa Linh Sơn 45 phút · culture":
      - text: "20"
      - strong: Chùa Linh Sơn
      - text: 45 phút · culture
    - button "21 Nhà thờ Chánh tòa Đà Lạt 45 phút · culture":
      - text: "21"
      - strong: Nhà thờ Chánh tòa Đà Lạt
      - text: 45 phút · culture
    - button "22 Thiền viện Vạn Hạnh 60 phút · culture":
      - text: "22"
      - strong: Thiền viện Vạn Hạnh
      - text: 60 phút · culture
    - button "23 Thung Lũng Tình Yêu 150 phút · park":
      - text: "23"
      - strong: Thung Lũng Tình Yêu
      - text: 150 phút · park
    - button "24 Nhà thờ Cam Ly 45 phút · culture":
      - text: "24"
      - strong: Nhà thờ Cam Ly
      - text: 45 phút · culture
    - button "25 Linh Ẩn Tự 60 phút · culture":
      - text: "25"
      - strong: Linh Ẩn Tự
      - text: 60 phút · culture
    - button "26 Làng Cù Lần 150 phút · attraction":
      - text: "26"
      - strong: Làng Cù Lần
      - text: 150 phút · attraction
    - button "27 Nhà lao thiếu nhi Đà Lạt 75 phút · museum":
      - text: "27"
      - strong: Nhà lao thiếu nhi Đà Lạt
      - text: 75 phút · museum
    - button "28 Crazy House 90 phút · museum":
      - text: "28"
      - strong: Crazy House
      - text: 90 phút · museum
    - button "29 Tịnh xá Ngọc Đà 45 phút · culture":
      - text: "29"
      - strong: Tịnh xá Ngọc Đà
      - text: 45 phút · culture
    - button "30 Chợ Phan Chu Trinh 45 phút · market":
      - text: "30"
      - strong: Chợ Phan Chu Trinh
      - text: 45 phút · market
    - heading "Điểm trong túi 0/30" [level=3]
    - paragraph: Chưa chọn điểm ghé. Bắt đầu với hai hoặc ba nơi bạn thực sự muốn đến.
    - group: Thêm điểm từ Google Maps / nhập tay
  - region "Bạn muốn đi theo cách nào?":
    - text: 03 / XẾP TUYẾN
    - heading "Bạn muốn đi theo cách nào?" [level=2]
    - group "Chế độ lập lịch":
      - button "Tự động xếp lịch Hệ thống thử phân bổ điểm theo giờ và khoảng cách ước tính" [pressed]:
        - strong: Tự động xếp lịch
        - text: Hệ thống thử phân bổ điểm theo giờ và khoảng cách ước tính
      - button "Tôi tự xếp Bạn quyết định ngày và giờ, hệ thống báo xung đột":
        - strong: Tôi tự xếp
        - text: Bạn quyết định ngày và giờ, hệ thống báo xung đột
    - button "XẾP LỊCH TRÌNH →"
  - region "Lịch đi theo ngày":
    - text: 04 / BẢN LỊCH TRÌNH
    - heading "Lịch đi theo ngày" [level=2]
    - text: CHƯA CÓ LỘ TRÌNH
    - paragraph: Kết quả theo từng ngày sẽ xuất hiện tại đây sau khi bạn xếp lịch. Các điểm không xếp được cũng sẽ được liệt kê — không biến mất âm thầm.
  - complementary:
    - text: THÔNG TIN TUYẾN / ĐÀ LẠT
    - strong: 00 điểm đã chọn
    - text: — ngày 3 điểm/ngày (gợi ý) PHÁC ĐỒ / 01 KHÔNG PHẢI BẢN ĐỒ ĐƯỜNG ĐI
    - img "Phác đồ vị trí tương đối của 0 điểm ghé và một điểm xuất phát": BẮC ↑ TỌA ĐỘ TƯƠNG ĐỐI
    - paragraph: Đường nối chỉ thể hiện thứ tự và vị trí tương đối. Không thay thế chỉ đường, quãng đường hoặc thời gian di chuyển thực tế.
    - text: QUỸ DỰ KIẾN
    - strong: Chưa nhập ngân sách
    - paragraph: Nhập ngày và số người để xem mức chia ngân sách.
    - paragraph: Chưa trừ vé, ăn uống, chỗ ở, di chuyển và 0 điểm có chi phí chưa biết. Không phải giá tour.
    - text: "TỌA ĐỘ ĐIỂM GỐC: 11.9404, 108.4583"
    - paragraph: Điểm xuất phát tạm. Khoảng thời gian đi lại sử dụng ước lượng đường chim bay, không phải ETA điều hướng.
- contentinfo:
  - strong: DỌC / VIỆT NAM
  - paragraph: Sản phẩm đang thử nghiệm. Địa điểm, giờ hoạt động, chi phí và đường đi cần được xác minh trước khi khởi hành.
  - link "Quyền riêng tư":
    - /url: /privacy
  - link "Điều khoản":
    - /url: /terms
```

# Test source

```ts
  1  | import {test,expect} from "@playwright/test";
  2  | test("Maps import failed request can be retried without losing a selected place",async({page})=>{
  3  |  let calls=0;await page.route("**/api/v1/places/resolve",async(route)=>{
  4  |   calls++;if(calls===1)return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:{code:"PROVIDER_UNAVAILABLE"}})});
  5  |   return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{status:"manual_entry_required",candidates:[],manual_entry_available:true}})});
  6  |  });
  7  |  await page.goto("/plan/new?destination=da-lat");
  8  |  await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
  9  |  await page.locator(".atlas-import > summary").click();
  10 |  await page.getByLabel("Liên kết Google Maps").fill("https://maps.app.goo.gl/opaque");
  11 |  await page.getByRole("button",{name:"Tìm ứng viên"}).click();
  12 |  await expect(page.getByText("Không thể nhận diện liên kết lúc này",{exact:false})).toBeVisible();
  13 |  await page.getByRole("button",{name:"Tìm ứng viên"}).click();
  14 |  await expect(page.getByText("Chưa xác định được địa điểm",{exact:false})).toBeVisible();
  15 |  expect(calls).toBe(2);
  16 |  await expect(page.getByRole("list",{name:"Các điểm đã thêm"}).getByRole("listitem")).toHaveCount(1);
  17 | });
  18 | test("offline and reduced-motion keep selection and local planning available",async({page,context})=>{
  19 |  await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/plan/new?destination=da-lat");
  20 |  await context.setOffline(true);
> 21 |  await expect(page.getByText("Bạn đang ngoại tuyến.",{exact:false})).toBeVisible();
     |                                                                      ^ Error: expect(locator).toBeVisible() failed
  22 |  await page.locator('[aria-label="Chọn điểm ghé"] button').filter({hasText:"Chợ Đà Lạt"}).first().click();
  23 |  await page.getByLabel("Ngày bắt đầu").fill("2026-11-10");await page.getByLabel("Ngày kết thúc").fill("2026-11-11");
  24 |  await page.getByRole("button",{name:/XẾP LỊCH TRÌNH/}).click();
  25 |  await expect(page.getByRole("tab",{name:/NGÀY 1/})).toBeVisible();
  26 |  await expect(page.locator("canvas")).toHaveCount(0);
  27 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  28 |  await context.setOffline(false);
  29 | });
  30 | 
```