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
