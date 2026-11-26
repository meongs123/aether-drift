// starfield.js — one job: the sky. Two parallax star layers + a Milky-Way band
// of faint clustered stars + the sun glare sprite. No black wallpaper: the
// stars carry depth, the band carries colour.
import * as THREE from '../vendor/three.module.min.js';
import { SUN_DIR } from './config.js';
import { makeGlowTexture } from './textures.js';
import { range } from './random.js';

export function createStarfield(scene, rng) {
  const group = new THREE.Group();
  group.name = 'starfield';

  const makeLayer = (count, size, brightness, radiusMin, radiusMax) => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform on a shell so the field surrounds the pilot in every direction.
      const u = rng() * 2 - 1, ph = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = range(rng, radiusMin, radiusMax);
      pos[i * 3] = r * s * Math.cos(ph);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(ph);
      const b = brightness * (0.5 + rng() * 0.5);
      const warm = rng();
      col[i * 3] = b * (warm > 0.7 ? 1.0 : 0.85);
      col[i * 3 + 1] = b * 0.9;
      col[i * 3 + 2] = b * (warm < 0.3 ? 1.0 : 0.92);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size, vertexColors: true, sizeAttenuation: false,
      transparent: true, opacity: 0.95, depthWrite: false, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.name = 'stars';
    group.add(pts);
  };

  makeLayer(2600, 1.6, 0.95, 3800, 5200); // far dim field
  makeLayer(700, 2.6, 1.0, 3200, 4800);   // near bright stars

  // Milky-Way band: faint clustered stars along a tilted great circle.
  const bandCount = 5200;
  const pos = new Float32Array(bandCount * 3);
  const col = new Float32Array(bandCount * 3);
  for (let i = 0; i < bandCount; i++) {
    const along = rng() * Math.PI * 2;
    const across = (rng() + rng() + rng() - 1.5) * 0.16; // gaussian-ish spread
    const r = range(rng, 4200, 5000);
    // Band plane tilted ~62 deg, passing near the sun direction.
    const x = Math.cos(along) * r;
    const y = Math.sin(along) * Math.cos(1.08) * r + Math.sin(across) * r * 0.35;
    const z = Math.sin(along) * Math.sin(1.08) * r + Math.cos(across) * r * 0.1;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const b = 0.16 + rng() * 0.5;
    col[i * 3] = b * 0.9; col[i * 3 + 1] = b * 0.88; col[i * 3 + 2] = b * 1.0;
  }
  const bandGeo = new THREE.BufferGeometry();
  bandGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  bandGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const band = new THREE.Points(bandGeo, new THREE.PointsMaterial({
    size: 1.4, vertexColors: true, sizeAttenuation: false,
    transparent: true, opacity: 0.85, depthWrite: false, fog: false,
  }));
  band.name = 'milkyWayBand';
  group.add(band);

  // Sun glare: bright core + wide halo, placed far along SUN_DIR so the rim
  // light on ship, planet and asteroids all agree with it.
  const glowTex = makeGlowTexture(THREE, 'rgba(255,250,230,1)', 'rgba(255,220,150,0.55)');
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, opacity: 0.95,
  }));
  sunSprite.position.copy(SUN_DIR).multiplyScalar(4600);
  sunSprite.scale.set(1500, 1500, 1);
  sunSprite.name = 'sunGlare';
  group.add(sunSprite);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, opacity: 1,
  }));
  sunCore.position.copy(SUN_DIR).multiplyScalar(4600);
  sunCore.scale.set(420, 420, 1);
  sunCore.name = 'sunCore';
  group.add(sunCore);

  scene.add(group);
  return group;
}
