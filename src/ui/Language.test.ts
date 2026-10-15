import {expect,it} from 'vitest';
import {englishText} from './Language';
it('translates full phrases first, keeps uppercase labels and dynamic counts',()=>{
 expect(englishText('ALUSTA LAHINGUT')).toBe('START BATTLE');
 expect(englishText('KAART VALMIS · 4096 m')).toBe('MAP READY · 4096 m');
 expect(englishText('Mobiilne raketiõhutõrje')).toBe('Mobile SAM launcher');
 expect(englishText('M1A2 · 15/30 · seed 42')).toBe('M1A2 · 15/30 · seed 42');
 expect(englishText('Metsapiirkond')).toBe('Woodland');
});
