"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";

type Props = { theme: "ocean" | "forest"; onReady: () => void; onUnavailable: () => void };

export default function ThreePostcard({ theme, onReady, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onUnavailable });
  useEffect(() => { callbacks.current = { onReady, onUnavailable }; }, [onReady, onUnavailable]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void import("three").then((THREE) => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2", { alpha: false, antialias: true, powerPreference: "low-power" });
      if (!context) { callbacks.current.onUnavailable(); return; }
      const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const forest = theme === "forest";
      scene.background = new THREE.Color(forest ? "#e4eddd" : "#d4edef");
      const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 50);
      camera.position.set(6, 5, 7); camera.lookAt(0, 0.45, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xa8b4a2, 2.8));
      const sun = new THREE.DirectionalLight(0xfff3d4, 3.5); sun.position.set(3, 7, 5); scene.add(sun);
      const world = new THREE.Group(); scene.add(world);
      const resources = new Set<Three.BufferGeometry | Three.Material>();
      function material(color: string) { const value = new THREE.MeshStandardMaterial({ color, roughness: 0.9 }); resources.add(value); return value; }
      const cream = material("#fff7e9"), green = material("#477464"), coral = material("#df765e"), wood = material("#876a4c");
      function mesh(geometry: Three.BufferGeometry, surface: Three.Material, x: number, y: number, z: number) {
        resources.add(geometry); const value = new THREE.Mesh(geometry, surface); value.position.set(x, y, z); world.add(value); return value;
      }
      mesh(new THREE.CylinderGeometry(2.35, 2.1, 0.35, 40), material(forest ? "#91af7c" : "#f3d6a2"), 0, 0, 0);
      if (!forest) mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.12, 48), material("#81c7cf"), 0, -0.2, 0);
      mesh(new THREE.BoxGeometry(1.1, 1.05, 0.95), cream, 0.1, 0.7, 0);
      const roof = mesh(new THREE.ConeGeometry(0.97, 0.75, 4), coral, 0.1, 1.6, 0); roof.rotation.y = Math.PI / 4;
      mesh(new THREE.BoxGeometry(0.28, 0.52, 0.035), wood, 0.1, 0.43, 0.49);
      for (const x of [-0.22, 0.42]) mesh(new THREE.BoxGeometry(0.2, 0.22, 0.045), material("#e8ad64"), x, 0.95, 0.49);
      for (const [x, z, height] of (forest ? [[-1.3, 0, 1.5], [1.25, -0.7, 1.9], [-0.65, -1.25, 1.6]] : [[-1.3, -0.45, 1.3], [1.4, -0.8, 1.1]])) {
        mesh(new THREE.CylinderGeometry(0.06, 0.09, height, 7), wood, x, height / 2, z);
        mesh(new THREE.ConeGeometry(forest ? 0.48 : 0.65, forest ? 1.15 : 0.45, forest ? 7 : 6), green, x, height, z);
      }
      mesh(new THREE.SphereGeometry(0.33, 16, 12), cream, 1.1, 0.62, 1.15);
      const dark = material("#263b37");
      for (const x of [1, 1.2]) mesh(new THREE.SphereGeometry(0.035, 7, 6), dark, x, 0.68, 1.45);
      mesh(new THREE.ConeGeometry(0.43, 0.28, 16), material("#f9c75f"), 1.1, 0.96, 1.15);
      let visible = true, frames = 0, lastFrame = 0;
      function render(time: number) {
        if (time - lastFrame < 1000 / 30) return;
        lastFrame = time; world.rotation.y = Math.sin(time * 0.00018) * 0.09;
        renderer.render(scene, camera); frames += 1; canvas.dataset.frames = String(frames);
      }
      function updateLoop() { renderer.setAnimationLoop(document.hidden || !visible ? null : render); }
      function resize() {
        const width = element!.clientWidth, height = element!.clientHeight;
        if (!width || !height) return;
        const aspect = width / height; camera.left = -2.9 * aspect; camera.right = 2.9 * aspect; camera.top = 2.9; camera.bottom = -2.9;
        camera.updateProjectionMatrix(); renderer.setSize(width, height, false); renderer.render(scene, camera);
      }
      const observer = new ResizeObserver(resize); observer.observe(element);
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateLoop(); }); intersection.observe(element);
      const contextLost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); callbacks.current.onUnavailable(); };
      canvas.addEventListener("webglcontextlost", contextLost);
      document.addEventListener("visibilitychange", updateLoop);
      element.appendChild(canvas); canvas.className = "h-full w-full"; canvas.setAttribute("aria-hidden", "true"); canvas.dataset.frames = "0";
      resize(); updateLoop(); callbacks.current.onReady();
      cleanup = () => {
        renderer.setAnimationLoop(null); observer.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange", updateLoop);
        canvas.removeEventListener("webglcontextlost", contextLost); resources.forEach((resource) => resource.dispose()); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      };
      if (cancelled) cleanup();
    }).catch((error: unknown) => {
      cleanup?.();
      if (!cancelled) {
        console.warn("Optional postcard rendering unavailable:", error instanceof Error ? error.name : "UnknownError");
        callbacks.current.onUnavailable();
      }
    });
    return () => { cancelled = true; cleanup?.(); };
  }, [theme]);
  return <div ref={host} className="absolute inset-0" data-testid="three-postcard" aria-hidden="true" />;
}
