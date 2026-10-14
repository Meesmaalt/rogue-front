import {afterEach,expect,it} from 'vitest';
import {createMetricRunway} from './MetricRunway';
import {World} from '../sim/World';
import {resetHeightmap,setBases} from '../sim/heightmap';
afterEach(resetHeightmap);
it('runway is one coloured geometry matching simulated 340 metre rollout strip',()=>{
 setBases([{x:0,z:0,r:500}]);const w=new World(1,false,[],[],[{x:0,z:0,r:500},{x:200,z:200,r:30}],false),pad=w.spawn('airbase',0,0,0);pad.heading=0;const mesh=createMetricRunway(pad);mesh.geometry.computeBoundingBox();expect(mesh.geometry.boundingBox!.max.z-mesh.geometry.boundingBox!.min.z).toBe(340);expect(mesh.geometry.groups).toHaveLength(0);expect(mesh.geometry.attributes.color.count).toBe(mesh.geometry.attributes.position.count);expect(mesh.children).toHaveLength(0);
});
