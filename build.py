"""Build the independent Zotero plugin and its HTTPS update manifest."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
manifest = json.loads((SRC / 'manifest.json').read_text())
version = manifest['version']
addon = manifest['applications']['zotero']
output = ROOT / 'dist' / f'sansho-link-{version}.xpi'
output.parent.mkdir(exist_ok=True)
files = {
    'manifest.json': SRC / 'manifest.json',
    'bootstrap.js': SRC / 'bootstrap.js',
    'content/reference-linker.js': SRC / 'reference-linker.js',
    'icon.png': SRC / 'icon.png',
    'icon@2x.png': SRC / 'icon@2x.png',
    'LICENSE': ROOT / 'LICENSE',
    'README.md': ROOT / 'README.md',
}
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name, source in sorted(files.items()):
        info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, source.read_bytes())
digest = hashlib.sha256(output.read_bytes()).hexdigest()
updates = {'addons': {addon['id']: {'updates': [{
    'version': version,
    'update_link': f'https://raw.githubusercontent.com/mcryo1108/sansho-link/main/dist/{output.name}',
    'update_hash': f'sha256:{digest}',
    'applications': {'zotero': {key: addon[key] for key in ('strict_min_version', 'strict_max_version')}},
}]}}}
(ROOT / 'updates.json').write_text(json.dumps(updates, indent=2) + '\n')
print(output)
print(digest)
