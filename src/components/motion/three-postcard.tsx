"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";

type Props = { theme: "ocean" | "forest"; tour: boolean; onReady: () => void; onUnavailable: () => void };

export default function ThreePostcard({ theme, tour, onReady, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onReady, onUnavailable });
  const touring = useRef(tour);
  useEffect(() => { callbacks.current = { onReady, onUnavailable }; }, [onReady, onUnavailable]);
  useEffect(() => { touring.current = tour; }, [tour]);

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
      const observers: { resize?: ResizeObserver; intersection?: IntersectionObserver } = {};
      // Register disposal before creating owned meshes so a partial setup failure
      // releases resources as well as a normal stop/unmount.
      cleanup = () => {
        renderer.setAnimationLoop(null); observers.resize?.disconnect(); observers.intersection?.disconnect(); document.removeEventListener("visibilitychange", updateLoop);
        canvas.removeEventListener("webglcontextlost", contextLost); resources.forEach((resource) => resource.dispose()); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      };
      function material(color: string) { const value = new THREE.MeshStandardMaterial({ color, roughness: 0.9 }); resources.add(value); return value; }
      const cream = material("#fff7e9"), green = material("#477464"), coral = material("#df765e"), wood = material("#876a4c");
      function mesh(geometry: Three.BufferGeometry, surface: Three.Material, x: number, y: number, z: number, parent = world) {
        resources.add(geometry); const value = new THREE.Mesh(geometry, surface); value.position.set(x, y, z); parent.add(value); return value;
      }
      mesh(new THREE.CylinderGeometry(2.35, 2.1, 0.35, 40), material(forest ? "#91af7c" : "#f3d6a2"), 0, 0, 0);
      if (!forest) mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.12, 48), material("#81c7cf"), 0, -0.2, 0);
      const water = material("#81c7cf"), white = material("#fffdf4"), yellow = material("#f9c75f");
      const ripples: Three.Mesh[] = [];
      if (forest) {
        mesh(new THREE.SphereGeometry(1.35, 14, 8), material("#a5bd92"), -0.9, -0.5, -0.9).scale.y = 0.8;
        const lake = mesh(new THREE.CircleGeometry(0.8, 28), water, 1.05, 0.19, 0.1); lake.rotation.x = -Math.PI / 2;
        for (let i = 0; i < 7; i++) {
          const angle = i * 2.399;
          mesh(new THREE.SphereGeometry(0.08, 7, 5), i % 2 ? coral : yellow, Math.cos(angle) * 1.9, 0.23, Math.sin(angle) * 1.9);
        }
      } else {
        // Symbolic terraced coastal tower; no exact venue/route claim.
        for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(1.25 - i * 0.16, 0.14, 1.08 - i * 0.12), coral, 0.1, 0.23 + i * 0.4, 0);
        for (let i = 0; i < 3; i++) {
          const ripple = mesh(new THREE.TorusGeometry(2.45 + i * 0.13, 0.018, 4, 40), white, 0, -0.12 + i * 0.012, 0);
          ripple.rotation.x = Math.PI / 2; ripples.push(ripple);
        }
      }
      const boat = new THREE.Group(); boat.position.set(1.9, 0.02, -1.6); world.add(boat); boat.visible = !forest;
      mesh(new THREE.ConeGeometry(0.4, 0.25, 4), coral, 0, 0, 0, boat).rotation.z = Math.PI;
      mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 5), wood, 0, 0.4, 0, boat);
      mesh(new THREE.ConeGeometry(0.3, 0.5, 3), cream, 0.1, 0.45, 0, boat);
      const clouds: Three.Group[] = [];
      for (const [x, y, z] of [[-1.7, 2.6, -0.7], [1.2, 2.9, -1.5]]) {
        const cloud = new THREE.Group(); cloud.position.set(x, y, z); world.add(cloud); clouds.push(cloud);
        for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.23 + (i % 2) * 0.1, 9, 6), white, i * 0.27, 0, 0, cloud).scale.y = 0.65;
      }
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
        lastFrame = time; world.rotation.y = touring.current ? time * 0.00012 : Math.sin(time * 0.00018) * 0.09;
        boat.position.y = 0.02 + Math.sin(time * 0.0014) * 0.035; boat.rotation.z = Math.sin(time * 0.001) * 0.06;
        ripples.forEach((ripple, i) => { ripple.scale.setScalar(1 + Math.sin(time * 0.001 + i) * 0.025); });
        clouds.forEach((cloud, i) => { cloud.position.x = (i ? 1.2 : -1.7) + Math.sin(time * 0.00022 + i) * 0.2; });
        renderer.render(scene, camera); frames += 1; canvas.dataset.frames = String(frames);
        canvas.dataset.viewpoint = touring.current ? "orbit" : "postcard";
        canvas.dataset.drawCalls = String(renderer.info.render.calls); canvas.dataset.triangles = String(renderer.info.render.triangles);
        canvas.dataset.geometries = String(renderer.info.memory.geometries);
      }
      function updateLoop() { renderer.setAnimationLoop(document.hidden || !visible ? null : render); }
      function resize() {
        const width = element!.clientWidth, height = element!.clientHeight;
        if (!width || !height) return;
        const aspect = width / height; camera.left = -2.9 * aspect; camera.right = 2.9 * aspect; camera.top = 2.9; camera.bottom = -2.9;
        camera.updateProjectionMatrix(); renderer.setSize(width, height, false); renderer.render(scene, camera);
      }
      observers.resize = new ResizeObserver(resize); observers.resize.observe(element);
      observers.intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateLoop(); }); observers.intersection.observe(element);
      function contextLost(event: Event) { event.preventDefault(); renderer.setAnimationLoop(null); callbacks.current.onUnavailable(); }
      canvas.addEventListener("webglcontextlost", contextLost);
      document.addEventListener("visibilitychange", updateLoop);
      element.appendChild(canvas); canvas.className = "h-full w-full"; canvas.setAttribute("aria-hidden", "true"); canvas.dataset.frames = "0";
      resize(); updateLoop(); callbacks.current.onReady();
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
