import { useEffect, useRef } from "react";

const HISTORY_POINTS = 30;
const SAMPLE_INTERVAL = 1000;

export default function LiveTickerChart({
  values = [],
  color = "#52ab98",
  minValue = 0,
  maxValue = 100,
  darkMode = false,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const animationRef = useRef(null);
  const currentValuesRef = useRef(values);
  const transitionStartRef = useRef(performance.now());

  useEffect(() => {
    currentValuesRef.current = values;
    transitionStartRef.current = performance.now();

    const draw = (now) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;

      if (!canvas || !wrap) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const progress = Math.min(
        1,
        (now - transitionStartRef.current) / SAMPLE_INTERVAL
      );

      const curr = currentValuesRef.current;
      if (!curr.length) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const stepX = width / Math.max(HISTORY_POINTS - 1, 1);
      const shiftX = stepX * progress;

      const topPad = 8;
      const bottomPad = 8;
      const usableHeight = height - topPad - bottomPad;
      const range = Math.max(maxValue - minValue, 0.0001);

      const toY = (value) =>
        topPad + (1 - (value - minValue) / range) * usableHeight;

      const bg = darkMode
        ? "rgba(255,255,255,0.035)"
        : "rgba(43,103,119,0.045)";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const gridColor = darkMode
        ? "rgba(255,255,255,0.08)"
        : "rgba(43,103,119,0.08)";

      for (let i = 0; i < 4; i += 1) {
        const y = topPad + (usableHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const points = curr.map((value, index) => {
        const x = index * stepX - shiftX;
        const y = toY(value);
        return { x, y };
      });

      const areaGradient = ctx.createLinearGradient(0, 0, 0, height);
      if (darkMode) {
        areaGradient.addColorStop(0, "rgba(82,171,152,0.22)");
        areaGradient.addColorStop(1, "rgba(82,171,152,0.01)");
      } else {
        areaGradient.addColorStop(0, "rgba(82,171,152,0.18)");
        areaGradient.addColorStop(1, "rgba(82,171,152,0.015)");
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - bottomPad);
      for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        if (i === 0) {
          ctx.lineTo(p.x, p.y);
        } else {
          const prev = points[i - 1];
          const midX = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(midX, prev.y, midX, p.y, p.x, p.y);
        }
      }
      ctx.lineTo(points[points.length - 1].x, height - bottomPad);
      ctx.closePath();
      ctx.fillStyle = areaGradient;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          const prev = points[i - 1];
          const midX = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(midX, prev.y, midX, p.y, p.x, p.y);
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      const last = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [values, color, minValue, maxValue, darkMode]);

  return (
    <div ref={wrapRef} className="chart-canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}