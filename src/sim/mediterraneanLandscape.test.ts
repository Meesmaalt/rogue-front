import {expect,it} from 'vitest';
import {generateProceduralMap,getPlayableMap} from './proceduralMap';
import {parcelArea,ridgeReliefAt} from './regionalLandscape';
import {validateFreshMap} from './freshMap';
import config from '../data/map-generation.json';
it('v13 replaces blanket mountain forest with open Mediterranean fields and terracotta settlements',()=>{
 const old=generateProceduralMap(42,'balanced',2048,12),map=generateProceduralMap(42,'balanced',2048,13);
 const wooded=(m:typeof map)=>m.map.features!.filter(f=>f.appearance==='forest'&&f.polygon).reduce((n,f)=>n+parcelArea(f.polygon!),0);
 expect(wooded(map)).toBeLessThan(wooded(old)*.55);expect(wooded(map)).toBeGreaterThan(2048**2*.005);
 const houses=map.map.features!.filter(f=>f.appearance==='farmhouse');expect(houses.length).toBeGreaterThan(50);expect(houses.every(f=>config.mediterranean.roofColors.includes(f.color!))).toBe(true);
 expect(getPlayableMap(map.id)).toEqual(map);expect(getPlayableMap(old.id)).toEqual(old);
},60000);
it('some seeds have a central crater with towns around it and usable supply routes',()=>{
 const map=generateProceduralMap(42,'balanced',2048,13),forms=map.map.landforms!,r=2048*config.mediterranean.volcanoRadiusRatio;
 expect(map.name).toContain('Vulkaani');expect(ridgeReliefAt({x:0,z:0},forms)).toBeLessThan(5);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;expect(ridgeReliefAt({x:Math.cos(a)*r,z:Math.sin(a)*r},forms)).toBeGreaterThan(30);}
 expect(map.map.features!.find(f=>f.id==='caldera-ground')?.cropPattern).toBe('bare');
 expect(validateFreshMap(map)).toBe(true);
 const ordinary=generateProceduralMap(43,'balanced',2048,13);expect(ordinary.map.features!.some(f=>f.id==='caldera-ground')).toBe(false);
},60000);
