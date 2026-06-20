// =====================
// 結晶ビューア：共通設定
// =====================
export const A = 2;
export const H = A / 2;

export const COLORS = {
  metal: 0x0077d9,
  anion: 0x006ee6,
  cation: 0xff8a00,
  frame: 0x111111,
  plane: 0xff5252,
  prism: 0xffe082,
  warning: 0xff1744,
};

export const CRYSTALS = {
  metal: {
    label: '金属結晶',
    defaultType: 'bcc',
    types: {
      bcc: {
        label: '体心立方構造 BCC',
        shortLabel: '体心立方 BCC',
      },
      fcc: {
        label: '面心立方構造 FCC',
        shortLabel: '面心立方 FCC',
      },
      hcp: {
        label: '六方最密充填構造 HCP',
        shortLabel: '六方最密 HCP',
      },
    },
  },
  ionic: {
    label: 'イオン結晶',
    defaultType: 'nacl',
    types: {
      nacl: {
        label: 'NaCl型',
        shortLabel: 'NaCl型',
      },
      cscl: {
        label: '塩化セシウム型 CsCl',
        shortLabel: 'CsCl型',
      },
      zincblende: {
        label: 'せん亜鉛鉱型 ZnS',
        shortLabel: 'せん亜鉛鉱型',
      },
    },
  },
};

// 半径比則による教材用の目安。
// ratio = r(陽イオン) / r(陰イオン)
export const ION_RADIUS_RATIO_RULES = {
  zincblende: {
    label: 'せん亜鉛鉱型 ZnS',
    coordination: '4配位・正四面体型',
    min: 0.225,
    max: 0.414,
    minInclusive: true,
    maxInclusive: false,
    tooSmall: '陽イオンが小さすぎます。4配位より少ない配位が有利になりやすい目安です。',
    tooLarge: '陽イオンが大きすぎます。NaCl型のような6配位構造が有利になりやすい目安です。',
  },
  nacl: {
    label: 'NaCl型',
    coordination: '6配位・正八面体型',
    min: 0.414,
    max: 0.732,
    minInclusive: true,
    maxInclusive: false,
    tooSmall: '陽イオンが小さすぎます。せん亜鉛鉱型のような4配位構造が有利になりやすい目安です。',
    tooLarge: '陽イオンが大きすぎます。CsCl型のような8配位構造が有利になりやすい目安です。',
  },
  cscl: {
    label: '塩化セシウム型 CsCl',
    coordination: '8配位・立方体型',
    min: 0.732,
    max: 1.0,
    minInclusive: true,
    maxInclusive: true,
    tooSmall: '陽イオンが小さすぎます。NaCl型のような6配位構造が有利になりやすい目安です。',
    tooLarge: '陽イオンが陰イオンより大きい設定です。半径比則の単純モデルでは標準範囲外として扱います。',
  },
};

export const ION_DEFAULTS = {
  // 1.00 で最近接の陽イオン・陰イオンが接する大きさ。
  // 少し下げると重なりが減り、全体形状を見やすくできます。
  ionSizeScale: 1.0,
  radiusRatioByType: {
    zincblende: 0.35,
    nacl: 0.52,
    cscl: 0.82,
  },
};

export function isMetal(state) {
  return state.crystalCategory === 'metal';
}

export function isIonic(state) {
  return state.crystalCategory === 'ionic';
}

export function isHCP(state) {
  return isMetal(state) && state.crystalType === 'hcp';
}

export function getCrystalName(state) {
  return `${CRYSTALS[state.crystalCategory].label}：${CRYSTALS[state.crystalCategory].types[state.crystalType].label}`;
}

export function getHCPParams() {
  const side = 1.0;                   // 六角形の外接半径 = 六角形の一辺
  const r = side / 2;                 // 球が接する半径
  const c = Math.sqrt(8 / 3) * side;  // 理想HCPの c/a
  return { side, r, c };
}

export function getMetalRadius(state) {
  if (state.crystalType === 'bcc') return Math.sqrt(3) * A / 4;
  if (state.crystalType === 'fcc') return Math.sqrt(2) * A / 4;
  return getHCPParams().r;
}

export function getIonRadiusRatio(state) {
  const fallback = ION_DEFAULTS.radiusRatioByType[state.crystalType] ?? 0.52;
  return Number.isFinite(state.ionRadiusRatio) ? state.ionRadiusRatio : fallback;
}

export function getIonSizeScale(state) {
  return Number.isFinite(state.ionSizeScale) ? state.ionSizeScale : ION_DEFAULTS.ionSizeScale;
}

// 各イオン結晶で、最近接の陽イオン・陰イオンの中心間距離。
export function getIonicContactDistance(state) {
  if (state.crystalType === 'cscl') return Math.sqrt(3) * A / 2;
  if (state.crystalType === 'zincblende') return Math.sqrt(3) * A / 4;
  return A / 2; // NaCl型
}

// 最近接の陽イオン・陰イオンが接するように、半径比から半径を自動計算します。
export function getIonRadii(state) {
  const ratio = getIonRadiusRatio(state);
  const scale = getIonSizeScale(state);
  const contactDistance = getIonicContactDistance(state) * scale;
  const anion = contactDistance / (1 + ratio);

  return {
    anion,
    cation: anion * ratio,
    ratio,
    scale,
    contactDistance,
  };
}

function isWithinRule(ratio, rule) {
  const lowerOk = rule.minInclusive ? ratio >= rule.min : ratio > rule.min;
  const upperOk = rule.maxInclusive ? ratio <= rule.max : ratio < rule.max;
  return lowerOk && upperOk;
}

export function getPredictedStructureFromRatio(ratio) {
  if (ratio < 0.155) return '2配位・直線型の範囲';
  if (ratio < 0.225) return '3配位・三角形型の範囲';
  if (ratio < 0.414) return '4配位・せん亜鉛鉱型などの範囲';
  if (ratio < 0.732) return '6配位・NaCl型などの範囲';
  if (ratio <= 1.0) return '8配位・CsCl型などの範囲';
  return '半径比 r+/r- > 1 の範囲';
}

export function getIonicStability(state) {
  if (!isIonic(state)) return null;

  const ratio = getIonRadiusRatio(state);
  const rule = ION_RADIUS_RATIO_RULES[state.crystalType];
  const stable = isWithinRule(ratio, rule);
  const predicted = getPredictedStructureFromRatio(ratio);

  let status = '適合';
  let message = `${rule.label}の目安範囲に入っています。`;

  if (!stable) {
    if (ratio < rule.min) {
      status = '不安定の可能性：陽イオンが小さすぎる';
      message = rule.tooSmall;
    } else {
      status = '不安定の可能性：陽イオンが大きすぎる';
      message = rule.tooLarge;
    }
  }

  return {
    ratio,
    stable,
    status,
    message,
    predicted,
    rule,
  };
}

export function getParticleNumberInCell(state) {
  if (isIonic(state)) return null;
  if (state.crystalType === 'bcc') return 2;
  if (state.crystalType === 'fcc') return 4;
  return 6;
}

export function getFillingRate(state) {
  if (isIonic(state)) return null;

  if (state.crystalType === 'hcp') return Math.PI / (3 * Math.sqrt(2));

  const r = getMetalRadius(state);
  return (getParticleNumberInCell(state) * (4 / 3) * Math.PI * Math.pow(r, 3)) / Math.pow(A, 3);
}

export function getRelationText(state) {
  if (isMetal(state)) {
    if (state.crystalType === 'bcc') return 'BCC：4r = √3a、単位格子中の原子数 = 2、充填率 ≒ 68.0%';
    if (state.crystalType === 'fcc') return 'FCC：4r = √2a、単位格子中の原子数 = 4、充填率 ≒ 74.0%';
    return 'HCP：ABAB型、理想比 c/a = √(8/3)、六角柱単位格子中の粒子数 = 6、充填率 ≒ 74.0%';
  }

  if (state.crystalType === 'nacl') {
    return 'NaCl型：陰イオンが面心立方格子、陽イオンが正八面体型のすき間に入る構造。単位格子中は陽イオン4個、陰イオン4個。';
  }
  if (state.crystalType === 'cscl') {
    return 'CsCl型：陰イオンが立方体の8つの頂点、陽イオンが体心に入る構造。単位格子中は陽イオン1個、陰イオン1個。';
  }
  return 'せん亜鉛鉱型：陰イオンが面心立方格子、陽イオンが正四面体型のすき間の半分に入る構造。単位格子中は陽イオン4個、陰イオン4個。';
}

export function getCountText(state) {
  if (isMetal(state)) {
    if (state.crystalType === 'bcc') {
      return '角：8 × 1/8 = 1<br>体心：1 × 1 = 1<br>合計：2個';
    }
    if (state.crystalType === 'fcc') {
      return '角：8 × 1/8 = 1<br>面心：6 × 1/2 = 3<br>合計：4個';
    }
    return '六角柱単位格子内の粒子数：6個<br>ABAB型の最密充填<br>六角柱の3分の1では、粒子数は2個に対応します。';
  }

  if (state.crystalType === 'nacl') {
    return '陰イオン：角 8 × 1/8 = 1、面心 6 × 1/2 = 3、合計 4個<br>陽イオン：辺心 12 × 1/4 = 3、体心 1 × 1 = 1、合計 4個<br>組成比 陽イオン：陰イオン = 1：1';
  }

  if (state.crystalType === 'cscl') {
    return '陰イオン：角 8 × 1/8 = 1<br>陽イオン：体心 1 × 1 = 1<br>組成比 陽イオン：陰イオン = 1：1';
  }

  return '陰イオン：面心立方格子として合計 4個<br>陽イオン：内部の正四面体型すき間に 4個<br>組成比 陽イオン：陰イオン = 1：1';
}

export function getIonicAnalysisHTML(state) {
  const result = getIonicStability(state);
  if (!result) return '';

  const { anion, cation, ratio, scale } = getIonRadii(state);
  const statusColor = result.stable ? '#1b5e20' : '#b71c1c';
  const range = `${result.rule.min.toFixed(3)} ≦ r<sup>+</sup>/r<sup>-</sup> ${result.rule.maxInclusive ? '≦' : '&lt;'} ${result.rule.max.toFixed(3)}`;

  return `
    <div style="margin-top:8px; padding:8px; background:#f5f5f5; border-radius:8px; border:1px solid #ddd;">
      <b>半径比による考察</b><br>
      現在の半径比：r<sup>+</sup>/r<sup>-</sup> = <b>${ratio.toFixed(3)}</b><br>
      表示半径：r<sup>-</sup> = ${anion.toFixed(3)}、r<sup>+</sup> = ${cation.toFixed(3)}、接触表示倍率 = ${scale.toFixed(2)}<br>
      この構造の目安：${result.rule.coordination}、${range}<br>
      判定：<b style="color:${statusColor};">${result.status}</b><br>
      予想されやすい配位：${result.predicted}<br>
      ${result.message}<br>
      <span style="font-size:12px; color:#555;">※ 表示上は最近接の陽イオン・陰イオンが接するように半径を自動計算しています。半径比則は教材用の目安です。実際の結晶構造は、電荷、結合性、格子エネルギーなどにも影響されます。</span>
    </div>
  `;
}

export function getLegendText(state) {
  if (!isIonic(state)) return '';
  const { anion, cation, ratio, scale } = getIonRadii(state);
  return `
    <div style="margin-top:6px;">
      <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#43a5f5;"></span> 陰イオン r<sup>-</sup> = ${anion.toFixed(2)}　
      <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#ffb74d;"></span> 陽イオン r<sup>+</sup> = ${cation.toFixed(2)}　
      r<sup>+</sup>/r<sup>-</sup> = ${ratio.toFixed(3)}　表示倍率 = ${scale.toFixed(2)}
    </div>
  `;
}
