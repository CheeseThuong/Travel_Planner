"""One bounded read of public CC0 coordinates. Not used by the application or CI."""
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

query = '''SELECT ?item ?itemLabel ?location ?distance WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?location .
    bd:serviceParam wikibase:center "Point(109.19 12.24)"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "35" .
    bd:serviceParam wikibase:distance ?distance .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "vi,en" . }
} ORDER BY ?distance LIMIT 150'''
url = 'https://query.wikidata.org/sparql?' + urlencode({'query': query, 'format': 'json'})
request = Request(url, headers={'User-Agent': 'TravelPlannerContentReview/0.1 (one-off public data review)', 'Accept': 'application/sparql-results+json'})
with urlopen(request, timeout=45) as response:
    data = json.load(response)
target = Path(__file__).resolve().parents[1] / 'docs/content/sources/wikidata-nearby.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps({'query': query, 'source_url': url, 'license': 'CC0-1.0', 'retrieved_on': '2026-10-21', 'response': data}, ensure_ascii=False, indent=2), encoding='utf-8')
for row in data['results']['bindings']:
    print(row['item']['value'].split('/')[-1], row['itemLabel']['value'], row['location']['value'])
