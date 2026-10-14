import data from '../data/platforms.json';
import type {UnitKind} from './types';
export const CORE_PLATFORMS=new Set<UnitKind>([...data.land,...data.air,...data.sea] as UnitKind[]);
export function canonicalPlatform(kind:UnitKind):UnitKind {return (data.aliases as Partial<Record<UnitKind,UnitKind>>)[kind]??kind;}
