import {expect,it} from 'vitest';
import {aircraftIcon} from './AircraftIcon';
it('aircraft portraits distinguish roles, nations and the Chinook instead of reusing old mismatched pictures',()=>{
 const kinds=['fighter','interceptor','bomber','ecm','multirole','attackAircraft','transport','airTransport'] as const;
 const icons=kinds.map(k=>aircraftIcon(k,'usa'));expect(new Set(icons).size).toBe(kinds.length);expect(icons.every(s=>s?.includes('<svg'))).toBe(true);expect(aircraftIcon('transport','usa')).toContain('Chinook');expect(aircraftIcon('fighter','russia')).not.toBe(aircraftIcon('fighter','usa'));expect(aircraftIcon('tank','usa')).toBeNull();
});

it('purchase cards show named, separately drawn real aircraft planforms instead of mesh screenshots',()=>{
 const types={fighter:'F-16C',interceptor:'F-22',multirole:'F-35A',bomber:'B-1B',ecm:'EA-18G',attackAircraft:'A-10C',cargoPlane:'C-17'} as const;
 for(const [kind,label] of Object.entries(types)){const card=aircraftIcon(kind as import('../sim/types').UnitKind,'usa',true)!;expect(card).toContain(label);expect(card).toContain('viewBox="0 0 160 112"');expect(card).not.toContain('.webp');}
});
