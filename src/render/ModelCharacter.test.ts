import {expect,it} from 'vitest';
import * as THREE from 'three';
import {applyModelCharacter} from './ModelCharacter';
it('wear changes cached armour geometry without repainting glass, markings, pivots or source geometry',()=>{
 const source=new THREE.BoxGeometry(3,2,5),paint=new THREE.MeshStandardMaterial({color:0x68755a,vertexColors:true});paint.name='armor';
 const glass=new THREE.MeshStandardMaterial({color:0x264553}),g=new THREE.Group(),armor=new THREE.Mesh(source,paint),cockpit=new THREE.Mesh(source,glass),turret=new THREE.Group();turret.name='Turret';turret.position.y=2;g.add(armor,cockpit,turret);
 const before=new THREE.Box3().setFromObject(g);applyModelCharacter(g,'tank','usa');const after=new THREE.Box3().setFromObject(g);
 expect(armor.geometry).not.toBe(source);expect(cockpit.geometry).toBe(source);expect(armor.material).toBe(paint);expect(source.getAttribute('color')).toBeUndefined();expect(after.min.distanceTo(before.min)+after.max.distanceTo(before.max)).toBe(0);
 expect(g.getObjectByName('Turret')).toBe(turret);expect(turret.position.y).toBe(2);expect([...armor.geometry.getAttribute('color').array].every(Number.isFinite)).toBe(true);const baked=armor.geometry;applyModelCharacter(g,'tank','usa');expect(armor.geometry).toBe(baked);
});
