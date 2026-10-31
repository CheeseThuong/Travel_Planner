#!/usr/bin/env python3
"""Apply a reviewed Atlas v2 source overlay. Never installs dependencies or touches secrets.

Uses a complete pre-image backup and a manifest of SHA-256 hashes. Default is read-only.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys

parser=argparse.ArgumentParser(description="Atlas v2 source overlay, with pre-apply backups")
parser.add_argument("project",help="Project root, e.g. D:\\Projects\\travel_plan")
group=parser.add_mutually_exclusive_group(required=True)
group.add_argument("--dry-run",action="store_true",help="Inspect proposed changes only")
group.add_argument("--apply",action="store_true",help="Backup then overlay code")
group.add_argument("--restore",metavar="BACKUP_DIR",help="Restore every original source file from a backup")
args=parser.parse_args()
source=Path(__file__).resolve().parent.parent/"files"
target=Path(args.project).expanduser().resolve()
if not target.is_dir() or not (target/"package.json").exists() or not (target/"src"/"app").exists():
    parser.error("Target must be the actual Next.js project root")
try:
    package=json.loads((target/"package.json").read_text(encoding="utf-8"))
except (OSError,ValueError) as ex:
    parser.error(f"Invalid target package.json: {ex}")
if package.get("name")!="vietnam-playful-travel-planner":
    parser.error("Refusing to modify an unexpected project")

def checksum(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

if args.restore:
    folder=Path(args.restore).expanduser().resolve()
    manifest_path=folder/"manifest.json"
    if not manifest_path.is_file():parser.error("Missing backup manifest")
    manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("target")!=str(target):parser.error("Backup was made for a different project")
    for record in manifest["files"]:
        destination=target/record["path"]
        if record["existed"]:
            preimage=folder/"original"/record["path"]
            if checksum(preimage)!=record["original_sha256"]:parser.error("Backup corruption detected")
            destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(preimage,destination)
            print("RESTORED",record["path"])
        elif destination.exists():
            destination.unlink()
            print("REMOVED NEW FILE",record["path"])
    sys.exit(0)

files=sorted(p for p in source.rglob("*") if p.is_file())
if not files:parser.error("No overlay files were found")
plan=[]
for source_file in files:
    relative=source_file.relative_to(source)
    destination=target/relative
    if relative.parts[0] not in ("src","tests"):
        parser.error("Overlay contains an unauthorized path")
    exists=destination.is_file()
    plan.append({"path":relative.as_posix(),"existed":exists,"original_sha256":checksum(destination) if exists else None,"overlay_sha256":checksum(source_file),"changed":not exists or checksum(destination)!=checksum(source_file)})
for record in plan:
    print(("UPDATE" if record["existed"] else "CREATE") if record["changed"] else "UNCHANGED",record["path"])
if args.dry_run:
    print(f"DRY RUN: {sum(p['changed'] for p in plan)} proposed changes; nothing written")
    sys.exit(0)

stamp=dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
folder=target.parent/f"{target.name}_atlas_backups"/stamp
if folder.exists():parser.error("Backup path collision; rerun")
(folder/"original").mkdir(parents=True)
try:
    for record in plan:
        if not record["existed"]:continue
        original=target/record["path"]
        dst=folder/"original"/record["path"]
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(original,dst)
    manifest={"target":str(target),"utc_created":stamp,"files":plan}
    (folder/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    # Every original file is safely backed up before first mutation.
    for record in plan:
        if not record["changed"]:continue
        dest=target/record["path"]
        dest.parent.mkdir(parents=True,exist_ok=True)
        temp=dest.with_name(dest.name+".atlas-pending")
        shutil.copy2(source/record["path"],temp)
        os.replace(temp,dest)
except Exception as ex:
    print("ERROR: operation failed, restore with --restore",folder,file=sys.stderr)
    raise
print("APPLIED. Backup:",folder)
print("Revert: python tools\\apply-atlas.py",str(target),"--restore",str(folder))
