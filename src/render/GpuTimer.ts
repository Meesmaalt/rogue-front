interface TimerExtension {TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number}
/** Asynchronous GPU queries: never wait for a result or call gl.finish(). */
export class GpuTimer {
 private readonly gl:WebGL2RenderingContext|null;
 private readonly ext:TimerExtension|null;
 private pending:Array<{query:WebGLQuery;frame:number}>=[];
 private active:WebGLQuery|null=null;
 private frame=0;
 milliseconds:number|null=null;
 sampleFrame:number|null=null;
 get supported():boolean{return this.ext!==null;}
 constructor(context:WebGLRenderingContext|WebGL2RenderingContext){
  this.gl='createQuery' in context?context:null;
  this.ext=this.gl?.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension|null??null;
 }
 begin(enabled:boolean):void {
  this.frame++;if(!this.gl||!this.ext||!enabled&&this.pending.length===0)return;
  const gl=this.gl,ext=this.ext;
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
   for(const p of this.pending)gl.deleteQuery(p.query);this.pending=[];this.milliseconds=null;this.sampleFrame=null;return;
  }else while(this.pending.length&&gl.getQueryParameter(this.pending[0].query,gl.QUERY_RESULT_AVAILABLE)){
   const p=this.pending.shift()!;this.milliseconds=Number(gl.getQueryParameter(p.query,gl.QUERY_RESULT))/1e6;this.sampleFrame=p.frame;gl.deleteQuery(p.query);
  }
  if(!enabled||this.frame%8!==0||this.pending.length>=4)return;
  const query=gl.createQuery();if(!query)return;
  gl.beginQuery(ext.TIME_ELAPSED_EXT,query);this.active=query;
 }
 end():void {
  if(!this.active||!this.gl||!this.ext)return;
  this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push({query:this.active,frame:this.frame});this.active=null;
 }
 get sampleAgeFrames():number|null{return this.sampleFrame===null?null:this.frame-this.sampleFrame;}
}
