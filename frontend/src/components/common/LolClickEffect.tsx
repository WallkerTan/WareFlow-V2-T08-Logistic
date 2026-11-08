import React, { useEffect, useRef } from "react";

interface ClickBurst {
    x: number;
    y: number;
    startTime: number;
    color: {
        primary: string;
        glow: string;
        core: string;
        ring: string;
    };
    sparks: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
    }[];
}

export const LolClickEffect: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const burstsRef = useRef<ClickBurst[]>([]);
    const animIdRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize canvas to window size with DPR support
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.scale(dpr, dpr);
        };

        resize();
        window.addEventListener("resize", resize);

        const render = (now: number) => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            const DURATION = 420; // 420ms animation length
            const bursts = burstsRef.current;

            for (let i = bursts.length - 1; i >= 0; i--) {
                const b = bursts[i];
                const elapsed = now - b.startTime;
                const t = Math.min(elapsed / DURATION, 1);

                if (t >= 1) {
                    bursts.splice(i, 1);
                    continue;
                }

                // Ease function for snap-in effect
                // Quick inward snap in first 35%, then smooth settle & fade
                const easeInward = Math.pow(1 - t, 2.5);
                const alpha = t < 0.2 ? 1 : Math.pow(1 - (t - 0.2) / 0.8, 1.6);

                const currentGap = 6 + easeInward * 14; // converges from 20px to 6px
                const bladeLen = 14 + (1 - t) * 6; // blade length

                ctx.save();
                ctx.translate(b.x, b.y);

                // 1. Draw glowing shockwave ring expanding outward
                const ringRadius = 4 + t * 24;
                const ringAlpha = Math.max(0, (1 - t * 1.3) * 0.7);
                if (ringAlpha > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = b.color.ring;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = ringAlpha;
                    ctx.shadowColor = b.color.glow;
                    ctx.shadowBlur = 8;
                    ctx.stroke();
                    ctx.restore();
                }

                // 2. Draw 4 diagonal slashes forming the "X" reticle (45, 135, 225, 315 deg)
                // LoL style: 4 sharp angled chevrons / slashes cutting towards center
                ctx.globalAlpha = alpha;
                ctx.shadowColor = b.color.glow;
                ctx.shadowBlur = 12;

                const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

                angles.forEach((angle) => {
                    ctx.save();
                    ctx.rotate(angle);

                    // Blade path: sharp tapered chevron / slash blade
                    ctx.beginPath();
                    // Tip pointing inwards
                    ctx.moveTo(currentGap, 0);
                    // Upper wing
                    ctx.lineTo(currentGap + bladeLen * 0.5, 3);
                    // Outer back tip
                    ctx.lineTo(currentGap + bladeLen, 0);
                    // Lower wing
                    ctx.lineTo(currentGap + bladeLen * 0.5, -3);
                    ctx.closePath();

                    // Outer stroke glow
                    ctx.strokeStyle = b.color.primary;
                    ctx.lineWidth = 1.8;
                    ctx.stroke();

                    // Inner bright core
                    ctx.fillStyle = b.color.core;
                    ctx.fill();

                    // Trailing slash light streak
                    ctx.beginPath();
                    ctx.moveTo(currentGap - 2, 0);
                    ctx.lineTo(currentGap + bladeLen * 0.8, 0);
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    ctx.restore();
                });

                // 3. Central flash spark / dot
                if (t < 0.35) {
                    const centerAlpha = (1 - t / 0.35);
                    const centerSize = (1 - t / 0.35) * 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.shadowColor = b.color.glow;
                    ctx.shadowBlur = 10;
                    ctx.globalAlpha = centerAlpha;
                    ctx.fill();
                }

                // 4. Subtle micro sparks drifting outward
                b.sparks.forEach((s) => {
                    s.x += s.vx;
                    s.y += s.vy;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size * (1 - t), 0, Math.PI * 2);
                    ctx.fillStyle = b.color.core;
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.fill();
                });

                ctx.restore();
            }

            if (bursts.length > 0) {
                animIdRef.current = requestAnimationFrame(render);
            } else {
                animIdRef.current = null;
            }
        };

        const handlePointerDown = (e: MouseEvent) => {
            // Check button: 0 = Left click, 2 = Right click
            // Left click = Cyan / Neon Blue (LoL Move Reticle)
            // Right click = Rose / Neon Red (LoL Attack Reticle)
            const isRightClick = e.button === 2;

            const colorTheme = isRightClick
                ? {
                      primary: "#f43f5e",
                      glow: "#fb7185",
                      core: "#fff1f2",
                      ring: "rgba(244, 63, 94, 0.8)",
                  }
                : {
                      primary: "#38bdf8",
                      glow: "#0284c7",
                      core: "#f0f9ff",
                      ring: "rgba(56, 189, 248, 0.85)",
                  };

            // Generate 4-6 small sparks bursting diagonally
            const sparks = [];
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.8 + Math.random() * 1.6;
                sparks.push({
                    x: 0,
                    y: 0,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    size: 1 + Math.random() * 1.5,
                });
            }

            burstsRef.current.push({
                x: e.clientX,
                y: e.clientY,
                startTime: performance.now(),
                color: colorTheme,
                sparks,
            });

            if (!animIdRef.current) {
                animIdRef.current = requestAnimationFrame(render);
            }
        };

        window.addEventListener("mousedown", handlePointerDown, { passive: true });

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousedown", handlePointerDown);
            if (animIdRef.current) {
                cancelAnimationFrame(animIdRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 999999,
                userSelect: "none",
            }}
        />
    );
};

export default LolClickEffect;

