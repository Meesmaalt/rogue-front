import {expect,it} from 'vitest';
import {PerformanceRecording,type RecordedFrame} from './PerformanceRecording';
const frame=(elapsedMs:number,frameMs=16):RecordedFrame=>({elapsedMs,frameMs,simulationMs:2,renderMs:3,steps:1,debtMs:0,suspendedMs:0,calls:25,triangles:500,stages:{'3D':2}});
it('export keeps chronological bounded frames and whole-session spikes with environment context',()=>{
 const r=new PerformanceRecording(3);r.configure({mapId:'seeded',gpuTimerSupported:false});
 r.record(frame(1,180));r.record(frame(2));r.record(frame(3));r.record(frame(4));r.longTask(10,150);
 const json=JSON.parse(JSON.stringify(r.export([{fps:60}])));
 expect(json.frames.map((f:RecordedFrame)=>f.elapsedMs)).toEqual([2,3,4]);expect(json.worstFrames[0].frameMs).toBe(180);expect(json.context.mapId).toBe('seeded');expect(json.longTasks[0].durationMs).toBe(150);
 r.reset();const empty=JSON.parse(JSON.stringify(r.export([])));expect(empty.frames).toEqual([]);expect(empty.worstFrames).toEqual([]);expect(empty.context.mapId).toBe('seeded');
});
it('preserves the CPU callback causing a slow following interval even after the raw ring wraps',()=>{
 const r=new PerformanceRecording(2),slow={...frame(16),renderMs:270,stages:{minikaart:265,HUD:1}};
 r.record(slow);r.record(frame(286,270));r.record(frame(302));
 const json=JSON.parse(JSON.stringify(r.export([])));
 expect(json.schemaVersion).toBe(3);expect(json.frames.map((f:RecordedFrame)=>f.elapsedMs)).toEqual([286,302]);
 expect(json.worstFrames[0].elapsedMs).toBe(286);
 expect(json.worstWorkFrames[0].elapsedMs).toBe(16);expect(json.worstWorkFrames[0].stages.minikaart).toBe(265);
 for(let i=0;i<40;i++)r.record({...slow,elapsedMs:i,renderMs:100+i});
 expect(JSON.parse(JSON.stringify(r.export([]))).worstWorkFrames).toHaveLength(30);
 r.reset();expect(JSON.parse(JSON.stringify(r.export([]))).worstWorkFrames).toEqual([]);
});
