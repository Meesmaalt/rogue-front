"""Losslessly encode documentation PNGs as WebP; verify all decoded RGBA pixels before replacing."""
import hashlib
import io
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
changes = []
for source in sorted((root / 'docs').rglob('*.png')):
    image = Image.open(source).convert('RGBA')
    output = io.BytesIO()
    image.save(output, format='WEBP', lossless=True, method=6, exact=True,
               icc_profile=image.info.get('icc_profile', b''), exif=image.info.get('exif', b''))
    encoded = output.getvalue()
    if len(encoded) >= source.stat().st_size:
        continue
    restored = Image.open(io.BytesIO(encoded)).convert('RGBA')
    if restored.size != image.size or restored.tobytes() != image.tobytes():
        raise RuntimeError(f'Pixel mismatch: {source}')
    target = source.with_suffix('.webp')
    target.write_bytes(encoded)
    changes.append((source, target, source.stat().st_size, len(encoded)))
# Update documentation paths only after every conversion has passed its pixel comparison.
for document in (root / 'docs').rglob('*'):
    if document.suffix not in {'.md', '.json'}:
        continue
    text = original = document.read_text()
    for source, target, _, _ in changes:
        text = text.replace(source.name, target.name)
    text = text.replace('arsenal-*.png', 'arsenal-*.webp')
    if text != original:
        document.write_text(text)
for source, _, _, _ in changes:
    source.unlink()
print({'images': len(changes), 'beforeBytes': sum(c[2] for c in changes), 'afterBytes': sum(c[3] for c in changes), 'decodedPixels': 'identical'})
