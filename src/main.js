import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf7f9fc);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(6, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.localClippingEnabled = true;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 1.35));
const light = new THREE.DirectionalLight(0xffffff, 2.2);
light.position.set(5, 8, 6);
scene.add(light);

const a = 2;
const h = a / 2;
const particleColor = 0x2fa8df;

let crystalType = 'bcc';
let objects = [];
let currentMode = 'cut';
let sliceAngleX = 0;
let sliceAngleY = 45;
let sliceOffset = 0;

// =====================
// UI
// =====================
const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.left = '16px';
ui.style.top = '16px';
ui.style.padding = '12px';
ui.style.background = 'rgba(255,255,255,0.92)';
ui.style.border = '1px solid #ccc';
ui.style.borderRadius = '10px';
ui.style.fontFamily = 'sans-serif';
ui.style.fontSize = '14px';
ui.style.zIndex = '10';
ui.style.width = '390px';
ui.style.maxHeight = '92vh';
ui.style.overflowY = 'auto';

ui.innerHTML = `
  <div style="font-weight:bold; margin-bottom:8px;">結晶構造ビューア</div>

  <div style="margin-bottom:8px;">
    <button id="type-bcc">体心立方 BCC</button>
    <button id="type-fcc">面心立方 FCC</button>
    <button id="type-hcp">六方最密 HCP</button>
  </div>

  <button id="mode-full">結晶構造いっぱい</button>
  <button id="mode-unit">単位格子</button>
  <button id="mode-cut">単位格子カット</button>
  <button id="mode-slice">単位格子 任意断面</button>
  <button id="mode-full-slice">結晶いっぱい 任意断面</button>

  <div id="slice-ui" style="display:none; margin-top:12px;">
    <div>断面角度X：<span id="angle-x-value">0</span>°</div>
    <input id="angle-x" type="range" min="-90" max="90" value="0" step="1" style="width:100%;">
    <div id="angle-x-buttons" style="display:flex; flex-wrap:wrap; gap:3px; margin:4px 0 8px 0;"></div>

    <div>断面角度Y：<span id="angle-y-value">45</span>°</div>
    <input id="angle-y" type="range" min="-90" max="90" value="45" step="1" style="width:100%;">
    <div id="angle-y-buttons" style="display:flex; flex-wrap:wrap; gap:3px; margin:4px 0 8px 0;"></div>

    <div>断面位置：<span id="offset-value">0.00</span></div>
    <input id="offset" type="range" min="-4.0" max="4.0" step="0.01" value="0" style="width:100%;">
  </div>

  <div id="info" style="margin-top:10px; line-height:1.6;"></div>
`;

document.body.appendChild(ui);

const info = document.getElementById('info');
const sliceUi = document.getElementById('slice-ui');

document.getElementById('type-bcc').onclick = () => {
  crystalType = 'bcc';
  setMode(currentMode);
};

document.getElementById('type-fcc').onclick = () => {
  crystalType = 'fcc';
  setMode(currentMode);
};

document.getElementById('type-hcp').onclick = () => {
  crystalType = 'hcp';
  setMode(currentMode);
};

document.getElementById('mode-full').onclick = () => setMode('full');
document.getElementById('mode-unit').onclick = () => setMode('unit');
document.getElementById('mode-cut').onclick = () => setMode('cut');
document.getElementById('mode-slice').onclick = () => setMode('slice');
document.getElementById('mode-full-slice').onclick = () => setMode('full-slice');

document.getElementById('angle-x').oninput = (e) => {
  sliceAngleX = Number(e.target.value);
  updateSliderLabels();
  refreshCurrentSliceMode();
};

document.getElementById('angle-y').oninput = (e) => {
  sliceAngleY = Number(e.target.value);
  updateSliderLabels();
  refreshCurrentSliceMode();
};

document.getElementById('offset').oninput = (e) => {
  sliceOffset = Number(e.target.value);
  updateSliderLabels();
  refreshCurrentSliceMode();
};

function updateSliderLabels() {
  document.getElementById('angle-x-value').textContent = sliceAngleX;
  document.getElementById('angle-y-value').textContent = sliceAngleY;
  document.getElementById('offset-value').textContent = sliceOffset.toFixed(2);
}

function refreshCurrentSliceMode() {
  if (currentMode === 'slice') showSliceMode();
  if (currentMode === 'full-slice') showFullSliceMode();
}

function createAngleButtons(containerId, axis) {
  const container = document.getElementById(containerId);
  for (let deg = -90; deg <= 90; deg += 15) {
    const btn = document.createElement('button');
    btn.textContent = String(deg);
    btn.style.fontSize = '11px';
    btn.style.padding = '2px 5px';

    btn.onclick = () => {
      if (axis === 'x') {
        sliceAngleX = deg;
        document.getElementById('angle-x').value = deg;
      } else {
        sliceAngleY = deg;
        document.getElementById('angle-y').value = deg;
      }
      updateSliderLabels();
      refreshCurrentSliceMode();
    };

    container.appendChild(btn);
  }
}

createAngleButtons('angle-x-buttons', 'x');
createAngleButtons('angle-y-buttons', 'y');

// =====================
// 基本関数
// =====================
function getCrystalName() {
  if (crystalType === 'bcc') return '体心立方格子 BCC';
  if (crystalType === 'fcc') return '面心立方格子 FCC';
  return '六方最密充填構造 HCP';
}

function getHCPParams() {
  const side = 1.0;              // 六角形の外接半径。隣り合う上下面頂点間距離でもある
  const r = side / 2;            // 球が接する半径
  const c = Math.sqrt(8 / 3) * side; // 理想HCPの c/a
  return { side, r, c };
}

function getRadius() {
  if (crystalType === 'bcc') return Math.sqrt(3) * a / 4;
  if (crystalType === 'fcc') return Math.sqrt(2) * a / 4;
  return getHCPParams().r;
}

function getParticleNumberInCell() {
  if (crystalType === 'bcc') return 2;
  if (crystalType === 'fcc') return 4;
  return 6;
}

function getFillingRate() {
  if (crystalType === 'hcp') return Math.PI / (3 * Math.sqrt(2));

  const r = getRadius();
  return (getParticleNumberInCell() * (4 / 3) * Math.PI * Math.pow(r, 3)) / Math.pow(a, 3);
}

function getRelationText() {
  if (crystalType === 'bcc') return 'BCC：4r = √3a';
  if (crystalType === 'fcc') return 'FCC：4r = √2a';
  return 'HCP：ABAB型、理想比 c/a = √(8/3)、充填率 ≒ 74.0%';
}

function clearSceneObjects() {
  for (const obj of objects) {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
    if (obj.children) {
      obj.children.forEach((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
    }
  }
  objects = [];
}

function addObject(obj) {
  scene.add(obj);
  objects.push(obj);
  return obj;
}

function blueMaterial(clippingPlanes = []) {
  return new THREE.MeshStandardMaterial({
    color: particleColor,
    roughness: 0.35,
    metalness: 0.02,
    side: THREE.DoubleSide,
    clippingPlanes,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

function lineMaterial() {
  return new THREE.LineBasicMaterial({ color: 0x111111 });
}

function addUnitCellFrame(size = a) {
  const box = new THREE.BoxGeometry(size, size, size);
  const edges = new THREE.EdgesGeometry(box);
  const line = new THREE.LineSegments(edges, lineMaterial());
  addObject(line);
}

function addSphere(x, y, z, radius, clippingPlanes = []) {
  const geo = new THREE.SphereGeometry(radius, 96, 64);
  const mesh = new THREE.Mesh(geo, blueMaterial(clippingPlanes));
  mesh.position.set(x, y, z);
  addObject(mesh);
}

function getUnitClippingPlanes() {
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), h),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), h),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), h),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), h),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), h),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), h),
  ];
}

function getHCPClippingPlanes(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();

  // 六角柱の内側を残す。平面は「法線方向の半空間」を残す形。
  const planes = [];

  // z = ±c/2
  planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), c / 2 - offsetZ));
  planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), c / 2 + offsetZ));

  // 正六角形：各辺の外向き法線に対して距離 side*√3/2
  const apothem = side * Math.sqrt(3) / 2;

  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + Math.PI / 6;
    const n = new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), 0);
    const constant = apothem + n.x * offsetX + n.y * offsetY;
    planes.push(new THREE.Plane(n, constant));
  }

  return planes;
}

// =====================
// 粒子中心
// =====================
function getBCCCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const centers = [];

  for (const x of [-h, h]) {
    for (const y of [-h, h]) {
      for (const z of [-h, h]) {
        centers.push(new THREE.Vector3(x + offsetX, y + offsetY, z + offsetZ));
      }
    }
  }

  centers.push(new THREE.Vector3(offsetX, offsetY, offsetZ));
  return centers;
}

function getFCCCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const centers = [];

  for (const x of [-h, h]) {
    for (const y of [-h, h]) {
      for (const z of [-h, h]) {
        centers.push(new THREE.Vector3(x + offsetX, y + offsetY, z + offsetZ));
      }
    }
  }

  centers.push(new THREE.Vector3(h + offsetX, 0 + offsetY, 0 + offsetZ));
  centers.push(new THREE.Vector3(-h + offsetX, 0 + offsetY, 0 + offsetZ));
  centers.push(new THREE.Vector3(0 + offsetX, h + offsetY, 0 + offsetZ));
  centers.push(new THREE.Vector3(0 + offsetX, -h + offsetY, 0 + offsetZ));
  centers.push(new THREE.Vector3(0 + offsetX, 0 + offsetY, h + offsetZ));
  centers.push(new THREE.Vector3(0 + offsetX, 0 + offsetY, -h + offsetZ));

  return centers;
}

function getHCPCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const centers = [];

  const zBottom = -c / 2;
  const zTop = c / 2;
  const zMiddle = 0;

  // 上下面の六角形頂点：12個
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = side * Math.cos(angle);
    const y = side * Math.sin(angle);

    centers.push(new THREE.Vector3(x + offsetX, y + offsetY, zBottom + offsetZ));
    centers.push(new THREE.Vector3(x + offsetX, y + offsetY, zTop + offsetZ));
  }

  // 上下面中心：2個
  centers.push(new THREE.Vector3(offsetX, offsetY, zBottom + offsetZ));
  centers.push(new THREE.Vector3(offsetX, offsetY, zTop + offsetZ));

  // 中間B層：3個
  const midR = side / Math.sqrt(3);
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI / 6 + i * (2 * Math.PI / 3);
    const x = midR * Math.cos(angle);
    const y = midR * Math.sin(angle);
    centers.push(new THREE.Vector3(x + offsetX, y + offsetY, zMiddle + offsetZ));
  }

  return centers;
}

function getCurrentCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  if (crystalType === 'bcc') return getBCCCenters(offsetX, offsetY, offsetZ);
  if (crystalType === 'fcc') return getFCCCenters(offsetX, offsetY, offsetZ);
  return getHCPCenters(offsetX, offsetY, offsetZ);
}

function addFullUnit(offsetX = 0, offsetY = 0, offsetZ = 0, clippingPlanes = []) {
  const r = getRadius();
  for (const c of getCurrentCenters(offsetX, offsetY, offsetZ)) {
    addSphere(c.x, c.y, c.z, r, clippingPlanes);
  }
}

// =====================
// HCPフレーム
// =====================
function addHCPFrame(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const bottom = [];
  const top = [];

  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    bottom.push(new THREE.Vector3(
      side * Math.cos(angle) + offsetX,
      side * Math.sin(angle) + offsetY,
      -c / 2 + offsetZ
    ));
    top.push(new THREE.Vector3(
      side * Math.cos(angle) + offsetX,
      side * Math.sin(angle) + offsetY,
      c / 2 + offsetZ
    ));
  }

  const points = [];
  for (let i = 0; i < 6; i++) {
    points.push(bottom[i], bottom[(i + 1) % 6]);
    points.push(top[i], top[(i + 1) % 6]);
    points.push(bottom[i], top[i]);
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineSegments(geo, lineMaterial());
  addObject(line);
}

function addHCPPrismFacePlanes(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe082,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 上下面
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = side * Math.cos(angle);
    const y = side * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const hexGeo = new THREE.ShapeGeometry(shape);

  const bottom = new THREE.Mesh(hexGeo, mat.clone());
  bottom.position.set(offsetX, offsetY, -c / 2 + offsetZ);
  addObject(bottom);

  const top = new THREE.Mesh(hexGeo, mat.clone());
  top.position.set(offsetX, offsetY, c / 2 + offsetZ);
  addObject(top);

  // 側面
  for (let i = 0; i < 6; i++) {
    const a1 = Math.PI / 3 * i;
    const a2 = Math.PI / 3 * ((i + 1) % 6);

    const p1 = new THREE.Vector3(side * Math.cos(a1), side * Math.sin(a1), -c / 2);
    const p2 = new THREE.Vector3(side * Math.cos(a2), side * Math.sin(a2), -c / 2);
    const p3 = new THREE.Vector3(side * Math.cos(a2), side * Math.sin(a2), c / 2);
    const p4 = new THREE.Vector3(side * Math.cos(a1), side * Math.sin(a1), c / 2);

    const vertices = new Float32Array([
      p1.x, p1.y, p1.z,
      p2.x, p2.y, p2.z,
      p3.x, p3.y, p3.z,
      p1.x, p1.y, p1.z,
      p3.x, p3.y, p3.z,
      p4.x, p4.y, p4.z,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.position.set(offsetX, offsetY, offsetZ);
    addObject(mesh);
  }
}

// =====================
// カット断面のふた
// =====================
function addCapCircle(center, normal, radius, color, clippingPlanes = [], opacity = 1.0) {
  if (radius <= 0.001) return;

  const geo = new THREE.CircleGeometry(radius, 128);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    clippingPlanes,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  const circle = new THREE.Mesh(geo, mat);

  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(defaultNormal, normal.clone().normalize());

  circle.quaternion.copy(q);
  circle.position.copy(center.clone().add(normal.clone().multiplyScalar(0.006)));
  circle.renderOrder = 3;
  addObject(circle);
}

function addCapsForSphereAgainstPlanes(sphereCenter, sphereRadius, planes, color) {
  for (const plane of planes) {
    const d = plane.distanceToPoint(sphereCenter);

    if (Math.abs(d) < sphereRadius) {
      const capRadius = Math.sqrt(sphereRadius * sphereRadius - d * d);
      const capCenter = sphereCenter.clone().add(plane.normal.clone().multiplyScalar(-d));
      addCapCircle(capCenter, plane.normal, capRadius, color, planes, 1.0);
    }
  }
}

// =====================
// 1/8球
// =====================
function createOctantSurfaceGeometry(radius, sx, sy, sz) {
  const segments = 32;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * Math.PI / 2;

    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI / 2;
      const x = sx * radius * Math.sin(phi) * Math.cos(theta);
      const y = sy * radius * Math.sin(phi) * Math.sin(theta);
      const z = sz * radius * Math.cos(phi);
      vertices.push(x, y, z);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a0 = i * (segments + 1) + j;
      const a1 = a0 + 1;
      const b0 = (i + 1) * (segments + 1) + j;
      const b1 = b0 + 1;
      indices.push(a0, b0, a1);
      indices.push(a1, b0, b1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createQuarterDiskGeometry(radius, axis, sx, sy, sz) {
  const segments = 48;
  const vertices = [0, 0, 0];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI / 2;
    let x = 0, y = 0, z = 0;

    if (axis === 'x') {
      y = sy * radius * Math.cos(t);
      z = sz * radius * Math.sin(t);
    }

    if (axis === 'y') {
      x = sx * radius * Math.cos(t);
      z = sz * radius * Math.sin(t);
    }

    if (axis === 'z') {
      x = sx * radius * Math.cos(t);
      y = sy * radius * Math.sin(t);
    }

    vertices.push(x, y, z);
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addOctantParticle(cx, cy, cz, sx, sy, sz) {
  const r = getRadius();
  const group = new THREE.Group();
  group.position.set(cx, cy, cz);

  const parts = [
    new THREE.Mesh(createOctantSurfaceGeometry(r, sx, sy, sz), blueMaterial()),
    new THREE.Mesh(createQuarterDiskGeometry(r, 'x', sx, sy, sz), blueMaterial()),
    new THREE.Mesh(createQuarterDiskGeometry(r, 'y', sx, sy, sz), blueMaterial()),
    new THREE.Mesh(createQuarterDiskGeometry(r, 'z', sx, sy, sz), blueMaterial()),
  ];

  for (const p of parts) group.add(p);
  addObject(group);
}

// =====================
// 1/2球
// =====================
function createHemisphereSurfaceGeometry(radius, axis, sign) {
  const latSegments = 32;
  const lonSegments = 64;
  const vertices = [];
  const indices = [];

  for (let i = 0; i <= latSegments; i++) {
    const phi = (i / latSegments) * Math.PI / 2;

    for (let j = 0; j <= lonSegments; j++) {
      const theta = (j / lonSegments) * Math.PI * 2;

      let x = 0, y = 0, z = 0;

      if (axis === 'x') {
        x = sign * radius * Math.cos(phi);
        y = radius * Math.sin(phi) * Math.cos(theta);
        z = radius * Math.sin(phi) * Math.sin(theta);
      }

      if (axis === 'y') {
        y = sign * radius * Math.cos(phi);
        x = radius * Math.sin(phi) * Math.cos(theta);
        z = radius * Math.sin(phi) * Math.sin(theta);
      }

      if (axis === 'z') {
        z = sign * radius * Math.cos(phi);
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
      }

      vertices.push(x, y, z);
    }
  }

  for (let i = 0; i < latSegments; i++) {
    for (let j = 0; j < lonSegments; j++) {
      const a0 = i * (lonSegments + 1) + j;
      const a1 = a0 + 1;
      const b0 = (i + 1) * (lonSegments + 1) + j;
      const b1 = b0 + 1;
      indices.push(a0, b0, a1);
      indices.push(a1, b0, b1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createFullDiskGeometry(radius, axis) {
  const segments = 96;
  const vertices = [0, 0, 0];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    let x = 0, y = 0, z = 0;

    if (axis === 'x') {
      y = radius * Math.cos(t);
      z = radius * Math.sin(t);
    }

    if (axis === 'y') {
      x = radius * Math.cos(t);
      z = radius * Math.sin(t);
    }

    if (axis === 'z') {
      x = radius * Math.cos(t);
      y = radius * Math.sin(t);
    }

    vertices.push(x, y, z);
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function addHemisphereParticle(cx, cy, cz, axis, sign) {
  const r = getRadius();
  const group = new THREE.Group();
  group.position.set(cx, cy, cz);

  const surface = new THREE.Mesh(createHemisphereSurfaceGeometry(r, axis, sign), blueMaterial());
  const disk = new THREE.Mesh(createFullDiskGeometry(r, axis), blueMaterial());

  group.add(surface);
  group.add(disk);
  addObject(group);
}

// =====================
// カット単位格子
// =====================
function addCutUnitAsParts() {
  if (crystalType === 'bcc') {
    addSphere(0, 0, 0, getRadius());

    for (const x of [-h, h]) {
      for (const y of [-h, h]) {
        for (const z of [-h, h]) {
          const sx = x > 0 ? -1 : 1;
          const sy = y > 0 ? -1 : 1;
          const sz = z > 0 ? -1 : 1;
          addOctantParticle(x, y, z, sx, sy, sz);
        }
      }
    }
    return;
  }

  if (crystalType === 'fcc') {
    for (const x of [-h, h]) {
      for (const y of [-h, h]) {
        for (const z of [-h, h]) {
          const sx = x > 0 ? -1 : 1;
          const sy = y > 0 ? -1 : 1;
          const sz = z > 0 ? -1 : 1;
          addOctantParticle(x, y, z, sx, sy, sz);
        }
      }
    }

    addHemisphereParticle(h, 0, 0, 'x', -1);
    addHemisphereParticle(-h, 0, 0, 'x', 1);
    addHemisphereParticle(0, h, 0, 'y', -1);
    addHemisphereParticle(0, -h, 0, 'y', 1);
    addHemisphereParticle(0, 0, h, 'z', -1);
    addHemisphereParticle(0, 0, -h, 'z', 1);
    return;
  }

  // HCPは六角柱で切るため、クリッピング＋ふた方式で表示
  const hcpPlanes = getHCPClippingPlanes();
  addHCPPrismFacePlanes();
  addFullUnit(0, 0, 0, hcpPlanes);
  for (const c of getHCPCenters()) {
    addCapsForSphereAgainstPlanes(c, getRadius(), hcpPlanes, particleColor);
  }
}

// =====================
// 任意断面
// =====================
function getSlicePlane() {
  const normal = new THREE.Vector3(0, 0, 1);

  normal.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(sliceAngleX));
  normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(sliceAngleY));
  normal.normalize();

  return new THREE.Plane(normal, -sliceOffset);
}

function addSlicePlaneVisual(plane, size = 7.0) {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff5252,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 5,
    polygonOffsetUnits: 5,
  });

  const mesh = new THREE.Mesh(geo, mat);

  const defaultNormal = new THREE.Vector3(0, 0, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(defaultNormal, plane.normal.clone().normalize());

  mesh.quaternion.copy(q);
  mesh.position.copy(plane.normal.clone().multiplyScalar(-plane.constant - 0.01));
  mesh.renderOrder = -1;

  addObject(mesh);
}

// =====================
// 表示モード
// =====================
function showFullCrystal() {
  clearSceneObjects();
  sliceUi.style.display = 'none';

  if (crystalType === 'hcp') {
    const { side } = getHCPParams();
    const dx = side * 1.5;
    const dy = side * Math.sqrt(3);

    for (const ix of [-2, -1, 0, 1, 2]) {
      for (const iy of [-2, -1, 0, 1, 2]) {
        const x = ix * dx;
        const y = iy * dy + (ix % 2) * dy / 2;
        addFullUnit(x, y, 0);
      }
    }

    info.innerHTML = `
      <b>${getCrystalName()}：結晶構造いっぱい版</b><br>
      六角形の単位格子がくり返し並ぶ様子です。<br>
      ${getRelationText()}
    `;
    return;
  }

  const range = [-2, 0, 2];

  for (const x of range) {
    for (const y of range) {
      for (const z of range) {
        addFullUnit(x, y, z);
      }
    }
  }

  info.innerHTML = `
    <b>${getCrystalName()}：結晶構造いっぱい版</b><br>
    単位格子がくり返し並ぶ様子です。<br>
    ${getRelationText()}
  `;
}

function showUnitCell() {
  clearSceneObjects();
  sliceUi.style.display = 'none';

  if (crystalType === 'hcp') {
    addHCPFrame();
    addFullUnit();

    info.innerHTML = `
      <b>${getCrystalName()}：単位格子版</b><br>
      ABAB型に粒子が積み重なる構造です。<br>
      ${getRelationText()}
    `;
    return;
  }

  addUnitCellFrame(a);
  addFullUnit();

  info.innerHTML = `
    <b>${getCrystalName()}：単位格子版</b><br>
    粒子を切らずに表示。<br>
    ${getRelationText()}
  `;
}

function showCutUnitCell() {
  clearSceneObjects();
  sliceUi.style.display = 'none';

  if (crystalType === 'hcp') addHCPFrame();
  else addUnitCellFrame(a);

  addCutUnitAsParts();

  let countText = '';
  if (crystalType === 'bcc') {
    countText = '角：8 × 1/8 = 1<br>体心：1 × 1 = 1<br>合計：2個';
  } else if (crystalType === 'fcc') {
    countText = '角：8 × 1/8 = 1<br>面心：6 × 1/2 = 3<br>合計：4個';
  } else {
    countText = '六角柱単位格子内の粒子数：6個<br>ABAB型の最密充填';
  }

  info.innerHTML = `
    <b>${getCrystalName()}：単位格子カット版</b><br>
    ${countText}<br>
    充填率：約 ${(getFillingRate() * 100).toFixed(1)}%
  `;
}

function showSliceMode() {
  clearSceneObjects();
  sliceUi.style.display = 'block';

  const slicePlane = getSlicePlane();

  let basePlanes;
  if (crystalType === 'hcp') {
    basePlanes = getHCPClippingPlanes();
    addHCPFrame();
  } else {
    basePlanes = getUnitClippingPlanes();
    addUnitCellFrame(a);
  }

  const allPlanes = [...basePlanes, slicePlane];

  addFullUnit(0, 0, 0, allPlanes);

  for (const c of getCurrentCenters()) {
    addCapsForSphereAgainstPlanes(c, getRadius(), allPlanes, particleColor);
  }

  addSlicePlaneVisual(slicePlane, crystalType === 'hcp' ? 3.8 : 3.4);

  info.innerHTML = `
    <b>${getCrystalName()}：単位格子 任意断面</b><br>
    単位格子カット版を任意角度で切っています。<br>
    充填率：約 ${(getFillingRate() * 100).toFixed(1)}%
  `;
}

function showFullSliceMode() {
  clearSceneObjects();
  sliceUi.style.display = 'block';

  const slicePlane = getSlicePlane();

  if (crystalType === 'hcp') {
    const { side } = getHCPParams();
    const dx = side * 1.5;
    const dy = side * Math.sqrt(3);

    for (const ix of [-2, -1, 0, 1, 2]) {
      for (const iy of [-2, -1, 0, 1, 2]) {
        const x = ix * dx;
        const y = iy * dy + (ix % 2) * dy / 2;

        addFullUnit(x, y, 0, [slicePlane]);

        for (const c of getCurrentCenters(x, y, 0)) {
          addCapsForSphereAgainstPlanes(c, getRadius(), [slicePlane], particleColor);
        }
      }
    }

    addSlicePlaneVisual(slicePlane, 8.0);

    info.innerHTML = `
      <b>${getCrystalName()}：結晶いっぱい 任意断面</b><br>
      HCPの繰り返し構造全体を任意角度で切っています。<br>
      15度ボタンで角度をすぐ変更できます。
    `;
    return;
  }

  const range = [-2, 0, 2];

  for (const x of range) {
    for (const y of range) {
      for (const z of range) {
        addFullUnit(x, y, z, [slicePlane]);

        for (const c of getCurrentCenters(x, y, z)) {
          addCapsForSphereAgainstPlanes(c, getRadius(), [slicePlane], particleColor);
        }
      }
    }
  }

  addSlicePlaneVisual(slicePlane, 8.0);

  info.innerHTML = `
    <b>${getCrystalName()}：結晶いっぱい 任意断面</b><br>
    繰り返し構造全体を任意角度で切っています。<br>
    15度ボタンで角度をすぐ変更できます。
  `;
}

function setMode(mode) {
  currentMode = mode;

  if (mode === 'full') showFullCrystal();
  if (mode === 'unit') showUnitCell();
  if (mode === 'cut') showCutUnitCell();
  if (mode === 'slice') showSliceMode();
  if (mode === 'full-slice') showFullSliceMode();
}

setMode(currentMode);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
