"""R1-01: offline provenance, cmap, shipped weights/styles and UTF-8 checks."""
import hashlib
import json
import unicodedata
from pathlib import Path
import fontTools
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'src/app/fonts/PROVENANCE.json').read_text(encoding='utf-8'))
required = set(range(0x1EA0, 0x1EFA)) | {ord(c) for c in 'ĂăĐđĨĩŨũƠơƯưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúý'}
for code in list(required):
    required.update(ord(c) for c in unicodedata.normalize('NFD', chr(code)))
results = []
for record in manifest['records']:
    path = root / record['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == record['sha256'], path
    if path.suffix != '.ttf':
        continue
    font = TTFont(path)
    cmap = font.getBestCmap()
    missing = sorted(required - set(cmap))
    assert not missing, f'{path}: missing {missing}'
    assert all(cmap[code] != '.notdef' for code in required), path
    assert font['OS/2'].usWeightClass == record['weight'], path
    assert bool(font['head'].macStyle & 2) == (record['style'] == 'italic'), path
    results.append({'file': record['file'], 'checked_characters': len(required), 'missing': missing, 'weight': font['OS/2'].usWeightClass, 'italic': bool(font['head'].macStyle & 2), 'bytes': path.stat().st_size})
sources = list((root / 'src').rglob('*.tsx')) + list((root / 'src').rglob('*.ts'))
for path in sources:
    text = path.read_text(encoding='utf-8')
    assert '\ufffd' not in text, path
    assert unicodedata.is_normalized('NFC', text), f'{path}: source is not NFC'
print(json.dumps({'task': 'R1-01', 'fontTools': fontTools.__version__, 'fonts': results, 'utf8_nfc_sources_checked': len(sources), 'total_font_bytes': sum(item['bytes'] for item in results)}, indent=2))
