import {expect,it,vi} from 'vitest';
import {GpuTimer} from './GpuTimer';
it('GPU timer reads only available queries asynchronously and discards disjoint results',()=>{
 let available=false,disjoint=false;
 const gl={getExtension:()=>({TIME_ELAPSED_EXT:100,GPU_DISJOINT_EXT:101}),createQuery:()=>({}),beginQuery:vi.fn(),endQuery:vi.fn(),deleteQuery:vi.fn(),getParameter:()=>disjoint,QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,getQueryParameter:(_q:unknown,p:number)=>p===1?available:12000000};
 const timer=new GpuTimer(gl as unknown as WebGL2RenderingContext);
 for(let i=0;i<8;i++){timer.begin(true);timer.end();}expect(gl.beginQuery).toHaveBeenCalledTimes(1);expect(timer.milliseconds).toBeNull();
 timer.begin(true);timer.end();expect(timer.milliseconds).toBeNull();available=true;timer.begin(true);timer.end();expect(timer.milliseconds).toBe(12);expect(gl.deleteQuery).toHaveBeenCalledTimes(1);
 disjoint=true;timer.begin(true);timer.end();expect(timer.milliseconds).toBeNull();
});
