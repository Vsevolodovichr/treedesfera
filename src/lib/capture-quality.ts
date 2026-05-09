export type CaptureQualityStatus = 'accepted' | 'warning' | 'rejected';

export interface CaptureQualityResult {
  score: number;
  status: CaptureQualityStatus;
  issues: string[];
  metrics: {
    brightness: number;
    brightnessVariance: number;
    blurVariance: number;
    tilt: number;
    composition: number;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function getSampledImageData(canvas: HTMLCanvasElement, maxSize: number) {
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const width = Math.max(1, Math.round(canvas.width * scale));
  const height = Math.max(1, Math.round(canvas.height * scale));
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = width;
  sampleCanvas.height = height;
  const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampleContext) return null;
  sampleContext.drawImage(canvas, 0, 0, width, height);
  return sampleContext.getImageData(0, 0, width, height);
}

function analyzeBrightness(imageData: ImageData) {
  const { data } = imageData;
  let sum = 0;
  let sumSq = 0;
  const count = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const value = luminance(data[i], data[i + 1], data[i + 2]);
    sum += value;
    sumSq += value * value;
  }

  const average = sum / count;
  const variance = Math.max(0, sumSq / count - average * average);
  const brightnessScore =
    average < 0.18
      ? clamp((average / 0.18) * 55, 0, 55)
      : average > 0.86
        ? clamp(((1 - average) / 0.14) * 55, 0, 55)
        : clamp(70 + variance * 140, 70, 100);

  return { average, variance, score: brightnessScore };
}

function analyzeBlur(imageData: ImageData) {
  const { width, height, data } = imageData;
  if (width < 3 || height < 3) return { variance: 0, score: 0 };

  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    gray[p] = luminance(data[i], data[i + 1], data[i + 2]) * 255;
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const laplacian =
        gray[index - width] +
        gray[index - 1] -
        4 * gray[index] +
        gray[index + 1] +
        gray[index + width];
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count += 1;
    }
  }

  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return {
    variance,
    score: clamp(((variance - 18) / 180) * 100, 0, 100),
  };
}

function analyzeComposition(imageData: ImageData) {
  const { width, height, data } = imageData;
  let thirdsEnergy = 0;
  let totalEnergy = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const value = luminance(data[index], data[index + 1], data[index + 2]);
      const nearThird =
        Math.min(
          Math.abs(x / width - 1 / 3),
          Math.abs(x / width - 2 / 3),
          Math.abs(y / height - 1 / 3),
          Math.abs(y / height - 2 / 3),
        ) < 0.08;
      totalEnergy += value;
      if (nearThird) thirdsEnergy += value;
    }
  }

  if (!totalEnergy) return 55;
  return clamp(55 + (thirdsEnergy / totalEnergy) * 90, 55, 100);
}

export function analyzeCaptureQuality(canvas: HTMLCanvasElement, tilt: { beta: number; gamma: number }): CaptureQualityResult {
  const imageData = getSampledImageData(canvas, 180);
  if (!imageData) {
    return {
      score: 0,
      status: 'rejected',
      issues: ['blurry'],
      metrics: {
        brightness: 0,
        brightnessVariance: 0,
        blurVariance: 0,
        tilt: Math.abs(tilt.gamma),
        composition: 0,
      },
    };
  }

  const brightness = analyzeBrightness(imageData);
  const blur = analyzeBlur(imageData);
  const tiltValue = Math.abs(tilt.gamma);
  const tiltScore = clamp(100 - tiltValue * 8, 0, 100);
  const compositionScore = analyzeComposition(imageData);
  const issues: string[] = [];

  if (brightness.average < 0.18) issues.push('too_dark');
  if (brightness.average > 0.86) issues.push('too_bright');
  if (blur.score < 45) issues.push('blurry');
  if (tiltValue > 5) issues.push('crooked');

  const score = Math.round(
    brightness.score * 0.3 +
      blur.score * 0.4 +
      tiltScore * 0.2 +
      compositionScore * 0.1,
  );
  const status: CaptureQualityStatus = score < 40 || issues.includes('too_dark') ? 'rejected' : score < 70 || issues.length > 0 ? 'warning' : 'accepted';

  return {
    score,
    status,
    issues,
    metrics: {
      brightness: brightness.average,
      brightnessVariance: brightness.variance,
      blurVariance: blur.variance,
      tilt: tiltValue,
      composition: compositionScore,
    },
  };
}
