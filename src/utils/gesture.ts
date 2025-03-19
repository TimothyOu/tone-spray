// 手势分析，检测手指张开情况(检测阈值0.0008)
export function analyzeGesture3D(keypoints3D: [number, number, number][]) {
  const palmEdges = [
    keypoints3D[0],
    keypoints3D[1],
    keypoints3D[5],
    keypoints3D[9],
    keypoints3D[13],
    keypoints3D[17],
  ];
  const fingers = [
    [keypoints3D[2], keypoints3D[3], keypoints3D[4]],
    [keypoints3D[6], keypoints3D[7], keypoints3D[8]],
    [keypoints3D[10], keypoints3D[11], keypoints3D[12]],
    [keypoints3D[14], keypoints3D[15], keypoints3D[16]],
    [keypoints3D[18], keypoints3D[19], keypoints3D[20]],
  ];
  // 手掌中心坐标和
  const [palmSumX, palmSumY, palmSumZ] = palmEdges.reduce(
    ([xs, ys, zs], [x, y, z]) => [xs + x, ys + y, zs + z]
  );
  // 手指各点与手心的方差
  const fingerSquareDeviation = fingers.map((finger) => {
    // 单指与手掌各点平均值
    const [pfX, pfY, pfZ] = finger
      .reduce(
        ([xs, ys, zs], [x, y, z]) => [xs + x, ys + y, zs + z],
        [palmSumX, palmSumY, palmSumZ]
      )
      .map((n) => n / 9);
    const [sdX, sdY, sdZ] = finger.reduce(
      ([xs, ys, zs], [x, y, z]) => [
        xs + (x - pfX) ** 2,
        ys + (y - pfY) ** 2,
        zs + (z - pfZ) ** 2,
      ],
      [0, 0, 0]
    );
    return (sdX + sdY + sdZ) / 9;
  });

  const allFingers = fingers.flat(1);

  const [centerX, centerY, centerZ] = allFingers
    .reduce(
      ([xs, ys, zs], [x, y, z]) => [xs + x, ys + y, zs + z],
      [palmSumX, palmSumY, palmSumZ]
    )
    .map((n) => n / 21);

  const [sdX, sdY, sdZ] = [...palmEdges, ...allFingers].reduce(
    ([xs, ys, zs], [x, y, z]) => [
      xs + (x - centerX) ** 2,
      ys + (y - centerY) ** 2,
      zs + (z - centerZ) ** 2,
    ],
    [0, 0, 0]
  );
  const squareDeviation = (sdX + sdY + sdZ) / 21;
  return {
    fingerSquareDeviation,
    squareDeviation,
    center: [palmSumX, palmSumX, palmSumX].map((n) => n / 6),
  };
}
export function analyzeGesture(keypoints: [number, number][]) {
  const palmEdges = [
    keypoints[0],
    keypoints[1],
    keypoints[5],
    keypoints[9],
    keypoints[13],
    keypoints[17],
  ];
  const [centerX, centerY] = palmEdges
    .reduce(([xs, ys], [x, y]) => [xs + x, ys + y], [0, 0])
    .map((n) => n / 6);

  return {
    center: [centerX, centerY],
  };
}

export interface PaintArea {
  x: number;
  y: number;
  distanceFactor: number;
  sizeFactor: number;
}
