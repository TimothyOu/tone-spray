import p5 from "p5";
import { analyser, isAudioPaused, isStream } from "../analyser";
import chroma from "chroma-js";
import { Painter } from "../Painter";
import { AudioPaintGenerator } from "../Audio/AudioPaintGenerator";
import { randomNormalDistribution } from "../utils";
import { Particle } from "../Painter/Particle";
import { defaultAngleFunction } from "../utils/angle";

export const sketchAnimateShow = (p: p5, painter: Painter) => {
  const audioPaintGenerator = new AudioPaintGenerator(analyser);
  audioPaintGenerator.paintAreaScale = 3; //0.5; //3
  const random = () => Math.random();
  let timestamp = 0;
  const cw = 800;
  const ch = 800;
  let px = 400;
  let py = 400;
  let paintGraphics: p5.Graphics;

  let distanceDeltaSpeedFactor = 100;
  let distanceAverageAmplitudeFactor = 2;
  let distanceAmplitudeFactor = 0.5;
  let distanceRandomFactor = 0;
  let distanceAverageDeltaSpeedFactor = 100;
  let distanceFactor = 1;
  let sizeFactor = 0.3;
  let endOpacity = 0; //0
  let opacityDeclineRate = (1 - endOpacity) / 500;
  const particleTime = 0;
  const colorScale = chroma.scale("Spectral");

  let particleList: Particle[] = [];

  p.setup = () => {
    timestamp = Date.now();
    p.createCanvas(cw, ch);
    paintGraphics = p.createGraphics(cw, ch);
  };
  p.draw = () => {
    const nt = Date.now();
    const t = nt - timestamp;
    timestamp = nt;
    if (!isStream() && isAudioPaused()) return;
    p.clear();
    const {
      points,
      deltaSpeed,
      averageAmplitude,
      fundamentalFrequency,
      fundamentalFrequencyAccuracy,
    } = audioPaintGenerator.getPaintData(t);

    // 背景画布移动到主画布上
    p.image(paintGraphics, 0, 0);

    // 更新并渲染老点
    particleList.forEach((pt) => {
      pt.update(t);
      if (pt.isStopped) pt.opacity -= opacityDeclineRate * t;
      painter.renderParticle(pt);
    });

    // 过滤掉已经到时间的点
    const removedParticles: Particle[] = [];
    const remainedParticles: Particle[] = [];
    particleList.forEach((pt) => {
      if (pt.opacity > endOpacity) {
        remainedParticles.push(pt);
      } else {
        removedParticles.push(pt);
      }
    });
    particleList = remainedParticles;

    // 过滤掉的点移动到背景画布上
    removedParticles.forEach((pt) => {
      pt.opacity = endOpacity;
      painter.renderParticle(pt, paintGraphics);
    });

    const ff = fundamentalFrequency || 440;
    const ffa = fundamentalFrequency && fundamentalFrequencyAccuracy;
    // 渲染并放置新点
    points.forEach((pt) => {
      const particle = painter.createStaticParticle(
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
  painter.onClear = () => {
    paintGraphics.clear();
    particleList = [];
  };
};
