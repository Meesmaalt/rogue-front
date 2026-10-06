"""Replace overlapping legacy routes with connected, rounded authored corridors."""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'src/data/maps/green-valley.json';mission=json.loads(p.read_text());m=mission['map']
features=[f for f in m['features'] if f['kind']!='road']
bridges=[f for f in features if f['kind']=='bridge'];roads=[]
def segment(name,a,b,width=8,cls='secondary'):
 dx,dz=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dz)
 if length<.2:return
 roads.append(dict(id=name,kind='road',x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,width=width,depth=length+.35,rotation=math.atan2(dx,dz),roadClass=cls,label='Maantee' if cls!='street' else 'Külatänav'))
def route(name,points,width=8,cls='secondary'):
 pts=[points[0]]
 for i in range(1,len(points)-1):
  a,b,c=points[i-1:i+2];before=math.dist(a,b);after=math.dist(b,c);r=min(16,before*.2,after*.2)
  start=tuple(b[k]+(a[k]-b[k])*r/before for k in [0,1]);end=tuple(b[k]+(c[k]-b[k])*r/after for k in [0,1]);pts.append(start)
  for j in range(1,9):
   t=j/8;pts.append(tuple((1-t)**2*start[k]+2*(1-t)*t*b[k]+t*t*end[k] for k in [0,1]))
 pts.append(points[-1])
 for i,(a,b) in enumerate(zip(pts,pts[1:])):segment(f'{name}-{i}',a,b,width,cls)
def ends(b):
 return [tuple(b[k]+sign*math.sin(b.get('rotation',0))*b['depth']/2 if k=='x' else b[k]+sign*math.cos(b.get('rotation',0))*b['depth']/2 for k in ['x','z']) for sign in [-1,1]]
west=(-330,210);east=(330,-210)
route('west-bank',[west,(-310,200),(-310,0),(-310,-310)],8)
route('east-bank',[east,(310,-200),(310,0),(310,310)],8)
for i,b in enumerate(bridges):
 a,c=sorted(ends(b),key=lambda p:p[0])
 if i==0:
  route('central-west',[west,(-180,120),a],9,'arterial');route('central-east',[c,(180,-120),east],9,'arterial')
 else:
  segment(f'crossing-{i}-west',(-310,a[1]),a,8.5)
  segment(f'crossing-{i}-east',c,(310,c[1]),8.5)
# Compact town streets join their through-road. No diagonal links through blocks.
for name,cx,cz in [('west',-205,-100.44),('east',205,132.84)]:
 for x in [cx-60,cx+60]:segment(f'{name}-street-{x}',(x,cz-52),(x,cz+52),6,'street')
 for z in [cz-52,cz+52]:segment(f'{name}-street-{z}',(cx-60,z),(cx+60,z),6,'street')
# Loading access connects to the nearest actual corridor, using the loading pad.
for i,r in enumerate(m['resources']):
 point=(r['x']-10,r['z']);best=None
 for f in roads:
  a=f.get('rotation',0);dx,dz=point[0]-f['x'],point[1]-f['z'];t=max(-f['depth']/2,min(f['depth']/2,dx*math.sin(a)+dz*math.cos(a)));q=(f['x']+math.sin(a)*t,f['z']+math.cos(a)*t);d=math.dist(point,q)
  if best is None or d<best[0]:best=(d,q)
 if best and best[0]>2:segment(f'resource-link-{i}',best[1],point,5,'track')
# Avoid placing houses or old pavements inside the corrected network.
def inside(f,x,z,pad):
 a=f.get('rotation',0);dx,dz=x-f['x'],z-f['z'];return abs(dx*math.cos(a)-dz*math.sin(a))<f['width']/2+pad and abs(dx*math.sin(a)+dz*math.cos(a))<f['depth']/2+pad
features=[f for f in features if not(f['kind']=='building' and any(inside(r,f['x'],f['z'],max(f['width'],f['depth'])/2+1) for r in roads))]
for i,r in enumerate(m['resources']):
 offsets=[r.get('facilityOffset',{'x':18,'z':0})]+[{'x':x,'z':z} for x,z in [(-18,-18),(-24,0),(0,-24),(24,24),(-24,24),(0,30),(30,0),(-30,-30)]]
 for off in offsets:
  x,z=r['x']+off['x'],r['z']+off['z']
  if not any(inside(f,x,z,7.5) for f in features+roads if f['kind'] in ['road','water']):
   r['facilityOffset']=off
   for f in features:
    if f['id']==f'resource-yard-{i}':f['x']=x;f['z']=z
   break
 else:raise RuntimeError('No safe facility placement')
m['features']=features+roads;m['layoutVersion']=13
p.write_text(json.dumps(mission,ensure_ascii=False,indent=2)+'\n')
print('Roheorg',len(roads),'connected road segments')
