import {afterEach,expect,it} from "vitest";
import {World} from "../sim/World";
import {resetHeightmap} from "../sim/heightmap";
import {tutorialGuide} from "./TutorialGuide";
import type {MissionObjectiveDef} from "../sim/types";
afterEach(resetHeightmap);
const step=(kind:MissionObjectiveDef["kind"],unitKind?:MissionObjectiveDef["unitKind"]):MissionObjectiveDef=>({id:"training",title:"Test",description:"Test",kind,unitKind,target:{kind:"factory",count:1}});
it("selects the actual build branch with an engineer and recovers missing engineers",()=>{
 const w=new World(71,false,[],[],[],false);w.spawn("hq",0,0,0);const command=w.spawn("landCommand",0,10,0),engineer=w.spawn("engineer",0,0,10);
 const pending=w.pending.length,guide=tutorialGuide(w,step("build"));
 expect(guide.ids).toEqual([command.id,engineer.id]);expect(guide.panel).toBe("builds");expect(guide.highlight).toBe('[data-build="factory"]');expect(w.pending).toHaveLength(pending);
 const barracks=w.spawn("barracks",0,20,20);engineer.dead=true;const recovery=tutorialGuide(w,step("build"));expect(recovery.ids).toEqual([barracks.id]);expect(recovery.panel).toBe("land");expect(recovery.highlight).toBe('[data-kind="engineer"]');
});
it("recovers a lost producer through construction rather than an empty selection",()=>{
 const w=new World(71,false,[],[],[],false),command=w.spawn("landCommand",0,10,0),engineer=w.spawn("engineer",0,0,10);
 const guide=tutorialGuide(w,step("produce","tank"));expect(guide.ids).toEqual([command.id,engineer.id]);expect(guide.panel).toBe("builds");
});
it("uses the loaded carrier and does not reveal hidden building damage or occupants",()=>{
 const features=[{id:"house",kind:"building" as const,appearance:"farmhouse" as const,x:30,z:20,width:7,depth:7,height:4}];
 const w=new World(71,false,[],features,[],false),inf=w.spawn("inf",0,0,0),apc=w.spawn("apc",0,10,0);
 inf.loadedIntoId=apc.id;apc.cargoUnitIds=[inf.id];
 const before=tutorialGuide(w,step("garrison","inf"));expect(before.ids).toEqual([apc.id]);expect(before.point).toEqual({x:30,z:20});
 w.infrastructureDamage.set("house",1);const enemy=w.spawn("inf",1,30,20);enemy.garrisonId="house";
 const hidden=tutorialGuide(w,step("garrison","inf"));expect(hidden.point).toEqual(before.point);expect(hidden.ids).toEqual(before.ids);
});

it("resumes a paused foundation and explains the actual placement mouse button",()=>{
 const w=new World(71,false,[],[],[],false);w.spawn("hq",0,0,0);w.spawn("landCommand",0,20,0);const engineer=w.spawn("engineer",0,0,20);
 expect(tutorialGuide(w,step("build")).hint).toContain("vasakklõps");
 const foundation=w.spawn("factory",0,30,30);foundation.underConstruction=true;
 const paused=tutorialGuide(w,step("produce","tank"));expect(paused.ids).toEqual([engineer.id]);expect(paused.point).toEqual({x:30,z:30});expect(paused.hint).toContain("Ehitus seisab");
 engineer.target=foundation;engineer.mode="build";expect(tutorialGuide(w,step("build")).hint).toContain("Oota");
 w.spawn("barracks",0,50,50);engineer.dead=true;expect(tutorialGuide(w,step("build")).highlight).toBe('[data-kind="engineer"]');
});

it("combat guidance selects armor with recon and reveals only a spotted target location",()=>{
 const w=new World(71,false,[],[],[],false),tank=w.spawn("tank",0,0,0),other=w.spawn("tank",0,10,0),recon=w.spawn("reconInf",0,-10,0);
 const depot=w.spawn("supply",1,120,80),objective={...step("destroy"),target:{kind:"supply" as const,team:1 as const,count:1}};
 const hidden=tutorialGuide(w,objective);expect(hidden.ids).toEqual([tank.id,other.id,recon.id]);expect(hidden.point).toEqual({x:w.bases[1].x,z:w.bases[1].z});
 w.isSpottedByTeam=()=>true;const seen=tutorialGuide(w,objective);expect(seen.point).toEqual({x:depot.x,z:depot.z});expect(seen.hint).toContain("laskeulatuses");
});
