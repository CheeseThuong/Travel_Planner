"""Rebuild curated content from an acquired open-data snapshot; no network calls."""
import json
import uuid
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source_file = root / 'docs/content/sources/osm-nha-trang.json'
selected_file = root / 'docs/content/sources/osm-selected.json'
# Editorial selection: source type/id, original Vietnamese title, slug, category,
# suggested minutes and original short description. No copied tourism prose.
selection = [
('node',849300563,'Lầu Bảo Đại','lau-bao-dai','culture',60,'Điểm dừng tìm hiểu không gian kiến trúc gắn với tên gọi Lầu Bảo Đại; hãy xác nhận khu vực được phép tham quan.'),
('node',4172003998,'Khu tắm bùn Trăm Trứng','tram-trung','attraction',180,'Gợi ý dành một buổi cho khu tắm bùn Trăm Trứng; thời lượng là đề xuất, cần hỏi lại dịch vụ và điều kiện vào cửa.'),
('node',4884705621,'Hòn Chồng','hon-chong','attraction',60,'Điểm dừng ngắm cảnh ven biển Hòn Chồng; kiểm tra lối đi và điều kiện tiếp cận trước khi ghé.'),
('node',5189505622,'Phòng tranh Long Thanh','phong-tranh-long-thanh','museum',45,'Gợi ý ghé không gian trưng bày Long Thanh; liên hệ trước để xác nhận thời gian đón khách.'),
('node',7087673293,'Phòng ảnh Mai Lộc','phong-anh-mai-loc','museum',45,'Điểm ghé dành cho người quan tâm ảnh tại phòng ảnh Mai Lộc; nội dung trưng bày cần được xác nhận tại thời điểm đi.'),
('node',11929829169,'Làng nghề Trường Sơn','lang-nghe-truong-son','culture',90,'Gợi ý tìm hiểu không gian làng nghề Trường Sơn; hỏi trước về hoạt động đang mở và thời lượng trải nghiệm.'),
('way',162818208,'Nhà thờ Chính tòa Nha Trang','nha-tho-chinh-toa','culture',45,'Điểm dừng tham quan khu vực Nhà thờ Chính tòa Nha Trang; giữ yên lặng và tôn trọng sinh hoạt tôn giáo.'),
('way',196749901,'Chợ đêm Nha Trang','cho-dem','market',60,'Gợi ý dạo khu chợ đêm được đánh dấu trong dữ liệu cộng đồng; giờ hoạt động thực tế chưa được xác minh.'),
('way',196896036,'Chùa Long Sơn','chua-long-son','culture',75,'Gợi ý một điểm dừng tại Chùa Long Sơn; chọn trang phục phù hợp và kiểm tra khả năng đi bộ của cả nhóm.'),
('way',266497124,'Chợ Xóm Mới','cho-xom-moi','market',60,'Gợi ý dạo Chợ Xóm Mới theo nhịp sinh hoạt địa phương; hỏi giá và xác nhận các quầy đang hoạt động.'),
('way',272274254,'Bãi biển An Viên','bai-bien-an-vien','beach',60,'Điểm ven biển An Viên từ dữ liệu mở; quyền tiếp cận công cộng và điều kiện xuống biển cần kiểm tra thêm.'),
('way',406136497,'Công viên Central Park','central-park','park',45,'Gợi ý nghỉ chân tại khu vực Central Park được đánh dấu trong nguồn mở; kiểm tra lối vào và tiện ích trước khi ghé.'),
('way',471186074,'Thủy cung Trí Nguyên','thuy-cung-tri-nguyen','museum',120,'Gợi ý tìm hiểu điểm thủy cung Trí Nguyên; cần xác nhận hoạt động, vé và phương tiện chuyển tiếp ra đảo.'),
('way',554587648,'Công viên Alexander Yersin','cong-vien-alexander-yersin','park',30,'Gợi ý một khoảng nghỉ ngắn tại công viên Alexander Yersin; chọn giờ đi bộ phù hợp điều kiện thời tiết thực tế.'),
('way',554587649,'Công viên Sanest','cong-vien-sanest','park',30,'Điểm nghỉ chân tại công viên Sanest theo dữ liệu cộng đồng; tiện ích và điều kiện tiếp cận chưa kiểm chứng tại chỗ.'),
('way',557175765,'Công viên Yến Phi','cong-vien-yen-phi','park',45,'Gợi ý dạo công viên Yến Phi; dành thời gian nghỉ giữa các điểm thay vì xếp lịch quá dày.'),
('way',1193057654,'Bảo tàng Alexandre Yersin','bao-tang-alexandre-yersin','museum',60,'Gợi ý tìm hiểu bảo tàng mang tên Alexandre Yersin; hãy xác nhận giờ tham quan trực tiếp trước chuyến đi.'),
('way',1239290934,'Bãi tắm Hòn Chồng','bai-tam-hon-chong','beach',60,'Khoảng dừng ven bãi tắm Hòn Chồng; không suy diễn điều kiện an toàn bơi từ vị trí trên dữ liệu mở.'),
('way',1245997779,'Nhà thờ Ba Làng','nha-tho-ba-lang','culture',30,'Gợi ý ghé khu vực Nhà thờ Ba Làng nếu được phép; ưu tiên sự yên tĩnh và tránh làm gián đoạn nghi lễ.'),
('way',1423461009,'Chợ Vĩnh Trường','cho-vinh-truong','market',45,'Gợi ý quan sát nhịp sinh hoạt tại Chợ Vĩnh Trường; giờ mở và các quầy hàng cần kiểm tra lại.'),
('way',1221946002,'Chùa Hải Ấn Tự','chua-hai-an-tu','culture',45,'Điểm dừng văn hóa tại Chùa Hải Ấn Tự theo nguồn mở; xác nhận khu vực được đón khách và giữ trang phục phù hợp.'),
('relation',16755650,'Chợ Vĩnh Hải','cho-vinh-hai','market',60,'Gợi ý ghé Chợ Vĩnh Hải như một điểm sinh hoạt địa phương; lịch trình cần linh hoạt theo thời gian hoạt động thực tế.'),
('way',1530303092,'Công viên Hòn Xện','cong-vien-hon-xen','park',30,'Gợi ý nghỉ chân tại công viên Hòn Xện; vị trí nguồn mở chưa bảo đảm lối vào thuận tiện cho mọi phương tiện.'),
('node',3355719306,'Chùa Suối Đổ','chua-suoi-do','culture',90,'Gợi ý tìm hiểu Chùa Suối Đổ ở khu vực ngoài trung tâm; cần kiểm tra lối tiếp cận và thể lực trước khi đưa vào lịch.'),
('node',3384239774,'Am Chúa','am-chua','culture',60,'Gợi ý điểm dừng văn hóa tại Am Chúa ngoài khu vực trung tâm Nha Trang; xác nhận hoạt động và phương tiện tiếp cận.'),
('node',4538859095,'Chùa Đa Bảo','chua-da-bao','culture',60,'Điểm dừng tại Chùa Đa Bảo theo dữ liệu cộng đồng; lối đi và điều kiện tham quan cần được kiểm tra trước.'),
('node',3331426996,'Chùa Tòng Lâm Lô Sơn','chua-tong-lam-lo-son','culture',60,'Gợi ý ghé Chùa Tòng Lâm Lô Sơn; kiểm tra thời gian đón khách và sắp xếp khoảng di chuyển riêng.'),
('node',1746426777,'Chùa Linh Thửu','chua-linh-thuu','culture',30,'Điểm dừng văn hóa tại Chùa Linh Thửu theo nguồn mở; chỉ tham quan khu vực được cho phép và giữ yên lặng.'),
('node',3333779918,'Chùa Phương Sơn','chua-phuong-son','culture',45,'Gợi ý tìm hiểu khu vực Chùa Phương Sơn; cần xác nhận tên gọi, lối vào và thời gian phù hợp trước chuyến đi.'),
('relation',15662995,'Bảo tàng Hải dương học Nha Trang','bao-tang-hai-duong-hoc','museum',120,'Gợi ý dành thời gian cho bảo tàng Hải dương học Nha Trang; lịch tham quan và vé cần được xác nhận từ đơn vị quản lý.')
]

if source_file.exists():
    raw = json.loads(source_file.read_text(encoding='utf-8'))
    lookup = {(entry['type'], entry['id']): entry for entry in raw['response']['elements']}
    selected = []
    for kind, identifier, *_ in selection:
        entry = lookup[(kind, identifier)]
        # Preserve only relevant public geographic facts, not contributor IDs,
        # usernames, contact details, unrelated records or entire OSM responses.
        selected.append({key: entry[key] for key in ('type','id','version','timestamp','lat','lon','center') if key in entry} | {'source_name': entry['tags']['name']})
    snapshot = {'license':'ODbL-1.0','license_url':'https://opendatacommons.org/licenses/odbl/1-0/','attribution':'© OpenStreetMap contributors','query':raw['query'],'source_url':raw['source_url'],'source_timestamp':raw['response']['osm3s']['timestamp_osm_base'],'retrieved_on':'2026-10-21','elements':selected}
    selected_file.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
else:
    snapshot = json.loads(selected_file.read_text(encoding='utf-8'))
lookup = {(entry['type'], entry['id']): entry for entry in snapshot['elements']}

records = []
for kind, identifier, title, slug, category, duration, description in selection:
    entry = lookup[(kind,identifier)]
    location = entry.get('center', entry)
    notes = ['Giờ hoạt động và quyền tiếp cận chưa được xác minh tại chỗ.', 'Minh họa biểu trưng theo nhóm, không phải ảnh hoặc bản vẽ chính xác của địa điểm.']
    if slug in ('chua-suoi-do','am-chua','chua-tong-lam-lo-son'):
        notes.append('Ngoài trung tâm; cần tính riêng thời gian và điều kiện tiếp cận.')
    island = slug == 'thuy-cung-tri-nguyen'
    if island:
        notes.append('Cần phương tiện chuyển tiếp ra đảo; không tự lập tuyến ô tô tới điểm này.')
    records.append({
      'id':str(uuid.uuid5(uuid.NAMESPACE_URL,f'https://www.openstreetmap.org/{kind}/{identifier}')),
      'slug':slug,'title_vi':title,'category':category,'description_vi':description,
      'lat':location['lat'],'lng':location['lon'],'coordinate_quality':'community_point' if kind=='node' else 'geometry_center_not_entrance',
      'recommended_duration_min':duration,'duration_basis':'editorial_suggestion_not_measured','visit_priority':50,
      'hours_state':'hours_unknown','editorial_hours':None,'hours_source':None,'hours_checked_at':None,
      'content_checked_at':'2026-10-21','verification_scope':'open_source_identity_coordinates_only','status':'draft',
      'image':{'path':f'docs/content/illustrations/{category}.svg','alt_vi':f'Minh họa biểu trưng nhóm {category} cho {title}; không mô tả địa điểm thực tế.',
        'kind':'original_symbolic_category_illustration','creator':'Codex, commissioned by project owner in chat 2026-10-21','license':'project-original-authorized-use','rights_evidence':'docs/content/RIGHTS.md'},
      'data_source':{'provider':'openstreetmap','object_type':kind,'object_id':identifier,'version':entry['version'],'url':f'https://www.openstreetmap.org/{kind}/{identifier}',
        'license':'ODbL-1.0','license_url':'https://opendatacommons.org/licenses/odbl/1-0/','snapshot':'docs/content/sources/osm-selected.json','retrieved_on':'2026-10-21'},
      'caution_notes':notes,'transport_constraint':'manual_island_transfer_required' if island else 'access_unverified'
    })
catalog = {'schema_version':1,'destination_slug':'nha-trang','database_license':'ODbL-1.0','attribution':'© OpenStreetMap contributors; database under ODbL-1.0. Original editorial additions: travel-planner project.','records':records}
(root/'docs/content/places.seed.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

symbols = {
 'culture':'<path d="M100 128l60-45 60 45M115 128v65h90v-65M142 193v-38h36v38"/>',
 'museum':'<path d="M98 120l62-34 62 34zM110 193h100M122 130v51m38-51v51m38-51v51"/>',
 'beach':'<path d="M95 180q24-24 48 0t48 0t36 0M155 174v-70m-45 16q45-64 90 0z"/>',
 'park':'<path d="M160 192v-59M116 154q-25-37 10-49q0-45 34-28q34-17 34 28q35 12 10 49z"/>',
 'market':'<path d="M106 133h108v59H106zM98 133l16-35h92l16 35M120 192v-37h30v37m22-36h24v21h-24z"/>',
 'attraction':'<path d="M160 198v-29m-43 29h86M160 93v76m-38-38h76m-65-27l54 54m0-54l-54 54"/><circle cx="160" cy="131" r="41"/>'
}
for category, symbol in symbols.items():
    path = root/f'docs/content/illustrations/{category}.svg'
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-labelledby="title desc">
<title id="title">Original symbolic {category} illustration</title><desc id="desc">Project-authored category artwork; not an accurate landmark depiction.</desc>
<rect width="320" height="240" rx="32" fill="#FFF7E9"/><circle cx="160" cy="126" r="88" fill="#76C8D7" opacity=".35"/>
<circle cx="245" cy="53" r="18" fill="#F9C75F"/><path d="M37 207q30-12 60 0t60 0t60 0t60 0" fill="none" stroke="#76C8D7" stroke-width="10" stroke-linecap="round"/>
<g fill="#FF836F" stroke="#263238" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">{symbol}</g>
<ellipse cx="68" cy="161" rx="23" ry="26" fill="#A5D6A7" stroke="#263238" stroke-width="4"/><circle cx="61" cy="157" r="3" fill="#263238"/><circle cx="75" cy="157" r="3" fill="#263238"/><path d="M62 169q6 6 12 0" fill="none" stroke="#263238" stroke-width="3"/>
</svg>\n''',encoding='utf-8')
print(f'Built {len(records)} real-source editorial draft records and {len(symbols)} original symbolic SVGs. No opening hours, entrance accuracy or production readiness claimed.')
