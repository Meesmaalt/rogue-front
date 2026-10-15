import type {World} from "../sim/World";
import type {Entity,MissionObjectiveDef,Point,UnitKind} from "../sim/types";
import {isGarrisonBuilding,buildingCondition,garrisonCapacity} from "../sim/garrison";
import {productionStatus} from "../sim/systems/production";

export interface TutorialGuide {
  ids:number[];point:Point|null;panel:"builds"|"land"|null;highlight:string|null;hint:string;
}
/** Reads actual game state; guide buttons select/open UI and never finish objectives. */
export function tutorialGuide(world:World,step:MissionObjectiveDef):TutorialGuide {
  const units=world.entities.filter(e=>!e.dead&&e.team===world.playerTeam),ready=(kind:UnitKind)=>units.find(e=>e.kind===kind&&!e.underConstruction&&e.loadedIntoId==null);
  const engineer=ready("engineer"),barracks=ready("barracks"),home=world.bases[world.playerTeam];
  let candidate:Entity|undefined,point=step.point??null,panel:TutorialGuide["panel"]=null,highlight:string|null=null,hint="Parem hiir annab käsu; vasak hiir valib. Shift lisab vahepunkti.";
  const ids:number[]=[];
  if(step.kind==="build"){
    const kind=step.target?.kind;
    const constructing=units.find(e=>e.kind===kind&&e.underConstruction);
    if(constructing){
      const assigned=units.some(e=>e.kind==="engineer"&&e.loadedIntoId==null&&e.target===constructing&&(e.mode==="build"||e.mode==="repair"));
      if(assigned||constructing.upgrading)return {ids:[constructing.id],point:null,panel:null,highlight:null,hint:"Hoone on ehitamisel. Oota inseneri töö lõppu; ära telli sama rajatist uuesti."};
      if(!engineer){const producer=barracks??ready("hq");return {ids:producer?[producer.id]:[],point:null,panel:barracks?"land":"builds",highlight:barracks?'[data-kind="engineer"]':null,hint:barracks?"Ehitus seisab: vali kasarm, telli insener ja paremklõpsa temaga vundamendile.":"Insener ja valmis kasarm puuduvad. Üksuse tellimine vajab kasarmut; kaitse algset ehitajat."};}
      return {ids:[engineer.id],point:{x:constructing.x,z:constructing.z},panel:null,highlight:null,hint:"Ehitus seisab: vali insener ja paremklõpsa vundamendile, et tööd jätkata."};
    }
    const branch:UnitKind=["factory","barracks","landStrategy","combatEngineer"].includes(kind??"")?"landCommand":["helipad","airbase","airStrategy"].includes(kind??"")?"airCommand":kind==="shipyard"||kind==="seaStrategy"?"seaCommand":"hq";
    candidate=ready(branch);panel="builds";highlight=kind?`[data-build="${kind}"]`:null;
    if(engineer)ids.push(engineer.id);
    hint=!engineer?"Insener puudub: vali kasarm ja telli uus insener.":!candidate?"Vajalik juhtimiskeskus puudub või pole valmis. Taasta see enne järgmise hoone ehitamist.":"Vali haru ja insener → Ava ehitus → esiletõstetud hoone → vasakklõps vabale platsile. R pöörab hoonet; Esc tühistab.";
    candidate??=ready("hq");
    if(!engineer){candidate=barracks??ready("hq");panel=barracks?"land":"builds";highlight=barracks?'[data-kind="engineer"]':null;if(!barracks)hint="Insener ja valmis kasarm puuduvad. Üksuse tellimine vajab kasarmut; kaitse algset ehitajat.";}
  }else if(step.kind==="produce"||step.kind==="upgrade"){
    const producer=step.kind==="upgrade"?step.target?.kind:step.unitKind==="tank"||step.unitKind==="apc"?"factory":"barracks";
    const constructing=units.find(e=>e.kind===producer&&e.underConstruction);
    if(constructing)return tutorialGuide(world,{...step,kind:"build",target:{kind:producer,count:1}});
    candidate=producer?ready(producer):undefined;panel="land";
    if(!candidate&&producer)return {...tutorialGuide(world,{...step,kind:"build",target:{kind:producer,count:1}}),hint:"Tootja puudub või pole valmis. Taasta see ehitusharust; oota ehituse lõppu."};
    highlight=step.kind==="produce"?`[data-kind="${step.unitKind}"]`:"[data-upgrade-producer]";
    hint=!candidate?"Tootja puudub või pole valmis. Ehita vajalik rajatis uuesti.":step.kind==="upgrade"?"Ava tootmine → Uuenda tootjat. Vajalik strateegiakeskus, energia ja raha; oota töö lõppu.":productionStatus(world,candidate)+" · Valitud hoone tootmispaneelist telli esiletõstetud üksus.";
  }else if(step.kind==="deliver"||step.kind==="capture"){
    candidate=engineer;
    const enemy=world.playerTeam===0?1:0;
    const resource=world.resourcePoints.filter(r=>r.controlledBy!==enemy).reduce<(typeof world.resourcePoints)[number]|undefined>((best,r)=>!best||Math.hypot(r.x-home.x,r.z-home.z)<Math.hypot(best.x-home.x,best.z-home.z)?r:best,undefined);
    if(resource)point={x:resource.x,z:resource.z};
    const delivered=world.roadCargoDelivered[world.playerTeam]+world.airCargoDelivered[world.playerTeam];
    hint=resource?.active?`Tarne ${Math.floor(delivered)}/${step.target?.count??100} · Rajatis töötab. Transport vajab ühendatud, töötavat ladu; raha lisandub koorma saabudes.`:"Insener + paremklõps sihtpunkti: jää hõive ja käivituse ajaks ressursiala sisse. Seejärel lase veokil koorem lattu tuua.";
  }else if(step.kind==="garrison"||step.kind==="transport"){
    const passenger=units.find(e=>e.kind===(step.unitKind??"inf")&&e.loadedIntoId!=null);
    candidate=step.kind==="garrison"&&passenger?world.byId.get(passenger.loadedIntoId!):ready(step.unitKind??"inf");
    if(step.kind==="garrison"){
      const knownOccupants=new Map<string,number>();
      for(const e of world.entities){
        if(e.dead||e.team!==world.playerTeam&&!world.isSpottedByTeam(e,world.playerTeam))continue;
        if(e.garrisonId)knownOccupants.set(e.garrisonId,(knownOccupants.get(e.garrisonId)??0)+1);
        if(e.garrisonOrderId&&e.garrisonOrderId!==e.garrisonId)knownOccupants.set(e.garrisonOrderId,(knownOccupants.get(e.garrisonOrderId)??0)+1);
      }
      const house=world.mapFeatures.filter(f=>{
        if(!isGarrisonBuilding(f))return false;
        const visible=world.vision.isVisible(world.playerTeam,f.x,f.z);
        return (!visible||buildingCondition(world,f)<1)&&(knownOccupants.get(f.id)??0)<garrisonCapacity(f);
      }).reduce<(typeof world.mapFeatures)[number]|undefined>((best,f)=>!best||Math.hypot(f.x-(candidate?.x??home.x),f.z-(candidate?.z??home.z))<Math.hypot(best.x-(candidate?.x??home.x),best.z-(candidate?.z??home.z))?f:best,undefined);
      if(house)point={x:house.x,z:house.z};
      hint=passenger?"Vali transport → U → paremklõps maja lähedal vabale maapinnale. Seejärel vali väljunud jalavägi ja paremklõpsa majale.":"Jalavägi + paremklõps tervele, vaba kohaga majale. Vaatesuund määrab laskesektori; välju U + paremklõpsuga.";
    }else{const carrier=ready("apc");if(carrier)point={x:carrier.x,z:carrier.z};hint="Vali jalavägi → paremklõps oma APC mudelile või nimesildile. Oota, kuni rühm on pardal.";}
  }else if(step.kind==="destroy"){
    const tanks=units.filter(e=>e.kind==="tank"&&e.loadedIntoId==null),recon=ready("reconInf")??ready("reconVehicle");
    candidate=tanks[0];
    if(candidate){ids.push(...tanks.slice(0,4).map(e=>e.id));if(recon)ids.push(recon.id);}
    const enemy=step.target?.team??(world.playerTeam===0?1:0);
    const visible=world.entities.find(e=>!e.dead&&e.team===enemy&&e.kind===step.target?.kind&&world.isSpottedByTeam(e,world.playerTeam));
    const base=world.bases[enemy];
    point=visible?{x:visible.x,z:visible.z}:base?{x:base.x,z:base.z}:null;
    hint=visible
      ? "Vaenlase rajatis on nähtav: paremklõps sellele annab ründekäsu. Tankid peatuvad oma laskeulatuses. Hoia luure elus ning too moon, kütus ja remont etteveetud lattu."
      : "Sihtpunkt näitab teadaolevat vastase baasi, mitte peidetud üksust. Vii luure tankide toel sillapääle; A + paremklõps ründab liikudes. Tugevda armeed ja varustust enne baasi ründamist.";
  }else candidate=ready(step.unitKind??"tank");
  if(!candidate&&!["build","deliver","capture"].includes(step.kind)){
    const kind=step.unitKind??"tank",producer:UnitKind=kind==="tank"||kind==="apc"?"factory":"barracks";
    candidate=ready(producer);panel="land";highlight=`[data-kind="${kind}"]`;hint="Vajalik üksus puudub: tooda see uuesti, seejärel jätka sama ülesannet.";
  }
  if(candidate&&!candidate.dead&&!ids.includes(candidate.id))ids.unshift(candidate.id);
  return {ids,point,panel,highlight,hint};
}
