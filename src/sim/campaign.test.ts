import { afterEach, describe, expect, it, vi } from "vitest";
import { MISSIONS } from "../data/missions";
import { CAMPAIGN, completeCampaignMission, loadCampaign, nextCampaignMission } from "./campaign";

function storage() {
  const values=new Map<string,string>();
  const local={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  vi.stubGlobal("localStorage",local);return local;
}
function mission(id:string) {
  const found=MISSIONS.find(m=>m.id===id);if(!found)throw new Error("Missing campaign fixture");return found;
}
afterEach(()=>vi.unstubAllGlobals());

describe("campaign finish and continuation",()=>{
  it("awards a completed operation once and follows the actual unlocked successor",()=>{
    storage();const tutorial=mission("tutorial-logistics");
    const first=completeCampaignMission(tutorial),again=completeCampaignMission(tutorial);
    expect(first.commandXP).toBe(100);expect(again).toEqual(first);
    expect(nextCampaignMission(tutorial.id,again)?.missionId).toBe("operation-sandglass");
    const second=completeCampaignMission(mission("operation-sandglass"));
    expect(second.commandXP).toBe(250);
    expect(nextCampaignMission(tutorial.id,second)?.missionId).toBe("operation-high-ground");
    const finished={...second,completed:CAMPAIGN.map(n=>n.id)};
    expect(nextCampaignMission("operation-tidebreaker",finished)).toBeUndefined();
    expect(nextCampaignMission("roheorg",finished)).toBeUndefined();
  });
  it("does not unlock the campaign by winning a locked operation or a skirmish map",()=>{
    storage();const state=completeCampaignMission(mission("operation-high-ground"));
    expect(state.completed).toEqual([]);expect(state.commandXP).toBe(0);
    expect(nextCampaignMission("operation-high-ground",state)).toBeUndefined();
  });
  it("normalizes malformed progress instead of blocking menu or result actions",()=>{
    const local=storage();local.setItem("rogue-front.campaign.v2",JSON.stringify({completed:["tutorial","tutorial",42,"unknown"],commandXP:-10,doctrines:{bad:true},difficulty:"hard"}));
    expect(loadCampaign()).toEqual({completed:["tutorial"],commandXP:0,doctrines:[],difficulty:"hard"});
    local.setItem("rogue-front.campaign.v2",JSON.stringify({completed:"tutorial",commandXP:"100",doctrines:["engineering","unknown"]}));
    expect(loadCampaign()).toEqual({completed:[],commandXP:0,doctrines:["engineering"],difficulty:"normal"});
  });
  it("keeps prior progress on quota failure and can retry completion afterwards",()=>{
    const local=storage(),set=local.setItem;
    local.setItem=()=>{throw new Error("QuotaExceeded");};
    expect(()=>completeCampaignMission(mission("tutorial-logistics"))).toThrow("QuotaExceeded");
    expect(loadCampaign().completed).toEqual([]);
    local.setItem=set;
    expect(completeCampaignMission(mission("tutorial-logistics")).commandXP).toBe(100);
    expect(completeCampaignMission(mission("tutorial-logistics")).commandXP).toBe(100);
  });
});
