const DEFAULT_PRIMARY = [138, 138, 136];
const DEFAULT_SECONDARY = [118, 118, 116];

function parseBucket(key) {
  return key.split(',').map((n) => Number(n));
}

function luminance([r, g, b]) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

function saturateColor([r, g, b], amount = 1.2) {
  const avg = (r + g + b) / 3;
  return [
    Math.max(0, Math.min(255, Math.round(avg + (r - avg) * amount))),
    Math.max(0, Math.min(255, Math.round(avg + (g - avg) * amount))),
    Math.max(0, Math.min(255, Math.round(avg + (b - avg) * amount))),
  ];
}

function bucketPixels(data, { includeGray = true, luminanceMin = 0.14, luminanceMax = 0.88 } = {}) {
  const colorBuckets = new Map();
  const grayBuckets = new Map();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 100) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = luminance([r, g, b]);
    if (lum > luminanceMax || lum < luminanceMin) continue;

    const rq = Math.round(r / 16) * 16;
    const gq = Math.round(g / 16) * 16;
    const bq = Math.round(b / 16) * 16;
    const key = `${rq},${gq},${bq}`;
    const sat = saturation([r, g, b]);

    if (sat < 0.08) {
      if (includeGray) {
        grayBuckets.set(key, (grayBuckets.get(key) || 0) + 1);
      }
      continue;
    }

    const weight = 1 + sat * 2.5;
    colorBuckets.set(key, (colorBuckets.get(key) || 0) + weight);
  }

  return { colorBuckets, grayBuckets };
}

function pickDominantColor(colorBuckets, grayBuckets) {
  const useColor = colorBuckets.size > 0;
  const buckets = useColor ? colorBuckets : grayBuckets;
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const fallback = useColor ? DEFAULT_PRIMARY : DEFAULT_SECONDARY;
  let primary = parseBucket(sorted[0]?.[0] ?? fallback.join(','));

  if (useColor) {
    primary = saturateColor(primary, 1.25);
  }

  return { primary, secondary: primary, isGrayscale: !useColor };
}

/** 앨범 커버에서 대표색을 추출합니다. 컬러·흑백 모두 지원합니다. */
export function extractTopTwoColors(img) {
  try {
    const canvas = document.createElement('canvas');
    const size = 80;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
    }

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let { colorBuckets, grayBuckets } = bucketPixels(data);

    if (colorBuckets.size === 0 && grayBuckets.size === 0) {
      ({ colorBuckets, grayBuckets } = bucketPixels(data, {
        luminanceMin: 0.05,
        luminanceMax: 0.95,
      }));
    }

    return pickDominantColor(colorBuckets, grayBuckets);
  } catch {
    return { primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY };
  }
}

function rgb([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function rgba([r, g, b], a) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function shade([r, g, b], amount) {
  return [
    Math.max(0, Math.min(255, Math.round(r * (1 - amount)))),
    Math.max(0, Math.min(255, Math.round(g * (1 - amount)))),
    Math.max(0, Math.min(255, Math.round(b * (1 - amount)))),
  ];
}

function tint([r, g, b], amount) {
  return [
    Math.max(0, Math.min(255, Math.round(r + (255 - r) * amount))),
    Math.max(0, Math.min(255, Math.round(g + (255 - g) * amount))),
    Math.max(0, Math.min(255, Math.round(b + (255 - b) * amount))),
  ];
}

function mix([r, g, b], [tr, tg, tb], amount) {
  return [
    Math.max(0, Math.min(255, Math.round(r + (tr - r) * amount))),
    Math.max(0, Math.min(255, Math.round(g + (tg - g) * amount))),
    Math.max(0, Math.min(255, Math.round(b + (tb - b) * amount))),
  ];
}

export function buildThemeStyles({ primary, secondary }) {
  const rawBase = primary || secondary || DEFAULT_PRIMARY;
  const base = luminance(rawBase) > 0.68 ? shade(rawBase, 0.22) : rawBase;
  const hero = tint(base, 0.26);
  const playlist = tint(base, 0.08);
  const active = mix(playlist, [0, 0, 0], 0.14);
  const shadow = shade(base, 0.58);

  const textLight = luminance(playlist) < 0.5;

  return {
    '--hero-bg': rgb(hero),
    '--playlist-bg': rgb(playlist),
    '--card-shadow': `0 12px 36px ${rgba(shadow, 0.22)}`,
    '--cover-shadow': `0 6px 14px ${rgba(shadow, 0.34)}`,
    '--hero-shadow': textLight ? `0 3px 10px ${rgba(shadow, 0.09)}` : `0 2px 8px ${rgba(shadow, 0.055)}`,
    '--playlist-inset': textLight ? `inset 0 4px 12px ${rgba(shadow, 0.1)}` : `inset 0 3px 10px ${rgba(shadow, 0.055)}`,
    '--accent': rgb(shade(base, 0.25)),
    '--text-hero': 'rgba(255, 255, 255, 0.96)',
    '--text-hero-muted': 'rgba(255, 255, 255, 0.78)',
    '--text-list': 'rgba(255, 255, 255, 0.96)',
    '--text-list-muted': 'rgba(255, 255, 255, 0.72)',
    '--row-hover': textLight ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.14)',
    '--row-active': rgb(active),
    '--scrollbar': rgb(active),
  };
}
