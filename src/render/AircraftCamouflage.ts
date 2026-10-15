import * as THREE from 'three';
import config from '../data/visual-materials.json';
const variants=new WeakMap<THREE.Texture,Map<string,THREE.Texture>>();
/** Macro patches survive tactical zoom. One texture variant per faction, shared by
 * both LODs and every aircraft; never mutate the tank/infantry camouflage texture. */
export function aircraftCamouflage(source:THREE.Texture,kind:"cargoPlane"|"bomber"="cargoPlane"):THREE.Texture {
 let family=variants.get(source);if(!family){family=new Map();variants.set(source,family);}
 let texture=family.get(kind);const settings=kind==="bomber"?config.bomberCamouflage:config.cargoCamouflage;
 if(!texture){texture=source.clone();texture.repeat.setScalar(settings.repeat);texture.anisotropy=settings.anisotropy;texture.needsUpdate=true;family.set(kind,texture);}
 return texture;
}
