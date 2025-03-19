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
export function audioBrightness(
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
  const spectralCentroid = weightedSum / total;

  // 计算高频能量占比（4kHz以上）
  const nyquist = sampleRate / 2;
  const startBin = Math.floor((4000 / nyquist) * frequencyData.length);
  let highEnergy = 0;
  for (let i = startBin; i < frequencyData.length; i++) {
    highEnergy += frequencyData[i];
  }
  const highRatio = highEnergy / total;

  return { spectralCentroid, highRatio };
}

/** 计算尖锐程度 */
export function audioSharpness(frequencyData: Uint8Array) {
  // 寻找基频
  let maxAmp = 0,
    fundamentalBin = 0;
  for (let i = 0; i < 200; i++) {
    // 仅检查低频段
    if (frequencyData[i] > maxAmp) {
      maxAmp = frequencyData[i];
      fundamentalBin = i;
    }
  }

  // 计算奇偶谐波比
  let oddEnergy = 0,
    evenEnergy = 0;
  for (let n = 2; n <= 8; n++) {
    // 取前8个谐波
    const harmonicBin = fundamentalBin * n;
    if (harmonicBin >= frequencyData.length) break;

    n % 2 === 0
      ? (evenEnergy += frequencyData[harmonicBin])
      : (oddEnergy += frequencyData[harmonicBin]);
  }
  const oddEvenRatio = oddEnergy / (evenEnergy + oddEnergy);

  return { oddEnergy, evenEnergy, oddEvenRatio };
}

/** 分析瞬态特征 */
export function audioTransient(timeDomainData: Uint8Array, sampleRate: number) {
  // 计算上升时间（10%到90%）
  const thresholdLow = 128 + (255 - 128) * 0.1;
  const thresholdHigh = 128 + (255 - 128) * 0.9;

  let attackStart = -1,
    attackEnd = -1;
  for (let i = 0; i < timeDomainData.length; i++) {
    if (timeDomainData[i] > thresholdLow && attackStart === -1) {
      attackStart = i;
    }
    if (timeDomainData[i] > thresholdHigh && attackEnd === -1) {
      attackEnd = i;
    }
  }

  const attackTime = ((attackEnd - attackStart) / sampleRate) * 1000; // ms
  return {
    attackTime,
    isSharpTransient: attackTime < 50, // <50ms为强烈瞬态
    attackSlope:
      (timeDomainData[attackEnd] - timeDomainData[attackStart]) /
      (attackTime || 1),
  };
}

/** 计算振幅波动 */
export function audioFluctuation(timeDomainData: Uint8Array) {
  // 计算标准差
  let sum = 0,
    sumSq = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    sum += timeDomainData[i];
    sumSq += timeDomainData[i] ** 2;
  }
  const mean = sum / timeDomainData.length;
  const stdDev = Math.sqrt(sumSq / timeDomainData.length - mean ** 2);

  // 计算过零率
  let zeroCross = 0;
  for (let i = 1; i < timeDomainData.length; i++) {
    if ((timeDomainData[i - 1] - 128) * (timeDomainData[i] - 128) < 0)
      zeroCross++;
  }

  return {
    stability: 1 - stdDev / 128, // 0-1, 越大越稳定
    fluctuationRate: zeroCross / (timeDomainData.length / 44100), // Hz
  };
}

/** 计算谐波温暖指数 */
export function audioWarmth(frequencyData: Uint8Array, sampleRate: number) {
  // 寻找基频
  let maxAmp = 0,
    fundamentalBin = 0;
  for (let i = 0; i < 200; i++) {
    // 仅检查低频段
    if (frequencyData[i] > maxAmp) {
      maxAmp = frequencyData[i];
      fundamentalBin = i;
    }
  }
  // 低频谐波能量比（150-600Hz）
  const nyquist = sampleRate;
  const lowStart = Math.floor((150 / nyquist) * frequencyData.length);
  const lowEnd = Math.floor((600 / nyquist) * frequencyData.length);

  let lowHarmonicEnergy = 0;
  for (let i = lowStart; i < lowEnd; i++) {
    lowHarmonicEnergy += frequencyData[i];
  }

  // 二次谐波强度
  const h2Bin = fundamentalBin * 2;
  const h2Strength = h2Bin < frequencyData.length ? frequencyData[h2Bin] : 0;

  // 计算7kHz以上噪声能量
  const noiseStartBin = Math.floor((7000 / nyquist) * frequencyData.length);
  let highNoiseEnergy = 0;
  for (let i = noiseStartBin; i < frequencyData.length; i++) {
    highNoiseEnergy += frequencyData[i];
  }

  // 谐波纯度检测
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

  return {
    warmthIndex: (lowHarmonicEnergy * 0.6 + h2Strength * 0.4) / 255, // 0-1
    isCold: h2Strength < frequencyData[fundamentalBin] * 0.7, // 二次谐波弱于基频70%
  };
}

/** 高频冰冷感检测 */
export function audioColdness(frequencyData: Uint8Array, sampleRate: number) {
  // 寻找基频
  let maxAmp = 0,
    fundamentalBin = 0;
  for (let i = 0; i < 200; i++) {
    // 仅检查低频段
    if (frequencyData[i] > maxAmp) {
      maxAmp = frequencyData[i];
      fundamentalBin = i;
    }
  }
  const nyquist = sampleRate;
  // 计算7kHz以上噪声能量
  const noiseStartBin = Math.floor((7000 / nyquist) * frequencyData.length);
  let highNoiseEnergy = 0;
  for (let i = noiseStartBin; i < frequencyData.length; i++) {
    highNoiseEnergy += frequencyData[i];
  }

  // 谐波纯度检测
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

  return {
    coldness: highNoiseEnergy / (frequencyData.length - noiseStartBin),
    harmonicPeaks,
    isMetallic: harmonicPeaks < 4, // 少于4个清晰谐波峰
  };
}

/** 基频检测(YIN算法) */
export function calculateFundamentalFrequency(
  timeDomainData: Uint8Array | Float32Array,
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

// 共振峰检测（峰值检测法）
export function detectFormants(
  frequencyData: Uint8Array | Float32Array,
  sampleRate: number,
  fftSize: number
): number[] {
  const binWidth = sampleRate / fftSize;
  const smoothed = frequencyData.map((v) => Math.pow(10, v / 10)); // 转换为线性能量

  // 简单平滑处理
  for (let i = 1; i < smoothed.length - 1; i++) {
    smoothed[i] = (smoothed[i - 1] + smoothed[i] + smoothed[i + 1]) / 3;
  }

  // 寻找局部极大值
  const peaks: number[] = [];
  for (let i = 2; i < smoothed.length - 2; i++) {
    if (
      smoothed[i] > smoothed[i - 1] &&
      smoothed[i] > smoothed[i + 1] &&
      smoothed[i] > 0.5 * Math.max(...smoothed)
    ) {
      peaks.push(i * binWidth);
    }
  }

  // 按频率排序并过滤低频（排除基频）
  return peaks
    .filter((f) => f > 200)
    .sort((a, b) => a - b)
    .slice(0, 3); // 取前三个高频峰
}

/** 变化检测器 */
export class FrequencyDetector {
  private maxLength = 20;
  private length = 0;
  private time = 0;
  private times: number[] = [];
  private frequencySeries: number[][] = [];
  init(frequencyData: Uint8Array | Float32Array) {
    this.frequencySeries = new Array(frequencyData.length).fill([]);
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
    const mean = (data?.reduce((a, b) => a + b, 0) || 0) / data.length;
    return Math.sqrt(
      data.map((x) => (x - mean) ** 2).reduce((a, b) => a + b) / data.length
    );
  }
  getSpeed(i: number) {
    const data = this.frequencySeries[i];
    const l = data.length;
    return l < 2
      ? 0
      : (data[l - 1] - data[l - 2]) / this.times[this.times.length - 1];
  }
  clear() {
    this.times = [];
    this.time = 0;
    this.length = 0;
    this.frequencySeries = new Array(this.frequencySeries.length).fill([]);
  }
}
