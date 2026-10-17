import {afterEach,expect,it,vi} from "vitest";
import {loadSettings} from "./Settings";
afterEach(()=>vi.unstubAllGlobals());
it("uses a medium alpha default and retains explicitly selected high quality",()=>{
 vi.stubGlobal("localStorage",{getItem:()=>null});expect(loadSettings().quality).toBe("medium");
 vi.stubGlobal("localStorage",{getItem:()=>JSON.stringify({quality:"high",keys:{attackMove:"B"}})});
 expect(loadSettings().quality).toBe("high");expect(loadSettings().keys.attackMove).toBe("b");
});
it("invalid settings cannot corrupt volume, graphics or command bindings",()=>{
 vi.stubGlobal("localStorage",{getItem:()=>JSON.stringify({quality:"broken",masterVolume:-2,sfxVolume:4,keys:{pause:null,attackMove:"",hold:7}})});
 const settings=loadSettings();expect(settings.quality).toBe("medium");expect(settings.masterVolume).toBe(0);expect(settings.sfxVolume).toBe(1);expect(settings.keys.pause).toBe("escape");expect(settings.keys.attackMove).toBe("a");
 vi.stubGlobal("localStorage",{getItem:()=>{throw new Error("Blocked");}});expect(loadSettings().quality).toBe("medium");
});
it('defaults include shadows and antialiasing, and explicit toggles and resolution survive reload',()=>{
 vi.stubGlobal('localStorage',{getItem:()=>null});expect(loadSettings().shadows).toBe(true);expect(loadSettings().antialiasing).toBe(true);
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({shadows:false,antialiasing:false,ambientOcclusion:true,bloom:true,renderScale:.75})});const s=loadSettings();expect([s.shadows,s.antialiasing,s.ambientOcclusion,s.bloom,s.renderScale]).toEqual([false,false,true,true,.75]);
});
