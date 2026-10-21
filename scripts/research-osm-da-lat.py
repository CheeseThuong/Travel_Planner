"""One bounded one-off OSM acquisition; strip personal/contact tags before disk."""
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

query = '''[out:json][timeout:25];(
 nwr["tourism"~"^(attraction|museum|viewpoint|theme_park|zoo|gallery)$"]["name"](11.80,108.25,12.10,108.60);
 nwr["leisure"="park"]["name"](11.80,108.25,12.10,108.60);
 nwr["amenity"~"^(place_of_worship|marketplace)$"]["name"](11.80,108.25,12.10,108.60);
);out center meta;'''
url = 'https://overpass-api.de/api/interpreter?' + urlencode({'data': query})
request = Request(url, headers={'User-Agent': 'TravelPlannerContentReview/0.1 (one-off source review)'})
with urlopen(request, timeout=40) as response:
    data = json.load(response)
rows = []
for row in data['elements']:
    safe = {key: row[key] for key in ('type', 'id', 'version', 'timestamp', 'lat', 'lon', 'center') if key in row}
    safe['source_name'] = row['tags']['name']
    safe['source_category'] = {key: value for key, value in row['tags'].items() if key in ('tourism', 'amenity', 'leisure')}
    rows.append(safe)
target = Path(__file__).resolve().parents[1] / 'docs/content/da-lat/source-candidates.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({'query': query, 'source_url': url, 'license': 'ODbL-1.0', 'retrieved_on': '2026-10-21', 'source_timestamp': data['osm3s']['timestamp_osm_base'], 'elements': rows}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
for row in rows:
    loc = row.get('center', row)
    print(row['type'], row['id'], row['source_name'], loc.get('lat'), loc.get('lon'), row['source_category'])
print(f'Acquired {len(rows)} candidates in one query; no personal contributor/contact tags retained.')
