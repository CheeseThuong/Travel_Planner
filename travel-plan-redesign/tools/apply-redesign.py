#!/usr/bin/env python3
"""Conservative visual-only overlay for the local Travel Plan Next.js workspace.
Run from this bundle: python tools/apply-redesign.py D:\\Projects\\travel_plan [--dry-run]
The original planner domain, APIs, database and tests are not modified.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import sys

BUNDLE = Path(__file__).resolve().parent.parent
FILES = [
    Path('src/app/globals.css'), Path('src/app/layout.tsx'), Path('src/app/page.tsx'),
    Path('src/app/destinations/[slug]/page.tsx'), Path('src/components/destination-catalog.tsx'),
]
WIZARD = Path('src/components/plan-wizard.tsx')
IMPORT = Path('src/components/place-import.tsx')
REGRESSION = Path('tests/demo/redesign.spec.mjs')
START = '  return (\n    <div className="page-shell py-12">'
ENDING = '\n  );\n}'


def rewrite_wizard(content: str) -> str:
    start = content.find(START)
    end = content.rfind(ENDING)
    if start < 0 or end < start:
        raise RuntimeError('Wizard return markup changed; refused to overwrite business logic.')
    new_return = (BUNDLE / 'tools/wizard-return.txt').read_text(encoding='utf-8').rstrip()
    # Preserve all hooks, submit logic, calculations, comments and imports unchanged.
    return content[:start] + new_return + '\n}' + content[end + len(ENDING):]


def rewrite_import(content: str) -> str:
    old = 'className="min-w-0 rounded-3xl border border-[#deded0] bg-white/60 p-5 sm:p-7"'
    if content.count(old) != 1:
        raise RuntimeError('Import fieldset markup changed; refused to overwrite.')
    content = content.replace(old, 'className="journey-section import-section"')
    content = content.replace('Thêm từ Maps hoặc nhập tay</legend>', '04 / Điểm ngoài danh mục</legend>')
    old_text = 'Không tự mở liên kết rút gọn. Dữ liệu catalog và thông tin bạn nhập có thể chưa xác minh giờ, chi phí hoặc đường đến.'
    new_text = 'Bạn có thể dán liên kết đầy đủ để tìm ứng viên trong danh mục. Liên kết rút gọn chưa thể xác định địa điểm tự động. Tọa độ nhập tay phải được kiểm tra lại trên bản đồ.'
    if content.count(old_text) != 1:
        raise RuntimeError('Maps guidance changed; refused to overwrite.')
    content = content.replace(old_text, new_text)
    anchor = '    <button type="button" disabled={busy || !url || !online} onClick={resolve}'
    if content.count(anchor) != 1:
        raise RuntimeError('Maps button changed; refused to overwrite.')
    warning = '    {url.startsWith("https://maps.app.goo.gl/") && <p role="note" className="mt-2 text-sm text-[#9b5139]">Đây là liên kết rút gọn: hệ thống không truy cập liên kết để suy đoán địa điểm. Mở địa điểm trong Google Maps, sao chép URL đầy đủ từ thanh địa chỉ hoặc nhập tên và tọa độ.</p>}\n'
    return content.replace(anchor, warning + anchor)


def dirty(repo: Path, paths: list[Path]) -> list[str]:
    cmd = ['git', '-C', str(repo), 'status', '--porcelain', '--', *(f':(literal){p.as_posix()}' for p in paths)]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode:
        raise RuntimeError('Git status failed: ' + res.stderr.strip())
    return res.stdout.splitlines()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('repo', type=Path, help='existing local Next.js project root')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    repo = args.repo.resolve()
    if not (repo / 'package.json').is_file() or not (repo / 'src/domain/trip-draft.ts').is_file():
        raise RuntimeError('Not the expected travel_plan workspace; no changes made.')
    targets = [*FILES, WIZARD, IMPORT]
    if missing := [str(p) for p in targets if not (repo / p).is_file()]:
        raise RuntimeError('Expected source missing: ' + ', '.join(missing))
    if changed := dirty(repo, targets):
        raise RuntimeError('Refusing to overwrite local changes in UI files:\n' + '\n'.join(changed) + '\nCommit/stash/reconcile first.')
    generated = {p: (BUNDLE / p).read_text(encoding='utf-8') for p in FILES}
    generated[WIZARD] = rewrite_wizard((repo / WIZARD).read_text(encoding='utf-8'))
    generated[IMPORT] = rewrite_import((repo / IMPORT).read_text(encoding='utf-8'))
    if (repo / REGRESSION).exists():
        raise RuntimeError('Refusing to overwrite an existing redesign regression test.')
    generated[REGRESSION] = (BUNDLE / REGRESSION).read_text(encoding='utf-8')
    for path, data in generated.items():
        if not data.strip():
            raise RuntimeError(f'Empty replacement: {path}')
    print(f'Validated {len(generated)} UI files; backend/domain unchanged.')
    if args.dry_run:
        print('DRY-RUN. Nothing written.')
        return 0
    backup = repo.parent / (repo.name + '.redesign-backup') / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    for path in targets:
        (backup / path).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(repo / path, backup / path)
    for path, content in generated.items():
        (repo / path).parent.mkdir(parents=True, exist_ok=True)
        (repo / path).write_text(content, encoding='utf-8')
    print(f'Applied visual overlay. Backups: {backup}')
    print('NEXT: npm.cmd run typecheck; npm.cmd run lint; npm.cmd run build; npm.cmd run test:e2e')
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print('ERROR:', exc, file=sys.stderr)
        sys.exit(1)
