import {afterEach,expect,it} from "vitest";
import {World} from "../sim/World";
import {resetHeightmap} from "../sim/heightmap";
import {tutorialGuide} from "./TutorialGuide";
import type {MissionObjectiveDef} from "../sim/types";
afterEach(resetHeightmap);
const step=(kind:MissionObjectiveDef["kind"],unitKind?:MissionObjectiveDef["unitKind"]):MissionObjectiveDef=>({id:"training",title:"Test",description:"Test",kind,unitKind,target:{kind:"factory",count:1}});
it("selects the actual build branch with an engineer and recovers missing engineers",()=>{
 const w=new World(71,false,[],[],[],false),hq=w.spawn("hq",0,0,0),command=w.spawn("landCommand",0,10,0),engineer=w.spawn("engineer",0,0,10);
 const pending=w.pending.length,guide=tutorialGuide(w,step("build"));
 expect(guide.ids).toEqual([command.id,engineer.id]);expect(guide.panel).toBe("builds");expect(guide.highlight).toBe('[data-build="factory"]');expect(w.pending).toHaveLength(pending);
 engineer.dead=true;const recovery=tutorialGuide(w,step("build"));expect(recovery.ids).toEqual([hq.id]);expect(recovery.panel).toBe("land");expect(recovery.highlight).toBe('[data-kind="engineer"]');
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
