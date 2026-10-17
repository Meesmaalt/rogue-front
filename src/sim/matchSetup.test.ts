import {afterEach,expect,it} from 'vitest';
import {World} from './World';
import {participantTeams,type MatchParticipant} from './matchSetup';
import {createSkirmish} from './scenario';
import {worldHash} from './Replay';
import {saveWorld,loadWorld} from './SaveState';
import {resetHeightmap,setBases,setMapSize} from './heightmap';
import {nearestEnemy} from './systems/units';
import {weaponFireBlocker} from './systems/combat';
const bases=[{x:-100,z:100,r:40},{x:100,z:-100,r:40},{x:-100,z:-100,r:40},{x:100,z:100,r:40}];
function setup(local=0,teams=true,bots=false){
 setMapSize(512);setBases(bases);
 const w=new World(438,true,[],[],bases,false);
 const p:MatchParticipant[]=participantTeams(4).map((t)=>({faction:t===2?'china':t%2?'russia':'usa',deck:null,alliance:teams?t%2:t,bot:bots&&t!==0}));
 w.setNetworkMode(local as 0|1|2|3);w.configureParticipants(p);createSkirmish(w);return w;
}
afterEach(()=>resetHeightmap());
it('four independent owners have separate bases and cannot command allies',()=>{
 const w=setup();expect(w.hq.map(e=>e?.team)).toEqual([0,1,2,3]);expect(w.teamCredits).toHaveLength(4);
 const own=w.spawn('tank',0,-30,0),ally=w.spawn('tank',2,-20,0);
 w.issue({type:'move',ids:[own.id,ally.id],team:0,x:20,z:20});w.tick(1/30);
 expect(own.dest).not.toBeNull();expect(ally.dest).toBeNull();
});
it('2v2 allies share fog and detections and cannot target each other',()=>{
 const w=setup(),own=w.spawn('tank',0,0,0),ally=w.spawn('tank',2,3,0),enemy=w.spawn('tank',3,8,0);
 w.spatial.rebuild(w.entities);w.vision.update(w.entities);enemy.spottedUntil[0]=10;
 expect(w.vision.isVisible(0,ally.x,ally.z)).toBe(true);
 expect(w.isSpottedByTeam(enemy,2)).toBe(true);
 expect(nearestEnemy(w,own,30)?.id).toBe(enemy.id);
 expect(weaponFireBlocker(w,own,ally,0)).toBe('Sihtmärk pole rünnatav');
});
it('a destroyed ally HQ does not end 2v2; surviving alliance wins on every peer',()=>{
 const a=setup(0),b=setup(3);
 for(const w of [a,b]){w.hq[0]!.dead=true;w.tick(1/30);expect(w.status).toBe('running');w.hq[1]!.dead=true;w.tick(1/30);expect(w.status).toBe('running');w.hq[3]!.dead=true;w.tick(1/30);}
 expect(a.status).toBe('won');expect(b.status).toBe('lost');expect(worldHash(a)).toBe(worldHash(b));
});
it('FFA continues until only one owner remains',()=>{
 const w=setup(2,false);w.hq[0]!.dead=true;w.hq[1]!.dead=true;w.tick(1/30);expect(w.status).toBe('running');
 w.hq[3]!.dead=true;w.tick(1/30);expect(w.status).toBe('won');expect(w.winningAlliance).toBe(2);
});
it('AI allies and opponents advance deterministically across local perspectives and restore',()=>{
 const a=setup(0,true,true),b=setup(3,true,true);
 for(let i=0;i<900;i++){a.tick(1/30);b.tick(1/30);}
 expect(a.botControllers.map(ai=>ai.team)).toEqual([1,2,3]);expect(a.entities.some(e=>e.team===2&&e.kind==='generator')).toBe(true);
 expect(worldHash(a)).toBe(worldHash(b));
 const c=setup(0,true,true);loadWorld(c,saveWorld(a));expect(worldHash(c)).toBe(worldHash(a));
 for(let i=0;i<30;i++){a.tick(1/30);c.tick(1/30);}expect(worldHash(c)).toBe(worldHash(a));
});

it('all four perspectives agree while different factions fight and recover morale',()=>{
 const a=setup(0),b=setup(3);
 for(const w of [a,b])for(const team of w.teams){const e=w.spawn('tank',team,(team%2)*12,Math.floor(team/2)*12);e.spottedUntil=w.teams.map(()=>100);e.morale=70;}
 for(let i=0;i<300;i++){a.tick(1/30);b.tick(1/30);}expect(worldHash(a)).toBe(worldHash(b));
});

it('AI objectives recognize allied resource ownership and keep enemy objectives available',()=>{
 const w=setup();w.resourcePoints[0].controlledBy=2;const sector=w.operationalMap.sectors.find(s=>s.id==='resource-0')!;
 expect(w.operationalMap.objectiveSecured(0,sector)).toBe(true);expect(w.operationalMap.objectiveSecured(1,sector)).toBe(false);
});
