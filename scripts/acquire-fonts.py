"""R1-01: one-time acquisition of complete, unmodified official font assets."""
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
target = root / 'src/app/fonts'
target.mkdir(exist_ok=True)
url = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Nunito:ital,wght@0,600;1,600&display=swap'
# Legacy UA requests full fonts, avoiding partial unicode subsets in next/font/local.
css = urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36'}), timeout=30).read().decode()
records = []
for block in re.findall(r'@font-face\s*\{([^}]+)\}', css):
    family = re.search(r"font-family: '([^']+)'", block)[1]
    style = re.search(r'font-style: (\w+)', block)[1]
    weight = re.search(r'font-weight: (\d+)', block)[1]
    source = re.search(r'url\(([^)]+)\)', block)[1]
    if not source.startswith('https://fonts.gstatic.com/') or not source.endswith('.ttf'):
        raise ValueError(f'Expected official full TrueType face: {source}')
    name = f"{family.lower().replace(' ', '-')}-{weight}-{style}.ttf"
    data = urlopen(source, timeout=30).read()
    (target / name).write_bytes(data)
    records.append({'file': f'src/app/fonts/{name}', 'family': family, 'style': style, 'weight': int(weight), 'source': source, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
for slug in ['bevietnampro', 'nunito']:
    license_url = f'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/OFL.txt'
    data = urlopen(license_url, timeout=30).read()
    (root / f'docs/licenses/{slug}-OFL.txt').write_bytes(data)
    records.append({'file': f'docs/licenses/{slug}-OFL.txt', 'source': license_url, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
(target / 'PROVENANCE.json').write_text(json.dumps({'task': 'R1-01', 'acquired_date': '2026-10-21', 'license': 'SIL Open Font License 1.1', 'modifications': 'None; complete upstream TTF bytes; no subsetting, renaming or glyph changes', 'css_source': url, 'records': records}, indent=2) + '\n', encoding='utf-8')
print(json.dumps(records, indent=2))
