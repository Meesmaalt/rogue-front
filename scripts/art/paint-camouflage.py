"""Original painted camouflage swatches, deterministic export, no external assets."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import random
out=Path(__file__).resolve().parents[2]/'public/models/art'
for faction, colors in {
 'usa': ['#b3a17a','#887956','#4e5240','#675e47'],
 'russia': ['#78845a','#455437','#a69c68','#363f32'],
 'china': ['#778574','#4c6255','#a3ad8e','#37443b'],
}.items():
 rng=random.Random('rogue-front-'+faction)
 im=Image.new('RGB',(512,512),colors[0]);d=ImageDraw.Draw(im)
 for i in range(55):
  x=rng.randrange(512);y=rng.randrange(512);w=rng.randrange(24,110);h=rng.randrange(25,100)
  points=[(x,y),(x+w*.45,y-12),(x+w,y+8),(x+w+12,y+h*.6),(x+w*.65,y+h),(x+w*.25,y+h+10),(x-14,y+h*.4)]
  if faction=='china':points=[(x,y),(x+w,y),(x+w,y+h*.5),(x+w*.6,y+h*.5),(x+w*.6,y+h),(x,y+h)]
  for dx in [-512,0,512]:
   for dy in [-512,0,512]:d.polygon([(a+dx,b+dy)for a,b in points],fill=colors[1+i%3])
 px=im.load()
 for y in range(512):
  for x in range(512):
   n=rng.randrange(-7,8);px[x,y]=tuple(max(0,min(255,c+n))for c in px[x,y])
 # Fine painted wear rather than shiny uniform plastic. All maps are seamless.
 height=Image.new('L',(512,512));hp=height.load();rough=Image.new('RGB',(512,512));rp=rough.load()
 for y in range(512):
  for x in range(512):
   hp[x,y]=128+rng.randrange(-12,13)
   v=205+rng.randrange(-14,15);rp[x,y]=(v,v,v)
 height=height.filter(ImageFilter.GaussianBlur(.6));hp=height.load()
 normal=Image.new('RGB',(512,512));np=normal.load()
 for y in range(512):
  for x in range(512):
   dx=(hp[(x+1)%512,y]-hp[(x-1)%512,y])*.8
   dy=(hp[x,(y+1)%512]-hp[x,(y-1)%512])*.8
   np[x,y]=(max(0,min(255,round(128-dx))),max(0,min(255,round(128-dy))),252)
 im.save(out/faction/'camouflage.png',optimize=True)
 rough.save(out/faction/'roughness.png',optimize=True)
 normal.save(out/faction/'normal.png',optimize=True)
print('Painted 3 faction camouflage / roughness / normal sets.')
