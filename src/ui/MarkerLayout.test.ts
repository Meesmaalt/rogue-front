import {expect,it} from "vitest";
import {MarkerLayout} from "./MarkerLayout";
it("retains a displaced label row through camera movement and reserves warning space",()=>{
  const layout=new MarkerLayout();layout.begin(800,600);
  const first=layout.place(1,300,240,130,15,true)!;
  const second=layout.place(2,300,240,130,15)!;
  expect(first).not.toBeNull();expect(second).not.toBeNull();expect(second.y).not.toBe(first.y);
  layout.begin(800,600);
  layout.place(1,305,242,130,15,true);
  const moved=layout.place(2,305,242,130,15)!;
  expect(moved.y-second.y).toBe(2);expect(moved.x-second.x).toBe(5);
  expect(moved.y+moved.height+2<=242-23||moved.y>=242-23+first.height+2).toBe(true);
});
it("keeps labels outside HUD rectangles and makes compact fallbacks selectable",()=>{
  const layout=new MarkerLayout();layout.begin(300,200);
  layout.reserve({x:0,y:0,width:300,height:50});
  const below=layout.place(1,150,60,90)!;expect(below.y).toBeGreaterThanOrEqual(50);
  layout.begin(160,200);
  const compact=layout.place(2,80,110,300)!;
  expect(compact.full).toBe(false);expect(compact.width).toBe(24);
  expect(compact.x).toBeGreaterThanOrEqual(0);expect(compact.x+compact.width).toBeLessThanOrEqual(160);
});
