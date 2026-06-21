import { clearSceneObjects } from './scene.js';
import { A, getCrystalName, getCountText, getFillingRate, getHCPParams, getIonicAnalysisHTML, getLegendText, getRelationText, isHCP, isMetal } from './config.js';
import { getCurrentParticles, getHCPBlockParticles, getHCPCutParticles } from './particles.js';
import {
  addCapsForParticles,
  addCutUnitByClipping,
  addFullUnit,
  addSphere,
  addHCPFrame,
  addHCPThirdFrame,
  addHCPThirdPrismFacePlanes,
  addMetalCutUnitAsParts,
  addSlicePlaneVisual,
  addUnitCellFrame,
  getHCPClippingPlanes,
  getHCPThirdClippingPlanes,
  getSlicePlane,
  getUnitClippingPlanes,
} from './drawing.js';

export function refreshCurrentSliceMode(ctx) {
  if (ctx.state.currentMode === 'slice') showSliceMode(ctx);
  if (ctx.state.currentMode === 'full-slice') showFullSliceMode(ctx);
}

export function showFullCrystal(ctx) {
  clearSceneObjects(ctx);
  ctx.ui.sliceUi.style.display = 'none';

  if (isHCP(ctx.state)) {
    const particles = getHCPBlockParticles(ctx.state);
    for (const p of particles) {
      addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color);
    }
  } else {
    const range = [-2, 0, 2];

    for (const x of range) {
      for (const y of range) {
        for (const z of range) {
          addFullUnit(ctx, x, y, z);
        }
      }
    }
  }

  ctx.ui.info.innerHTML = `
    <b>${getCrystalName(ctx.state)}：結晶構造いっぱい版</b><br>
    ${isHCP(ctx.state) ? 'HCPはABAB配列を9層に増やし、全体が立方体状に見えるように表示しています。' : '単位格子がくり返し並ぶ様子です。'}<br>
    ${getRelationText(ctx.state)}
    ${getLegendText(ctx.state)}
    ${getIonicAnalysisHTML(ctx.state)}
  `;
}

export function showUnitCell(ctx) {
  clearSceneObjects(ctx);
  ctx.ui.sliceUi.style.display = 'none';

  if (isHCP(ctx.state)) {
    addHCPFrame(ctx);
  } else {
    addUnitCellFrame(ctx, A);
  }

  addFullUnit(ctx);

  ctx.ui.info.innerHTML = `
    <b>${getCrystalName(ctx.state)}：単位格子版</b><br>
    粒子を切らずに表示しています。<br>
    ${getRelationText(ctx.state)}
    ${getLegendText(ctx.state)}
    ${getIonicAnalysisHTML(ctx.state)}
  `;
}

export function showCutUnitCell(ctx) {
  clearSceneObjects(ctx);
  ctx.ui.sliceUi.style.display = 'none';

  if (isHCP(ctx.state)) addHCPFrame(ctx);
  else addUnitCellFrame(ctx, A);

  if (isMetal(ctx.state)) {
    addMetalCutUnitAsParts(ctx);
  } else {
    addCutUnitByClipping(ctx);
  }

  const fillingText = isMetal(ctx.state)
    ? `<br>充填率：約 ${(getFillingRate(ctx.state) * 100).toFixed(1)}%`
    : '<br>※ イオン半径は見やすさ優先の表示用サイズです。';

  ctx.ui.info.innerHTML = `
    <b>${getCrystalName(ctx.state)}：単位格子カット版</b><br>
    ${getCountText(ctx.state)}
    ${fillingText}
    ${getLegendText(ctx.state)}
    ${getIonicAnalysisHTML(ctx.state)}
  `;
}



export function showHCPThirdCut(ctx) {
  if (!isHCP(ctx.state)) {
    showCutUnitCell(ctx);
    return;
  }

  clearSceneObjects(ctx);
  ctx.ui.sliceUi.style.display = 'none';

  const planes = getHCPThirdClippingPlanes();
  addHCPThirdPrismFacePlanes(ctx);
  addHCPThirdFrame(ctx);
  for (const p of getHCPCutParticles(ctx.state)) {
    addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color, planes);
  }
  addCapsForParticles(ctx, getHCPCutParticles(ctx.state), planes);

  ctx.ui.info.innerHTML = `
    <b>${getCrystalName(ctx.state)}：六角柱の3分の1カット</b><br>
    六角柱単位格子を中心軸から120°分だけ残した表示です。<br>
    120°は360°の3分の1なので、六角柱の3分の1に対応します。<br>
    この部分は、HCPを「2個分の粒子を含む基本単位」として見るときの説明に使えます。<br>
    ${getCountText(ctx.state)}<br>
    充填率：約 ${(getFillingRate(ctx.state) * 100).toFixed(1)}%
  `;
}

export function showSliceMode(ctx) {
  clearSceneObjects(ctx);
  ctx.ui.sliceUi.style.display = 'block';

  const slicePlane = getSlicePlane(ctx.state);

  let basePlanes;
  if (isHCP(ctx.state)) {
    basePlanes = getHCPClippingPlanes();
    addHCPFrame(ctx);
  } else {
    basePlanes = getUnitClippingPlanes();
    addUnitCellFrame(ctx, A);
  }

  const allPlanes = [...basePlanes, slicePlane];

  if (isHCP(ctx.state)) {
    const particles = getHCPCutParticles(ctx.state);
    for (const p of particles) {
      addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color, allPlanes);
    }
    addCapsForParticles(ctx, particles, allPlanes);
  } else {
    addFullUnit(ctx, 0, 0, 0, allPlanes);
    addCapsForParticles(ctx, getCurrentParticles(ctx.state), allPlanes);
  }
  addSlicePlaneVisual(ctx, slicePlane, isHCP(ctx.state) ? 3.8 : 3.4);

  const fillingText = isMetal(ctx.state)
    ? `<br>充填率：約 ${(getFillingRate(ctx.state) * 100).toFixed(1)}%`
    : '<br>イオン結晶も同じ操作で任意断面を確認できます。';

  ctx.ui.info.innerHTML = `
    <b>${getCrystalName(ctx.state)}：単位格子 任意断面</b><br>
    単位格子カット版を任意角度で切っています。
    ${fillingText}
    ${getLegendText(ctx.state)}
    ${getIonicAnalysisHTML(ctx.state)}
  `;
}

export function showFullSliceMode(ctx) {
  clearSceneObjects(ctx);
  ctx.ui.sliceUi.style.display = 'block';

  const slicePlane = getSlicePlane(ctx.state);

  if (isHCP(ctx.state)) {
    const particles = getHCPBlockParticles(ctx.state);

    for (const p of particles) {
      addSphere(ctx, p.center.x, p.center.y, p.center.z, p.radius, p.color, [slicePlane]);
    }
    addCapsForParticles(ctx, particles, [slicePlane]);

    addSlicePlaneVisual(ctx, slicePlane, 8.0);
  } else {
    const range = [-2, 0, 2];

    for (const x of range) {
      for (const y of range) {
        for (const z of range) {
          addFullUnit(ctx, x, y, z, [slicePlane]);
          addCapsForParticles(ctx, getCurrentParticles(ctx.state, x, y, z), [slicePlane]);
        }
      }
    }

    addSlicePlaneVisual(ctx, slicePlane, 8.0);
  }

  ctx.ui.info.innerHTML = `
    <b>${getCrystalName(ctx.state)}：結晶いっぱい 任意断面</b><br>
    繰り返し構造全体を任意角度で切っています。<br>
    15度ボタンで角度をすぐ変更できます。
    ${getLegendText(ctx.state)}
    ${getIonicAnalysisHTML(ctx.state)}
  `;
}

export function setMode(ctx, mode) {
  if (mode === 'hcp-third' && !isHCP(ctx.state)) mode = 'cut';
  ctx.state.currentMode = mode;
  ctx.ui.updateActiveButtons();

  if (mode === 'full') showFullCrystal(ctx);
  if (mode === 'unit') showUnitCell(ctx);
  if (mode === 'cut') showCutUnitCell(ctx);
  if (mode === 'slice') showSliceMode(ctx);
  if (mode === 'full-slice') showFullSliceMode(ctx);
  if (mode === 'hcp-third') showHCPThirdCut(ctx);

  ctx.ui.updateActiveButtons();
}
