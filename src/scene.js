import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';

// 左側の設定パネルに重ならないよう、3D描画領域を右側だけにする。
// 設定パネルの実寸：left 16px + width 500px + gap 20px = 536px。
const VIEWER_LEFT_DESKTOP = 536;
const MIN_RIGHT_VIEWER_WIDTH = 420;

const CAMERA_VIEW_PRESETS = {
  cool: {
    label: '初期',
    direction: new THREE.Vector3(6.2, 4.6, 5.4),
    distanceScale: 1.08,
  },
  diagonal: {
    label: '斜め上',
    direction: new THREE.Vector3(-5.8, 5.0, 4.2),
    distanceScale: 1.12,
  },
  front: {
    label: '正面',
    direction: new THREE.Vector3(0, -7.2, 1.2),
    distanceScale: 1.04,
  },
  side: {
    label: '横',
    direction: new THREE.Vector3(7.2, 0, 1.2),
    distanceScale: 1.04,
  },
  top: {
    label: '真上',
    direction: new THREE.Vector3(0.01, 0.01, 7.5),
    distanceScale: 1.05,
  },
};

function getViewerRect() {
  const splitView = window.innerWidth - VIEWER_LEFT_DESKTOP >= MIN_RIGHT_VIEWER_WIDTH;
  const left = splitView ? VIEWER_LEFT_DESKTOP : 0;
  return {
    left,
    top: 0,
    width: Math.max(1, window.innerWidth - left),
    height: Math.max(1, window.innerHeight),
  };
}

function applyRendererLayout(renderer) {
  const rect = getViewerRect();
  const canvas = renderer.domElement;

  canvas.style.position = 'fixed';
  canvas.style.left = `${rect.left}px`;
  canvas.style.top = `${rect.top}px`;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  canvas.style.display = 'block';
  canvas.style.zIndex = '1';

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(rect.width, rect.height, false);

  return rect;
}

function getObjectBounds(ctx) {
  const box = new THREE.Box3();
  let hasObject = false;

  for (const obj of ctx.objects ?? []) {
    if (!obj || obj.visible === false) continue;

    const objectBox = new THREE.Box3().setFromObject(obj);
    if (objectBox.isEmpty()) continue;

    if (!hasObject) {
      box.copy(objectBox);
      hasObject = true;
    } else {
      box.union(objectBox);
    }
  }

  if (!hasObject) {
    return {
      center: new THREE.Vector3(0, 0, 0),
      radius: 4,
    };
  }

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1.6);

  return { center, radius };
}

function getFitDistance(camera, radius, distanceScale = 1.1) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.1));

  const verticalDistance = radius / Math.sin(verticalFov / 2);
  const horizontalDistance = radius / Math.sin(horizontalFov / 2);

  return Math.min(Math.max(verticalDistance, horizontalDistance) * distanceScale, 28);
}

export function getCameraViewPresets() {
  return Object.entries(CAMERA_VIEW_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
  }));
}

export function applyCameraPreset(ctx, presetKey = 'cool') {
  const preset = CAMERA_VIEW_PRESETS[presetKey] ?? CAMERA_VIEW_PRESETS.cool;
  const { center, radius } = getObjectBounds(ctx);
  const direction = preset.direction.clone().normalize();
  const distance = getFitDistance(ctx.camera, radius, preset.distanceScale);
  const position = center.clone().add(direction.multiplyScalar(distance));

  ctx.camera.position.copy(position);
  ctx.camera.up.set(0, 0, 1);
  ctx.camera.lookAt(center);

  ctx.controls.target.copy(center);
  ctx.controls.update();

  // TrackballControls の reset() が、現在のプリセット角度へ戻るようにする。
  // three.js の版によって保存用プロパティ名が異なるため、安全に更新する。
  // ここで存在しないプロパティを直接参照すると、初期表示前に JavaScript が止まり、
  // 3D構造が何も表示されなくなる。
  if (ctx.controls.position0?.copy) ctx.controls.position0.copy(ctx.camera.position);
  if (ctx.controls.target0?.copy) ctx.controls.target0.copy(ctx.controls.target);
  if (ctx.controls.up0?.copy) ctx.controls.up0.copy(ctx.camera.up);

  if (ctx.controls._position0?.copy) ctx.controls._position0.copy(ctx.camera.position);
  if (ctx.controls._target0?.copy) ctx.controls._target0.copy(ctx.controls.target);
  if (ctx.controls._up0?.copy) ctx.controls._up0.copy(ctx.camera.up);
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf7f9fc);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.localClippingEnabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.background = '#f7f9fc';

  const initialRect = applyRendererLayout(renderer);

  const camera = new THREE.PerspectiveCamera(45, initialRect.width / initialRect.height, 0.1, 100);
  camera.position.set(6.2, 4.6, 5.4);
  camera.up.set(0, 0, 1);
  scene.add(camera);

  document.body.appendChild(renderer.domElement);

  // OrbitControls は上下方向で回転が止まるため、自由回転できる TrackballControls に変更。
  const controls = new TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 3.2;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.7;
  controls.staticMoving = false;
  controls.dynamicDampingFactor = 0.12;
  controls.noZoom = false;
  controls.noPan = false;
  controls.target.set(0, 0, 0);

  // 全体を明るくする環境光。
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdde7ff, 1.15));

  // 画面手前から常に照らすライト。カメラに付けることで、回転しても手前側が暗くなりにくい。
  const cameraLight = new THREE.PointLight(0xffffff, 2.0, 0, 1.0);
  camera.add(cameraLight);

  // 立体感を残すための補助ライト。アニメーション中にカメラ位置へ追従させる。
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.55);
  frontLight.position.copy(camera.position);
  frontLight.target.position.set(0, 0, 0);
  scene.add(frontLight);
  scene.add(frontLight.target);

  return {
    scene,
    camera,
    renderer,
    controls,
    frontLight,
    objects: [],
  };
}

export function addObject(ctx, obj) {
  ctx.scene.add(obj);
  ctx.objects.push(obj);
  return obj;
}

export function clearSceneObjects(ctx) {
  for (const obj of ctx.objects) {
    ctx.scene.remove(obj);

    obj.traverse?.((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });

    if (!obj.traverse) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }
  }
  ctx.objects = [];
}

export function handleResize(ctx) {
  const rect = applyRendererLayout(ctx.renderer);
  ctx.camera.aspect = rect.width / rect.height;
  ctx.camera.updateProjectionMatrix();
  ctx.controls.handleResize?.();

  // リサイズ後も、選択中の角度設定で見やすい大きさに合わせる。
  applyCameraPreset(ctx, ctx.state?.cameraPreset ?? 'cool');
}

export function startAnimation(ctx) {
  function animate() {
    requestAnimationFrame(animate);

    // どの角度に回しても、常に画面手前からライトが当たるようにする。
    if (ctx.frontLight) {
      ctx.frontLight.position.copy(ctx.camera.position);
      ctx.frontLight.target.position.copy(ctx.controls.target);
      ctx.frontLight.target.updateMatrixWorld();
    }

    ctx.controls.update();
    ctx.renderer.render(ctx.scene, ctx.camera);
  }

  animate();
}
