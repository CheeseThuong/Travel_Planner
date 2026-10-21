"""Offline editorial rebuild; source is one minimized, licensed OSM snapshot."""
import json
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
folder = root / 'docs/content/da-lat'
selection = [
('relation',4119185,'Chợ Đà Lạt','cho-da-lat','market',60,'Dành khoảng thời gian dạo Chợ Đà Lạt, quan sát các quầy hàng và hỏi giá trực tiếp; hoạt động từng khu cần xác nhận khi đến.'),
('node',1152350875,'Bảo tàng Lâm Đồng','bao-tang-lam-dong','museum',90,'Gợi ý tìm hiểu không gian trưng bày tại Bảo tàng Lâm Đồng; hỏi đơn vị quản lý về nội dung đang mở và điều kiện tham quan.'),
('node',1164597191,'Thác Datanla','thac-datanla','attraction',120,'Gợi ý dành một buổi cho khu vực thác Datanla; kiểm tra thời tiết, lối đi và điều kiện sử dụng từng dịch vụ trước chuyến đi.'),
('node',2706917665,'Thác Voi','thac-voi','attraction',90,'Điểm gợi ý ngoài trung tâm tại khu vực Thác Voi; cần kiểm tra quyền vào, tình trạng đường xuống thác và phương án quay lại.'),
('node',4096525696,'Thác Prenn','thac-prenn','attraction',90,'Gợi ý ghé khu vực Thác Prenn nếu đang đón khách; xác nhận lối tiếp cận và dịch vụ đang hoạt động trước khi chốt lịch.'),
('node',4135863789,'XQ Đà Lạt','xq-da-lat','museum',90,'Gợi ý tìm hiểu không gian XQ Đà Lạt được ghi nhận trong nguồn mở; nội dung tham quan và lịch đón khách cần hỏi trực tiếp.'),
('node',4368051989,'Đường hầm điêu khắc','duong-ham-dieu-khac','attraction',120,'Gợi ý tham quan khu Đường hầm điêu khắc; vị trí nguồn mở chưa xác định cổng vào, cần kiểm tra vé và các khu đang mở.'),
('node',5274759821,'Dinh III Bảo Đại','dinh-iii-bao-dai','culture',75,'Dành một điểm dừng tìm hiểu không gian Dinh III Bảo Đại; kiểm tra phạm vi được tham quan và quy định tại chỗ.'),
('relation',17877171,'Ga Đà Lạt','ga-da-lat','culture',60,'Gợi ý ghé khu vực Ga Đà Lạt; thời lượng này dành cho điểm dừng, không bao gồm chuyến tàu hay khẳng định lịch tàu.'),
('node',5666385423,'Vườn hoa Cẩm Tú Cầu','vuon-hoa-cam-tu-cau','park',75,'Gợi ý khu vườn được nguồn mở ghi tên Vườn hoa Cẩm Tú Cầu; mùa hoa, quyền vào và lối đến cần xác nhận riêng.'),
('node',11365555079,'Mongo Land Đà Lạt','mongo-land-da-lat','attraction',120,'Gợi ý dành khoảng nghỉ dài tại Mongo Land Đà Lạt; hỏi trước về hoạt động hiện có, vé và điều kiện di chuyển.'),
('node',11598941137,'Điểm ngắm Hồ Tuyền Lâm','diem-ngam-ho-tuyen-lam','attraction',45,'Điểm nguồn mở để gợi ý dừng ngắm Hồ Tuyền Lâm; tọa độ không bảo đảm bến thuyền hay lối xuống hồ, cần xác nhận tiếp cận.'),
('node',11916349146,'Vườn hoa thành phố Đà Lạt','vuon-hoa-thanh-pho-da-lat','park',90,'Gợi ý dành thời gian tại Vườn hoa thành phố Đà Lạt; loại hoa, khu mở cửa và điều kiện tham quan thay đổi theo thời điểm.'),
('node',11916396494,'Đồi trà Cầu Đất','doi-tra-cau-dat','park',90,'Gợi ý điểm dừng tại khu Đồi trà Cầu Đất theo dữ liệu mở; kiểm tra khu được phép vào, thời tiết và đường tiếp cận.'),
('node',11918260737,'Khu vực Suối Vàng','khu-vuc-suoi-vang','park',60,'Gợi ý dừng tại khu vực Suối Vàng được đánh dấu trong nguồn mở; không suy diễn quyền cắm trại, xuống nước hay lối đi từ tọa độ.'),
('way',99660966,'Công viên Ánh Sáng','cong-vien-anh-sang','park',30,'Gợi ý nghỉ chân tại Công viên Ánh Sáng; kiểm tra lối vào và điều kiện đi bộ thực tế thay vì coi tâm hình học là cổng.'),
('way',99661160,'Vườn hoa Hữu nghị Việt-Nhật','vuon-hoa-huu-nghi-viet-nhat','park',30,'Gợi ý khoảng dạo ngắn tại Vườn hoa Hữu nghị Việt-Nhật; xác nhận khu vực được tiếp cận và điều kiện thời tiết khi đến.'),
('way',232458166,'Chùa Linh Quang','chua-linh-quang','culture',45,'Gợi ý điểm dừng văn hóa tại Chùa Linh Quang; giữ trang phục phù hợp và chỉ tham quan khu vực được phép.'),
('way',361692265,'Nhà thờ Domaine de Marie','nha-tho-domaine-de-marie','culture',60,'Gợi ý ghé khu vực Nhà thờ Domaine de Marie; tôn trọng sinh hoạt tôn giáo và xác nhận giờ có thể đón khách tham quan.'),
('way',361851927,'Chùa Linh Sơn','chua-linh-son','culture',45,'Gợi ý ghé Chùa Linh Sơn trong khoảng dừng vừa phải; giữ yên lặng và hỏi về khu vực được phép tham quan.'),
('way',452519411,'Nhà thờ Chánh tòa Đà Lạt','nha-tho-chanh-toa-da-lat','culture',45,'Gợi ý điểm dừng tại Nhà thờ Chánh tòa Đà Lạt theo dữ liệu mở; tránh gián đoạn nghi lễ và xác nhận lối vào dành cho khách.'),
('way',473547277,'Thiền viện Vạn Hạnh','thien-vien-van-hanh','culture',60,'Gợi ý tìm hiểu khu vực Thiền viện Vạn Hạnh; kiểm tra điều kiện đi bộ, trang phục và lịch sinh hoạt trước khi ghé.'),
('way',473771564,'Thung Lũng Tình Yêu','thung-lung-tinh-yeu','park',150,'Gợi ý dành một buổi cho khu Thung Lũng Tình Yêu; thời lượng chỉ là đề xuất và cần kiểm tra các khu đang hoạt động.'),
('way',515288602,'Nhà thờ Cam Ly','nha-tho-cam-ly','culture',45,'Gợi ý ghé khu vực Nhà thờ Cam Ly nếu được phép; không coi vị trí dữ liệu mở là xác nhận giờ mở hay quyền vào.'),
('way',1355582224,'Linh Ẩn Tự','linh-an-tu','culture',60,'Gợi ý điểm dừng tại Linh Ẩn Tự ở khu vực ngoài trung tâm; tính riêng quãng di chuyển và tôn trọng sinh hoạt tôn giáo.'),
('way',1509937793,'Làng Cù Lần','lang-cu-lan','attraction',150,'Gợi ý tham quan khu Làng Cù Lần khi đã xác nhận đang đón khách; kiểm tra đường đi, thời tiết và phạm vi hoạt động.'),
('relation',7758125,'Nhà lao thiếu nhi Đà Lạt','nha-lao-thieu-nhi-da-lat','museum',75,'Gợi ý tìm hiểu điểm Nhà lao thiếu nhi Đà Lạt được nguồn mở ghi nhận; hỏi trước về nội dung trưng bày và lịch tiếp khách.'),
('relation',20657435,'Crazy House','crazy-house','museum',90,'Gợi ý khoảng tham quan tại Crazy House theo nguồn mở; xác nhận vé, lối đi và khả năng tiếp cận phù hợp cho cả nhóm.'),
('node',4259838689,'Tịnh xá Ngọc Đà','tinh-xa-ngoc-da','culture',45,'Gợi ý ghé khu vực Tịnh xá Ngọc Đà; giữ yên tĩnh và hỏi trước về thời điểm phù hợp, khu vực cho phép tham quan.'),
('way',971577581,'Chợ Phan Chu Trinh','cho-phan-chu-trinh','market',45,'Gợi ý quan sát sinh hoạt tại Chợ Phan Chu Trinh; hỏi giờ hoạt động từng khu và lựa chọn điểm dừng phù hợp với nhóm.')
]
candidate = folder / 'source-candidates.json'
snapshot_file = folder / 'osm-selected.json'
if candidate.exists():
    acquired = json.loads(candidate.read_text(encoding='utf-8'))
    lookup = {(r['type'], r['id']): r for r in acquired['elements']}
    snapshot = {key: acquired[key] for key in ('query','source_url','license','retrieved_on','source_timestamp')}
    snapshot.update({'license_url':'https://opendatacommons.org/licenses/odbl/1-0/', 'attribution':'© OpenStreetMap contributors', 'elements':[lookup[(kind, identifier)] for kind, identifier, *_ in selection]})
    snapshot_file.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
else:
    snapshot = json.loads(snapshot_file.read_text(encoding='utf-8'))
lookup = {(r['type'], r['id']): r for r in snapshot['elements']}
remote = {'thac-voi','thac-prenn','duong-ham-dieu-khac','mongo-land-da-lat','doi-tra-cau-dat','khu-vuc-suoi-vang','linh-an-tu','lang-cu-lan'}
records = []
for kind, identifier, title, slug, category, duration, description in selection:
    source = lookup[(kind,identifier)]
    location = source.get('center', source)
    notes = ['Giờ hoạt động và quyền tiếp cận chưa được xác minh tại chỗ.', 'Minh họa biểu trưng theo nhóm, không phải ảnh hoặc bản vẽ chính xác của địa điểm.']
    if slug in remote:
        notes.append('Ngoài trung tâm; cần tính riêng thời gian di chuyển và xác nhận điều kiện tiếp cận. Không phải kiểm định ranh giới hành chính.')
    records.append({
      'id':str(uuid.uuid5(uuid.NAMESPACE_URL,f'https://www.openstreetmap.org/{kind}/{identifier}')),
      'slug':slug,'title_vi':title,'category':category,'description_vi':description,
      'lat':location['lat'],'lng':location['lon'],'coordinate_quality':'community_point' if kind=='node' else 'geometry_center_not_entrance',
      'recommended_duration_min':duration,'duration_basis':'editorial_suggestion_not_measured','visit_priority':50,
      'hours_state':'hours_unknown','editorial_hours':None,'hours_source':None,'hours_checked_at':None,
      'content_checked_at':snapshot['retrieved_on'],'verification_scope':'open_source_identity_coordinates_only','status':'draft',
      'image':{'path':f'docs/content/illustrations/{category}.svg','alt_vi':f'Minh họa biểu trưng nhóm {category} cho {title}; không mô tả địa điểm thực tế.',
        'kind':'original_symbolic_category_illustration','creator':'Codex, commissioned by project owner in chat 2026-10-21','license':'project-original-authorized-use','rights_evidence':'docs/content/RIGHTS.md'},
      'data_source':{'provider':'openstreetmap','object_type':kind,'object_id':identifier,'version':source['version'],'url':f'https://www.openstreetmap.org/{kind}/{identifier}',
        'license':'ODbL-1.0','license_url':'https://opendatacommons.org/licenses/odbl/1-0/','snapshot':'docs/content/da-lat/osm-selected.json','retrieved_on':snapshot['retrieved_on']},
      'caution_notes':notes,'transport_constraint':'access_unverified'
    })
catalog = {'schema_version':1,'destination_slug':'da-lat','database_license':'ODbL-1.0','attribution':'© OpenStreetMap contributors; database under ODbL-1.0. Original editorial additions: travel-planner project.','records':records}
(folder/'places.seed.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
schema = json.loads((root/'docs/content/places.seed.schema.json').read_text(encoding='utf-8'))
schema['title'] = 'Đà Lạt editorial seed content v1'
schema['properties']['destination_slug']['enum'] = ['da-lat']
schema['properties']['records']['items']['properties']['data_source']['properties']['snapshot']['enum'] = ['docs/content/da-lat/osm-selected.json']
(folder/'places.seed.schema.json').write_text(json.dumps(schema,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Built {len(records)} Đà Lạt-area editorial draft records; reused existing original symbolic SVGs. No hours, entrances or live access verified.')
