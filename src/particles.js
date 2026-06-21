import * as THREE from 'three';
import { COLORS, H, getHCPParams, getIonRadii, getMetalRadius, isMetal } from './config.js';

export function getCornerCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const centers = [];

  for (const x of [-H, H]) {
    for (const y of [-H, H]) {
      for (const z of [-H, H]) {
        centers.push(new THREE.Vector3(x + offsetX, y + offsetY, z + offsetZ));
      }
    }
  }

  return centers;
}

export function getFaceCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  return [
    new THREE.Vector3(H + offsetX, 0 + offsetY, 0 + offsetZ),
    new THREE.Vector3(-H + offsetX, 0 + offsetY, 0 + offsetZ),
    new THREE.Vector3(0 + offsetX, H + offsetY, 0 + offsetZ),
    new THREE.Vector3(0 + offsetX, -H + offsetY, 0 + offsetZ),
    new THREE.Vector3(0 + offsetX, 0 + offsetY, H + offsetZ),
    new THREE.Vector3(0 + offsetX, 0 + offsetY, -H + offsetZ),
  ];
}

export function getEdgeCenters(offsetX = 0, offsetY = 0, offsetZ = 0) {
  const centers = [];

  for (const x of [-H, H]) {
    for (const y of [-H, H]) {
      centers.push(new THREE.Vector3(x + offsetX, y + offsetY, 0 + offsetZ));
    }
  }

  for (const x of [-H, H]) {
    for (const z of [-H, H]) {
      centers.push(new THREE.Vector3(x + offsetX, 0 + offsetY, z + offsetZ));
    }
  }

  for (const y of [-H, H]) {
    for (const z of [-H, H]) {
      centers.push(new THREE.Vector3(0 + offsetX, y + offsetY, z + offsetZ));
    }
  }

  return centers;
}

export function getBCCParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const r = getMetalRadius(state);
  const particles = [];

  for (const center of getCornerCenters(offsetX, offsetY, offsetZ)) {
    particles.push({ center, radius: r, color: COLORS.metal, label: '金属原子' });
  }

  particles.push({
    center: new THREE.Vector3(offsetX, offsetY, offsetZ),
    radius: r,
    color: COLORS.metal,
    label: '金属原子',
  });

  return particles;
}

export function getFCCParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const r = getMetalRadius(state);
  const particles = [];

  for (const center of getCornerCenters(offsetX, offsetY, offsetZ)) {
    particles.push({ center, radius: r, color: COLORS.metal, label: '金属原子' });
  }

  for (const center of getFaceCenters(offsetX, offsetY, offsetZ)) {
    particles.push({ center, radius: r, color: COLORS.metal, label: '金属原子' });
  }

  return particles;
}

function addHCPMiddleLayerParticles(particles, state, offsetX, offsetY, offsetZ, includeNeighborFragments = false) {
  const { side } = getHCPParams();
  const r = getMetalRadius(state);
  const zMiddle = offsetZ;

  const centers = [];
  const midR = side / Math.sqrt(3);

  // 単位格子の内部に中心をもつB層の3個。
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI / 6 + i * (2 * Math.PI / 3);
    centers.push([midR * Math.cos(angle), midR * Math.sin(angle), '金属原子：中央層']);
  }

  if (includeNeighborFragments) {
    // 切断表示では、「中心は隣の単位格子側にあるが、球の端だけがこの六角柱に入る」
    // 中央層B層の粒子片も必要になる。以前はこの3つが未登録だったため、
    // HCP単位格子カット・1/3カットで中央層の端の球片が表示されなかった。
    centers.push(
      [-side, -side / Math.sqrt(3), '金属原子：中央層の端'],
      [side, -side / Math.sqrt(3), '金属原子：中央層の端'],
      [0, 2 * side / Math.sqrt(3), '金属原子：中央層の端'],
    );
  }

  for (const [x, y, label] of centers) {
    particles.push({
      center: new THREE.Vector3(x + offsetX, y + offsetY, zMiddle),
      radius: r,
      color: COLORS.metal,
      label,
    });
  }
}

export function getHCPParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const r = getMetalRadius(state);
  const particles = [];

  const zBottom = -c / 2;
  const zTop = c / 2;

  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = side * Math.cos(angle);
    const y = side * Math.sin(angle);

    particles.push({
      center: new THREE.Vector3(x + offsetX, y + offsetY, zBottom + offsetZ),
      radius: r,
      color: COLORS.metal,
      label: '金属原子',
    });

    particles.push({
      center: new THREE.Vector3(x + offsetX, y + offsetY, zTop + offsetZ),
      radius: r,
      color: COLORS.metal,
      label: '金属原子',
    });
  }

  particles.push({
    center: new THREE.Vector3(offsetX, offsetY, zBottom + offsetZ),
    radius: r,
    color: COLORS.metal,
    label: '金属原子',
  });

  particles.push({
    center: new THREE.Vector3(offsetX, offsetY, zTop + offsetZ),
    radius: r,
    color: COLORS.metal,
    label: '金属原子',
  });

  addHCPMiddleLayerParticles(particles, state, offsetX, offsetY, offsetZ, false);

  return particles;
}

export function getHCPCutParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { side, c } = getHCPParams();
  const r = getMetalRadius(state);
  const particles = [];

  const zBottom = -c / 2;
  const zTop = c / 2;

  // 上下面は従来どおり、六角柱の角と中心にある粒子を使う。
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 3 * i;
    const x = side * Math.cos(angle);
    const y = side * Math.sin(angle);

    particles.push({
      center: new THREE.Vector3(x + offsetX, y + offsetY, zBottom + offsetZ),
      radius: r,
      color: COLORS.metal,
      label: '金属原子',
    });

    particles.push({
      center: new THREE.Vector3(x + offsetX, y + offsetY, zTop + offsetZ),
      radius: r,
      color: COLORS.metal,
      label: '金属原子',
    });
  }

  particles.push({
    center: new THREE.Vector3(offsetX, offsetY, zBottom + offsetZ),
    radius: r,
    color: COLORS.metal,
    label: '金属原子',
  });

  particles.push({
    center: new THREE.Vector3(offsetX, offsetY, zTop + offsetZ),
    radius: r,
    color: COLORS.metal,
    label: '金属原子',
  });

  // 切断表示だけ、中央層の外側3粒子を追加し、クリッピングで端の部分だけ残す。
  addHCPMiddleLayerParticles(particles, state, offsetX, offsetY, offsetZ, true);

  return particles;
}


export function getHCPBlockParticles(state) {
  const { side } = getHCPParams();
  const r = getMetalRadius(state);
  const particles = [];

  // 「結晶いっぱい版」用。
  // 六角柱単位格子を横に並べるだけだと3段に見えやすいので、
  // ABAB... の層を直接増やし、全体がほぼ立方体になる範囲だけを表示する。
  const nearest = side;                       // 同じ層内で接する粒子間距離 = 2r
  const rowStep = Math.sqrt(3) * nearest / 2; // 三角格子の行間
  const layerStep = Math.sqrt(2 / 3) * nearest; // A層-B層の高さ
  const bShiftX = nearest / 2;
  const bShiftY = Math.sqrt(3) * nearest / 6;

  const halfBox = 3.25;
  const layerRange = 4; // -4〜4 の9層。ABABがしっかり見える。
  const rowRange = 8;
  const colRange = 8;

  for (let k = -layerRange; k <= layerRange; k++) {
    const isBLayer = Math.abs(k % 2) === 1;
    const z = k * layerStep;

    for (let j = -rowRange; j <= rowRange; j++) {
      const rowShift = Math.abs(j % 2) * nearest / 2;
      const y = j * rowStep + (isBLayer ? bShiftY : 0);

      for (let i = -colRange; i <= colRange; i++) {
        const x = i * nearest + rowShift + (isBLayer ? bShiftX : 0);

        // 中心が立方体状の範囲に入る粒子だけを表示する。
        // 半径ぶんは外へ少し出るので、見た目は「粒子が詰まった立方体」に近くなる。
        if (Math.abs(x) <= halfBox && Math.abs(y) <= halfBox && Math.abs(z) <= halfBox) {
          particles.push({
            center: new THREE.Vector3(x, y, z),
            radius: r,
            color: COLORS.metal,
            label: isBLayer ? '金属原子：B層' : '金属原子：A層',
          });
        }
      }
    }
  }

  return particles;
}

export function getNaClParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { anion, cation } = getIonRadii(state);
  const particles = [];

  for (const center of [...getCornerCenters(offsetX, offsetY, offsetZ), ...getFaceCenters(offsetX, offsetY, offsetZ)]) {
    particles.push({ center, radius: anion, color: COLORS.anion, label: 'Cl⁻' });
  }

  for (const center of [...getEdgeCenters(offsetX, offsetY, offsetZ), new THREE.Vector3(offsetX, offsetY, offsetZ)]) {
    particles.push({ center, radius: cation, color: COLORS.cation, label: 'Na⁺' });
  }

  return particles;
}

export function getCsClParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { anion, cation } = getIonRadii(state);
  const particles = [];

  for (const center of getCornerCenters(offsetX, offsetY, offsetZ)) {
    particles.push({ center, radius: anion, color: COLORS.anion, label: 'Cl⁻' });
  }

  particles.push({
    center: new THREE.Vector3(offsetX, offsetY, offsetZ),
    radius: cation,
    color: COLORS.cation,
    label: 'Cs⁺',
  });

  return particles;
}

export function getZincblendeParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  const { anion, cation } = getIonRadii(state);
  const particles = [];

  for (const center of [...getCornerCenters(offsetX, offsetY, offsetZ), ...getFaceCenters(offsetX, offsetY, offsetZ)]) {
    particles.push({ center, radius: anion, color: COLORS.anion, label: 'S²⁻' });
  }

  const tetrahedralSites = [
    [-0.5, -0.5, -0.5],
    [-0.5, 0.5, 0.5],
    [0.5, -0.5, 0.5],
    [0.5, 0.5, -0.5],
  ];

  for (const [x, y, z] of tetrahedralSites) {
    particles.push({
      center: new THREE.Vector3(x + offsetX, y + offsetY, z + offsetZ),
      radius: cation,
      color: COLORS.cation,
      label: 'Zn²⁺',
    });
  }

  return particles;
}

export function getCurrentParticles(state, offsetX = 0, offsetY = 0, offsetZ = 0) {
  if (isMetal(state)) {
    if (state.crystalType === 'bcc') return getBCCParticles(state, offsetX, offsetY, offsetZ);
    if (state.crystalType === 'fcc') return getFCCParticles(state, offsetX, offsetY, offsetZ);
    return getHCPParticles(state, offsetX, offsetY, offsetZ);
  }

  if (state.crystalType === 'nacl') return getNaClParticles(state, offsetX, offsetY, offsetZ);
  if (state.crystalType === 'cscl') return getCsClParticles(state, offsetX, offsetY, offsetZ);
  return getZincblendeParticles(state, offsetX, offsetY, offsetZ);
}
