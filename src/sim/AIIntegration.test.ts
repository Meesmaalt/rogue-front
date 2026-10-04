import {it,expect} from "vitest";
import {World} from "./World";
import {createSkirmish} from "./scenario";
import {SIM_STEP} from "./constants";
it("AI completes the real base/economy/production chain without injected money",()=>{
 const w=new World(17);createSkirmish(w);w.ai.setProfile("economic","normal");
 for(let i=0;i<360/SIM_STEP&&w.status==="running";i++){w.tick(SIM_STEP);w.drainEvents();}

 expect(w.resourcePoints.some(r=>r.controlledBy===1&&r.active)).toBe(true);
 expect(w.hasBuilding(1,"factory")).toBe(true);
 expect(w.roadCargoDelivered[1]).toBeGreaterThan(0);
 expect(w.producedCounts.tank || w.entities.some(e=>e.team===1&&e.kind==="tank")).toBe(true);
},30000);
