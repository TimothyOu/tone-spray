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

class PaintCore implements PaintArea {
  centerX = 0;
  centerY = 0;
  x = 0;
  y = 0;
  distanceFactor = 1;
  velocityDamp = 1;
  moveRatioSpeed = 0.001;
  sizeFactor = 1;
  buffDistanceFactor = 0.5;
  targetX = 0;
  targetY = 0;
  direction = 0;
  velocity = 0;
  distanceCore = 100;
  angleDistance: [number, number, number][] = [];
  centerWeightFactor = 1;
  backToCenter = false;
  constructor({ x, y }: { x: number; y: number }) {
    this.x = this.centerX = this.targetX = x;
    this.y = this.centerY = this.targetY = y;
  }
  attachKeyPoint(points: [number, number, number][], time: number) {
    const hasPoints = !!points.length;
    if (!hasPoints) {
      points.push([
        this.centerX,
        this.centerY,
        this.centerWeightFactor / this.buffDistanceFactor,
      ]);
    }
    if (hasPoints) {
      const x0 = this.x;
      const y0 = this.y;

      const [tx, ty, tw] = points.reduce(
        ([sx, sy, sw], [x, y, w]) => [sx + x * w, sy + y * w, sw + w],
        [0, 0, 0]
      );
      this.angleDistance = points.map(([x, y, t]) => [
        Math.atan2(y - y0, x - x0),
        Math.sqrt((x - x0) ** 2 + (y - y0) ** 2),
        t,
      ]);

      let distanceFactor = this.centerWeightFactor;
      if (hasPoints) {
        this.angleDistance.forEach(([a, d, w]) => {
          if (d > this.distanceCore) return;
          distanceFactor +=
            w *
            ((this.distanceCore - d) / this.distanceCore) *
            this.buffDistanceFactor;
        });
      }
      this.distanceFactor = distanceFactor;
      this.targetX = tx / tw;
      this.targetY = ty / tw;
    } else {
      this.angleDistance = [];
      this.distanceFactor =
        Math.sign(this.distanceFactor - 1) *
          Math.abs(this.distanceFactor - 1) *
          (1 - this.moveRatioSpeed) ** time +
        1;
      if (this.backToCenter) {
        this.targetX = this.centerX;
        this.targetY = this.centerY;
      }
    }

    const { targetX, targetY, x: x0, y: y0 } = this;
    this.direction = Math.atan2(y0 - targetY, x0 - targetX);

    const targetDistance = Math.sqrt((x0 - targetX) ** 2 + (y0 - targetY) ** 2);

    const moveDistance =
      targetDistance * (1 - (1 - this.moveRatioSpeed) ** time);

    const { direction } = this;
    this.x = this.x - moveDistance * Math.cos(direction);
    this.y = this.y - moveDistance * Math.sin(direction);

    this.velocity = moveDistance / time;
  }
}

export const sketchCapture2 = (p: p5, painter: Painter) => {
  const audioPaintGenerator = new AudioPaintGenerator(analyser);
  audioPaintGenerator.paintAreaScale = 2; //1;
  const random = () => Math.random();
  let timestamp = 0;
  const cw = 1440;
  const ch = 1080;
  let paintGraphics: p5.Graphics;

  let distanceDeltaSpeedFactor = 100;
  let distanceAverageAmplitudeFactor = 2;
  let distanceAmplitudeFactor = 0.3;
  let distanceAverageDeltaSpeedFactor = 100;
  let distanceRandomFactor = 0;
  let distanceFactor = 0.5;
  let sizeFactor = 0.5;
  let endOpacity = 0;
  let opacityDeclineRate = (1 - endOpacity) / 500; // (1 - endOpacity) / 1000;

  let showCapture = true;
  let showKeypoints = true;

  const particleTime = 0;
  const colorScale = chroma.scale("Spectral");

  const showBackgroundGrid = true;
  let backgroundGrid: p5.Graphics | null = null;
  let backgroundGridGap = 40;

  let videoOpacity = 0.1;

  let particleList: Particle[] = [];
  let handPose: any;
  let video: p5.Element;
  let hands: any[] = [];
  const paintCore = new PaintCore({ x: cw / 2, y: ch / 2 });

  document.addEventListener("keydown", (k) => {
    if (k.key == "c") {
      const { centerX, centerY } = paintCore;
      if (centerX == paintCore.targetX && centerY == paintCore.targetY) {
        paintCore.x = centerX;
        paintCore.y = centerY;
      } else {
        paintCore.targetX = centerX;
        paintCore.targetY = centerY;
      }
    }
  });

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
    if (showBackgroundGrid) {
      backgroundGrid = p.createGraphics(cw, ch);
      backgroundGrid.stroke("lightgrey");
      for (let gx = backgroundGridGap; gx < cw; gx += backgroundGridGap) {
        backgroundGrid.line(gx, 0, gx, ch);
      }
      for (let gy = backgroundGridGap; gy < ch; gy += backgroundGridGap) {
        backgroundGrid.line(0, gy, cw, gy);
      }
    }

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

    p.tint(255, 128);
    if (backgroundGrid) p.image(backgroundGrid, 0, 0);
    p.tint(255, 255);

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
    }
    paintCore.attachKeyPoint(
      paintAreas.map(({ x, y, distanceFactor }) => [x, y, distanceFactor]),
      t
    );

    if (showKeypoints) {
      p.noFill();
      p.stroke("#44444422");
      p.strokeWeight(2);
      paintAreas.forEach((a) => {
        p.circle(a.x, a.y, 20 * a.distanceFactor);
      });
      p.strokeWeight(4);
      p.circle(paintCore.x, paintCore.y, 20 * paintCore.distanceFactor);
      // p.stroke("red");
      // p.circle(
      //   paintCore.targetX,
      //   paintCore.targetY,
      //   20 * paintCore.distanceFactor
      // );
      p.noStroke();
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

    const curves: [number, number, (x: number) => number, number][] = [];
    paintCore.angleDistance.forEach(([angle, distance]) => {
      const coreRatio =
        (distance - paintCore.distanceCore) / paintCore.distanceCore;
      if (coreRatio <= 0) return;

      const buffCurve = normalDistributionCurve(
        0,
        Math.acos(paintCore.distanceCore / distance) / 6
      );
      const buffCurve0 = buffCurve(0);
      curves.push([angle, coreRatio, buffCurve, buffCurve0]);
    });

    // 渲染并放置新点
    points.forEach((pt) => {
      const particleAngle = defaultAngleFunction(pt.frequency, ff, ffa);
      const particleDistance =
        (deltaSpeed * distanceAverageDeltaSpeedFactor +
          pt.deltaSpeed * distanceDeltaSpeedFactor +
          averageAmplitude * distanceAverageAmplitudeFactor +
          pt.amplitude * distanceAmplitudeFactor) *
        (1 +
          randomNormalDistribution(random(), random()) * distanceRandomFactor) *
        distanceFactor *
        paintCore.distanceFactor;
      let particleDistanceBuff = 1;

      curves.forEach(([angle, weight, buffCurve, buffCurve0]) => {
        const angleOffset = particleAngle - angle;
        const ao =
          angleOffset < -Math.PI
            ? angleOffset + 2 * Math.PI
            : angleOffset > Math.PI
            ? angleOffset - 2 * Math.PI
            : angleOffset;
        const buff = (buffCurve(ao) / buffCurve0) * weight;
        particleDistanceBuff += buff;
      });

      const particle = painter.createDynamicParticle(
        paintCore.x,
        paintCore.y,
        particleAngle,
        particleDistance * particleDistanceBuff,
        pt.size * sizeFactor * paintCore.sizeFactor,
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

function normalDistributionCurve(m: number, s: number) {
  const _2s2 = (2 * s) ** 2;
  const _s_sqrt2pi = s * Math.sqrt(2 * Math.PI);
  return (x: number) => Math.E ** -((x - m) ** 2 / _2s2) / _s_sqrt2pi;
}
