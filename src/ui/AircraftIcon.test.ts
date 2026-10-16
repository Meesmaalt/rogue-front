import {expect,it} from 'vitest';
import {aircraftIcon} from './AircraftIcon';
it('aircraft portraits distinguish roles, nations and the Chinook instead of reusing old mismatched pictures',()=>{
 const kinds=['fighter','interceptor','bomber','ecm','multirole','attackAircraft','transport','airTransport'] as const;
 const icons=kinds.map(k=>aircraftIcon(k,'usa'));expect(new Set(icons).size).toBe(kinds.length);expect(icons.every(s=>s?.includes('<svg'))).toBe(true);expect(aircraftIcon('transport','usa')).toContain('Chinook');expect(aircraftIcon('fighter','russia')).not.toBe(aircraftIcon('fighter','usa'));expect(aircraftIcon('tank','usa')).toBeNull();
});
