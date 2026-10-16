import {expect,it} from 'vitest';
import {CORE_PLATFORMS,canonicalPlatform} from './platforms';
import {FACTION_LIST,factionLandUnits,factionAirUnits,factionSeaUnits} from './factions';
import {CURATED_MAPS,getPlayableMap} from './proceduralMap';
it('all nations use the same distinct air roles and radar/passive air defence and no hand-authored maps are playable',()=>{
 expect(CORE_PLATFORMS.size).toBe(31);for(const f of FACTION_LIST)for(const k of [...factionLandUnits(f),...factionAirUnits(f),...factionSeaUnits(f)])expect(CORE_PLATFORMS.has(k)).toBe(true);
 expect(canonicalPlatform('manpad')).toBe('manpad');expect(canonicalPlatform('mortar')).toBe('mortar');expect(canonicalPlatform('interceptor')).toBe('interceptor');expect(canonicalPlatform('atgm')).toBe('atgm');expect(CURATED_MAPS).toEqual([]);
 for(const id of ['roheorg','operation-tidebreaker','tutorial-logistics','operation-sandglass'])expect(getPlayableMap(id)).toBeUndefined();
});
