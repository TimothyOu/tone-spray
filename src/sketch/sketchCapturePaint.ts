import p5 from "p5";
import ml5 from "ml5";
import { analyser, isAudioPaused, isStream } from "../analyser";
import chroma from "chroma-js";
import { Particle } from "../Painter/Particle";
import { Painter } from "../Painter";
import { AudioPaintGenerator } from "../Audio/AudioPaintGenerator";
import { randomNormalDistribution } from "../utils";
import { defaultAngleFunction } from "../utils/angle";
import { PaintArea, analyzeGesture3D, analyzeGesture } from "../utils/gesture";

export const sketchCapturePaint = (p: p5, painter: Painter) => {
  const audioPaintGenerator = new AudioPaintGenerator(analyser);
  const random = () => Math.random();
  let timestamp = 0;
  const cw = 800;
  const ch = 600;
  let paintGraphics: p5.Graphics;

  let distanceDeltaSpeedFactor = 100;
  let distanceAverageAmplitudeFactor = 2;
  let distanceAmplitudeFactor = 0.5;
  let distanceAverageDeltaSpeedFactor = 100;
  let distanceRandomFactor = 0;
  let distanceFactor = 0.5;
  let sizeFactor = 0.5;
  let endOpacity = 0;
  let opacityDeclineRate = (1 - endOpacity) / 3000;

  let showCapture = true;
  let showKeypoints = true;

  const particleTime = 500;
  const colorScale = chroma.scale("Spectral");

  let videoOpacity = 0.1;

  let particleList: Particle[] = [];
  let handPose: any;
  let video: p5.Element;
  let hands: any[] = [];
  let paintAreaIndex = 0;

  p.preload = () => {
    handPose = ml5.handPose();
  };
  p.setup = () => {
    timestamp = Date.now();
    p.createCanvas(cw, ch);
    paintGraphics = p.createGraphics(cw, ch);

    video = p.createCapture("video", { flipped: true } as any);
    video.size(cw, ch);
    video.hide();

    console.log(handPose);
    handPose.ready.then(() => {
      handPose.detectStart(video, function (result: any[]) {
        hands = result;
      });
    });
  };
  p.draw = () => {
    p.noStroke();
    // console.log(handPose.model);
    const nt = Date.now();
    const t = nt - timestamp;
    const paintAreas: PaintArea[] = [];
    timestamp = nt;
    if (!isStream() && isAudioPaused()) return;
    p.clear();
    // 绘制视频捕捉
    if (showCapture) p.image(video, 0, 0);
    p.fill(255, 255, 255, (1 - videoOpacity) * 255);
    p.rect(0, 0, cw, ch);

    //console.log(hands);
    // 绘制关键点
    for (let i = 0; i < hands.length; i++) {
      let hand = hands[i];
      const keypoints: { x: number; y: number }[] = hand.keypoints;
      const { fingerSquareDeviation, squareDeviation } = analyzeGesture3D(
        hand.keypoints3D.map(({ x, y, z }: any) => [x, y, z])
      );
      const { center } = analyzeGesture(
        hand.keypoints.map(({ x, y }: any) => [x, y])
      );
      const qualifiedFingers = [
        keypoints[4],
        keypoints[8],
        keypoints[12],
        keypoints[16],
        keypoints[20],
      ].filter((_n, i) => fingerSquareDeviation[i] > 0.0008);
      if (qualifiedFingers.length == 0 || qualifiedFingers.length > 3) {
        paintAreas.push({
          x: center[0],
          y: center[1],
          distanceFactor: Math.sqrt(squareDeviation) * 30,
          sizeFactor: 1,
        });
      } else {
        qualifiedFingers.forEach(({ x, y }) =>
          paintAreas.push({
            x,
            y,
            distanceFactor: 1,
            sizeFactor: 1,
          })
        );
      }

      if (showKeypoints) {
        p.noFill();
        p.stroke("#44444422");
        p.strokeWeight(2);
        paintAreas.forEach((a) => {
          p.circle(a.x, a.y, 20 * a.distanceFactor);
        });
        p.noStroke();
      }
    }

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
    if (endOpacity)
      removedParticles.forEach((pt) => {
        pt.opacity = endOpacity;
        painter.renderParticle(pt, paintGraphics);
      });

    const ff = fundamentalFrequency || 440;
    const ffa = fundamentalFrequency && fundamentalFrequencyAccuracy;
    // 渲染并放置新点
    points.forEach((pt) => {
      if (!paintAreas.length) return;
      if (paintAreaIndex >= paintAreas.length) {
        paintAreaIndex = paintAreaIndex % paintAreas.length;
      }
      const currentPaintArea = paintAreas[paintAreaIndex];

      const particle = painter.createDynamicParticle(
        currentPaintArea.x,
        currentPaintArea.y,
        defaultAngleFunction(pt.frequency, ff, ffa),
        (deltaSpeed * distanceAverageDeltaSpeedFactor +
          pt.deltaSpeed * distanceDeltaSpeedFactor +
          averageAmplitude * distanceAverageAmplitudeFactor +
          pt.amplitude * distanceAmplitudeFactor) *
          (1 +
            randomNormalDistribution(random(), random()) *
              distanceRandomFactor) *
          distanceFactor *
          currentPaintArea.distanceFactor,
        pt.size * sizeFactor * currentPaintArea.sizeFactor,
        colorScale(Math.sqrt(pt.frequency / 12000))
          //.luminance((spectralCentroid + 2000) / 12000, "hsl")
          .hex(),
        particleTime
      );
      painter.renderParticle(particle);
      particleList.push(particle);
      paintAreaIndex++;
    });
  };
  painter.onClear = () => {
    paintGraphics.clear();
    particleList = [];
  };
};
