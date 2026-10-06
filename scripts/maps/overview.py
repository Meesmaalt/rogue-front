"""Data-derived placement view, deliberately not a game-render screenshot."""
import json,math,sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon,Ellipse,Circle
root=Path(__file__).resolve().parents[2]
paths=[Path(sys.argv[1]),root/'src/data/maps/green-valley.json'] if len(sys.argv)>1 else [root/'src/data/maps/green-valley.json']
fig,axes=plt.subplots(1,len(paths),figsize=(8*len(paths),8),squeeze=False)
for ax,p,title in zip(axes[0],paths,['Enne · kattuvad kihid','Pärast · korrastatud org'] if len(paths)>1 else ['Roheorg · paigutusskeem']):
 m=json.loads(p.read_text())['map'];ax.set_facecolor('#929a7c');half=m['size']/2
 ordered=sorted(m['features'],key=lambda f:({'field':0,'forest':1,'yard':2}.get(f.get('appearance'),{'road':3,'water':4,'bridge':5,'building':6}.get(f['kind'],7))))
 for f in ordered:
  k=f['kind'];appearance=f.get('appearance');a=f.get('rotation',0);c,s=math.cos(a),math.sin(a)
  color=('#%06x'%f.get('color',0x969570)) if appearance=='field' else '#3c563a' if appearance=='forest' else '#8e9287' if appearance=='yard' else '#759195' if k=='water' else '#626964' if k=='road' else '#b4b2a1' if k=='bridge' else '#d1c8aa' if k=='building' else '#766e55'
  if f.get('shape')=='ellipse':patch=Ellipse((f['x'],f['z']),f['width'],f['depth'],angle=-a*180/math.pi,facecolor=color,linewidth=0)
  else:
   points=[(f['x']+x*c+z*s,f['z']-x*s+z*c) for x,z in [(-f['width']/2,-f['depth']/2),(f['width']/2,-f['depth']/2),(f['width']/2,f['depth']/2),(-f['width']/2,f['depth']/2)]]
   patch=Polygon(points,facecolor=color,edgecolor='#7d7768' if k=='building' else color,linewidth=.35)
  ax.add_patch(patch)
 for i,b in enumerate(m['bases']):ax.add_patch(Circle((b['x'],b['z']),b['r'],color='#c0bbb0',alpha=.8));ax.text(b['x'],b['z'],'BAAS '+str(i+1),fontsize=8,ha='center',color='#283327')
 for r in m['resources']:ax.plot(r['x'],r['z'],'o',ms=5,color='#e4cb85',mec='#535846')
 ax.set(xlim=(-half,half),ylim=(half,-half),aspect='equal',title=title);ax.set_xlabel('meetrit');ax.set_ylabel('meetrit')
fig.suptitle('Kaardiandmete paigutusskeem · mitte mängu render',fontsize=11);fig.tight_layout();fig.savefig(root/'docs/checks/roheorg-layout-comparison.png',dpi=150);plt.close(fig)
