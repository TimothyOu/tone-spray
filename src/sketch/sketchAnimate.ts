import p5 from "p5";
import { analyser, isAudioPaused, isStream } from "../analyser";
import chroma from "chroma-js";
import { Particle } from "../Painter/Particle";
import { Painter } from "../Painter";
import { AudioPaintGenerator } from "../Audio/AudioPaintGenerator";
import { randomNormalDistribution } from "../utils";
import { defaultAngleFunction } from "../utils/angle";

export const sketchAnimate = (p: p5, painter: Painter) => {
  const audioPaintGenerator = new AudioPaintGenerator(analyser);
  const random = () => Math.random();
  let timestamp = 0;
  const cw = 800;
  const ch = 800;
  let px = 400;
  let py = 400;

  let distanceDeltaSpeedFactor = 100;
  let distanceAverageAmplitudeFactor = 2;
  let distanceAmplitudeFactor = 0.5;
  let distanceRandomFactor = 0;
  let distanceAverageDeltaSpeedFactor = 100;
  let distanceFactor = 1;
  let sizeFactor = 0.2;

  const particleTime = 500;
  const colorScale = chroma.scale("Spectral");

  let particleList: Particle[] = [];

  p.setup = () => {
    timestamp = Date.now();
    p.createCanvas(cw, ch);
    p.clear();
  };
  p.draw = () => {
    if (!isStream() && isAudioPaused()) return;
    p.clear();
    const nt = Date.now();
    const t = nt - timestamp;
    timestamp = nt;
    const {
      points,
      deltaSpeed,
      averageAmplitude,
      fundamentalFrequency,
      fundamentalFrequencyAccuracy,
    } = audioPaintGenerator.getPaintData(t);
    // 更新并渲染老点
    particleList.forEach((pt) => {
      pt.update(t);
      painter.renderParticle(pt);
    });

    // 过滤掉已经到时间的点
    particleList = particleList.filter((pt) => pt.lifetime < pt.time);

    const ff = fundamentalFrequency || 440;
    const ffa = fundamentalFrequency && fundamentalFrequencyAccuracy;
    // 渲染并放置新点
    points.forEach((pt) => {
      const particle = painter.createDynamicParticle(
        px,
        py,
        defaultAngleFunction(pt.frequency, ff, ffa),
        (deltaSpeed * distanceAverageDeltaSpeedFactor +
          pt.deltaSpeed * distanceDeltaSpeedFactor +
          averageAmplitude * distanceAverageAmplitudeFactor +
          pt.amplitude * distanceAmplitudeFactor) *
          (1 +
            randomNormalDistribution(random(), random()) *
              distanceRandomFactor) *
          distanceFactor,
        pt.size * sizeFactor,
        colorScale(Math.sqrt(pt.frequency / 12000))
          //.luminance((spectralCentroid + 2000) / 12000, "hsl")
          .hex(),
        particleTime
      );
      painter.renderParticle(particle);
      particleList.push(particle);
    });
  };
};
