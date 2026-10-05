"""Author a connected river and road-aligned crossings in Roheorg layout 10."""
import json, math
from pathlib import Path
path=Path(__file__).resolve().parents[2]/'src/data/maps/green-valley.json'
d=json.loads(path.read_text());m=d['map'];fs=m['features']
if any(f['id'].startswith('rohe-river-') for f in fs):raise SystemExit('River is already authored')
points=[(0,-560),(-45,-365),(32,-190),(0,0),(-32,190),(45,365),(0,560)]
water=[]
for i,(a,b) in enumerate(zip(points,points[1:])):
 dx=b[0]-a[0];dz=b[1]-a[1]
 water.append(dict(id=f'rohe-river-{i}',kind='water',x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,width=26,depth=math.hypot(dx,dz)+16,rotation=math.atan2(dx,dz),surfaceHeight=-.8,label='Rohe jõgi'))
# Center-line intersections with every existing road; de-duplicate close junctions.
crossings=[]
for road in [f for f in fs if f['kind']=='road']:
 a=road.get('rotation',0);rx=math.sin(a);rz=math.cos(a)
 for p,q in zip(points,points[1:]):
  sx=q[0]-p[0];sz=q[1]-p[1];den=rx*sz-rz*sx
  sine=abs(den)/math.hypot(sx,sz)
  if sine<.45:continue
  dx=p[0]-road['x'];dz=p[1]-road['z'];t=(dx*sz-dz*sx)/den;u=(dx*rz-dz*rx)/den
  if abs(t)>road['depth']/2 or not 0<=u<=1:continue
  x=road['x']+rx*t;z=road['z']+rz*t
  if any(math.hypot(x-b['x'],z-b['z'])<32 for b in crossings):continue
  crossings.append(dict(id=f'rohe-bridge-{len(crossings)}',kind='bridge',x=x,z=z,width=max(12,road['width']+3),depth=26/sine+30,rotation=a,surfaceHeight=1.2,label='Rohe jõe sild'))
fs.extend(water+crossings)
# The former centre resource lies in the new river; place depot and industry on bank.
m['resources'][2].update(x=-65,z=32,label='Jõekalda ladu')
d['briefing']='1088 m Roheorg: looklev jõgi, sillad, kaks väikeste majade ja siseõuedega linnakvartalit ning tihedad metsad. Maaüksused ületavad jõe sildadel; jalavägi saab hõivata elamuid. Kaitse sillakoridore ja jõekalda ladu, kasuta külgmist teedevõrku ning luuret.'
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print('River segments:',len(water),'bridges:',len(crossings))
