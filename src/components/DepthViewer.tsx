import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { hasOrientationPermission } from '../lib/depth/orientation';

type DepthViewerProps = {
  photoUrl: string;
  depthUrl: string;
  aspectRatio?: number;
  strength?: number;
  className?: string;
};

export default function DepthViewer({
  photoUrl,
  depthUrl,
  aspectRatio = 4 / 3,
  strength = 0.08,
  className = '',
}: DepthViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, aspectRatio / 2, -aspectRatio / 2, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.PlaneGeometry(1, aspectRatio, 64, 64);
    const uniforms = {
      uPhoto: { value: new THREE.Texture() },
      uDepth: { value: new THREE.Texture() },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uStrength: { value: strength },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        uniform sampler2D uDepth;
        uniform vec2 uOffset;
        uniform float uStrength;

        void main() {
          vUv = uv;
          float depth = texture2D(uDepth, uv).r;
          vec3 displaced = position;
          displaced.xy += uOffset * depth * uStrength;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D uPhoto;

        void main() {
          gl_FragColor = texture2D(uPhoto, vUv);
        }
      `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const targetOffset = new THREE.Vector2(0, 0);
    let frameId = 0;
    let disposed = false;
    let photoTexture: THREE.Texture | null = null;
    let depthTexture: THREE.Texture | null = null;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height, false);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      targetOffset.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      );
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!hasOrientationPermission()) return;
      const gamma = Math.max(-30, Math.min(30, event.gamma ?? 0)) / 30;
      const beta = Math.max(-30, Math.min(30, (event.beta ?? 0) - 45)) / 30;
      targetOffset.set(gamma, -beta);
    };

    const animate = () => {
      uniforms.uOffset.value.lerp(targetOffset, 0.08);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('deviceorientation', handleOrientation);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    Promise.all([loader.loadAsync(photoUrl), loader.loadAsync(depthUrl)])
      .then(([loadedPhoto, loadedDepth]) => {
        if (disposed) {
          loadedPhoto.dispose();
          loadedDepth.dispose();
          return;
        }
        photoTexture = loadedPhoto;
        depthTexture = loadedDepth;
        photoTexture.colorSpace = THREE.SRGBColorSpace;
        uniforms.uPhoto.value = photoTexture;
        uniforms.uDepth.value = depthTexture;
        animate();
      })
      .catch(() => {
        if (!disposed) animate();
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('deviceorientation', handleOrientation);
      photoTexture?.dispose();
      depthTexture?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [aspectRatio, depthUrl, photoUrl, strength]);

  return <div ref={containerRef} className={`relative overflow-hidden ${className}`} />;
}
