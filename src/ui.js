import { CRYSTALS, ION_DEFAULTS, getIonRadii, isHCP, isIonic } from './config.js';

export function createUI(ctx, handlers) {
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
  ui.style.boxSizing = 'border-box';
  ui.style.width = '500px';
  ui.style.maxHeight = 'calc(100vh - 32px)';
  ui.style.overflowY = 'auto';

  ui.innerHTML = `
    <div style="font-weight:bold; margin-bottom:8px;">結晶構造ビューア</div>

    <div style="margin-bottom:8px;">
      <div style="font-weight:bold; margin-bottom:4px;">1. 結晶の種類</div>
      <button id="cat-metal">金属結晶</button>
      <button id="cat-ionic">イオン結晶</button>
    </div>

    <div style="margin-bottom:8px;">
      <div id="structure-title" style="font-weight:bold; margin-bottom:4px;">2. 構造</div>
      <div id="structure-buttons" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
    </div>

    <div id="ionic-ui" style="display:none; margin:10px 0; padding:8px; background:#f7fbff; border:1px solid #d0e7ff; border-radius:8px;">
      <div style="font-weight:bold; margin-bottom:6px;">イオン半径の設定</div>

      <div>接触表示倍率：<span id="ion-size-scale-value">1.00</span></div>
      <input id="ion-size-scale" type="range" min="0.70" max="1.08" value="1.00" step="0.01" style="width:100%;">

      <div style="margin-top:6px;">半径比 r<sup>+</sup>/r<sup>-</sup>：<span id="radius-ratio-value">0.520</span></div>
      <input id="radius-ratio" type="range" min="0.10" max="1.20" value="0.52" step="0.001" style="width:100%;">

      <div style="margin-top:6px;">
        陰イオン半径 r<sup>-</sup>：<span id="anion-radius-value">0.66</span>　
        陽イオン半径 r<sup>+</sup>：<span id="cation-radius-value">0.34</span>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">
        <button id="ratio-zincblende">4配位 0.35</button>
        <button id="ratio-nacl">6配位 0.52</button>
        <button id="ratio-cscl">8配位 0.82</button>
      </div>

      <div style="font-size:12px; color:#555; margin-top:6px;">
        表示倍率1.00では、最近接の陽イオン・陰イオンが接するように自動計算します。<br>
        半径比を変えると、粒子の大きさと安定判定が連動します。
      </div>
    </div>

    <div style="margin-bottom:8px;">
      <div style="font-weight:bold; margin-bottom:4px;">3. 表示モード</div>
      <button id="mode-full">結晶構造いっぱい</button>
      <button id="mode-unit">単位格子</button>
      <button id="mode-cut">単位格子カット</button>
      <button id="mode-hcp-third">HCP 1/3カット</button>
      <button id="mode-slice">単位格子 任意断面</button>
      <button id="mode-full-slice">結晶いっぱい 任意断面</button>
    </div>

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

  const viewUi = document.createElement('div');
  viewUi.style.position = 'fixed';
  viewUi.style.right = '16px';
  viewUi.style.top = '16px';
  viewUi.style.padding = '10px';
  viewUi.style.background = 'rgba(255,255,255,0.90)';
  viewUi.style.border = '1px solid #ccc';
  viewUi.style.borderRadius = '10px';
  viewUi.style.fontFamily = 'sans-serif';
  viewUi.style.fontSize = '13px';
  viewUi.style.zIndex = '10';
  viewUi.style.boxSizing = 'border-box';
  viewUi.style.maxWidth = '270px';
  viewUi.innerHTML = `
    <div style="font-weight:bold; margin-bottom:6px;">角度設定</div>
    <div id="view-buttons" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
    <div style="font-size:11px; color:#555; margin-top:6px; line-height:1.35;">
      ボタンを押すと、現在の構造を見やすい大きさに自動調整します。
    </div>
  `;
  document.body.appendChild(viewUi);

  const viewPresets = [
    { key: 'cool', label: '初期' },
    { key: 'diagonal', label: '斜め上' },
    { key: 'front', label: '正面' },
    { key: 'side', label: '横' },
    { key: 'top', label: '真上' },
  ];

  function createViewButtons() {
    const container = document.getElementById('view-buttons');
    container.innerHTML = '';

    for (const preset of viewPresets) {
      const btn = document.createElement('button');
      btn.id = `view-${preset.key}`;
      btn.textContent = preset.label;
      btn.style.fontSize = '12px';
      btn.style.padding = '4px 8px';
      btn.onclick = () => handlers.setCameraPreset(preset.key);
      container.appendChild(btn);
    }
  }

  function updateActiveViewButtons() {
    for (const preset of viewPresets) {
      setButtonActive(document.getElementById(`view-${preset.key}`), ctx.state.cameraPreset === preset.key);
    }
  }

  function applyUiResponsiveWidth() {
    if (window.innerWidth < 900) {
      ui.style.width = 'min(500px, calc(100vw - 32px))';
      viewUi.style.right = '16px';
      viewUi.style.top = '16px';
      viewUi.style.maxWidth = '220px';
    } else {
      ui.style.width = '500px';
      viewUi.style.right = '16px';
      viewUi.style.top = '16px';
      viewUi.style.maxWidth = '270px';
    }
  }
  applyUiResponsiveWidth();
  window.addEventListener('resize', applyUiResponsiveWidth);

  const info = document.getElementById('info');
  const sliceUi = document.getElementById('slice-ui');
  const ionicUi = document.getElementById('ionic-ui');

  function setButtonActive(button, active) {
    if (!button) return;
    button.style.background = active ? '#263238' : '';
    button.style.color = active ? '#ffffff' : '';
    button.style.borderRadius = '4px';
  }

  function updateSliderLabels() {
    document.getElementById('angle-x-value').textContent = ctx.state.sliceAngleX;
    document.getElementById('angle-y-value').textContent = ctx.state.sliceAngleY;
    document.getElementById('offset-value').textContent = ctx.state.sliceOffset.toFixed(2);
  }

  function updateIonicControls() {
    ionicUi.style.display = isIonic(ctx.state) ? 'block' : 'none';

    const sizeScaleInput = document.getElementById('ion-size-scale');
    const ratioInput = document.getElementById('radius-ratio');

    sizeScaleInput.value = ctx.state.ionSizeScale;
    ratioInput.value = ctx.state.ionRadiusRatio;

    const { anion, cation, ratio, scale } = getIonRadii(ctx.state);
    document.getElementById('ion-size-scale-value').textContent = scale.toFixed(2);
    document.getElementById('anion-radius-value').textContent = anion.toFixed(2);
    document.getElementById('radius-ratio-value').textContent = ratio.toFixed(3);
    document.getElementById('cation-radius-value').textContent = cation.toFixed(2);
  }

  function updateActiveButtons() {
    setButtonActive(document.getElementById('cat-metal'), ctx.state.crystalCategory === 'metal');
    setButtonActive(document.getElementById('cat-ionic'), ctx.state.crystalCategory === 'ionic');

    for (const typeKey of Object.keys(CRYSTALS[ctx.state.crystalCategory].types)) {
      setButtonActive(document.getElementById(`structure-${typeKey}`), ctx.state.crystalType === typeKey);
    }

    const hcpThirdButton = document.getElementById('mode-hcp-third');
    hcpThirdButton.style.display = isHCP(ctx.state) ? 'inline-block' : 'none';

    for (const mode of ['full', 'unit', 'cut', 'slice', 'full-slice', 'hcp-third']) {
      setButtonActive(document.getElementById(`mode-${mode}`), ctx.state.currentMode === mode);
    }

    updateActiveViewButtons();
  }

  function renderStructureButtons() {
    const container = document.getElementById('structure-buttons');
    container.innerHTML = '';

    document.getElementById('structure-title').textContent = `2. 構造（${CRYSTALS[ctx.state.crystalCategory].label}）`;

    for (const [typeKey, typeData] of Object.entries(CRYSTALS[ctx.state.crystalCategory].types)) {
      const btn = document.createElement('button');
      btn.id = `structure-${typeKey}`;
      btn.textContent = typeData.shortLabel;
      btn.onclick = () => handlers.setStructure(typeKey);
      container.appendChild(btn);
    }

    updateActiveButtons();
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
          ctx.state.sliceAngleX = deg;
          document.getElementById('angle-x').value = deg;
        } else {
          ctx.state.sliceAngleY = deg;
          document.getElementById('angle-y').value = deg;
        }
        updateSliderLabels();
        handlers.refreshSlice();
      };

      container.appendChild(btn);
    }
  }

  document.getElementById('cat-metal').onclick = () => handlers.setCategory('metal');
  document.getElementById('cat-ionic').onclick = () => handlers.setCategory('ionic');

  document.getElementById('mode-full').onclick = () => handlers.setMode('full');
  document.getElementById('mode-unit').onclick = () => handlers.setMode('unit');
  document.getElementById('mode-cut').onclick = () => handlers.setMode('cut');
  document.getElementById('mode-hcp-third').onclick = () => handlers.setMode('hcp-third');
  document.getElementById('mode-slice').onclick = () => handlers.setMode('slice');
  document.getElementById('mode-full-slice').onclick = () => handlers.setMode('full-slice');

  document.getElementById('angle-x').oninput = (e) => {
    ctx.state.sliceAngleX = Number(e.target.value);
    updateSliderLabels();
    handlers.refreshSlice();
  };

  document.getElementById('angle-y').oninput = (e) => {
    ctx.state.sliceAngleY = Number(e.target.value);
    updateSliderLabels();
    handlers.refreshSlice();
  };

  document.getElementById('offset').oninput = (e) => {
    ctx.state.sliceOffset = Number(e.target.value);
    updateSliderLabels();
    handlers.refreshSlice();
  };

  document.getElementById('ion-size-scale').oninput = (e) => {
    ctx.state.ionSizeScale = Number(e.target.value);
    updateIonicControls();
    handlers.refreshCrystal();
  };

  document.getElementById('radius-ratio').oninput = (e) => {
    ctx.state.ionRadiusRatio = Number(e.target.value);
    updateIonicControls();
    handlers.refreshCrystal();
  };

  document.getElementById('ratio-zincblende').onclick = () => {
    ctx.state.ionRadiusRatio = ION_DEFAULTS.radiusRatioByType.zincblende;
    updateIonicControls();
    handlers.refreshCrystal();
  };

  document.getElementById('ratio-nacl').onclick = () => {
    ctx.state.ionRadiusRatio = ION_DEFAULTS.radiusRatioByType.nacl;
    updateIonicControls();
    handlers.refreshCrystal();
  };

  document.getElementById('ratio-cscl').onclick = () => {
    ctx.state.ionRadiusRatio = ION_DEFAULTS.radiusRatioByType.cscl;
    updateIonicControls();
    handlers.refreshCrystal();
  };

  createAngleButtons('angle-x-buttons', 'x');
  createAngleButtons('angle-y-buttons', 'y');
  createViewButtons();
  updateSliderLabels();
  updateIonicControls();
  updateActiveViewButtons();

  return {
    info,
    sliceUi,
    renderStructureButtons,
    updateActiveButtons,
    updateActiveViewButtons,
    updateSliderLabels,
    updateIonicControls,
  };
}
