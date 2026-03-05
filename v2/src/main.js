import * as THREE from 'three';
import { Pane } from 'tweakpane';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createScene } from './core/SceneSetup.js';
import { Loop } from './core/Loop.js';
import { createStreet } from './world/Street.js';
import { createSiteDetails } from './world/SiteDetails.js';
import { getLotPositions, getStreetLength } from './world/StreetLayout.js';
import { generateHouse } from './house/HouseGenerator.js';
import { CameraController } from './camera/CameraController.js';
import { InputController } from './interaction/InputController.js';
import { HouseLabels } from './ui/HouseLabel.js';
import { NavigationHint } from './ui/NavigationHint.js';
import { projects } from './projects.js';

// --- Init ---
const container = document.getElementById('canvas-container');
const labelContainer = document.getElementById('label-container');
const loadingEl = document.getElementById('loading');
const crosshair = document.getElementById('crosshair');

const { renderer, scene, camera, sun } = createScene(container);
const loop = new Loop();

// --- Post-processing ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 0.5;
ssaoPass.minDistance = 0.001;
ssaoPass.maxDistance = 0.1;
ssaoPass.intensity = 1.0;
composer.addPass(ssaoPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- Street ---
const streetLength = getStreetLength(projects.length);
const street = createStreet(streetLength);
scene.add(street);

// --- Lots & houses ---
const lots = getLotPositions(projects.length);
const houseGroups = [];
for (let i = 0; i < projects.length; i++) {
  const project = projects[i];
  const lot = lots[i];
  const house = generateHouse(project.house, project.images);

  house.position.set(lot.x, 0, lot.z);
  house.rotation.y = lot.rotationY;
  house.userData.projectIndex = i;

  scene.add(house);
  houseGroups.push(house);
}

// --- Site details (walkways, lot lines, scale figures) ---
const siteDetails = createSiteDetails(lots, projects);
scene.add(siteDetails);

// --- Camera ---
const cameraController = new CameraController(camera);

// --- Input ---
const inputController = new InputController(renderer.domElement);
inputController.setupTouchControls();
inputController.enable();

// --- Labels ---
const houseLabels = new HouseLabels(labelContainer);
for (let i = 0; i < projects.length; i++) {
  const project = projects[i];
  const house = houseGroups[i];
  const totalHeight = project.house.floors * project.house.floorHeight;
  houseLabels.addLabel(project.title, house, totalHeight);
}

// --- Navigation hint ---
const navHint = new NavigationHint();
navHint.el.textContent = 'WASD to move \u00B7 Click to look \u00B7 T top view \u00B7 V wireframe \u00B7 I invert';

// --- Settings ---
const params = {
  inverted: false,
  wireframe: false,
  fogNear: 40,
  fogFar: 120,
  fogEnabled: true,
  exposure: 1.1,
  edgeOpacity: 0.6,
  shadowsEnabled: true,
  sunIntensity: 1.2,
  ssaoEnabled: true,
  ssaoIntensity: 1.0,
  ssaoRadius: 0.5,
};

const lightBg = new THREE.Color(0xf5f3f0);
const darkBg = new THREE.Color(0x1a1a1a);
const _origColors = new Map();

function applyInvert(inverted) {
  params.inverted = inverted;
  const bg = inverted ? darkBg : lightBg;

  scene.background.copy(bg);
  if (scene.fog) scene.fog.color.copy(bg);
  renderer.setClearColor(bg, 1);

  // Crosshair
  crosshair.style.background = inverted ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

  scene.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.color) {
      const mat = obj.material;
      if (mat.map) return;
      if (!_origColors.has(mat)) {
        _origColors.set(mat, mat.color.clone());
      }
      const orig = _origColors.get(mat);
      mat.color.setRGB(
        inverted ? 1 - orig.r : orig.r,
        inverted ? 1 - orig.g : orig.g,
        inverted ? 1 - orig.b : orig.b,
      );
    }
    if (obj.isLineSegments || obj.isLine) {
      const mat = obj.material;
      if (!_origColors.has(mat)) {
        _origColors.set(mat, mat.color.clone());
      }
      const orig = _origColors.get(mat);
      mat.color.setRGB(
        inverted ? 1 - orig.r : orig.r,
        inverted ? 1 - orig.g : orig.g,
        inverted ? 1 - orig.b : orig.b,
      );
    }
  });
}

function applyWireframe(on) {
  params.wireframe = on;
  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if (obj.material.map) return;
      obj.material.wireframe = on;
    }
  });
}

// --- Tweakpane ---
const pane = new Pane({ title: 'Settings', expanded: false });

const displayFolder = pane.addFolder({ title: 'Display' });
displayFolder.addBinding(params, 'inverted').on('change', (e) => applyInvert(e.value));
displayFolder.addBinding(params, 'wireframe').on('change', (e) => applyWireframe(e.value));
displayFolder.addBinding(params, 'edgeOpacity', { min: 0, max: 1, step: 0.05 }).on('change', (e) => {
  scene.traverse((obj) => {
    if ((obj.isLineSegments || obj.isLine) && obj.material && obj.material.transparent) {
      obj.material.opacity = e.value;
    }
  });
});

const fogFolder = pane.addFolder({ title: 'Fog' });
fogFolder.addBinding(params, 'fogEnabled').on('change', (e) => {
  scene.fog = e.value ? new THREE.Fog(scene.background, params.fogNear, params.fogFar) : null;
});
fogFolder.addBinding(params, 'fogNear', { min: 5, max: 100, step: 1 }).on('change', (e) => {
  if (scene.fog) scene.fog.near = e.value;
});
fogFolder.addBinding(params, 'fogFar', { min: 20, max: 300, step: 1 }).on('change', (e) => {
  if (scene.fog) scene.fog.far = e.value;
});

const lightFolder = pane.addFolder({ title: 'Lighting' });
lightFolder.addBinding(params, 'exposure', { min: 0.3, max: 3, step: 0.05 }).on('change', (e) => {
  renderer.toneMappingExposure = e.value;
});
lightFolder.addBinding(params, 'sunIntensity', { min: 0, max: 3, step: 0.1 }).on('change', (e) => {
  sun.intensity = e.value;
});
lightFolder.addBinding(params, 'shadowsEnabled').on('change', (e) => {
  renderer.shadowMap.enabled = e.value;
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = e.value;
      obj.receiveShadow = e.value;
      if (obj.material) obj.material.needsUpdate = true;
    }
  });
});

const ssaoFolder = pane.addFolder({ title: 'SSAO' });
ssaoFolder.addBinding(params, 'ssaoEnabled').on('change', (e) => {
  ssaoPass.enabled = e.value;
});
ssaoFolder.addBinding(params, 'ssaoIntensity', { min: 0, max: 3, step: 0.1 }).on('change', (e) => {
  ssaoPass.intensity = e.value;
});
ssaoFolder.addBinding(params, 'ssaoRadius', { min: 0.01, max: 2, step: 0.01 }).on('change', (e) => {
  ssaoPass.kernelRadius = e.value;
});

// --- Keyboard toggles ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyT') {
    cameraController.toggleTopDown();
    crosshair.style.display = cameraController.mode === 'top-down' ? 'none' : '';
  }
  if (e.code === 'KeyV') {
    applyWireframe(!params.wireframe);
    pane.refresh();
  }
  if (e.code === 'KeyI') {
    applyInvert(!params.inverted);
    pane.refresh();
  }
});

// --- Handle resize for post-processing ---
window.addEventListener('resize', () => {
  composer.setSize(window.innerWidth, window.innerHeight);
  ssaoPass.setSize(window.innerWidth, window.innerHeight);
});

// --- Main loop ---
loop.onUpdate((delta, elapsed) => {
  const moveDir = inputController.getMoveDirection();
  const mouseDelta = inputController.consumeMouseDelta();
  cameraController.updateFirstPerson(moveDir, mouseDelta, delta);

  // Render via composer (includes SSAO)
  composer.render(delta);
  houseLabels.render(scene, camera);
});

// --- Start ---
loop.start();

// --- Hide loading ---
requestAnimationFrame(() => {
  loadingEl.classList.add('hidden');
  setTimeout(() => loadingEl.remove(), 600);
});
