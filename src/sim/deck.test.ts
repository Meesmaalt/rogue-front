import {afterEach,expect,it,vi} from "vitest";
import {DEFAULT_RULES,defaultDeck,deckActivationTotal,loadAllDecks,validateDeck} from "./deck";
import {FACTION_LIST} from "./factions";
afterEach(()=>vi.unstubAllGlobals());
it("each faction starts with a legal combined-arms deck including engineer, recon and transport",()=>{
 for(const faction of FACTION_LIST){
  const deck=defaultDeck(faction);
  expect(validateDeck(deck)).toEqual([]);expect(deckActivationTotal(deck)).toBeLessThanOrEqual(DEFAULT_RULES.maxActivation);
  for(const kind of ["engineer","reconInf","tank","apc","spaa","artillery","transport"])expect(deck.slots.some(s=>s.kind===kind),`${faction} ${kind}`).toBe(true);
 }
});
it("malformed stored decks recover per faction without replacing an editable over-budget deck",()=>{
 const deck=defaultDeck("usa");deck.slots.find(s=>s.kind==="inf")!.count=30;
 vi.stubGlobal("localStorage",{getItem:()=>JSON.stringify({usa:deck,russia:{faction:"russia",slots:[{kind:"tank",count:-2}]},china:{faction:"china",slots:"broken"}})});
 const loaded=loadAllDecks();expect(loaded.usa.slots).toEqual(deck.slots);expect(validateDeck(loaded.usa).length).toBeGreaterThan(0);
 expect(validateDeck(loaded.russia)).toEqual([]);expect(validateDeck(loaded.china)).toEqual([]);
});
it("empty, duplicate and invalid quantities cannot pass launch validation",()=>{
 const deck=defaultDeck("usa");
 expect(validateDeck({...deck,slots:[]})).toContain("Vali vähemalt üks üksus");
 expect(validateDeck({...deck,slots:[{kind:"tank",count:1},{kind:"tank",count:1}]})).toContain("Sama üksuse korduv kaart");
 for(const count of [-1,0,1.5,NaN])expect(validateDeck({...deck,slots:[{kind:"tank",count}]}).length).toBeGreaterThan(0);
});
