import {it,expect,afterEach} from 'vitest';
import {World} from './World';
import {resetHeightmap,setBases} from './heightmap';
import {weaponFireBlocker,alternateAirWeapon,shotAccuracy,weaponSpec} from './systems/combat';
const bases=[{x:0,z:0,r:250},{x:280,z:280,r:20}];
function fixture(){setBases(bases);const w=new World(77,false,[],[],bases,false);w.networkMode=true;return w;}
function pair(tx:number,tz:number){
  const w=fixture(),u=w.spawn('fighter',0,0,0),t=w.spawn('fighter',1,tx,tz);
  for(const e of [u,t]){e.airState='airborne';e.y=120;}t.spottedUntil[0]=100;u.heading=0;u.turretYaw=0;
  const gun=(u.def.weapons??[]).findIndex(s=>s.weapon==='cannon');
  return {w,u,t,gun};
}
afterEach(()=>resetHeightmap());
it('fixed-wing cannon only fires along the nose, never sideways or backwards',()=>{
  const ahead=pair(0,40),side=pair(40,0),behind=pair(0,-40);
  expect(ahead.gun).toBeGreaterThanOrEqual(0);
  expect(weaponFireBlocker(ahead.w,ahead.u,ahead.t,ahead.gun)).toBeNull();
  expect(weaponFireBlocker(side.w,side.u,side.t,side.gun)).not.toBeNull();
  expect(weaponFireBlocker(behind.w,behind.u,behind.t,behind.gun)).not.toBeNull();
});
it('a jet turret yaw no longer lets the gun aim away from the nose',()=>{
  const {w,u,t,gun}=pair(40,0);u.turretYaw=Math.PI/2;
  expect(weaponFireBlocker(w,u,t,gun)).not.toBeNull();
});
it('falls back to the cannon when the missile slot cannot fire yet',()=>{
  const {w,u,t,gun}=pair(0,40);const missile=(u.def.weapons??[]).findIndex(s=>s.flight==='guided');
  expect(alternateAirWeapon(w,u,t,missile)).toBe(gun);
});
it('hard banking and a crossing target reduce gun accuracy',()=>{
  const {w,u,t,gun}=pair(0,40),spec=weaponSpec(u,gun);t.motionSpeed=0;
  const steady=shotAccuracy(w,u,t,spec);u.flightBank=1.2;
  expect(shotAccuracy(w,u,t,spec)).toBeLessThan(steady);
  u.flightBank=0;t.motionSpeed=26;t.flightVx=26;t.flightVz=0;
  expect(shotAccuracy(w,u,t,spec)).toBeLessThan(steady);
});
