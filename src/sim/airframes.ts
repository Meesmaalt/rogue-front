import data from '../data/airframes.json';
import type {FactionId} from './factions';
import type {UnitKind} from './types';
export type Airframe = typeof data.usa.fighter;
export function airframeFor(faction:FactionId,kind:UnitKind):Airframe|undefined {
 const fleet=data[faction] as Partial<Record<UnitKind,Airframe>>;return fleet[kind==='airTransport'?'cargoPlane':kind];
}
