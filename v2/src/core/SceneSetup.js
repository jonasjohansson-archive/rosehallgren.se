import * as THREE from 'three';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xf5f3f0, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  );
  camera.position.set(0, 1.7, 0);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f3f0);
  scene.fog = new THREE.Fog(0xf5f3f0, 40, 120);

  // Warm ambient
  const ambient = new THREE.AmbientLight(0xfff8f0, 0.6);
  scene.add(ambient);

  // Hemisphere — sky/ground
  const hemi = new THREE.HemisphereLight(0xeef4ff, 0xe8e0d8, 0.4);
  scene.add(hemi);

  // Directional sun with shadows
  const sun = new THREE.DirectionalLight(0xfff4e8, 1.2);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.001;
  sun.shadow.radius = 3;
  scene.add(sun);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, sun };
}
