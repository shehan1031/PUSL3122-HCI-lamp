"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const particles = Array.from({ length: 55 }, () => ({
            x:     Math.random() * window.innerWidth,
            y:     Math.random() * window.innerHeight,
            vx:    (Math.random() - 0.5) * 0.28,
            vy:    (Math.random() - 0.5) * 0.28,
            size:  Math.random() * 1.4 + 0.3,
            alpha: Math.random() * 0.35 + 0.05,
        }));

        let raf: number;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.x = (p.x + p.vx + canvas.width)  % canvas.width;
                p.y = (p.y + p.vy + canvas.height) % canvas.height;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(201,169,110,${p.alpha})`;
                ctx.fill();
            }
            raf = requestAnimationFrame(draw);
        };
        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <div style={s.root}>
            <canvas ref={canvasRef} style={s.canvas} />
            <div style={s.glow} />

            {/* Nav */}
            <nav className="lamp-nav" style={s.nav}>
                <div style={s.navLogo}>
                    <div style={s.navLogoIcon}>🪔</div>
                    <span style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)", fontSize: "1.1rem", fontWeight: 500, letterSpacing: "0.04em" }}>
                        LAMP Studio
                    </span>
                </div>
                <div className="lamp-navlinks" style={s.navLinks}>
                    <a href="#features" className="lamp-nav-link" style={s.navLink}>Features</a>
                    <a href="#about"    className="lamp-nav-link" style={s.navLink}>About</a>
                    <Link href="/login" className="lamp-btn-nav"  style={s.btnNav}>Sign In</Link>
                </div>
            </nav>

            {/* Hero */}
            <main className="lamp-hero" style={s.hero}>
                <p className="lamp-fadeup-1" style={s.eyebrow}>
                    Professional Interior Design Tool
                </p>
                <h1 className="lamp-fadeup-2" style={s.title}>
                    Design rooms<br />
                    in <em style={{ fontStyle: "italic", color: "var(--gold, #c9a96e)" }}>stunning</em> 3D
                </h1>
                <p className="lamp-fadeup-3" style={s.sub}>
                    LAMP Studio brings your interior visions to life — drag-and-drop floor planning
                    paired with immersive Three.js visualization, PBR materials, and cinematic lighting.
                </p>
                <div className="lamp-fadeup-4" style={s.ctaRow}>
                    <Link href="/login" className="lamp-btn-primary" style={s.btnPrimary}>
                        Start Designing
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </Link>
                    <Link href="/register" className="lamp-btn-ghost" style={s.btnGhost}>
                        Create free account
                    </Link>
                </div>
            </main>

            <div className="lamp-fadeup-4" style={s.divider} />

            {/* Features */}
            <section id="features" className="lamp-features lamp-fadeup-5" style={s.features}>
                {FEATURES.map((f, i) => (
                    <FeatureCard key={i} {...f} isLast={i === FEATURES.length - 1} />
                ))}
            </section>

            <footer style={s.footer}>
                LAMP Design Studio — Professional furniture visualization tool
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc, tag, isLast }: {
    icon: string; title: string; desc: string; tag: string; isLast: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className="lamp-feature-card"
            style={{
                padding: "2.2rem 2rem",
                background: hovered ? "var(--s2, #221f1b)" : "var(--s, #181714)",
                borderRight: isLast ? "none" : "1px solid var(--b, rgba(201,169,110,0.12))",
                transition: "background 0.3s",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={{
                width: 40, height: 40,
                background:   hovered ? "rgba(201,169,110,0.18)" : "rgba(201,169,110,0.1)",
                border:       `1px solid ${hovered ? "rgba(201,169,110,0.4)" : "rgba(201,169,110,0.2)"}`,
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, marginBottom: "1.15rem",
                transition: "background 0.3s, border-color 0.3s",
            }}>
                {icon}
            </div>
            <div style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)", fontSize: "1.05rem", fontWeight: 500, color: "var(--cream,#f5efe6)", marginBottom: "0.6rem" }}>
                {title}
            </div>
            <p style={{ fontSize: "0.82rem", fontWeight: 300, color: "var(--tm,#8a7f72)", lineHeight: 1.7 }}>
                {desc}
            </p>
            <span style={{ display: "inline-block", marginTop: "1rem", fontFamily: "var(--font-mono,'DM Mono',monospace)", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gold,#c9a96e)", opacity: 0.7 }}>
                {tag}
            </span>
        </div>
    );
}

const FEATURES = [
    {
        icon: "⬜",
        title: "2D Floor Planning",
        desc: "Design room layouts with precise measurements and drag-and-drop furniture placement on a pixel-perfect canvas.",
        tag: "Drag & Drop",
    },
    {
        icon: "✦",
        title: "3D Visualization",
        desc: "Experience your designs in immersive Three.js with ACES filmic tone mapping, PCF shadows, and bloom post-processing.",
        tag: "Three.js · PBR",
    },
    {
        icon: "◈",
        title: "Customization",
        desc: "Personalize colors, materials, and room configurations. Save multiple design variants and share with clients.",
        tag: "12 Furniture Types",
    },
];

const s: Record<string, React.CSSProperties> = {
    root: {
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        position: "relative",
        background: "var(--bg, #0f0e0c)",
        color: "var(--cream, #f5efe6)",
        fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
        overflowX: "hidden",
    },
    canvas: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
    glow: {
        position: "fixed", top: "-20vh", left: "50%",
        transform: "translateX(-50%)",
        width: "80vw", height: "80vh",
        background: "radial-gradient(ellipse, rgba(201,169,110,0.06) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
    },
    nav: {
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1.4rem 3rem",
        borderBottom: "1px solid var(--b, rgba(201,169,110,0.12))",
    },
    navLogo: { display: "flex", alignItems: "center", gap: "0.55rem", color: "var(--cream, #f5efe6)" },
    navLogoIcon: {
        width: 28, height: 28,
        background: "linear-gradient(135deg, #c9a96e, #e8c98a)",
        borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14,
    },
    navLinks: { display: "flex", alignItems: "center", gap: "2rem" },
    navLink: {
        fontSize: "0.78rem", fontWeight: 400, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--tm, #8a7f72)",
        textDecoration: "none", transition: "color 0.2s",
    },
    btnNav: {
        fontSize: "0.76rem", fontWeight: 500, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--bg, #0f0e0c)",
        background: "linear-gradient(135deg, #c9a96e, #e8c98a)",
        borderRadius: 6, padding: "0.48rem 1.15rem",
        textDecoration: "none", display: "inline-block",
        transition: "opacity 0.2s, transform 0.2s",
    },
    hero: {
        flex: 1, position: "relative", zIndex: 5,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "5.5rem 2rem 3.5rem",
    },
    eyebrow: {
        fontFamily: "var(--font-mono, 'DM Mono', monospace)",
        fontSize: "0.67rem", letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--gold, #c9a96e)", marginBottom: "1.3rem",
    },
    title: {
        fontFamily: "var(--font-playfair, 'Playfair Display', serif)",
        fontSize: "clamp(2.8rem, 7vw, 5.2rem)",
        fontWeight: 500, lineHeight: 1.08,
        color: "var(--cream, #f5efe6)", marginBottom: "0.2rem",
    },
    sub: {
        fontSize: "clamp(0.9rem, 1.4vw, 1.05rem)",
        fontWeight: 300, color: "var(--tm, #8a7f72)",
        maxWidth: 500, lineHeight: 1.68,
        marginTop: "1.3rem", marginBottom: "2.6rem",
    },
    ctaRow: {
        display: "flex", gap: "0.9rem", alignItems: "center",
        flexWrap: "wrap", justifyContent: "center",
    },
    btnPrimary: {
        display: "inline-flex", alignItems: "center", gap: "0.45rem",
        background: "linear-gradient(135deg, #c9a96e, #e8c98a)",
        color: "var(--bg, #0f0e0c)", fontSize: "0.8rem", fontWeight: 600,
        letterSpacing: "0.06em", textTransform: "uppercase",
        padding: "0.82rem 1.9rem", borderRadius: 8,
        textDecoration: "none", transition: "transform 0.2s, box-shadow 0.2s",
        boxShadow: "0 4px 24px rgba(201,169,110,0.25)",
    },
    btnGhost: {
        display: "inline-flex", alignItems: "center", gap: "0.45rem",
        background: "transparent", color: "var(--cream, #f5efe6)",
        fontSize: "0.8rem", fontWeight: 400, letterSpacing: "0.04em",
        padding: "0.82rem 1.7rem", borderRadius: 8,
        border: "1px solid var(--b, rgba(201,169,110,0.12))",
        textDecoration: "none", transition: "border-color 0.2s, color 0.2s, background 0.2s",
    },
    divider: {
        width: 1, height: 44,
        background: "linear-gradient(to bottom, transparent, var(--b, rgba(201,169,110,0.12)), transparent)",
        margin: "0 auto", position: "relative", zIndex: 5,
    },
    features: {
        position: "relative", zIndex: 5,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        margin: "0 3rem 5rem",
        border: "1px solid var(--b, rgba(201,169,110,0.12))",
        borderRadius: 16, overflow: "hidden",
    },
    footer: {
        position: "relative", zIndex: 5,
        textAlign: "center", padding: "1.4rem",
        borderTop: "1px solid var(--b, rgba(201,169,110,0.12))",
        fontFamily: "var(--font-mono, 'DM Mono', monospace)",
        fontSize: "0.63rem", letterSpacing: "0.12em", textTransform: "uppercase",
        color: "var(--tm, #8a7f72)",
    },
};
