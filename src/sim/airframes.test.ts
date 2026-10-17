import {expect,it} from 'vitest';
import {airframeFor} from './airframes';
it('matches every fixed wing role to a faction airframe and a genuinely different silhouette',()=>{
 for(const faction of ['usa','russia','china'] as const){for(const kind of ['fighter','interceptor','multirole','attackAircraft','ecm','bomber','cargoPlane','airTransport'] as const)expect(airframeFor(faction,kind)?.length).toBeGreaterThan(5);expect(airframeFor(faction,'airTransport')).toEqual(airframeFor(faction,'cargoPlane'));}
 expect(airframeFor('usa','fighter')?.engines).toBe(1);expect(airframeFor('usa','interceptor')?.tails).toBe(2);expect(airframeFor('usa','attackAircraft')?.sweep).toBeLessThan(.1);expect(airframeFor('russia','cargoPlane')?.name).toContain('Il-76');expect(airframeFor('china','fighter')?.style).toBe('canard');expect(airframeFor('usa','heli')).toBeUndefined();
});
