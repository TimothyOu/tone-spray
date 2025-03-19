import { PitchDetector } from "pitchy";
import {
  calculateSpectralCentroid,
  FrequencyDetector,
  getFreqArea,
  getFrequencyValue,
  getFreqX,
  getNote,
} from "../utils";

export interface FreqPointData {
  /** 大小 */
  size: number;
  /** 频率 */
  frequency: number;
  /** 振幅 */
  amplitude: number;
  /** 速度 */
  deltaSpeed: number;
  /** 离散度 */
  deltaStdDev: number;
}

export interface PaintData {
  points: FreqPointData[];
  fundamentalFrequency: number;
  fundamentalFrequencyAccuracy: number;
  spectralCentroid: number;
  deltaSpeed: number;
  sampleRate: number;
  amplitude: number;
  averageAmplitude: number;
}

export class AudioPaintGenerator {
  paintAreaScale = 0.5;
  sizeScale = 1;
  random = () => Math.random(); //seedRandom(7130);
  analyser: AnalyserNode;
  /** 瞬时频率分布数据 */
  frequencyData: Uint8Array<ArrayBuffer>;
  /** 时域分布数据 */
  timeDomainData: Float32Array<ArrayBuffer>;
  frequencyDetector: FrequencyDetector;
  constructor(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    this.timeDomainData = new Float32Array(analyser.fftSize);
    this.frequencyDetector = new FrequencyDetector();
    this.frequencyDetector.init(this.frequencyData);
  }
  // 获取绘制信息
  getPaintData(time: number): PaintData {
    const { frequencyData, timeDomainData, frequencyDetector } = this;
    const analyser = this.analyser;
    analyser.getByteFrequencyData(frequencyData);
    analyser.getFloatTimeDomainData(timeDomainData);

    frequencyDetector.push(frequencyData, Date.now());

    // 总面积
    const area = getFreqArea(frequencyData);
    // 振幅
    const amplitude = Math.max(...frequencyData);

    const averageAmplitude = area / analyser.frequencyBinCount;
    const sampleRate = analyser.context.sampleRate;
    const fftSize = analyser.fftSize;
    const spectralCentroid = calculateSpectralCentroid(
      frequencyData,
      sampleRate,
      fftSize
    );

    const pitchDetector = PitchDetector.forFloat32Array(timeDomainData.length);
    const [fundamentalFrequency, fundamentalFrequencyAccuracy] =
      pitchDetector.findPitch(timeDomainData, sampleRate);
    // console.log(amplitude, averageAmplitude);
    let paintAreaRemain = amplitude * this.paintAreaScale * time;
    const points: FreqPointData[] = [];
    while (paintAreaRemain > 0) {
      const freqx = getFreqX(frequencyData, this.random(), area);
      const freqi = Math.floor(freqx);
      const frequency = getFrequencyValue(
        freqx,
        sampleRate,
        frequencyData.length
      );
      const amplitude = frequencyData[freqi];
      const size = Math.sqrt(amplitude) * this.sizeScale;
      const speed = frequencyDetector.getSpeed(freqi);
      const standardDeviation = frequencyDetector.getStandardDeviation(freqi);
      points.push({
        size,
        amplitude,
        frequency,
        deltaSpeed: speed > 0 ? speed : 0,
        deltaStdDev: standardDeviation,
      });
      paintAreaRemain -= size ** 2;
    }
    const deltaSpeed = frequencyDetector.getAverageIncrement();
    return {
      points,
      fundamentalFrequency,
      fundamentalFrequencyAccuracy,
      spectralCentroid,
      deltaSpeed,
      sampleRate,
      amplitude,
      averageAmplitude,
    };
  }
}
