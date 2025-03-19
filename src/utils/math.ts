export function seedRandom(seed: number) {
  let s = seed;
  const random = () => {
    s = s * 9301 + (49297 % 233280);
    return s / 233280;
  };
  return random;
}

/** 输入两个随机数，获取符合正态分布的随机数 */
export function randomNormalDistribution(u0: number, v0: number) {
  let u = u0;
  let v = v0;
  let w = 0.0;
  do {
    //获得两个（-1,1）的独立随机变量
    u = Math.random() * 2 - 1.0;
    v = Math.random() * 2 - 1.0;
    w = u * u + v * v;
  } while (w == 0.0 || w >= 1.0);
  //这里就是 Box-Muller转换
  const c = Math.sqrt((-2 * Math.log(w)) / w);
  //返回2个标准正态分布的随机数，封装进一个数组返回
  //当然，因为这个函数运行较快，也可以扔掉一个
  //return [u*c,v*c];
  return u * c;
}
