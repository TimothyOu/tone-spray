import p5 from "p5";
import { analyser, isAudioPaused, isStream } from "../analyser";
import chroma from "chroma-js";
import { Painter } from "../Painter";
import { AudioPaintGenerator } from "../Audio/AudioPaintGenerator";
import { randomNormalDistribution } from "../utils";
import { defaultAngleFunction } from "../utils/angle";

export const sketchShow = (p: p5, painter: Painter) => {
  const colorScale = chroma.scale("Spectral");
  const audioPaintGenerator = new AudioPaintGenerator(analyser);
  audioPaintGenerator.paintAreaScale = 20;
  const random = () => Math.random();
  let timestamp = 0;
  const cw = 800;
  const ch = 800;
  let px = 400;
  let py = 400;

  let distanceDeltaSpeedFactor = 100;
  let distanceAverageAmplitudeFactor = 2;
  let distanceAmplitudeFactor = 0.5;
  let distanceAverageDeltaSpeedFactor = 100;
  let distanceDispersionFactor = 0;
  let distanceFactor = 0.5;
  let sizeFactor = 0.5;

  p.setup = () => {
    timestamp = Date.now();
    p.createCanvas(cw, ch);
    p.clear();
  };
  p.draw = () => {
    p.clear();
    const nt = Date.now();
    const t = nt - timestamp;
    timestamp = nt;
    if (!isStream() && isAudioPaused()) return;
    const {
      points,
      deltaSpeed,
      averageAmplitude,
      fundamentalFrequency,
      fundamentalFrequencyAccuracy,
    } = audioPaintGenerator.getPaintData(t);
    const ff = fundamentalFrequency || 440;
    const ffa = fundamentalFrequency && fundamentalFrequencyAccuracy;
    points.forEach((pt) => {
      painter.drawCircle(
        px,
        py,
        defaultAngleFunction(pt.frequency, ff, ffa),
        (deltaSpeed * distanceAverageDeltaSpeedFactor +
          pt.deltaSpeed * distanceDeltaSpeedFactor +
          averageAmplitude * distanceAverageAmplitudeFactor +
          pt.amplitude * distanceAmplitudeFactor +
          randomNormalDistribution(random(), random()) *
            pt.deltaStdDev *
            distanceDispersionFactor) *
          distanceFactor,
        pt.size * sizeFactor,
        colorScale(Math.sqrt(pt.frequency / 12000))
          //.luminance((spectralCentroid + 2000) / 12000, "hsl")
          .hex()
      );
    });
  };
};
