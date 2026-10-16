"""Reproducible CPU thumbnails of actual game meshes; Pillow + NumPy, no GPU/browser dependency."""
import json, math, struct, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[2]
VIEWS=json.loads((ROOT/'src/data/aircraft-portraits.json').read_text())
DTYPES={5120:'i1',5121:'u1',5122:'<i2',5123:'<u2',5125:'<u4',5126:'<f4'}
def glb(path):
    raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0];data=json.loads(raw[20:20+size]);start=20+size;binary=raw[start+8:]
    def accessor(i):
        a=data['accessors'][i];v=data['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];dtype=np.dtype(DTYPES[a['componentType']]);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        return np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=offset,strides=(v.get('byteStride',n*dtype.itemsize),dtype.itemsize)).copy()
    out=[]
    def walk(i,parent):
        node=data['nodes'][i];m=np.eye(4)
        if 'matrix' in node:m=np.array(node['matrix']).reshape(4,4).T
        else:
            x,y,z,w=node.get('rotation',[0,0,0,1]);m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(node.get('scale',[1,1,1]));m[:3,3]=node.get('translation',[0,0,0])
        m=parent@m
        if 'mesh' in node:
            for primitive in data['meshes'][node['mesh']]['primitives']:
                pos=accessor(primitive['attributes']['POSITION']);pos=np.c_[pos,np.ones(len(pos))]@m.T;idx=accessor(primitive['indices']).reshape(-1,3) if 'indices' in primitive else np.arange(len(pos)).reshape(-1,3)
                material=data['materials'][primitive.get('material',0)];color=material.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1])[:3];uv=accessor(primitive['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in primitive['attributes'] else None
                for tri in idx:out.append((pos[tri,:3],np.array(color),material.get('name',''),None if uv is None else uv[tri].mean(axis=0)))
        for child in node.get('children',[]):walk(child,m)
    for node in data['scenes'][data.get('scene',0)]['nodes']:walk(node,np.eye(4))
    return out

def render(tris,az,el,path,camo=None):
    W,H,S=240,170,3;az,el=math.radians(az),math.radians(el)
    view=np.array([math.sin(az)*math.cos(el),math.sin(el),math.cos(az)*math.cos(el)]);right=np.array([math.cos(az),0,-math.sin(az)]);up=np.cross(view,right)
    xyz=np.concatenate([t[0] for t in tris]);center=(xyz.min(axis=0)+xyz.max(axis=0))/2;project=np.array([right,up,view]).T
    transformed=[((p-center)@project,c,n,uv,p) for p,c,n,uv in tris];flat=np.concatenate([t[0][:,:2] for t in transformed]);low,high=flat.min(axis=0),flat.max(axis=0);zoom=min(W*.86/(high[0]-low[0]),H*.78/(high[1]-low[1]));mid=(high+low)/2
    bg=np.zeros((H*S,W*S,3),dtype=np.uint8)
    for y in range(H*S):bg[y,:]=np.array([31,43,49])+(1-y/(H*S))*np.array([15,18,20])
    image=Image.fromarray(bg);shadow=Image.new('RGBA',image.size);d=ImageDraw.Draw(shadow);d.ellipse((W*S*.13,H*S*.75,W*S*.87,H*S*.91),fill=(0,0,0,100));image=Image.alpha_composite(image.convert('RGBA'),shadow.filter(ImageFilter.GaussianBlur(10)))
    draw=ImageDraw.Draw(image);sun=np.array([-.3,.85,.45]);sun/=np.linalg.norm(sun)
    for proj,color,name,uv,world in sorted(transformed,key=lambda t:t[0][:,2].mean()):
        normal=np.cross(world[1]-world[0],world[2]-world[0]);norm=np.linalg.norm(normal)
        if norm<1e-8:continue
        normal/=norm
        if normal@view<-.05:continue
        if name=='armor' and camo is not None:
            if uv is not None:color=np.array(camo.getpixel((int((uv[0]%1)*camo.width),int((uv[1]%1)*camo.height)))[:3])/255
            else:color=np.array([.45,.52,.5])
        else:color=np.maximum(0,color)**(1/2.2)
        shade=.54+.54*max(0,normal@sun)+.12*max(0,normal@view);rgb=tuple(np.clip(color*shade*255,0,255).astype('uint8'))
        points=[((p[0]-mid[0])*zoom*S+W*S/2,-(p[1]-mid[1])*zoom*S+H*S*.47) for p in proj];draw.polygon(points,fill=rgb)
    path.parent.mkdir(parents=True,exist_ok=True);image.convert('RGB').resize((W,H),Image.Resampling.LANCZOS).save(path,quality=91,method=6)

if __name__=='__main__':
    with tempfile.TemporaryDirectory() as temp:
        script=Path(temp)/'chinook.cjs';subprocess.run([str(ROOT/'node_modules/.bin/esbuild'),'scripts/art/export-chinook-preview.ts','--bundle','--platform=node','--format=cjs',f'--outfile={script}'],cwd=ROOT,check=True,capture_output=True)
        chinook=json.loads(subprocess.check_output(['node',str(script)]));chinook=[(np.array(t['p']).reshape(3,3),np.array(t['c']),'',None) for t in chinook]
    for faction in ['usa','russia','china']:
        camo=Image.open(ROOT/f'public/models/art/{faction}/camouflage.png').convert('RGB')
        for kind,(az,el) in VIEWS.items():
            model='cargoPlane' if kind=='airTransport' else kind
            tris=chinook if faction=='usa' and kind=='transport' else glb(ROOT/f'public/models/art/{faction}/{model}.glb')
            render(tris,az,el,ROOT/f'public/ui/units/{faction}/{kind}.webp',camo)
        print(f'{faction}: {len(VIEWS)} actual-model portraits')
