import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Red de nodos en canvas (reacción al cursor + GSAP). Sustituto de vídeo de fondo en páginas públicas del ERP.
 */
type GridPoint = {
  x: number;
  y: number;
  originX: number;
  originY: number;
  closest: GridPoint[];
  active: number;
  circle?: PointCircle;
};

class PointCircle {
  active = 0;

  constructor(
    public pos: GridPoint,
    public radius: number,
    private getCtx: () => CanvasRenderingContext2D | null,
    private baseDot: number,
  ) {}

  draw() {
    const ctx = this.getCtx();
    if (!ctx) return;
    const a = Math.max(this.baseDot, this.active || 0);
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = `rgba(156,217,249,${a})`;
    ctx.fill();
  }
}

export type AnimatedNetworkBackgroundProps = {
  className?: string;
};

export function AnimatedNetworkBackground({ className = "" }: AnimatedNetworkBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || typeof window === "undefined") return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let ctx: CanvasRenderingContext2D | null = null;
    let points: GridPoint[] = [];
    const target = { x: width / 2, y: height / 2 };
    const smoothTarget = { x: target.x, y: target.y };
    let animateHeader = true;
    let rafId = 0;
    let visualViewportRef: VisualViewport | null = null;

    const DENSITY = 1.2;
    const COLS = Math.round(15 * DENSITY);
    const ROWS_MIN = Math.round(12 * DENSITY);
    const ROWS_MAX = Math.round(22 * DENSITY);
    const BASE_LINE_ALPHA = 0.07;
    const BASE_DOT_ALPHA = 0.11;
    const MOVE_RADIUS_SQ = 55000;

    const getCtx = () => ctx;

    function readViewportSize() {
      const iw = window.innerWidth;
      const ih = window.innerHeight;
      const rect = container.getBoundingClientRect();
      const rw = Math.round(rect.width);
      const rh = Math.round(rect.height);
      const w = Math.max(iw, rw >= 2 ? rw : 0, 1);
      const h = Math.max(ih, rh >= 2 ? rh : 0, 1);
      return { width: w, height: h };
    }

    function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    }

    function initHeader() {
      const s = readViewportSize();
      width = s.width;
      height = s.height;
      target.x = width / 2;
      target.y = height / 2;
      smoothTarget.x = target.x;
      smoothTarget.y = target.y;
      container.style.minHeight = `${height}px`;
      container.style.height = `${height}px`;
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 0.7;

      let rows = Math.round((COLS * height) / width);
      rows = Math.min(ROWS_MAX, Math.max(ROWS_MIN, rows));
      const stepX = width / Math.max(1, COLS - 1);
      const stepY = height / Math.max(1, rows - 1);
      const cell = Math.min(stepX, stepY);
      const jitterMain = 0.58;
      const jitterCross = 0.38;
      const jitterFine = 0.22;

      points = [];
      for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < rows; j++) {
          const baseX = i * stepX;
          const baseY = j * stepY;
          const wx =
            (Math.random() - 0.5) * stepX * jitterMain +
            (Math.random() - 0.5) * stepY * jitterCross +
            (Math.random() - 0.5) * cell * jitterFine;
          const wy =
            (Math.random() - 0.5) * stepY * jitterMain +
            (Math.random() - 0.5) * stepX * jitterCross +
            (Math.random() - 0.5) * cell * jitterFine;
          const px = Math.min(width, Math.max(0, baseX + wx));
          const py = Math.min(height, Math.max(0, baseY + wy));
          points.push({
            x: px,
            originX: px,
            y: py,
            originY: py,
            closest: [],
            active: 0,
          });
        }
      }

      for (let i = 0; i < points.length; i++) {
        const closest: GridPoint[] = [];
        const p1 = points[i];
        for (let j = 0; j < points.length; j++) {
          const p2 = points[j];
          if (p1 !== p2) {
            let placed = false;
            for (let k = 0; k < 5; k++) {
              if (!placed && closest[k] === undefined) {
                closest[k] = p2;
                placed = true;
              }
            }
            for (let k = 0; k < 5; k++) {
              if (!placed && getDistance(p1, p2) < getDistance(p1, closest[k])) {
                closest[k] = p2;
                placed = true;
              }
            }
          }
        }
        p1.closest = closest;
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.circle = new PointCircle(p, 2 + Math.random() * 2, getCtx, BASE_DOT_ALPHA);
      }
    }

    function mouseMove(e: MouseEvent) {
      let posx = 0;
      let posy = 0;
      if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
      } else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      target.x = posx;
      target.y = posy;
    }

    function scrollCheck() {
      const st = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      animateHeader = st <= height;
    }

    function resize() {
      if (points.length) gsap.killTweensOf(points);
      initHeader();
    }

    function drawLines(p: GridPoint) {
      const lineAlpha = Math.max(BASE_LINE_ALPHA, p.active || 0);
      if (!ctx) return;
      for (let i = 0; i < p.closest.length; i++) {
        if (!p.closest[i]) continue;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.closest[i].x, p.closest[i].y);
        ctx.strokeStyle = `rgba(156,217,249,${lineAlpha})`;
        ctx.stroke();
      }
    }

    function shiftPoint(p: GridPoint) {
      const spread = Math.min(width, height) * 0.045;
      gsap.to(p, {
        duration: 3.4 + Math.random() * 3.2,
        x: p.originX - spread + Math.random() * (2 * spread),
        y: p.originY - spread + Math.random() * (2 * spread),
        ease: "sine.inOut",
        overwrite: "auto",
      });
    }

    function animate() {
      if (animateHeader && ctx && points.length) {
        smoothTarget.x += (target.x - smoothTarget.x) * 0.065;
        smoothTarget.y += (target.y - smoothTarget.y) * 0.065;

        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const d = getDistance(smoothTarget, p);
          const dot = p.circle;
          if (d < 6500) {
            p.active = 0.3;
            if (dot) dot.active = 0.6;
          } else if (d < 28000) {
            p.active = 0.1;
            if (dot) dot.active = 0.3;
          } else if (d < 55000) {
            p.active = 0.02;
            if (dot) dot.active = 0.1;
          } else {
            p.active = 0;
            if (dot) dot.active = 0;
          }

          if (d < MOVE_RADIUS_SQ) {
            if (!gsap.isTweening(p)) shiftPoint(p);
          } else {
            gsap.killTweensOf(p);
            p.x = p.originX;
            p.y = p.originY;
          }

          drawLines(p);
          p.circle?.draw();
        }
      }
      rafId = requestAnimationFrame(animate);
    }

    function addListeners() {
      if (!("ontouchstart" in window)) {
        window.addEventListener("mousemove", mouseMove);
      }
      window.addEventListener("scroll", scrollCheck, { passive: true });
      window.addEventListener("resize", resize, { passive: true });
      visualViewportRef = window.visualViewport ?? null;
      if (visualViewportRef) {
        visualViewportRef.addEventListener("resize", resize, { passive: true });
      }
    }

    initHeader();
    animate();
    addListeners();

    return () => {
      animateHeader = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("scroll", scrollCheck);
      window.removeEventListener("resize", resize);
      if (visualViewportRef) {
        visualViewportRef.removeEventListener("resize", resize);
        visualViewportRef = null;
      }
      if (points.length) gsap.killTweensOf(points);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full max-w-none overflow-hidden ${className}`}
      aria-hidden
    >
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
