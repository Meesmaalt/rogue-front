import {afterEach,expect,it,vi} from 'vitest';
import {Minimap} from './Minimap';
import type {World} from '../sim/World';
import type {Picker} from '../input/Picker';
import {resetHeightmap} from '../sim/heightmap';
function fixture(){
 const contexts:ReturnType<typeof context>[]=[];
 function context(){return {createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:vi.fn(),drawImage:vi.fn(),save:vi.fn(),restore:vi.fn(),translate:vi.fn(),rotate:vi.fn(),fillRect:vi.fn(),clearRect:vi.fn(),beginPath:vi.fn(),closePath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn()};}
 function canvas(){const ctx=context();contexts.push(ctx);return Object.assign(new EventTarget(),{width:176,height:176,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:176,height:176})});}
 vi.stubGlobal('document',{createElement:()=>canvas()});vi.stubGlobal('addEventListener',vi.fn());
 const damage=new Map<string,number>();
 const world={mapFeatures:[{id:'road',kind:'road',x:0,z:0,width:8,depth:100},{id:'bridge',kind:'bridge',x:0,z:0,width:8,depth:25}],infrastructureDamage:damage,playerTeam:0,time:0,terrain:{fires:()=>[]},vision:{width:1,height:1,cellToWorld:()=>({x:0,z:0}),stateAt:()=>2},resourcePoints:[],entities:[],getIntel:()=>[]} as unknown as World;
 const main=canvas(),m=new Minimap(main as unknown as HTMLCanvasElement,world,{groundAtNDC:()=>({x:0,z:0})} as unknown as Picker);
 return {m,contexts,damage};
}
afterEach(()=>{vi.unstubAllGlobals();resetHeightmap();});
it('steady minimap refreshes reuse the map layer instead of redrawing each feature',()=>{
 const {m,contexts}=fixture(),base=contexts[1];expect(base.fillRect).toHaveBeenCalledTimes(2);
 for(let i=0;i<10;i++)m.draw(.1);
 expect(base.fillRect).toHaveBeenCalledTimes(2);expect(base.putImageData).toHaveBeenCalledTimes(1);expect(contexts[0].drawImage).toHaveBeenCalledTimes(20);
});
it('collapsed and restored bridges invalidate the static map once, partial damage does not',()=>{
 const {m,contexts,damage}=fixture();m.draw(.1);const before=contexts.length;
 damage.set('bridge',.4);m.draw(.1);expect(contexts).toHaveLength(before);
 damage.set('bridge',1);m.draw(.1);expect(contexts).toHaveLength(before+1);
 m.draw(.1);expect(contexts).toHaveLength(before+1);
 damage.clear();m.draw(.1);expect(contexts).toHaveLength(before+2);
});
