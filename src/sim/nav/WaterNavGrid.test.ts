import {afterEach,expect,it} from 'vitest';
import {resetHeightmap,setMapSize} from '../heightmap';
import {WaterNavGrid} from './WaterNavGrid';
import {findPath} from './Pathfinder';
afterEach(resetHeightmap);
it('routes through authored water and refuses land and solid bridge decks',()=>{
 setMapSize(256);const nav=new WaterNavGrid([{id:'water',kind:'water',x:-50,z:0,width:120,depth:220,surfaceHeight:2},{id:'bridge',kind:'bridge',x:-50,z:0,width:120,depth:12}]);
 expect(nav.isWalkableWorld(60,0)).toBe(false);expect(nav.surfaceAt(-50,60)).toBe(2);expect(nav.nearestWater({x:100,z:50},4,24)).toBeNull();expect(findPath(nav,{x:-50,z:60},{x:-50,z:-60},4)).toEqual([]);
});
