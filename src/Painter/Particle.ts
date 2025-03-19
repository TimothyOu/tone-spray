export interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  time: number;
  lifetime: number;
  opacity: number;
  isStopped: boolean;
  update(t: number): void;
}

export class DynamicParticle implements Particle {
  static defaultTimingFunction = (t: number) => t;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x: number;
  y: number;
  size0: number;
  size1: number;
  size: number;
  time: number;
  color: string;
  lifetime: number;
  isStopped = false;
  opacity = 1;
  timingFunction: (t: number) => number;
  constructor({
    x0,
    y0,
    x1,
    y1,
    size0,
    size1,
    time,
    color,
    timingFunction = DynamicParticle.defaultTimingFunction,
  }: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    size0: number;
    size1: number;
    time: number;
    color: string;
    timingFunction?: (t: number) => number;
  }) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.size0 = size0;
    this.size1 = size1;
    this.time = time;
    this.color = color;

    this.x = x0;
    this.y = y0;
    this.size = size0;
    this.lifetime = 0;
    this.timingFunction = timingFunction;
  }
  update(t: number) {
    this.lifetime += t;
    if (this.isStopped == true) return;
    const { x0, y0, x1, y1, size1, size0 } = this;
    const tx = this.timingFunction(Math.min(this.lifetime / this.time, 1));
    this.x = (x1 - x0) * tx + x0;
    this.y = (y1 - y0) * tx + y0;
    this.size = (size1 - size0) * tx + size0;
    if (this.lifetime >= this.time) this.isStopped = true;
  }
}

export class StaticParticle implements Particle {
  static defaultTimingFunction = (t: number) => t;
  x: number;
  y: number;
  size: number;
  time: number;
  color: string;
  lifetime: number;
  isStopped = false;
  opacity = 1;
  timingFunction: (t: number) => number;
  constructor({
    x,
    y,
    size,
    time,
    color,
    timingFunction = DynamicParticle.defaultTimingFunction,
  }: {
    x: number;
    y: number;
    size: number;
    time: number;
    color: string;
    timingFunction?: (t: number) => number;
  }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.time = time;
    this.color = color;

    this.lifetime = 0;
    this.timingFunction = timingFunction;
  }
  update(t: number) {
    this.lifetime += t;
    if (this.isStopped == true) return;
    if (this.lifetime >= this.time) this.isStopped = true;
  }
}
