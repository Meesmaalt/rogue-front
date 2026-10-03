import * as THREE from "three";

export function createSky(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(650, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x8eb4c8) }, horizon: { value: new THREE.Color(0xf0e0b0) } },
    vertexShader: `varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vWorld; void main(){float h=clamp(normalize(vWorld).y*0.5+0.5,0.0,1.0);gl_FragColor=vec4(mix(horizon,top,pow(h,0.65)),1.0);}`,
  });
  return new THREE.Mesh(geo, mat);
}

export function createWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(96, 96, 48, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { time: { value: 0 }, deep: { value: new THREE.Color(0x315a64) }, shallow: { value: new THREE.Color(0x789b92) } },
    vertexShader: `uniform float time; varying vec2 vUv; void main(){vUv=uv;vec3 p=position;p.y+=sin(p.x*0.12+time*0.7)*0.16+cos(p.z*0.17+time*0.55)*0.12;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader: `uniform vec3 deep; uniform vec3 shallow; varying vec2 vUv; void main(){float w=0.5+0.5*sin(vUv.x*70.0+vUv.y*45.0);gl_FragColor=vec4(mix(deep,shallow,w),0.62);}`,
    depthWrite: false,
  });
  mat.userData.animate = (t: number) => { mat.uniforms.time.value = t; };
  const water = new THREE.Mesh(geo, mat);
  water.position.set(70, -8.5, -65);
  water.renderOrder = 1;
  return water;
}
