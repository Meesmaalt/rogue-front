from pathlib import Path
from PIL import Image
for image in Path('public/ui/units').rglob('*.png'):
    Image.open(image).convert('RGB').save(image.with_suffix('.webp'), quality=86)
    image.unlink()
