import * as THREE from "three";

let cached: THREE.CubeTexture | null = null;

export function createGoldEnvMap(): THREE.CubeTexture {
  if (cached) return cached;

  const cube = new THREE.CubeTexture();
  const size = 64;
  const canvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < 6; i++) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, "#1a2840");
    grad.addColorStop(0.5, "#0a1628");
    grad.addColorStop(1, "#020611");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "rgba(201, 162, 39, 0.2)";
    ctx.beginPath();
    ctx.arc(size * 0.7, size * 0.3, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(26, 111, 212, 0.08)";
    ctx.beginPath();
    ctx.arc(size * 0.2, size * 0.7, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    canvases.push(c);
  }

  cube.images = canvases;
  cube.needsUpdate = true;
  cube.colorSpace = THREE.SRGBColorSpace;
  cached = cube;
  return cube;
}
