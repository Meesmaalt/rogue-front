import {expect,it} from "vitest";
import {tacticalClass} from "./TacticalClass";
it("distinguishes tactical roles rather than grouping all infantry or vehicles together",()=>{
  expect(tacticalClass("inf")).toBe("infantry");
  expect(tacticalClass("atInf")).toBe("antiTank");
  expect(tacticalClass("manpad")).toBe("airDefense");
  expect(tacticalClass("reconVehicle")).toBe("recon");
  expect(tacticalClass("tank")).toBe("armor");
  expect(tacticalClass("logiTruck")).toBe("logistics");
  expect(tacticalClass("casHeli")).toBe("helicopter");
});
