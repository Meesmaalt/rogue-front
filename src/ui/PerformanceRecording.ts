import type {FrameMetrics} from '../core/GameLoop';
export interface RecordedFrame extends FrameMetrics {
 elapsedMs:number;stages:Record<string,number>;calls:number;triangles:number;
 cameraX?:number;cameraY?:number;cameraZ?:number;gpuMs?:number|null;gpuSampleAgeFrames?:number|null;
}
/** Bounded, chronological raw samples preserve spikes hidden by cumulative averages. */
export class PerformanceRecording {
 private startMs=0;
 private frames:RecordedFrame[]=[];
 private cursor=0;
 private worst:RecordedFrame[]=[];
 private worstWork:RecordedFrame[]=[];
 private context:Record<string,unknown>={};
 private tasks:Array<{startMs:number;durationMs:number}>=[];
 constructor(private readonly capacity=3600){}
 configure(context:Record<string,unknown>):void{this.context=context;}
 reset(startMs=0):void{this.startMs=startMs;this.frames=[];this.cursor=0;this.worst=[];this.worstWork=[];this.tasks=[];}
 record(frame:RecordedFrame):void {
  this.frames[this.cursor]=frame;this.cursor=(this.cursor+1)%this.capacity;
  if(frame.frameMs>=50){this.worst.push(frame);this.worst.sort((a,b)=>b.frameMs-a.frameMs);if(this.worst.length>30)this.worst.length=30;}
  if(frame.simulationMs+frame.renderMs>=50){this.worstWork.push(frame);this.worstWork.sort((a,b)=>(b.simulationMs+b.renderMs)-(a.simulationMs+a.renderMs));if(this.worstWork.length>30)this.worstWork.length=30;}
 }
 longTask(startMs:number,durationMs:number):void{this.tasks.push({startMs,durationMs});if(this.tasks.length>200)this.tasks.shift();}
 export(snapshots:readonly object[]):object {
  const frames=this.frames.length===this.capacity?[...this.frames.slice(this.cursor),...this.frames.slice(0,this.cursor)]:[...this.frames];
  return {schemaVersion:3,createdAt:new Date().toISOString(),recordingStartPerformanceMs:this.startMs,context:this.context,
   timingNotes:{frame:'Time since the previous animation callback; expensive work in this callback delays the next interval',cpu:'Submission timings for the current callback, not GPU time',gpu:'Asynchronous 3D-pass samples; null means unavailable, age indicates delayed result',rawFrames:'Latest 3600 frames; worstFrames preserves long intervals and worstWorkFrames preserves slow CPU callbacks across the whole measurement'},
   snapshots,frames,worstFrames:this.worst,worstWorkFrames:this.worstWork,longTasks:this.tasks};
 }
}
