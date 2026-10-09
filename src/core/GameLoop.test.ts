import { afterEach, expect, it, vi } from "vitest";
import { GameLoop, type FrameMetrics } from "./GameLoop";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene } from "three";
import { freezeTerrainTransforms } from "../render/Terrain";

afterEach(() => vi.unstubAllGlobals());
const surface = () => vi.stubGlobal("document", { hidden: false });
it("repays a long active frame in bounded fixed steps without losing simulation time", () => {
  surface(); let simulated = 0; const alphas: number[] = [], metrics: FrameMetrics[] = [];
  const loop = new GameLoop(1/30, dt => { simulated += dt; }, alpha => alphas.push(alpha), m => metrics.push(m), () => true);
  loop.advance(400); expect(simulated).toBeCloseTo(.1); expect(metrics[0].debtMs).toBeGreaterThan(250);
  for (let now=416;now<=704;now+=16) loop.advance(now);
  expect(simulated).toBeCloseTo(.7); expect(alphas.every(a=>a>=0&&a<=1)).toBe(true);
  expect(metrics.every(m=>m.steps<=3)).toBe(true); expect(metrics.at(-1)!.debtMs).toBe(0);
});
it("excludes hidden-tab time explicitly and does not report waiting updates as simulation steps", () => {
  const doc={hidden:false};vi.stubGlobal("document",doc);const update=vi.fn(()=>false),metrics:FrameMetrics[]=[];
  const loop=new GameLoop(1/30,update,()=>{},m=>metrics.push(m),()=>true);
  loop.advance(40); expect(metrics[0].steps).toBe(0);
  doc.hidden=true;loop.advance(1000);loop.advance(3000);doc.hidden=false;loop.advance(5000);
  expect(metrics.at(-1)!.suspendedMs).toBeCloseTo(4960);expect(metrics.at(-1)!.debtMs).toBe(0);
  expect(update).toHaveBeenCalledTimes(1);
});
it("retains static terrain matrices while explicitly changed houses still update descendants", () => {
  const scene=new Scene(),terrain=new Group(),house=new Group(),wall=new Mesh(new BoxGeometry(),new MeshBasicMaterial());
  scene.updateMatrix();scene.matrixAutoUpdate=false;house.position.set(3,2,4);wall.position.y=2;house.add(wall);terrain.add(house);scene.add(terrain);
  freezeTerrainTransforms(terrain);scene.updateMatrixWorld();const before=wall.matrixWorld.clone();
  const compose=vi.spyOn(wall,"updateMatrix"),multiply=vi.spyOn(wall.matrixWorld,"multiplyMatrices");
  for(let i=0;i<60;i++)scene.updateMatrixWorld();expect(compose).not.toHaveBeenCalled();expect(multiply).not.toHaveBeenCalled();
  house.scale.y=.2;house.updateMatrix();scene.updateMatrixWorld();expect(wall.matrixWorld.equals(before)).toBe(false);expect(wall.matrixWorld.elements[13]).toBeCloseTo(2.4);
  wall.geometry.dispose();(wall.material as MeshBasicMaterial).dispose();
});
