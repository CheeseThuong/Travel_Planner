"""One-off licensed source acquisition, never an application dependency."""
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

query = '''[out:json][timeout:25];(
 nwr["tourism"~"^(attraction|museum|viewpoint|theme_park|zoo|aquarium|gallery)$"]["name"](12.12,109.08,12.35,109.32);
 nwr["leisure"="park"]["name"](12.12,109.08,12.35,109.32);
 nwr["amenity"~"^(place_of_worship|marketplace)$"]["name"](12.12,109.08,12.35,109.32);
 nwr["natural"="beach"]["name"](12.12,109.08,12.35,109.32);
);out center meta;'''
url = 'https://overpass-api.de/api/interpreter?' + urlencode({'data': query})
request = Request(url, headers={'User-Agent': 'TravelPlannerContentReview/0.1 (one-off source review)'})
with urlopen(request, timeout=40) as response:
    data = json.load(response)
target = Path(__file__).resolve().parents[1] / 'docs/content/sources/osm-nha-trang.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({'query': query, 'source_url': url, 'license': 'ODbL-1.0', 'retrieved_on': '2026-10-21', 'response': data}, ensure_ascii=False, indent=2), encoding='utf-8')
for row in data['elements']:
    location = row.get('center', row)
    print(row['type'], row['id'], row['tags']['name'], location.get('lat'), location.get('lon'), row['tags'].get('tourism', row['tags'].get('amenity', row['tags'].get('leisure', row['tags'].get('natural')))))
