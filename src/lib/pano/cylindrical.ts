export function projectFrameToCylinder(
  imgData: ImageData,
  focalPx: number,
  outWidth: number,
  outHeight: number,
  yawDeg: number,
): { canvas: OffscreenCanvas; xStart: number; xEnd: number } {
  const sourceWidth = imgData.width;
  const sourceHeight = imgData.height;
  const source = imgData.data;
  const canvas = new OffscreenCanvas(outWidth, outHeight);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('canvas_unavailable');
  }

  const output = context.createImageData(outWidth, outHeight);
  const target = output.data;
  const yawCenter = ((yawDeg % 360) + 360) % 360;
  const halfHorizontalFov = Math.atan((sourceWidth / 2) / focalPx);
  const startAngle = yawCenter * Math.PI / 180 - halfHorizontalFov;
  const endAngle = yawCenter * Math.PI / 180 + halfHorizontalFov;
  const xStart = Math.max(0, Math.floor(((startAngle + Math.PI) / (Math.PI * 2)) * outWidth));
  const xEnd = Math.min(outWidth - 1, Math.ceil(((endAngle + Math.PI) / (Math.PI * 2)) * outWidth));
  const centerX = sourceWidth / 2;
  const centerY = sourceHeight / 2;
  const verticalScale = sourceHeight / outHeight;

  for (let y = 0; y < outHeight; y += 1) {
    const sourceY = (y - outHeight / 2) * verticalScale + centerY;
    if (sourceY < 0 || sourceY >= sourceHeight - 1) continue;

    for (let x = 0; x < outWidth; x += 1) {
      const angle = (x / outWidth) * Math.PI * 2 - Math.PI - yawCenter * Math.PI / 180;
      const sourceX = focalPx * Math.tan(angle) + centerX;

      if (sourceX < 0 || sourceX >= sourceWidth - 1) continue;

      const sx = Math.floor(sourceX);
      const sy = Math.floor(sourceY);
      const offset = (sy * sourceWidth + sx) * 4;
      const outOffset = (y * outWidth + x) * 4;
      const edge = Math.min(sourceX, sourceWidth - sourceX);
      const feather = Math.max(0, Math.min(1, edge / (sourceWidth * 0.15)));

      target[outOffset] = source[offset];
      target[outOffset + 1] = source[offset + 1];
      target[outOffset + 2] = source[offset + 2];
      target[outOffset + 3] = source[offset + 3] * feather;
    }
  }

  context.putImageData(output, 0, 0);

  return { canvas, xStart, xEnd };
}
