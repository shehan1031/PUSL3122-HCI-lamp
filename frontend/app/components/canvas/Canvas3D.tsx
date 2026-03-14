"use client";
/**
 * LAMP Studio — Rich Three.js 3D Scene
 * Fixed: removed all .clampScalar() chaining (not available on THREE.Color in r128)
 * Fixed: removed unused imports (useState, useEffect, useThree, extend, etc.)
 * All color manipulation uses the safe shiftColor() helper instead.
 */

import { Suspense, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    OrbitControls,
    Html,
    MeshReflectorMaterial,
    ContactShadows,
} from "@react-three/drei";
import {
    EffectComposer,
    Bloom,
    Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

// ─── Safe color helper (replaces chained .clampScalar) ────────────────────────

/** Multiply each RGB channel by factor and clamp to [0, 1]. Returns hex string. */
function shiftColor(hex: string, factor: number): string {
    const c = new THREE.Color(hex);
    c.r = Math.min(1, Math.max(0, c.r * factor));
    c.g = Math.min(1, Math.max(0, c.g * factor));
    c.b = Math.min(1, Math.max(0, c.b * factor));
    return "#" + c.getHexString();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FurnitureItem {
    id?: string;
    _id?: string;
    type: string;
    label: string;
    x: number;
    y: number;
    fw: number;
    fh: number;
    color: string;
    opacity: number;
}

interface Design {
    roomWidth: number;
    roomLength: number;
    wallColor: string;
    shape: string;
    furniture: FurnitureItem[];
}

interface Props {
    activeDesign: Design | undefined;
    selectedFurnitureId: string | null;
    setSelectedFurniture: (id: string | null) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS_PX_PER_METRE = 70;

function canvasToWorld(item: FurnitureItem, roomW: number, roomL: number) {
    const S = 1 / CANVAS_PX_PER_METRE;
    const cx = item.x * S + (item.fw * S) / 2 - roomW / 2;
    const cz = item.y * S + (item.fh * S) / 2 - roomL / 2;
    return { cx, cz, w: item.fw * S, d: item.fh * S };
}

const HEIGHTS: Record<string, number> = {
    sofa: 0.78, bed: 0.55, wardrobe: 2.1, bookshelf: 1.8,
    lamp: 1.65, plant: 0.9, "dining-table": 0.75, "coffee-table": 0.42,
    armchair: 0.85, "tv-unit": 0.52, desk: 0.78, rug: 0.02,
};

// ─── Parquet floor texture (procedural) ──────────────────────────────────────

function useParquetTexture(): THREE.CanvasTexture {
    return useMemo(() => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const plankW = 64, plankH = 16;
        const colors = ["#5c3d1e","#6b4a25","#7a5530","#5a3818","#6e4e2a"];
        for (let py = 0; py < size; py += plankH * 2) {
            for (let px = 0; px < size; px += plankW) {
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillRect(px, py, plankW - 1, plankH - 1);
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillRect(px - plankW / 2, py + plankH, plankW - 1, plankH - 1);
            }
        }
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < size; i += 4) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return tex;
    }, []);
}

// ─── Room shell ───────────────────────────────────────────────────────────────

function RoomShell({ design }: { design: Design }) {
    const W = design.roomWidth, L = design.roomLength, H = 3.0;
    const wc = design.wallColor;
    const parquet = useParquetTexture();
    const bbColor = useMemo(() => shiftColor(wc, 0.7), [wc]);

    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[W + 0.2, L + 0.2]} />
                <MeshReflectorMaterial map={parquet} blur={[300, 100]} resolution={1024}
                                       mixBlur={0.6} mixStrength={0.25} roughness={0.9} depthScale={0.5}
                                       minDepthThreshold={0.4} maxDepthThreshold={1.4} metalness={0.05} mirror={0} />
            </mesh>

            {/* Back wall */}
            <mesh position={[0, H / 2, -L / 2]} receiveShadow>
                <planeGeometry args={[W, H]} />
                <meshStandardMaterial color={wc} roughness={0.88} />
            </mesh>

            {/* Left wall */}
            <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[L, H]} />
                <meshStandardMaterial color={wc} roughness={0.88} />
            </mesh>

            {/* Window — emissive daylight panel */}
            <mesh position={[W * 0.2, H * 0.55, -L / 2 + 0.01]}>
                <planeGeometry args={[1.4, 1.1]} />
                <meshStandardMaterial color="#b8d4f0" emissive="#b8d4f0" emissiveIntensity={1.2}
                                      transparent opacity={0.85} roughness={0} metalness={0} />
            </mesh>
            {[[-0.7, 0], [0.7, 0], [0, 0.55], [0, -0.55]].map(([ox, oy], i) => (
                <mesh key={i} position={[
                    W * 0.2 + ox * (i < 2 ? 0.01 : 0),
                    H * 0.55 + oy * (i >= 2 ? 0.01 : 0),
                    -L / 2 + 0.015,
                ]}>
                    <boxGeometry args={[i < 2 ? 0.04 : 1.48, i >= 2 ? 0.04 : 1.14, 0.04]} />
                    <meshStandardMaterial color="#e8ddd0" roughness={0.4} />
                </mesh>
            ))}

            {/* Ceiling */}
            <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[W + 0.2, L + 0.2]} />
                <meshStandardMaterial color="#f0ebe4" roughness={0.95} />
            </mesh>

            {/* Skirting boards */}
            <mesh position={[0, 0.05, -L / 2 + 0.025]} castShadow receiveShadow>
                <boxGeometry args={[W, 0.1, 0.025]} />
                <meshStandardMaterial color={bbColor} roughness={0.5} />
            </mesh>
            <mesh position={[-W / 2 + 0.025, 0.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.025, 0.1, L]} />
                <meshStandardMaterial color={bbColor} roughness={0.5} />
            </mesh>

            {/* Ceiling pendant */}
            <mesh position={[0, H - 0.01, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.03, 16]} />
                <meshStandardMaterial color="#d0c8b8" roughness={0.3} metalness={0.2} />
            </mesh>
            <mesh position={[0, H - 0.22, 0]} castShadow>
                <sphereGeometry args={[0.08, 12, 8]} />
                <meshStandardMaterial color="#f5f0e8" emissive="#fff8e0" emissiveIntensity={0.4} roughness={0.2} />
            </mesh>

            {/* Wall picture frame */}
            <mesh position={[-W * 0.28, H * 0.6, -L / 2 + 0.015]} castShadow>
                <boxGeometry args={[0.7, 0.5, 0.03]} />
                <meshStandardMaterial color="#4a3828" roughness={0.4} />
            </mesh>
            <mesh position={[-W * 0.28, H * 0.6, -L / 2 + 0.03]}>
                <boxGeometry args={[0.62, 0.42, 0.01]} />
                <meshStandardMaterial color="#8ba0b0" roughness={0.9} />
            </mesh>
        </group>
    );
}

// ─── Furniture models ─────────────────────────────────────────────────────────

function SofaModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const lc       = useMemo(() => shiftColor(color, 0.75), [color]);
    const cushionC = useMemo(() => shiftColor(color, 1.12), [color]);
    const ei = selected ? 0.08 : 0;
    const legH = 0.12, seatH = 0.22, backH = 0.42, armW = 0.12;

    const mat = useCallback((roughness = 0.85) => (
        <meshStandardMaterial color={color} roughness={roughness}
                              emissive={selected ? color : "#000"} emissiveIntensity={ei} />
    ), [color, selected, ei]);

    const legPos: [number, number, number][] = [
        [ w/2-0.08, legH/2,  d/2-0.08],
        [-w/2+0.08, legH/2,  d/2-0.08],
        [ w/2-0.08, legH/2, -d/2+0.08],
        [-w/2+0.08, legH/2, -d/2+0.08],
    ];

    return (
        <group>
            {legPos.map((p, i) => (
                <mesh key={i} position={p} castShadow>
                    <cylinderGeometry args={[0.025, 0.02, legH, 8]} />
                    <meshStandardMaterial color={lc} roughness={0.3} metalness={0.1} />
                </mesh>
            ))}
            <mesh position={[0, legH+seatH/2, 0]} castShadow receiveShadow>
                <boxGeometry args={[w, seatH, d*0.65]} />{mat(0.88)}
            </mesh>
            {[-1,0,1].map((xi) => (
                <mesh key={xi} position={[xi*(w/3.2), legH+seatH+0.04, 0]} castShadow>
                    <boxGeometry args={[w/3-0.02, 0.1, d*0.6]} />
                    <meshStandardMaterial color={cushionC} roughness={0.9}
                                          emissive={selected ? cushionC : "#000"} emissiveIntensity={selected ? 0.06 : 0} />
                </mesh>
            ))}
            <mesh position={[0, legH+seatH+backH/2, -d*0.3]} castShadow receiveShadow>
                <boxGeometry args={[w, backH, d*0.28]} />{mat(0.85)}
            </mesh>
            {[-1,0,1].map((xi) => (
                <mesh key={xi} position={[xi*(w/3.2), legH+seatH+backH*0.5, -d*0.18]} castShadow>
                    <boxGeometry args={[w/3-0.02, backH*0.7, 0.08]} />
                    <meshStandardMaterial color={cushionC} roughness={0.9}
                                          emissive={selected ? cushionC : "#000"} emissiveIntensity={selected ? 0.06 : 0} />
                </mesh>
            ))}
            {[-1,1].map((side) => (
                <mesh key={side} position={[side*(w/2-armW/2), legH+seatH+backH*0.3, 0]} castShadow>
                    <boxGeometry args={[armW, backH*0.6, d*0.65]} />{mat(0.82)}
                </mesh>
            ))}
        </group>
    );
}

function BedModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const frameC = useMemo(() => shiftColor(color, 0.6),  [color]);
    const duvC   = useMemo(() => shiftColor(color, 1.15), [color]);
    const em = selected ? color : "#000", ei = selected ? 0.07 : 0;
    return (
        <group>
            <mesh position={[0,0.1,0]} castShadow receiveShadow>
                <boxGeometry args={[w+0.08,0.2,d+0.08]} />
                <meshStandardMaterial color={frameC} roughness={0.4} emissive={em} emissiveIntensity={ei} />
            </mesh>
            <mesh position={[0,0.65,-d/2+0.06]} castShadow>
                <boxGeometry args={[w+0.08,1.1,0.1]} />
                <meshStandardMaterial color={frameC} roughness={0.38} emissive={em} emissiveIntensity={ei} />
            </mesh>
            <mesh position={[0,0.28,0.05]} castShadow receiveShadow>
                <boxGeometry args={[w-0.04,0.2,d-0.06]} />
                <meshStandardMaterial color="#f0ebe4" roughness={0.95} emissive={em} emissiveIntensity={ei*0.5} />
            </mesh>
            <mesh position={[0,0.42,0.1]} castShadow>
                <boxGeometry args={[w-0.08,0.14,d*0.65]} />
                <meshStandardMaterial color={duvC} roughness={0.92} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[-0.25,0.25].map((ox) => (
                <mesh key={ox} position={[ox,0.42,-d/2+0.22]} castShadow>
                    <boxGeometry args={[0.42,0.1,0.28]} />
                    <meshStandardMaterial color="#f8f4ee" roughness={0.93} emissive={em} emissiveIntensity={ei*0.5} />
                </mesh>
            ))}
            {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz],i) => (
                <mesh key={i} position={[sx*(w/2-0.06),0.04,sz*(d/2-0.06)]} castShadow>
                    <boxGeometry args={[0.06,0.1,0.06]} />
                    <meshStandardMaterial color={frameC} roughness={0.3} />
                </mesh>
            ))}
        </group>
    );
}

function WardrobeModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const darkerC = useMemo(() => shiftColor(color, 0.75), [color]);
    const H = HEIGHTS.wardrobe;
    const em = selected ? color : "#000", ei = selected ? 0.06 : 0;
    return (
        <group>
            <mesh position={[0,H/2,0]} castShadow receiveShadow>
                <boxGeometry args={[w,H,d]} />
                <meshStandardMaterial color={color} roughness={0.45} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[-1,1].map((side) => (
                <mesh key={side} position={[side*w*0.25,H/2,d/2+0.005]} castShadow>
                    <boxGeometry args={[w*0.47,H*0.94,0.02]} />
                    <meshStandardMaterial color={darkerC} roughness={0.4} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            {[-1,1].map((side) => (
                <mesh key={side} position={[side*w*0.06,H*0.5,d/2+0.025]} castShadow>
                    <cylinderGeometry args={[0.008,0.008,0.06,8]} />
                    <meshStandardMaterial color="#c0b090" roughness={0.2} metalness={0.8} />
                </mesh>
            ))}
            <mesh position={[0,H+0.02,0]} castShadow>
                <boxGeometry args={[w+0.02,0.04,d+0.02]} />
                <meshStandardMaterial color={darkerC} roughness={0.3} />
            </mesh>
            {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz],i) => (
                <mesh key={i} position={[sx*(w/2-0.04),0.03,sz*(d/2-0.04)]} castShadow>
                    <boxGeometry args={[0.04,0.06,0.04]} />
                    <meshStandardMaterial color={darkerC} roughness={0.3} />
                </mesh>
            ))}
        </group>
    );
}

function BookshelfModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const H = HEIGHTS.bookshelf, shelves = 5;
    const shelfColors = ["#c9a96e","#e8927c","#8bb89a","#4ecdc4","#c9b49e","#6b8fb0","#e0c870","#b09070"];
    const em = selected ? color : "#000", ei = selected ? 0.06 : 0;

    const books = useMemo(() => {
        const b: {x:number;y:number;bw:number;bh:number;color:string;zOff:number}[] = [];
        for (let s = 0; s < shelves; s++) {
            let x = -w/2+0.03;
            const sy = (s/shelves)*(H*0.88)+0.12;
            while (x < w/2-0.05) {
                const bw = 0.025+Math.random()*0.025;
                const bh = (H/shelves)*(0.55+Math.random()*0.3);
                b.push({ x:x+bw/2, y:sy+bh/2, bw, bh,
                    color: shelfColors[Math.floor(Math.random()*shelfColors.length)],
                    zOff: Math.random()*0.02 });
                x += bw+0.005;
            }
        }
        return b;
    }, [w, H]);

    return (
        <group>
            {[-1,1].map((side) => (
                <mesh key={side} position={[side*(w/2-0.015),H/2,0]} castShadow receiveShadow>
                    <boxGeometry args={[0.03,H,d]} />
                    <meshStandardMaterial color={color} roughness={0.5} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            <mesh position={[0,H/2,-d/2+0.01]} castShadow receiveShadow>
                <boxGeometry args={[w,H,0.02]} />
                <meshStandardMaterial color={color} roughness={0.6} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {Array.from({length:shelves+1}).map((_,i) => (
                <mesh key={i} position={[0,(i/shelves)*H*0.94+0.015,0]} castShadow>
                    <boxGeometry args={[w-0.03,0.03,d]} />
                    <meshStandardMaterial color={color} roughness={0.5} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            {books.map((bk,i) => (
                <mesh key={i} position={[bk.x,bk.y,-d/2+0.05+bk.zOff]} castShadow>
                    <boxGeometry args={[bk.bw,bk.bh,d*0.7]} />
                    <meshStandardMaterial color={bk.color} roughness={0.8} />
                </mesh>
            ))}
        </group>
    );
}

function LampModel({ color, selected: _selected }: { color: string; selected: boolean }) {
    const lightRef = useRef<THREE.PointLight>(null);
    useFrame(() => {
        if (lightRef.current) lightRef.current.intensity = 1.2 + Math.sin(Date.now()*0.003)*0.05;
    });
    return (
        <group>
            <mesh position={[0,0.04,0]} castShadow>
                <cylinderGeometry args={[0.12,0.14,0.06,16]} />
                <meshStandardMaterial color="#8a8070" roughness={0.3} metalness={0.4} />
            </mesh>
            {[0.4,0.9,1.35].map((y,i) => (
                <mesh key={i} position={[0,y,0]} castShadow>
                    <cylinderGeometry args={[0.015,0.015,0.52,8]} />
                    <meshStandardMaterial color="#9a9080" roughness={0.25} metalness={0.5} />
                </mesh>
            ))}
            <mesh position={[0,1.62,0]} castShadow>
                <coneGeometry args={[0.22,0.28,16,1,true]} />
                <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide}
                                      emissive={color} emissiveIntensity={0.3} transparent opacity={0.9} />
            </mesh>
            <mesh position={[0,1.52,0]}>
                <sphereGeometry args={[0.04,8,6]} />
                <meshStandardMaterial color="#fff8e0" emissive="#fff8e0" emissiveIntensity={3.0} />
            </mesh>
            <pointLight ref={lightRef} position={[0,1.5,0]} color="#ffcc66"
                        intensity={1.2} distance={4.0} decay={2} castShadow
                        shadow-mapSize-width={512} shadow-mapSize-height={512} />
        </group>
    );
}

function PlantModel({ color: _color, selected }: { color: string; selected: boolean }) {
    const leafColor     = selected ? "#7abf5a" : "#5a9b4a";
    const leafColorDark = "#3a7030";
    const leaves = useMemo(() => Array.from({length:7}).map((_,i) => ({
        angle: (i/7)*Math.PI*2,
        lean:  0.3+Math.random()*0.2,
        len:   0.18+Math.random()*0.12,
        rot:   Math.random()*0.4-0.2,
    })), []);
    return (
        <group>
            <mesh position={[0,0.12,0]} castShadow>
                <cylinderGeometry args={[0.1,0.08,0.22,12]} />
                <meshStandardMaterial color="#8b6040" roughness={0.7} />
            </mesh>
            <mesh position={[0,0.235,0]}>
                <cylinderGeometry args={[0.095,0.095,0.02,12]} />
                <meshStandardMaterial color="#3a2810" roughness={0.95} />
            </mesh>
            {leaves.map((lf,i) => (
                <mesh key={i} position={[Math.sin(lf.angle)*0.02, 0.42+i*0.04, Math.cos(lf.angle)*0.02]}
                      rotation={[lf.lean,lf.angle,lf.rot]} castShadow>
                    <boxGeometry args={[0.008,lf.len*1.1,0.008]} />
                    <meshStandardMaterial color={leafColorDark} roughness={0.8} />
                </mesh>
            ))}
            {leaves.map((lf,i) => (
                <mesh key={i} position={[
                    Math.sin(lf.angle)*(0.04+lf.lean*0.15),
                    0.5+i*0.04+lf.len,
                    Math.cos(lf.angle)*(0.04+lf.lean*0.15),
                ]} rotation={[lf.lean*0.6,lf.angle,lf.rot]} castShadow>
                    <sphereGeometry args={[lf.len*0.9,6,4]} />
                    <meshStandardMaterial color={i%2===0 ? leafColor : leafColorDark}
                                          roughness={0.8} transparent opacity={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function CoffeeTableModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const H = HEIGHTS["coffee-table"];
    const em = selected ? color : "#000", ei = selected ? 0.07 : 0;
    return (
        <group>
            <mesh position={[0,H-0.02,0]} castShadow receiveShadow>
                <boxGeometry args={[w,0.04,d]} />
                <meshStandardMaterial color="#c8e0f0" roughness={0.05} metalness={0.1}
                                      transparent opacity={0.7} emissive={em} emissiveIntensity={ei*0.3} />
            </mesh>
            <mesh position={[0,H*0.38,0]} castShadow>
                <boxGeometry args={[w*0.85,0.025,d*0.85]} />
                <meshStandardMaterial color={color} roughness={0.55} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz],i) => (
                <mesh key={i} position={[sx*(w*0.42),H/2,sz*(d*0.42)]} castShadow>
                    <boxGeometry args={[0.04,H,0.04]} />
                    <meshStandardMaterial color={color} roughness={0.4} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
        </group>
    );
}

function DiningTableModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const H = HEIGHTS["dining-table"];
    const em = selected ? color : "#000", ei = selected ? 0.06 : 0;
    const darkC = useMemo(() => shiftColor(color, 0.7), [color]);
    return (
        <group>
            <mesh position={[0,H,0]} castShadow receiveShadow>
                <boxGeometry args={[w,0.05,d]} />
                <meshStandardMaterial color={color} roughness={0.4} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[
                {pos:[0,H-0.08,d/2-0.04]    as [number,number,number], size:[w-0.08,0.06,0.03] as [number,number,number]},
                {pos:[0,H-0.08,-d/2+0.04]   as [number,number,number], size:[w-0.08,0.06,0.03] as [number,number,number]},
                {pos:[w/2-0.04,H-0.08,0]    as [number,number,number], size:[0.03,0.06,d-0.08] as [number,number,number]},
                {pos:[-w/2+0.04,H-0.08,0]   as [number,number,number], size:[0.03,0.06,d-0.08] as [number,number,number]},
            ].map((f,i) => (
                <mesh key={i} position={f.pos} castShadow>
                    <boxGeometry args={f.size} />
                    <meshStandardMaterial color={darkC} roughness={0.5} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz],i) => (
                <mesh key={i} position={[sx*(w/2-0.06),H/2,sz*(d/2-0.06)]} castShadow>
                    <cylinderGeometry args={[0.03,0.018,H,8]} />
                    <meshStandardMaterial color={darkC} roughness={0.35} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
        </group>
    );
}

function ArmchairModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const em = selected ? color : "#000", ei = selected ? 0.07 : 0;
    const lightC = useMemo(() => shiftColor(color, 1.1),  [color]);
    const darkC  = useMemo(() => shiftColor(color, 0.65), [color]);
    return (
        <group>
            <mesh position={[0,0.38,0]} castShadow receiveShadow>
                <boxGeometry args={[w*0.85,0.18,d*0.7]} />
                <meshStandardMaterial color={color} roughness={0.88} emissive={em} emissiveIntensity={ei} />
            </mesh>
            <mesh position={[0,0.5,0]} castShadow>
                <boxGeometry args={[w*0.8,0.1,d*0.65]} />
                <meshStandardMaterial color={lightC} roughness={0.9} emissive={em} emissiveIntensity={ei} />
            </mesh>
            <mesh position={[0,0.72,-d*0.3]} castShadow receiveShadow>
                <boxGeometry args={[w*0.85,0.52,d*0.25]} />
                <meshStandardMaterial color={color} roughness={0.85} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[-1,1].map((sx) => (
                <mesh key={sx} position={[sx*w*0.4,0.62,0]} castShadow>
                    <boxGeometry args={[w*0.1,0.1,d*0.7]} />
                    <meshStandardMaterial color={darkC} roughness={0.6} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz],i) => (
                <mesh key={i} position={[sx*(w*0.36),0.1,sz*(d*0.32)]} castShadow>
                    <cylinderGeometry args={[0.022,0.016,0.22,8]} />
                    <meshStandardMaterial color={darkC} roughness={0.3} metalness={0.1} />
                </mesh>
            ))}
        </group>
    );
}

function TVUnitModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const H = HEIGHTS["tv-unit"];
    const em = selected ? color : "#000", ei = selected ? 0.06 : 0;
    const darkC = useMemo(() => shiftColor(color, 0.6), [color]);
    return (
        <group>
            <mesh position={[0,H/2,0]} castShadow receiveShadow>
                <boxGeometry args={[w,H,d]} />
                <meshStandardMaterial color={color} roughness={0.4} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[-1,0,1].map((xi) => (
                <mesh key={xi} position={[xi*(w/3),H/2,d/2+0.005]} castShadow>
                    <boxGeometry args={[w/3-0.02,H*0.88,0.015]} />
                    <meshStandardMaterial color={darkC} roughness={0.35} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            <mesh position={[0,H+0.55,0]} castShadow>
                <boxGeometry args={[w*0.9,0.55,0.04]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.1} metalness={0.4} />
            </mesh>
            <mesh position={[0,H+0.55,0.025]}>
                <boxGeometry args={[w*0.86,0.51,0.005]} />
                <meshStandardMaterial color="#0a1020" emissive="#0a3060" emissiveIntensity={0.15} roughness={0.05} />
            </mesh>
            {[-1,1].map((sx) => (
                <mesh key={sx} position={[sx*(w*0.35),0.02,0]} castShadow>
                    <boxGeometry args={[0.06,0.06,d*0.7]} />
                    <meshStandardMaterial color={darkC} roughness={0.35} />
                </mesh>
            ))}
        </group>
    );
}

function DeskModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const H = HEIGHTS.desk;
    const em = selected ? color : "#000", ei = selected ? 0.06 : 0;
    const darkC = useMemo(() => shiftColor(color, 0.65), [color]);
    return (
        <group>
            <mesh position={[0,H,0]} castShadow receiveShadow>
                <boxGeometry args={[w,0.04,d]} />
                <meshStandardMaterial color={color} roughness={0.45} emissive={em} emissiveIntensity={ei} />
            </mesh>
            {[-1,1].map((sx) => (
                <mesh key={sx} position={[sx*(w/2-0.02),H/2,0]} castShadow receiveShadow>
                    <boxGeometry args={[0.04,H,d]} />
                    <meshStandardMaterial color={darkC} roughness={0.4} emissive={em} emissiveIntensity={ei} />
                </mesh>
            ))}
            <mesh position={[0,H+0.3,-d*0.2]} castShadow>
                <boxGeometry args={[0.5,0.32,0.03]} />
                <meshStandardMaterial color="#1c1c1c" roughness={0.2} metalness={0.5} />
            </mesh>
            <mesh position={[0,H+0.3,-d*0.2+0.018]}>
                <boxGeometry args={[0.47,0.29,0.005]} />
                <meshStandardMaterial color="#081828" emissive="#0a3060" emissiveIntensity={0.3} roughness={0.05} />
            </mesh>
            <mesh position={[0,H+0.05,-d*0.2]} castShadow>
                <boxGeometry args={[0.06,0.12,0.04]} />
                <meshStandardMaterial color="#222" roughness={0.3} metalness={0.4} />
            </mesh>
        </group>
    );
}

function RugModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    const em = selected ? color : "#000", ei = selected ? 0.1 : 0;
    const borderC = useMemo(() => shiftColor(color, 0.65), [color]);
    return (
        <group position={[0,0.01,0]}>
            <mesh receiveShadow>
                <boxGeometry args={[w,0.015,d]} />
                <meshStandardMaterial color={color} roughness={0.95} emissive={em} emissiveIntensity={ei} />
            </mesh>
            <mesh receiveShadow>
                <boxGeometry args={[w+0.02,0.01,d+0.02]} />
                <meshStandardMaterial color={borderC} roughness={0.95} />
            </mesh>
        </group>
    );
}

function GenericModel({ w, d, color, selected }: { w: number; d: number; color: string; selected: boolean }) {
    return (
        <mesh position={[0,0.25,0]} castShadow receiveShadow>
            <boxGeometry args={[w*0.9,0.5,d*0.9]} />
            <meshStandardMaterial color={color} roughness={0.8}
                                  emissive={selected ? color : "#000"} emissiveIntensity={selected ? 0.1 : 0} />
        </mesh>
    );
}

// ─── Furniture dispatcher ─────────────────────────────────────────────────────

function FurnitureModel({ item, roomW, roomL, selected, onSelect }: {
    item: FurnitureItem; roomW: number; roomL: number; selected: boolean; onSelect: () => void;
}) {
    const { cx, cz, w, d } = canvasToWorld(item, roomW, roomL);
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!groupRef.current) return;
        groupRef.current.scale.setScalar(selected ? 1 + Math.sin(Date.now()*0.003)*0.008 : 1);
    });

    const cp = { w, d, color: item.color, selected };
    const model = useMemo(() => {
        switch (item.type) {
            case "sofa":         return <SofaModel {...cp} />;
            case "bed":          return <BedModel {...cp} />;
            case "wardrobe":     return <WardrobeModel {...cp} />;
            case "bookshelf":    return <BookshelfModel {...cp} />;
            case "lamp":         return <LampModel color={item.color} selected={selected} />;
            case "plant":        return <PlantModel color={item.color} selected={selected} />;
            case "coffee-table": return <CoffeeTableModel {...cp} />;
            case "dining-table": return <DiningTableModel {...cp} />;
            case "armchair":     return <ArmchairModel {...cp} />;
            case "tv-unit":      return <TVUnitModel {...cp} />;
            case "desk":         return <DeskModel {...cp} />;
            case "rug":          return <RugModel {...cp} />;
            default:             return <GenericModel {...cp} />;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.type, item.color, selected, w, d]);

    return (
        <group ref={groupRef} position={[cx, 0, cz]}
               onClick={(e) => { e.stopPropagation(); onSelect(); }}>
            {model}
            {selected && (
                <Html position={[0, (HEIGHTS[item.type] ?? 0.5) + 0.35, 0]} center>
                    <div style={{
                        background: "rgba(201,169,110,0.92)", color: "#0f0e0c",
                        padding: "3px 10px", borderRadius: 6, fontSize: 11,
                        fontFamily: "'DM Sans',sans-serif", fontWeight: 600,
                        whiteSpace: "nowrap", pointerEvents: "none",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    }}>{item.label}</div>
                </Html>
            )}
        </group>
    );
}

// ─── Lighting rig ─────────────────────────────────────────────────────────────

function LightingRig({ roomW, roomL }: { roomW: number; roomL: number }) {
    return (
        <>
            <ambientLight color="#ffe8c8" intensity={0.35} />
            <directionalLight position={[roomW*0.6, 4.5, roomL*0.4]} intensity={1.8} color="#fff5e0"
                              castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048}
                              shadow-camera-near={0.1} shadow-camera-far={20}
                              shadow-camera-left={-8} shadow-camera-right={8}
                              shadow-camera-top={8} shadow-camera-bottom={-8}
                              shadow-bias={-0.0005} shadow-normalBias={0.02} />
            <directionalLight position={[-roomW*0.5, 3.0, -roomL*0.3]} intensity={0.4} color="#c8d8ff" />
            <directionalLight position={[0, 5, roomL*0.6]} intensity={0.3} color="#fff0d8" />
            <spotLight position={[roomW*0.2, 3.2, -roomL/2+1.0]} intensity={2.5} color="#d8ecff"
                       angle={0.4} penumbra={0.6} castShadow
                       shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.001} />
            <pointLight position={[0, 2.85, 0]} color="#ffcc88" intensity={0.8} distance={5} decay={2} />
        </>
    );
}

// ─── Post-processing ──────────────────────────────────────────────────────────

function PostFX() {
    return (
        <EffectComposer multisampling={4}>
            <Bloom luminanceThreshold={0.7} luminanceSmoothing={0.9} intensity={0.6} blendFunction={BlendFunction.SCREEN} />
            <Vignette offset={0.25} darkness={0.55} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
    );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ design, selectedFurnitureId, setSelectedFurniture }: Props & { design: Design }) {
    return (
        <>
            <LightingRig roomW={design.roomWidth} roomL={design.roomLength} />
            <RoomShell design={design} />
            {design.furniture.map((item) => {
                const fid = (item._id || item.id)!;
                return (
                    <FurnitureModel key={fid} item={item}
                                    roomW={design.roomWidth} roomL={design.roomLength}
                                    selected={fid === selectedFurnitureId}
                                    onSelect={() => setSelectedFurniture(fid)} />
                );
            })}
            <ContactShadows position={[0,0.005,0]} opacity={0.45}
                            scale={Math.max(design.roomWidth, design.roomLength)*1.5}
                            blur={2.0} far={1.5} resolution={512} color="#1a1208" />
            <mesh position={[0,-0.02,0]} rotation={[-Math.PI/2,0,0]}
                  onClick={() => setSelectedFurniture(null)}>
                <planeGeometry args={[design.roomWidth+4, design.roomLength+4]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <OrbitControls enablePan enableZoom enableRotate
                           minPolarAngle={0.05} maxPolarAngle={Math.PI/2.1}
                           minDistance={2} maxDistance={14}
                           dampingFactor={0.08} enableDamping target={[0,0.5,0]} />
            <fog attach="fog" args={["#0d0c0a", 12, 28]} />
            <PostFX />
        </>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Canvas3D({ activeDesign, selectedFurnitureId, setSelectedFurniture }: Props) {
    if (!activeDesign) {
        return (
            <div className="flex-1 flex items-center justify-center"
                 style={{ background: "linear-gradient(180deg,#1a2535 0%,#0d1520 50%,#1a1208 100%)" }}>
                <p className="text-sm text-[--tm]">No design selected</p>
            </div>
        );
    }
    return (
        <div className="flex-1 relative"
             style={{ background: "linear-gradient(180deg,#1a2535 0%,#0d1520 50%,#1a1208 100%)" }}>
            <Canvas
                shadows={{ type: THREE.PCFSoftShadowMap }}
                camera={{ position: [activeDesign.roomWidth*0.8, activeDesign.roomLength*0.7, activeDesign.roomLength*1.1], fov: 42 }}
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15, outputColorSpace: THREE.SRGBColorSpace }}
                dpr={[1,2]}
            >
                <Suspense fallback={null}>
                    <Scene activeDesign={activeDesign} selectedFurnitureId={selectedFurnitureId}
                           setSelectedFurniture={setSelectedFurniture} design={activeDesign} />
                </Suspense>
            </Canvas>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-[--tm] font-mono bg-[--s]/80 px-3 py-1.5 rounded-full border border-[--b] pointer-events-none backdrop-blur-sm select-none">
                Drag to orbit · Scroll to zoom · Click furniture to select
            </div>
            <div className="absolute top-3 right-3 text-[10px] text-[--tm] font-mono bg-[--s]/80 px-2 py-1 rounded-lg border border-[--b] pointer-events-none">
                Three.js · ACES Filmic · PCF Shadows · Bloom
            </div>
        </div>
    );
}
