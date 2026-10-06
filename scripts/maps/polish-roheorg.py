"""Author the focused Roheorg layout; game loads the resulting JSON directly."""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'src/data/maps/green-valley.json';mission=json.loads(p.read_text());m=mission['map'];old=m['features']
features=[f for f in old if f['kind']=='road' and (f['id'].startswith(('Külatee-','Põhjatee-','Lõunatee-','flank-')))]
for f in features:f['roadClass']='arterial' if f['id'].startswith('Külatee-') else 'secondary';f['width']=9 if f['roadClass']=='arterial' else 7

network=list(features)

def road(id,a,b,width=6,cls='street',label='Külatänav'):
 dx,dz=b[0]-a[0],b[1]-a[1];f=dict(id=id,kind='road',x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,width=width,depth=math.hypot(dx,dz)+2,rotation=math.atan2(dx,dz),roadClass=cls,label=label);features.append(f);return f

def local(f,x,z):
 a=f.get('rotation',0);dx,dz=x-f['x'],z-f['z'];return dx*math.cos(a)-dz*math.sin(a),dx*math.sin(a)+dz*math.cos(a)
def inside(f,x,z,pad=0):
 x,z=local(f,x,z);return abs(x)<=f['width']/2+pad and abs(z)<=f['depth']/2+pad

def nearest_arterial(point):
 best=None
 for f in network:
  if f.get('roadClass') not in ['arterial','secondary']:continue
  _,lz=local(f,*point);lz=max(-f['depth']/2+1,min(f['depth']/2-1,lz));a=f.get('rotation',0);q=(f['x']+math.sin(a)*lz,f['z']+math.cos(a)*lz);d=math.dist(point,q)
  if best is None or d<best[0]:best=(d,q)
 return best[1]

for name,cx,cz in [('west',-205,-100.44),('east',205,132.84)]:
 a,b=(-280,cz),(110,cz) if name=='west' else (280,cz)
 if name=='east':a=(-110,cz)
 road(f'village-{name}-main',a,b,8.5,'secondary','Jõesilla maantee')
 for endpoint in [a,b]:
  q=nearest_arterial(endpoint)
  if math.dist(endpoint,q)>1:road(f'village-{name}-link-{endpoint[0]}',endpoint,q,7,'secondary','Asula ühendustee')
 for x in [cx-60,cx+60]:road(f'village-{name}-side-{x}',(x,cz-53),(x,cz+53),6)
 for z in [cz-52,cz+52]:road(f'village-{name}-edge-{z}',(cx-60,z),(cx+60,z),6)
 # Pavements only along village roads, rather than enormous paved rectangles.
 for x in [cx-60,cx+60]:
  for side in [-1,1]:features.append(dict(id=f'walk-{name}-{x}-{side}',kind='cover',appearance='yard',x=x+side*4.1,z=cz,width=1.2,depth=106,color=0x96978a,blocksMovement=False))
 for side in [-1,1]:features.append(dict(id=f'walk-{name}-main-{side}',kind='cover',appearance='yard',x=cx,z=cz+side*5.1,width=120,depth=1.2,color=0x96978a,blocksMovement=False))
 for row,dz in enumerate([-37,-20,20,37]):
  for col,dx in enumerate([-43,-25,-7,11,29,45]):
   x,z=cx+dx,cz+dz;idx=row*6+col
   width=6.4 if idx%7 else 8;depth=7.2 if idx%7 else 8.5;height=3.6 if idx%7 else 6.4
   if any(f['kind']=='road' and inside(f,x,z,max(width,depth)/2+2) for f in features):continue
   features.append(dict(id=f'{name}-house-{idx}',kind='building',appearance='farmhouse',x=x,z=z,width=width,depth=depth,height=height,rotation=0 if dz>0 else math.pi,label='Jõeküla elamu' if name=='west' else 'Sillaküla elamu',garrisonCapacity=1))

parcels=[(-345,-370,145,86),(-185,-390,135,82),(-315,-242,130,84),(-95,-355,70,68),(-335,-12,100,100),(-195,18,118,80),(-265,320,130,100),(-105,280,150,84),(-160,427,160,80),(-385,382,105,95),(-418,-112,55,110)]
colors=[0x8e936b,0xa39c7c,0x8a9170,0xaaa180,0x7e8966]
for side in [1,-1]:
 for i,(x,z,w,d) in enumerate(parcels):features.append(dict(id=f'parcel-{side}-{i}',kind='cover',appearance='field',x=x*side,z=z*side,width=w,depth=d,rotation=(i%3-1)*.035,color=colors[i%len(colors)],blocksMovement=False))
woods=[(-380,-465,220,130,-.15),(-275,132,125,78,.45),(-110,-16,104,83,-.25),(-218,-188,154,52,.12),(-258,-306,120,65,-.18),(-485,185,70,255,.02),(-475,-185,68,215,.04),(-190,480,140,86,.1),(-50,-465,58,108,.12),(-60,390,50,84,.2)]
for side in [1,-1]:
 for i,(x,z,w,d,a) in enumerate(woods):features.append(dict(id=f'woodland-{side}-{i}',kind='cover',appearance='forest',shape='ellipse',x=x*side,z=z*side+(40 if side==-1 and i==3 else 0),width=w,depth=d,rotation=a,height=8,density=.82 if i%3 else .92,blocksMovement=False))
# Small farm clusters tie open parcels to roads; no random houses across the map.
for i,(x,z) in enumerate([(-310,-330),(-295,310),(-150,390),(310,330),(295,-310),(150,-390)]):
 q=nearest_arterial((x,z));angle=math.atan2(q[0]-x,q[1]-z);road(f'farm-lane-{i}',(x+math.sin(angle)*12,z+math.cos(angle)*12),q,3.4,'track','Talutee')
 features.append(dict(id=f'farm-house-{i}',kind='building',appearance='farmhouse',x=x,z=z,width=7,depth=8,height=3.7,rotation=angle,label='Talu',garrisonCapacity=1))
# Readable industrial yards at the five actual resource points.
for i,r in enumerate(m['resources']):
 features.append(dict(id=f'resource-yard-{i}',kind='cover',appearance='yard',x=r['x']+15,z=r['z'],width=31,depth=27,color=0x85887b,blocksMovement=False))
 q=nearest_arterial((r['x']-12,r['z']));road(f'resource-access-{i}',(r['x']-12,r['z']),q,5,'street','Lao juurdepääs')
 for dx,dz in [(18,0),(-18,0),(0,18),(0,-18),(18,18),(-18,-18)]:
  x,z=r['x']+dx,r['z']+dz
  if any(f['kind'] in ['building','road'] and inside(f,x,z,8) for f in features):continue
  r['facilityOffset']={'x':dx,'z':dz};break
# Keep navigation/deck coordinates and IDs, with enough reach across the banks.
bridges=[dict(f,depth=max(f['depth'],78)) for f in old if f['kind']=='bridge']
# Smooth the same river anchors; overlapping narrow segments share one surface.
anchors=[(0,-560),(-45,-365),(32,-190),(0,0),(-32,190),(45,365),(0,560)]
points=[]
for i in range(len(anchors)-1):
 a,b,c,d=anchors[max(0,i-1)],anchors[i],anchors[i+1],anchors[min(len(anchors)-1,i+2)]
 for j in range(8):
  t=j/8;t2=t*t;t3=t2*t
  points.append(tuple(.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3) for k in [0,1]))
points.append(anchors[-1])
for i,(a,b) in enumerate(zip(points,points[1:])):features.append(dict(id=f'rohe-river-{i}',kind='water',x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,width=26,depth=math.dist(a,b)+3,rotation=math.atan2(b[0]-a[0],b[1]-a[1]),surfaceHeight=-.8,label='Rohe jõgi'))
features.extend(bridges)
# Fields, forests and roads belong below geometry in the atlas. Terrain consumers
# use kind/appearance, independently of authoring/render order.
m['features']=features;m['name']='Roheorg · jõeorg';mission['briefing']='Rohe jõe org: kaks asulat, viis silda ja avatud põllud. Kasuta maanteid varustuseks, metsi luureks ja maju sillaületuste kaitseks. Keskne jõekalda ladu ja külgmised tööstuspunktid toetavad rindele toodavat varustust.'
p.write_text(json.dumps(mission,ensure_ascii=False,indent=2)+'\n')
print({kind:sum(f['kind']==kind for f in features) for kind in ['road','building','cover','water','bridge']})
