import { CRYSTALS, ION_DEFAULTS } from './config.js';
import { applyCameraPreset, createScene, handleResize, startAnimation } from './scene.js';
import { createUI } from './ui.js';
import { refreshCurrentSliceMode, setMode } from './modes.js';

export function createApp() {
  const state = {
    crystalCategory: 'metal',
    crystalType: CRYSTALS.metal.defaultType,
    currentMode: 'cut',
    sliceAngleX: 0,
    sliceAngleY: 45,
    sliceOffset: 0,
    ionSizeScale: ION_DEFAULTS.ionSizeScale,
    ionRadiusRatio: ION_DEFAULTS.radiusRatioByType[CRYSTALS.ionic.defaultType],
    cameraPreset: 'cool',
  };

  const ctx = {
    state,
    ...createScene(),
  };

  function applyDefaultIonRatioForCurrentType() {
    if (ctx.state.crystalCategory !== 'ionic') return;
    ctx.state.ionRadiusRatio = ION_DEFAULTS.radiusRatioByType[ctx.state.crystalType] ?? ctx.state.ionRadiusRatio;
  }

  function renderCurrentMode(mode = ctx.state.currentMode, resetCamera = true) {
    setMode(ctx, mode);
    if (resetCamera) applyCameraPreset(ctx, ctx.state.cameraPreset);
    ctx.ui.updateActiveViewButtons?.();
  }

  function setCategory(category) {
    ctx.state.crystalCategory = category;
    ctx.state.crystalType = CRYSTALS[category].defaultType;
    applyDefaultIonRatioForCurrentType();
    ctx.ui.renderStructureButtons();
    ctx.ui.updateIonicControls();
    renderCurrentMode(ctx.state.currentMode);
  }

  function setStructure(typeKey) {
    ctx.state.crystalType = typeKey;
    applyDefaultIonRatioForCurrentType();
    ctx.ui.updateIonicControls();
    renderCurrentMode(ctx.state.currentMode);
  }

  function refreshCrystal() {
    renderCurrentMode(ctx.state.currentMode, false);
  }

  function setCameraPreset(presetKey) {
    ctx.state.cameraPreset = presetKey;
    applyCameraPreset(ctx, presetKey);
    ctx.ui.updateActiveViewButtons?.();
  }

  ctx.ui = createUI(ctx, {
    setCategory,
    setStructure,
    setMode: (mode) => renderCurrentMode(mode),
    setCameraPreset,
    refreshSlice: () => refreshCurrentSliceMode(ctx),
    refreshCrystal,
  });

  ctx.ui.renderStructureButtons();
  ctx.ui.updateIonicControls();
  renderCurrentMode(ctx.state.currentMode);

  window.addEventListener('resize', () => handleResize(ctx));
  startAnimation(ctx);
}
