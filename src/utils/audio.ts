import { PitchDetector } from "pitchy";

/** 根据直方图面积比值获取目标频率 */
export function getFreqX(
  arr: number[] | Uint8Array,
  n: number,
  totalArea?: number
) {
  const total = totalArea ?? getFreqArea(arr);
  if (total == 0) return 0;
  let area = total * n;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    if (area < val) {
      return i + area / val;
    }
    area -= val;
    if (area == 0) return i + 1;
  }
  return arr.length;
}

/** 获取直方图面积 */
export function getFreqArea(arr: number[] | Uint8Array) {
  return (arr as number[]).reduce((prev, cur) => prev + cur, 0);
}

/** 计算谱质心 */
export function calculateSpectralCentroid(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number
) {
  // 计算谱质心
  let total = 0;
  let weightedSum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    const freq = (i * sampleRate) / fftSize;
    weightedSum += frequencyData[i] * freq;
    total += frequencyData[i];
  }
  return weightedSum / total;
}

export function getFrequencyX(
  frequency: number,
  sampleRate: number,
  length: number
) {
  const nyquist = sampleRate / 2;
  return (frequency / nyquist) * length;
}

export function getFrequencyValue(
  index: number,
  sampleRate: number,
  length: number
) {
  const nyquist = sampleRate / 2;
  return (index / length) * nyquist;
}

export function getNote(frequency: number) {
  const standardFrequency = 440;
  return Math.log2((frequency * 32) / standardFrequency) * 12 + 9;
}

export function getNoteFrequency(note: number) {
  const standardFrequency = 440;
  return (standardFrequency / 32) * 2 ** ((note - 9.0) / 12);
}

/** 基频检测(YIN算法) */
export function calculateFundamentalFrequency(
  timeDomainData: Float32Array,
  sampleRate: number
): number {
  const yinThreshold = 0.2; // 典型阈值范围 0.1-0.2
  const bufferSize = timeDomainData.length;
  const yinBuffer = new Float32Array(bufferSize >> 1);

  // Step 1: 计算差分函数
  for (let tau = 0; tau < yinBuffer.length; tau++) {
    yinBuffer[tau] = 0;
    for (let j = 0; j < yinBuffer.length; j++) {
      const delta = timeDomainData[j] - timeDomainData[j + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  // Step 2: 累积均值归一化
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBuffer.length; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Step 3: 绝对阈值搜索
  let tau = 2;
  while (tau < yinBuffer.length) {
    if (yinBuffer[tau] < yinThreshold) {
      while (
        tau + 1 < yinBuffer.length &&
        yinBuffer[tau + 1] < yinBuffer[tau]
      ) {
        tau++;
      }
      break;
    }
    tau++;
  }

  // Step 4: 抛物线插值提高精度
  if (tau === yinBuffer.length || yinBuffer[tau] >= yinThreshold) {
    return 0; // 未检测到有效基频
  }

  const x0 = tau < 1 ? tau : tau - 1;
  const x2 = tau + 1 < yinBuffer.length ? tau + 1 : tau;
  if (x0 === tau) {
    return sampleRate / tau;
  }

  const s0 = yinBuffer[x0];
  const s1 = yinBuffer[tau];
  const s2 = yinBuffer[x2];
  const fractionalTau = tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));

  return sampleRate / fractionalTau;
}

/** 奇偶谐波比 */
export function calculateHarmonicRatio(
  frequencyData: Uint8Array | Float32Array,
  fundamentalFrequency: number,
  sampleRate: number,
  fftSize: number
): number {
  const binWidth = sampleRate / fftSize;
  let oddEnergy = 0;
  let evenEnergy = 0;

  // 计算前10个谐波
  for (let n = 1; n <= 10; n++) {
    const harmonicFreq = fundamentalFrequency * n;
    const bin = Math.round(harmonicFreq / binWidth);
    if (bin >= frequencyData.length) break;

    // 将dB转换为线性能量值
    const energy = Math.pow(10, frequencyData[bin] / 10);

    n % 2 === 0 ? (evenEnergy += energy) : (oddEnergy += energy);
  }

  return evenEnergy !== 0 ? oddEnergy / evenEnergy : 0;
}

/** 计算二次谐波/基频能量比 */
export function calculateHarmonic2Ratio(
  frequencyData: Uint8Array,
  fundamentalFrequency: number,
  sampleRate: number
) {
  const nyquist = sampleRate / 2;
  const fundamentalBin = Math.round(
    (fundamentalFrequency / nyquist) * frequencyData.length
  );

  const h2Bin = fundamentalBin * 2;
  const h2Strength = h2Bin < frequencyData.length ? frequencyData[h2Bin] : 0;

  let harmonicPeaks = 0;
  for (let n = 1; n <= 8; n++) {
    const bin = fundamentalBin * n;
    if (bin >= frequencyData.length) break;
    if (
      frequencyData[bin] > frequencyData[bin - 1] &&
      frequencyData[bin] > frequencyData[bin + 1]
    ) {
      harmonicPeaks++;
    }
  }

  return h2Strength / frequencyData[fundamentalBin]; // 二次谐波/基频能量比，弱于基频70%则寒冷
}

/** 变化检测器 */
export class FrequencyDetector {
  private maxLength = 20;
  private length = 0;
  private time = 0;
  private times: number[] = [];
  private frequencySeries: number[][] = [];
  init(frequencyData: Uint8Array | Float32Array) {
    this.frequencySeries = Array.from(
      { length: frequencyData.length },
      () => []
    );
  }
  push(frequencyData: Uint8Array | Float32Array, time: number) {
    if (this.length == 0) {
      this.times.push(0);
    } else {
      this.times.push(time - this.time);
    }
    if (this.length >= this.maxLength) {
      frequencyData.forEach((n, i) => {
        this.frequencySeries[i].push(n);
        this.frequencySeries[i].shift();
      });
      this.times.shift();
    } else {
      frequencyData.forEach((n, i) => {
        this.frequencySeries[i].push(n);
      });
      this.length += 1;
    }
    this.time = time;
  }
  getStandardDeviation(i: number) {
    const data = this.frequencySeries[i];
    if (!data) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(
      data.map((x) => (x - mean) ** 2).reduce((a, b) => a + b) / data.length
    );
  }
  getSpeed(i: number) {
    const data = this.frequencySeries[i] || [];
    const l = data.length;
    return l < 2
      ? 0
      : (data[l - 1] - data[l - 2]) / this.times[this.times.length - 1];
  }
  getAverageIncrement() {
    const speedList = this.frequencySeries.map((n, i) =>
      Math.max(0, this.getSpeed(i))
    );
    return speedList.reduce((a, b) => a + b, 0) / speedList.length;
  }
  clear() {
    this.times = [];
    this.time = 0;
    this.length = 0;
    this.frequencySeries = new Array(this.frequencySeries.length).fill([]);
  }
}

interface Formant {
  frequency: number; // 共振峰频率 (Hz)
  bandwidth: number; // 带宽 (Hz)
  amplitude: number; // 相对振幅 (dB)
}

// 完整的LPC共振峰检测流程
export function detectFormants(
  timeDomainData: Float32Array,
  sampleRate: number
): Formant[] {
  // 3. 预加重滤波
  const preEmphasized = preEmphasis(timeDomainData, 0.97);

  // 4. 计算LPC系数
  const lpcCoeffs = computeLPC(preEmphasized, 14);

  // 5. 转换为共振峰参数
  return lpcToFormants(lpcCoeffs, sampleRate);
}

function preEmphasis(buffer: Float32Array, coeff: number): Float32Array {
  const out = new Float32Array(buffer.length);
  out[0] = buffer[0];
  for (let i = 1; i < buffer.length; i++) {
    out[i] = buffer[i] - coeff * buffer[i - 1];
  }
  return out;
}

// 计算LPC系数（自相关法 + Levinson-Durbin算法）
function computeLPC(buffer: Float32Array, order: number): Float32Array {
  const autoCorr = new Float32Array(order + 1);

  // 计算自相关系数
  for (let i = 0; i <= order; i++) {
    autoCorr[i] = 0;
    for (let j = 0; j < buffer.length - i; j++) {
      autoCorr[i] += buffer[j] * buffer[j + i];
    }
  }

  // Levinson-Durbin递归
  const lpc = new Float32Array(order + 1);
  const err = new Float32Array(order + 1);
  err[0] = autoCorr[0];

  for (let k = 1; k <= order; k++) {
    let lambda = 0;
    for (let m = 0; m < k; m++) {
      lambda -= lpc[m] * autoCorr[k - m];
    }
    lambda /= err[k - 1];

    for (let n = k; n > 0; n--) {
      lpc[n] = lpc[n] + lambda * lpc[k - n];
    }

    lpc[k] = lambda;
    err[k] = err[k - 1] * (1 - lambda * lambda);
  }

  return lpc.slice(1); // 返回a[1..p]
}

// 将LPC系数转换为共振峰参数
function lpcToFormants(lpcCoeffs: Float32Array, sampleRate: number): Formant[] {
  const roots = findPolynomialRoots(lpcCoeffs);
  const formants: Formant[] = [];

  roots.forEach((root) => {
    // 转换为极坐标形式
    const r = Math.sqrt(root.re * root.re + root.im * root.im);
    const theta = Math.atan2(root.im, root.re);

    // 计算频率和带宽
    const freq = (theta / (2 * Math.PI)) * sampleRate;
    const bw = (-Math.log(r) / Math.PI) * sampleRate;

    // 过滤有效共振峰
    if (freq > 80 && freq < 4000 && bw < 500) {
      formants.push({
        frequency: freq,
        bandwidth: bw,
        amplitude: 20 * Math.log10(1 / (1 - r)), // 近似振幅
      });
    }
  });

  // 按频率排序并保留前3-5个
  return formants.sort((a, b) => a.frequency - b.frequency).slice(0, 5);
}
// 多项式求根（使用简化的Bairstow方法）
function findPolynomialRoots(
  coeffs: Float32Array
): { re: number; im: number }[] {
  const roots: { re: number; im: number }[] = [];
  const poly = [...coeffs].reverse(); // 转换为a0 + a1*z + ... + an*z^n

  while (poly.length > 2) {
    // 这里应实现完整的Bairstow算法
    // 为简化示例，返回近似解
    const re = -poly[1] / poly[0];
    roots.push({ re, im: 0 });
    poly.shift();
  }

  // 处理二次因子
  if (poly.length === 2) {
    const a = poly[0];
    const b = poly[1];
    const discriminant = b * b - 4 * a;
    if (discriminant >= 0) {
      roots.push({
        re: (-b + Math.sqrt(discriminant)) / (2 * a),
        im: 0,
      });
      roots.push({
        re: (-b - Math.sqrt(discriminant)) / (2 * a),
        im: 0,
      });
    } else {
      roots.push({
        re: -b / (2 * a),
        im: Math.sqrt(-discriminant) / (2 * a),
      });
      roots.push({
        re: -b / (2 * a),
        im: -Math.sqrt(-discriminant) / (2 * a),
      });
    }
  }

  return roots;
}
