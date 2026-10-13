"""Replace overlapping legacy routes with connected, rounded authored corridors."""
import json,math
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=root/'src/data/maps/green-valley.json';mission=json.loads(p.read_text());m=mission['map']
features=[f for f in m['features'] if f['kind']!='road']
bridges=[f for f in features if f['kind']=='bridge'];roads=[]
# Decks span the channel, not a 78 m slab across both banks. Roads carry the approach ramps.
for b in bridges:b['depth']=52;b['width']=10
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
 for dz in [-28.5,28.5]:segment(f'{name}-residential-{dz}',(cx-60,cz+dz),(cx+60,cz+dz),4.4,'street')
# Farms retain an actual access lane rather than isolated houses in fields.
for f in features:
 if not f['id'].startswith('farm-house-'):continue
 a=f.get('rotation',0);point=(f['x']+math.sin(a)*(max(f['width'],f['depth'])/2+4),f['z']+math.cos(a)*(max(f['width'],f['depth'])/2+4));best=None
 for r in roads:
  ra=r.get('rotation',0);t=max(-r['depth']/2,min(r['depth']/2,(point[0]-r['x'])*math.sin(ra)+(point[1]-r['z'])*math.cos(ra)))
  q=(r['x']+math.sin(ra)*t,r['z']+math.cos(ra)*t);distance=math.dist(point,q)
  if best is None or distance<best[0]:best=(distance,q)
 if best:segment(f"farm-access-{f['id']}",point,best[1],3.4,'track')
# Loading access connects to the nearest actual corridor, using the loading pad.
for i,r in enumerate(m['resources']):
 point=(r['x']-10,r['z']);best=None
 for f in roads:
  a=f.get('rotation',0);dx,dz=point[0]-f['x'],point[1]-f['z'];t=max(-f['depth']/2,min(f['depth']/2,dx*math.sin(a)+dz*math.cos(a)));q=(f['x']+math.sin(a)*t,f['z']+math.cos(a)*t);d=math.dist(point,q)
  if best is None or d<best[0]:best=(d,q)
 if best and best[0]>2:segment(f'resource-link-{i}',best[1],point,5,'track')
# Reproducible residential scale/setbacks; fronts face the local access lanes.
features=[f for f in features if not f['id'].startswith(('garden-','canopy-edge-','bank-copse-','field-border-','field-copse-','meadow-parcel-'))]
for f in features:
 if not f['id'].startswith(('west-house-','east-house-')):continue
 i=int(f['id'].split('-')[-1]);row=i//6;cz=-100.44 if f['id'].startswith('west') else 132.84
 f['width']=round(6.2+(i%4)*.5,2);f['depth']=round(6.6+(i%3)*.4,2)
 f['height']=5.8 if i%7==0 else 3.5+(i%3)*.25
 f['z']=cz+[-37,-20,20,37][row]+((i%3)-1)*.35
 f['rotation']=0 if row in [0,2] else math.pi
 f['label']='Kahekorruseline elamu' if f['height']>5 else 'Aedlinna elamu'
# A few offset canopy lobes break up the repeated elliptical forest outline.
for f in list(features):
 if f.get('appearance')!='forest' or f['width']<100 or f['depth']<65:continue
 a=f.get('rotation',0)
 for side in [-1,1]:
  features.append(dict(id=f"canopy-edge-{f['id']}-{side}",kind='cover',appearance='forest',shape='ellipse',x=round(f['x']+side*f['width']*.32*math.cos(a),3),z=round(f['z']-side*f['width']*.32*math.sin(a)+f['depth']*.32,3),width=f['width']*.38,depth=f['depth']*.48,rotation=a+.22*side,height=6,density=.72,blocksMovement=False))
for i,(x,z) in enumerate([(-66,-92),(72,136),(-92,290),(90,-267)]):
 features.append(dict(id=f'bank-copse-{i}',kind='cover',appearance='forest',shape='ellipse',x=x,z=z,width=42,depth=28,rotation=.3,height=6,density=.7,blocksMovement=False))
# The photographed reference has mixed crops and narrow, real cover along field boundaries.
for side in [1,-1]:
 for i,(x,z,w,d) in enumerate([(-392,20,94,100),(-400,112,96,66),(-210,-270,78,60),(-108,-125,58,70),(-156,74,104,62),(-414,470,110,70),(-275,440,72,82)]):
  features.append(dict(id=f'meadow-parcel-{side}-{i}',kind='cover',appearance='field',x=x*side,z=z*side,width=w,depth=d,rotation=(i%3-1)*.025,blocksMovement=False))
parcels=[f for f in features if f['id'].startswith(('parcel-','meadow-parcel-'))]
crop_colors=[0xa99b67,0x927b70,0x87916a,0xb0a375,0x8b9571]
for i,f in enumerate(parcels):
 f['color']=crop_colors[i%len(crop_colors)]
 if i%2==0:
  a=f.get('rotation',0);side=1 if i%4==0 else -1;offset=f['width']*.47*side
  features.append(dict(id='field-border-'+f['id'],kind='cover',appearance='forest',shape='ellipse',x=round(f['x']+math.cos(a)*offset,3),z=round(f['z']-math.sin(a)*offset,3),width=5.5,depth=f['depth']*.86,rotation=a,height=3.4,density=.72,blocksMovement=False,label='Põlluäärne hekk'))
 if i%3==0:
  features.append(dict(id='field-copse-'+f['id'],kind='cover',appearance='forest',shape='ellipse',x=f['x']-f['width']*.31,z=f['z']+f['depth']*.3,width=13,depth=11,height=6,density=.48,blocksMovement=False,label='Põllusalu'))
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
for f in list(features):
 if f['id'].startswith(('west-house-','east-house-')):
  features.append(dict(id='garden-'+f['id'],kind='cover',appearance='field',x=f['x'],z=f['z'],width=12,depth=12,rotation=0,color=[0x90997c,0x879373,0x9b9f83][int(f['id'].split('-')[-1])%3],blocksMovement=False,label='Elamu aed'))
m['features']=features+roads;m['layoutVersion']=16
p.write_text(json.dumps(mission,ensure_ascii=False,indent=2)+'\n')
print('Roheorg',len(roads),'connected road segments')
