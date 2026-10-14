import {afterEach,expect,it} from 'vitest';
import {SpatialHash} from './SpatialHash';
import {World} from './World';
import {setMapSize,resetHeightmap} from './heightmap';
afterEach(resetHeightmap);
it('sparse kilometre queries preserve dense row-major order, bucket membership and early stop',()=>{
 setMapSize(6144);const w=new World(12,false,[],[],[{x:0,z:0,r:100},{x:2000,z:2000,r:50}],false);
 const positions=[[900,900],[-1500,-1500],[902,902],[0,0],[1500,-1500],[-1500,1500]];
 const entities=positions.map(([x,z])=>w.spawn('inf',0,x,z)),hash=new SpatialHash(16);hash.rebuild(entities);
 const expected=[...entities].sort((a,b)=>Math.floor((a.z+3072)/16)-Math.floor((b.z+3072)/16)||Math.floor((a.x+3072)/16)-Math.floor((b.x+3072)/16)||a.id-b.id).map(e=>e.id),found:number[]=[];
 hash.queryRadius(0,0,2500,e=>{found.push(e.id);});expect(found).toEqual(expected);
 const stopped:number[]=[];hash.queryRadius(0,0,2500,e=>{stopped.push(e.id);return true;});expect(stopped).toEqual(expected.slice(0,1));
 const narrow:number[]=[];hash.queryRadius(901,901,3,e=>{narrow.push(e.id);});expect(narrow).toEqual([entities[0].id,entities[2].id]);
 entities[0].dead=true;hash.rebuild(entities);const remaining:number[]=[];hash.queryRadius(0,0,2500,e=>{remaining.push(e.id);});expect(remaining).toEqual(expected.filter(id=>id!==entities[0].id));
});
