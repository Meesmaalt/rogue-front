import {expect,it} from 'vitest';
import {CORE_PLATFORMS,canonicalPlatform} from './platforms';
import {FACTION_LIST,factionLandUnits,factionAirUnits,factionSeaUnits} from './factions';
import {CURATED_MAPS,getPlayableMap} from './proceduralMap';
it('all nations use the same twenty-one chassis classes and no hand-authored maps are playable',()=>{
 expect(CORE_PLATFORMS.size).toBe(21);for(const f of FACTION_LIST)for(const k of [...factionLandUnits(f),...factionAirUnits(f),...factionSeaUnits(f)])expect(CORE_PLATFORMS.has(k)).toBe(true);
 expect(canonicalPlatform('manpad')).toBe('manpad');expect(canonicalPlatform('mortar')).toBe('mortar');expect(canonicalPlatform('interceptor')).toBe('fighter');expect(canonicalPlatform('atgm')).toBe('inf');expect(CURATED_MAPS).toEqual([]);
 for(const id of ['roheorg','operation-tidebreaker','tutorial-logistics','operation-sandglass'])expect(getPlayableMap(id)).toBeUndefined();
});
