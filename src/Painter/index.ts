import p5 from "p5";
import { DynamicParticle, StaticParticle, Particle } from "./Particle";
import chroma from "chroma-js";

export class Painter {
  frameClear = true;
  p: p5;
  graphics: p5.Graphics[] = [];
  onClear?: () => void;
  particleTimingFunction = (x: number) => (x - 1) ** 3 + 1;
  constructor(sketch: (p: p5, painter: Painter) => void, palette: HTMLElement) {
    this.p = new p5((p) => sketch(p, this), palette);

    console.log("Painter");
    console.log(this);
  }
  drawCircle(
    x: number,
    y: number,
    deg: number,
    dis: number,
    size: number,
    color: string
  ) {
    this.p.fill(color);
    this.p.noStroke();
    this.p.circle(x + Math.cos(deg) * dis, y + Math.sin(deg) * dis, size);
  }
  createDynamicParticle(
    x0: number,
    y0: number,
    deg: number,
    dis: number,
    size: number,
    color: string,
    time: number
  ) {
    return new DynamicParticle({
      x0,
      y0,
      x1: x0 + Math.cos(deg) * dis,
      y1: y0 + Math.sin(deg) * dis,
      size0: 0,
      size1: size,
      color,
      time,
      timingFunction: this.particleTimingFunction,
    });
  }
  createStaticParticle(
    x: number,
    y: number,
    deg: number,
    dis: number,
    size: number,
    color: string,
    time: number
  ) {
    return new StaticParticle({
      x: x + Math.cos(deg) * dis,
      y: y + Math.sin(deg) * dis,
      size,
      color,
      time,
    });
  }
  renderParticle(
    { x, y, size, color, opacity }: Particle,
    renderer: p5 | p5.Graphics = this.p
  ) {
    const fillColor = renderer.color(color);
    fillColor.setAlpha(opacity * 255);
    renderer.fill(fillColor);
    renderer.noStroke();
    renderer.circle(x, y, size);
  }
  clear() {
    this.p.clear();
    this.onClear?.();
  }
}
