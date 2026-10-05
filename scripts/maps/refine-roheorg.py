"""One-shot layout 10 authoring migration. Re-running on layout 10 is a no-op."""
import json, math
from pathlib import Path
path=Path(__file__).resolve().parents[2]/'src/data/maps/green-valley.json'
d=json.loads(path.read_text());m=d['map']
if m['size']!=960:
    raise SystemExit('Roheorg migration requires the original 960 m layout')
# Spread the existing road/resource network modestly; preserve base/gate relationships.
s=1.08
for collection in ('bases','resources','features'):
    for o in m[collection]:
        o['x']=round(o['x']*s,3);o['z']=round(o['z']*s,3)
        if collection=='features' and o['kind']!='building':
            # Scale length and footprint consistently so road joins/gates stay connected.
            for k in ('width','depth'):o[k]=round(o[k]*s,3)
features=m['features'];features[:]=[f for f in features if not (f['id'].startswith('town-') and '-house-' in f['id'])]
for f in features:
    if f.get('appearance')=='farmhouse':
        f['width']=round(f['width']*.82,2);f['depth']=round(f['depth']*.82,2)
        f['height']=round(f['height']*.82,2)
        # Small houses still accept a squad under the shared garrison rule.
        f['width']=max(6,f['width']);f['depth']=max(6,f['depth'])
def road(id,a,b,width=8,label='Kvartali tänav'):
    dx=b[0]-a[0];dz=b[1]-a[1]
    features.append(dict(id=id,kind='road',x=round((a[0]+b[0])/2,3),z=round((a[1]+b[1])/2,3),width=width,depth=math.hypot(dx,dz)+width,rotation=math.atan2(dx,dz),label=label))
def overlap(a,b):
    # Separating-axis rectangle test keeps authored roads open through new blocks.
    def corners(f):
        c=math.cos(f.get('rotation',0));s=math.sin(f.get('rotation',0))
        return [(f['x']+x*c+z*s,f['z']-x*s+z*c) for x,z in [(-f['width']/2,-f['depth']/2),(f['width']/2,-f['depth']/2),(f['width']/2,f['depth']/2),(-f['width']/2,f['depth']/2)]]
    aa,bb=corners(a),corners(b)
    for f in (a,b):
        t=f.get('rotation',0)
        for x,z in ((math.cos(t),-math.sin(t)),(math.sin(t),math.cos(t))):
            pa=[xx*x+zz*z for xx,zz in aa];pb=[xx*x+zz*z for xx,zz in bb]
            if max(pa)<min(pb) or max(pb)<min(pa):return False
    return True
for side in (-1,1):
    cx=side*190*s;cz=side*78*s
    for axis in ('x','z'):
        for offset in (-48,0,48):
            a=(cx-72,cz+offset) if axis=='x' else (cx+offset,cz-72)
            b=(cx+72,cz+offset) if axis=='x' else (cx+offset,cz+72)
            road(f'urban-{side}-{axis}-{offset}',a,b,8 if offset else 10)
    for iz,z in enumerate((-60,-30,-18,18,30,60)):
        for ix,x in enumerate((-60,-30,-18,18,30,60)):
            i=iz*6+ix;two=i%9==0
            house=dict(id=f'town-{side}-house-{i}',kind='building',appearance='farmhouse',x=round(cx+x,3),z=round(cz+z,3),width=7 if two else 6,depth=8 if two else 7,height=5.8 if two else 3.4,rotation=math.pi if z<0 else 0,label='Roheoru korterelamu' if two else 'Roheoru ridaelamu',garrisonCapacity=1)
            if not any(overlap(house,r) for r in features if r['kind']=='road'):
                features.append(house)
    # An outer route makes the extra map margin usable for flanking/logistics.
    road(f'flank-{side}-0',(side*363,side*-246),(side*460,side*-110),8,'Välimine ringtee')
    road(f'flank-{side}-1',(side*460,side*-110),(side*460,side*210),8,'Välimine ringtee')
    road(f'flank-{side}-2',(side*460,side*210),(side*330,side*310),8,'Välimine ringtee')
    for i,(x,z) in enumerate(((410,20),(405,150),(90,425))):
        features.append(dict(id=f'outer-wood-{side}-{i}',kind='cover',appearance='forest',x=side*x,z=side*z,width=64,depth=72,height=8,density=.75,blocksMovement=False))
m['size']=1088;m['name']='Roheorg · 1088 m'
d['briefing']='1088 m Roheorg: kaks tihedat asulat väikeste elamute, siseõuede ja läbitavate tänavatega. Välised ringteed võimaldavad külgrünnakuid ning logistika ümbersuunamist. Jalavägi kasutab maju ja metsa; soomus liigub kiiremini maanteel. Kaitse ressursivedusid ja raja eesliini ladusid.'
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(f"Roheorg: {m['size']} m; {sum(f['kind']=='building' for f in features)} buildings; {len(features)} features")
