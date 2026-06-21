import * as THREE from 'three';
import { addObject } from './scene.js';
import { A, COLORS, H, getHCPParams, getMetalRadius, isHCP, isMetal } from './config.js';
import { getCurrentParticles, getHCPCutParticles } from './particles.js';

export function sphereMaterial(state, color, clippingPlanes = []) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.35,
    metalness: isMetal(state) ? 0.04 : 0.01,
    side: THREE.DoubleSide,
    clippingPlanes,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

export function lineMaterial() {
  return new THREE.LineBasicMaterial({ color: COLORS.frame });
}

export function addUnitCellFrame(ctx, size = A, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const box = new THREE.BoxGeometry(size, size, size);
  const edges = new THREE.EdgesGeometry(box);
  const line = new THREE.LineSegments(edges, lineMaterial());
  line.position.set(offsetX, offsetY, offsetZ);
  addObject(ctx, line);
}

export function addSphere(ctx, x, y, z, radius, color, clippingPlanes = []) {
  // 結晶いっぱい版では粒子数が多くなるため、少しだけ分割数を下げて操作を軽くする。
  // 単位格子・カット表示では高精細のままにする。
  const manyParticles = ctx.state.currentMode === 'full' || ctx.state.currentMode === 'full-slice';
  const widthSegments = manyParticles ? 48 : 96;
  const heightSegments = manyParticles ? 32 : 64;
  const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const mesh = new THREE.Mesh(geo, sphereMaterial(ctx.state, color, clippingPlanes));
  mesh.position.set(x, y, z);
  addObject(ctx, mesh);
}

export function getUnitClippingPlanes(offsetX = 0, offsetY = 0, offsetZ = 0) {
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), H - offsetX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), H + offsetX),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), H - offsetY),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), H + offsetY),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), H - offsetZ),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), H + offsetZ),
  ];
}

export function getHCPClippingPlanes(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const planes = [];

  planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), c / 2 - offsetZ));
  planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), c / 2 + offsetZ));

  const apothem = side * Math.sqrt(3) / 2;

  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + Math.PI / 6;
    const n = new THREE.Vector3(-Math.cos(angle), -Math.sin(angle), 0);
    const constant = apothem + n.x * offsetX + n.y * offsetY;
    planes.push(new THREE.Plane(n, constant));
  }

  return planes;
}



export function getHCPThirdClippingPlanes(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const planes = getHCPClippingPlanes(offsetX, offsetY, offsetZ);

  // 六角柱を中心軸から 120° 分だけ残す。120° = 360° の 1/3。
  // 残す範囲：角度 0° の半直線から 120° の半直線まで。
  planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), -offsetY));
  planes.push(new THREE.Plane(new THREE.Vector3(Math.sqrt(3) / 2, 0.5, 0), -(Math.sqrt(3) / 2 * offsetX + 0.5 * offsetY)));

  return planes;
}

function getHCPThirdPrismPoints(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const bottomZ = -c / 2 + offsetZ;
  const topZ = c / 2 + offsetZ;

  const polygon2D = [
    [0, 0],
    [side, 0],
    [side * Math.cos(Math.PI / 3), side * Math.sin(Math.PI / 3)],
    [side * Math.cos(2 * Math.PI / 3), side * Math.sin(2 * Math.PI / 3)],
  ];

  const bottom = polygon2D.map(([x, y]) => new THREE.Vector3(x + offsetX, y + offsetY, bottomZ));
  const top = polygon2D.map(([x, y]) => new THREE.Vector3(x + offsetX, y + offsetY, topZ));

  return { bottom, top };
}

export function addHCPThirdFrame(ctx, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { bottom, top } = getHCPThirdPrismPoints(offsetX, offsetY, offsetZ);
  const points = [];

  for (let i = 0; i < bottom.length; i++) {
    const next = (i + 1) % bottom.length;
    points.push(bottom[i], bottom[next]);
    points.push(top[i], top[next]);
    points.push(bottom[i], top[i]);
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineSegments(geo, lineMaterial());
  addObject(ctx, line);
}

function makeQuadGeometry(p1, p2, p3, p4) {
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
  return geo;
}

export function addHCPThirdPrismFacePlanes(ctx, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { bottom, top } = getHCPThirdPrismPoints(offsetX, offsetY, offsetZ);
  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.prism,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const bottomGeo = new THREE.BufferGeometry();
  bottomGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    bottom[0].x, bottom[0].y, bottom[0].z,
    bottom[1].x, bottom[1].y, bottom[1].z,
    bottom[2].x, bottom[2].y, bottom[2].z,
    bottom[0].x, bottom[0].y, bottom[0].z,
    bottom[2].x, bottom[2].y, bottom[2].z,
    bottom[3].x, bottom[3].y, bottom[3].z,
  ]), 3));
  bottomGeo.computeVertexNormals();
  addObject(ctx, new THREE.Mesh(bottomGeo, mat.clone()));

  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    top[0].x, top[0].y, top[0].z,
    top[2].x, top[2].y, top[2].z,
    top[1].x, top[1].y, top[1].z,
    top[0].x, top[0].y, top[0].z,
    top[3].x, top[3].y, top[3].z,
    top[2].x, top[2].y, top[2].z,
  ]), 3));
  topGeo.computeVertexNormals();
  addObject(ctx, new THREE.Mesh(topGeo, mat.clone()));

  for (let i = 0; i < bottom.length; i++) {
    const next = (i + 1) % bottom.length;
    addObject(ctx, new THREE.Mesh(makeQuadGeometry(bottom[i], bottom[next], top[next], top[i]), mat.clone()));
  }
}

export function addFullUnit(ctx, offsetX = 0, offsetY = 0, offsetZ = 0, clippingPlanes = []) {
  for (const p of getCurrentParticles(ctx.state, offsetX, offsetY, offsetZ)) {
    addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color, clippingPlanes);
  }
}

export function addHCPFrame(ctx, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const bottom = [];
  const top = [];

  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    bottom.push(new THREE.Vector3(
      side * Math.cos(angle) + offsetX,
      side * Math.sin(angle) + offsetY,
      -c / 2 + offsetZ,
    ));
    top.push(new THREE.Vector3(
      side * Math.cos(angle) + offsetX,
      side * Math.sin(angle) + offsetY,
      c / 2 + offsetZ,
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
  addObject(ctx, line);
}

export function addHCPPrismFacePlanes(ctx, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.prism,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

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
  addObject(ctx, bottom);

  const top = new THREE.Mesh(hexGeo, mat.clone());
  top.position.set(offsetX, offsetY, c / 2 + offsetZ);
  addObject(ctx, top);

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
    addObject(ctx, mesh);
  }
}

export function addCapCircle(ctx, center, normal, radius, color, clippingPlanes = [], opacity = 1.0) {
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
  addObject(ctx, circle);
}

export function addCapsForSphereAgainstPlanes(ctx, sphereCenter, sphereRadius, planes, color) {
  for (const plane of planes) {
    const d = plane.distanceToPoint(sphereCenter);

    if (Math.abs(d) < sphereRadius) {
      const capRadius = Math.sqrt(sphereRadius * sphereRadius - d * d);
      const capCenter = sphereCenter.clone().add(plane.normal.clone().multiplyScalar(-d));
      addCapCircle(ctx, capCenter, plane.normal, capRadius, color, planes, 1.0);
    }
  }
}

export function addCapsForParticles(ctx, particles, planes) {
  for (const p of particles) {
    addCapsForSphereAgainstPlanes(ctx, p.center, p.radius, planes, p.color);
  }
}

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

function addOctantParticle(ctx, cx, cy, cz, sx, sy, sz) {
  const r = getMetalRadius(ctx.state);
  const group = new THREE.Group();
  group.position.set(cx, cy, cz);

  const parts = [
    new THREE.Mesh(createOctantSurfaceGeometry(r, sx, sy, sz), sphereMaterial(ctx.state, COLORS.metal)),
    new THREE.Mesh(createQuarterDiskGeometry(r, 'x', sx, sy, sz), sphereMaterial(ctx.state, COLORS.metal)),
    new THREE.Mesh(createQuarterDiskGeometry(r, 'y', sx, sy, sz), sphereMaterial(ctx.state, COLORS.metal)),
    new THREE.Mesh(createQuarterDiskGeometry(r, 'z', sx, sy, sz), sphereMaterial(ctx.state, COLORS.metal)),
  ];

  for (const p of parts) group.add(p);
  addObject(ctx, group);
}

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

function addHemisphereParticle(ctx, cx, cy, cz, axis, sign) {
  const r = getMetalRadius(ctx.state);
  const group = new THREE.Group();
  group.position.set(cx, cy, cz);

  const surface = new THREE.Mesh(createHemisphereSurfaceGeometry(r, axis, sign), sphereMaterial(ctx.state, COLORS.metal));
  const disk = new THREE.Mesh(createFullDiskGeometry(r, axis), sphereMaterial(ctx.state, COLORS.metal));

  group.add(surface);
  group.add(disk);
  addObject(ctx, group);
}

export function addMetalCutUnitAsParts(ctx) {
  if (ctx.state.crystalType === 'bcc') {
    addSphere(ctx, 0, 0, 0, getMetalRadius(ctx.state), COLORS.metal);

    for (const x of [-H, H]) {
      for (const y of [-H, H]) {
        for (const z of [-H, H]) {
          const sx = x > 0 ? -1 : 1;
          const sy = y > 0 ? -1 : 1;
          const sz = z > 0 ? -1 : 1;
          addOctantParticle(ctx, x, y, z, sx, sy, sz);
        }
      }
    }
    return;
  }

  if (ctx.state.crystalType === 'fcc') {
    for (const x of [-H, H]) {
      for (const y of [-H, H]) {
        for (const z of [-H, H]) {
          const sx = x > 0 ? -1 : 1;
          const sy = y > 0 ? -1 : 1;
          const sz = z > 0 ? -1 : 1;
          addOctantParticle(ctx, x, y, z, sx, sy, sz);
        }
      }
    }

    addHemisphereParticle(ctx, H, 0, 0, 'x', -1);
    addHemisphereParticle(ctx, -H, 0, 0, 'x', 1);
    addHemisphereParticle(ctx, 0, H, 0, 'y', -1);
    addHemisphereParticle(ctx, 0, -H, 0, 'y', 1);
    addHemisphereParticle(ctx, 0, 0, H, 'z', -1);
    addHemisphereParticle(ctx, 0, 0, -H, 'z', 1);
    return;
  }

  const hcpPlanes = getHCPClippingPlanes();
  addHCPPrismFacePlanes(ctx);
  for (const p of getHCPCutParticles(ctx.state)) {
    addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color, hcpPlanes);
  }
  addCapsForParticles(ctx, getHCPCutParticles(ctx.state), hcpPlanes);
}

export function addCutUnitByClipping(ctx) {
  const planes = isHCP(ctx.state) ? getHCPClippingPlanes() : getUnitClippingPlanes();

  if (isHCP(ctx.state)) addHCPPrismFacePlanes(ctx);

  if (isHCP(ctx.state)) {
    const particles = getHCPCutParticles(ctx.state);
    for (const p of particles) {
      addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color, planes);
    }
    addCapsForParticles(ctx, particles, planes);
  } else {
    addFullUnit(ctx, 0, 0, 0, planes);
    addCapsForParticles(ctx, getCurrentParticles(ctx.state), planes);
  }
}

export function getSlicePlane(state) {
  const normal = new THREE.Vector3(0, 0, 1);

  normal.applyAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(state.sliceAngleX));
  normal.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(state.sliceAngleY));
  normal.normalize();

  // three.js の clippingPlanes は「平面の正の側」を残し、負の側を切り取る。
  // これまでの設定では、初期角度で下側・奥側が切り取られていたため、
  // 法線を反転して、同じ切断面のまま上側・手前側が切り取られる向きにする。
  // 平面の位置は offset のまま保つため、constant も反転前と対応させている。
  return new THREE.Plane(normal.negate(), state.sliceOffset);
}

export function addSlicePlaneVisual(ctx, plane, size = 7.0) {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.plane,
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

  addObject(ctx, mesh);
}
