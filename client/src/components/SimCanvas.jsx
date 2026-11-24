import { useEffect, useRef, useState } from 'react';
import { drawScene } from './drawScene.js';

/** Responsive, devicePixelRatio-aware canvas that redraws whenever the scene changes. */
export default function SimCanvas({ scene, label }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, size.w, size.h, scene);
  }, [scene, size]);

  return (
    <div className="stage__canvas-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}
