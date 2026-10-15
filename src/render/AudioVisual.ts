/** Rendering-only reactions to audio cues: screen flash, off-screen direction arrow and shake strength. Never touches the simulation. */
export interface AudioCue{kind:'siren'|'alert'|'capture'|'lost'|'impact'|'warn'|'ready';x?:number;z?:number;intensity?:number}
export type AlertTone='danger'|'warn'|'good';
export function reducedMotion():boolean{return typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;}
/** Camera-relative direction of a world offset: right/up in screen terms (matches RtsCamera's yaw convention). */
export function alertDirection(dx:number,dz:number,yaw:number):{right:number;up:number}{const s=Math.sin(yaw),c=Math.cos(yaw);return {right:dx*c-dz*s,up:-dx*s-dz*c};}
export function shakeAmount(intensity:number):number{return intensity<.08?0:Math.min(1,intensity)*.9;}
export function toneFor(kind:AudioCue['kind']):AlertTone|null{return kind==='siren'?'danger':kind==='capture'?'good':kind==='alert'||kind==='lost'?'warn':null;}
const STYLE=`.av-vignette{position:fixed;inset:0;pointer-events:none;z-index:900;opacity:0}
.av-vignette.run{animation:av-pulse .9s ease-out 1}.av-vignette.danger{background:radial-gradient(ellipse at center,transparent 55%,rgba(255,40,40,.5) 100%)}
.av-vignette.warn{background:radial-gradient(ellipse at center,transparent 60%,rgba(255,150,40,.4) 100%)}.av-vignette.good{background:radial-gradient(ellipse at center,transparent 65%,rgba(80,220,120,.3) 100%)}
.av-vignette.run.twice{animation-iteration-count:2}
@keyframes av-pulse{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
.av-arrow{position:fixed;pointer-events:none;z-index:901;font-size:26px;line-height:1;transform-origin:center;text-shadow:0 0 6px #000;animation:av-arrow 1.6s ease-out forwards}
.av-arrow.danger{color:#ff4a4a}.av-arrow.warn{color:#ffa23c}.av-arrow.good{color:#6be28a}
@keyframes av-arrow{0%{opacity:0}15%{opacity:1}100%{opacity:0}}`;
export class AlertOverlay{
 private readonly vignette:HTMLDivElement;
 constructor(private readonly root:HTMLElement=document.body){
  if(!document.getElementById('av-style')){const s=document.createElement('style');s.id='av-style';s.textContent=STYLE;document.head.appendChild(s);}
  this.vignette=document.createElement('div');this.vignette.className='av-vignette';root.appendChild(this.vignette);
 }
 flash(tone:AlertTone):void{
  if(reducedMotion())return;const v=this.vignette;v.className='av-vignette';void v.offsetWidth;v.className=`av-vignette ${tone} run${tone==='danger'?' twice':''}`;
 }
 /** Arrow on the screen edge pointing at an off-screen event. */
 indicate(x:number,z:number,cam:{x:number;z:number;yaw:number;dist:number},tone:AlertTone):void{
  const dx=x-cam.x,dz=z-cam.z;if(Math.hypot(dx,dz)<cam.dist*.85)return;
  const {right,up}=alertDirection(dx,dz,cam.yaw),a=Math.atan2(up,right),el=document.createElement('div');
  el.className=`av-arrow ${tone}`;el.textContent='▲';el.style.left=`${50+Math.cos(a)*44}%`;el.style.top=`${50-Math.sin(a)*40}%`;
  el.style.transform=`translate(-50%,-50%) rotate(${Math.PI/2-a}rad)`;this.root.appendChild(el);window.setTimeout(()=>el.remove(),1700);
 }
}
