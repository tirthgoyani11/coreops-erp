import { useEffect, useRef } from 'react';

export function CyberBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        setSize();
        window.addEventListener('resize', setSize);

        // Grid Configuration
        const gridSize = 40;
        const points: Point[] = [];

        interface Point {
            x: number;
            y: number;
            originX: number;
            originY: number;
            vx: number;
            vy: number;
            size: number;
        }

        // Initialize Points
        for (let x = 0; x <= width; x += gridSize) {
            for (let y = 0; y <= height; y += gridSize) {
                points.push({
                    x,
                    y,
                    originX: x,
                    originY: y,
                    vx: 0,
                    vy: 0,
                    size: Math.random() * 1.5 + 0.5
                });
            }
        }

        // Mouse Interaction
        const mouse = { x: -1000, y: -1000 };
        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);

        // Animation Loop
        let animationFrameId: number;
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw Background (Deep Navy)
            ctx.fillStyle = '#020617'; // slate-950
            ctx.fillRect(0, 0, width, height);

            // Draw Grid Connections
            ctx.strokeStyle = 'rgba(109, 255, 142, 0.05)'; // #6DFF8E very faint
            ctx.lineWidth = 1;

            // Update and Draw Points
            points.forEach((point) => {
                // Distance from mouse
                const dx = mouse.x - point.x;
                const dy = mouse.y - point.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 200;

                // Mouse Repulsion/Attraction
                if (dist < maxDist) {
                    const angle = Math.atan2(dy, dx);
                    const force = (maxDist - dist) / maxDist;
                    point.vx -= Math.cos(angle) * force * 0.5;
                    point.vy -= Math.sin(angle) * force * 0.5;
                }

                // Return to origin (Spring)
                const dxOrigin = point.originX - point.x;
                const dyOrigin = point.originY - point.y;
                point.vx += dxOrigin * 0.02;
                point.vy += dyOrigin * 0.02;

                // Friction
                point.vx *= 0.9;
                point.vy *= 0.9;

                // Update Position
                point.x += point.vx;
                point.y += point.vy;

                // Draw Point
                ctx.beginPath();
                ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);

                // Color based on activity
                const speed = Math.sqrt(point.vx * point.vx + point.vy * point.vy);
                const alpha = Math.min(speed * 0.1 + 0.1, 0.4);
                ctx.fillStyle = `rgba(109, 255, 142, ${alpha})`;
                ctx.fill();
            });

            // Connect nearby points (Triangulation effect)
            // Optimization: Only connect a subset or use a separate loop if performance allows
            // For now, let's keep it simple: Just dots for performance, maybe faint grid lines

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', setSize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}
