import {it,expect,vi,afterEach} from 'vitest';
import {CommandController} from './CommandController';
import {SelectionController} from './SelectionController';
import type {Picker} from './Picker';
import type {Fx} from '../render/Fx';
import {World} from '../sim/World';
import {resetHeightmap} from '../sim/heightmap';
class Surface extends EventTarget {style={cursor:''};closest(){return null;}}
function event(type:string,props:Record<string,unknown>){return Object.assign(new Event(type,{cancelable:true}),props);}
function fixture(){
 const root=new EventTarget(),el=new Surface();vi.stubGlobal('Element',Surface);vi.stubGlobal('addEventListener',root.addEventListener.bind(root));vi.stubGlobal('innerWidth',800);vi.stubGlobal('innerHeight',600);
 const w=new World(21,false,[],[],[{x:0,z:0,r:180},{x:250,z:250,r:20}],false);w.networkMode=true;const a=w.spawn('inf',0,-30,0),b=w.spawn('inf',0,-20,0);
 let picked=a;
 const picker={groundAt:()=>({x:60,z:45}),pickEntity:(_x:number,_y:number,team:number)=>team===0?picked:null,pickGarrisonBuilding:()=>null,toScreen:()=>({x:100,y:100,z:0})} as unknown as Picker;
 const proxy={selected:new Set<number>(),selectedIds(){return [...this.selected];}};
 const commands=new CommandController(el as unknown as HTMLElement,w,picker,proxy as unknown as SelectionController,{ping:vi.fn()} as unknown as Fx);commands.enabled=true;
 const selection=new SelectionController(el as unknown as HTMLElement,w,picker);selection.enabled=true;selection.selected.add(a.id);proxy.selected=selection.selected;
 const click=(shiftKey=false)=>{el.dispatchEvent(event('mousedown',{button:0,clientX:100,clientY:100,shiftKey}));root.dispatchEvent(event('mouseup',{button:0,clientX:100,clientY:100,shiftKey}));};
 return {w,a,b,selection,commands,click,pick:(u:typeof a)=>{picked=u;}};
}
afterEach(()=>{resetHeightmap();vi.unstubAllGlobals();});
it('armed attack movement accepts left click and Shift preserves queued targeting',()=>{
 const f=fixture();f.commands.armOrder('attack');f.click(true);expect(f.w.pending.at(-1)).toMatchObject({type:'amove',append:true,x:60,z:45});expect(f.commands.attackMoveMode).toBe(true);expect([...f.selection.selected]).toEqual([f.a.id]);
 f.click();expect(f.w.pending.at(-1)?.type).toBe('amove');expect(f.commands.targeting).toBe(false);
});
it('patrol waits for its clicked destination; choosing another order cancels air targeting',()=>{
 const f=fixture();f.commands.armOrder('patrol');expect(f.w.pending).toHaveLength(0);f.click();expect(f.w.pending.at(-1)).toMatchObject({type:'patrol',x:60,z:45});
 f.commands.startAirMission([f.a.id],'strike');f.commands.armOrder('move');f.click();expect(f.w.pending.at(-1)?.type).toBe('move');expect(f.commands.targeting).toBe(false);
 f.commands.armOrder('patrol');f.commands.moveTo(90,70);expect(f.w.pending.at(-1)).toMatchObject({type:'patrol',x:90,z:70});expect(f.commands.targeting).toBe(false);
});
it('Shift deselects even immediately after a click, and clicking different soldiers does not select every soldier',()=>{
 const f=fixture();f.click();f.click(true);expect(f.selection.selected.size).toBe(0);f.click();f.pick(f.b);f.click();expect([...f.selection.selected]).toEqual([f.b.id]);
 f.b.loadedIntoId=999;f.selection.prune();expect(f.selection.selected.size).toBe(0);
});
