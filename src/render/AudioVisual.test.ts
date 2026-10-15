import {expect,it} from 'vitest';
import {alertDirection,shakeAmount,toneFor} from './AudioVisual';
it('alert direction follows the camera yaw convention',()=>{
 const ahead=alertDirection(0,-10,0),right=alertDirection(10,0,0);
 expect(ahead.up).toBeGreaterThan(0);expect(Math.abs(ahead.right)).toBeLessThan(1e-9);expect(right.right).toBeGreaterThan(0);expect(Math.abs(right.up)).toBeLessThan(1e-9);
 const turned=alertDirection(0,-10,Math.PI/2);expect(Math.abs(turned.up)).toBeLessThan(1e-9);
});
it('shake ignores faint sounds and is capped; tones map to alert kinds only',()=>{
 expect(shakeAmount(.05)).toBe(0);expect(shakeAmount(.5)).toBeGreaterThan(0);expect(shakeAmount(5)).toBeLessThanOrEqual(.9);
 expect(toneFor('siren')).toBe('danger');expect(toneFor('capture')).toBe('good');expect(toneFor('lost')).toBe('warn');expect(toneFor('ready')).toBeNull();
});
