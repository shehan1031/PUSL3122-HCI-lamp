"use client";
import { useRef, useEffect, useState, useCallback } from "react";

interface FurnitureItem {
  id?: string; _id?: string; type: string; label: string; icon: string;
  x: number; y: number; fw: number; fh: number; color: string; opacity: number;
}
interface Design {
  roomWidth: number; roomLength: number; wallColor: string; shape: string; furniture: FurnitureItem[];
}

const CLIPS: Record<string, string> = {
  Rectangle: "none",
  "L-Shape": "polygon(0 0,60% 0,60% 40%,100% 40%,100% 100%,0 100%)",
  "T-Shape": "polygon(0 0,100% 0,100% 40%,65% 40%,65% 100%,35% 100%,35% 40%,0 40%)",
};

export default function Canvas2D({
  design, selectedId, setSelectedId, onFurnitureMove, zoom, showGrid,
}: {
  design: Design | undefined;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  onFurnitureMove: (id: string, x: number, y: number) => void;
  zoom: number;
  showGrid: boolean;
}) {
  const cvRef = useRef<HTMLDivElement>(null);
  const OX = 56, OY = 56;
  const SC = 70 * zoom;

  const handleMouseDown = useCallback((e: React.MouseEvent, item: FurnitureItem) => {
    e.preventDefault(); e.stopPropagation();
    const fid = (item._id || item.id)!;
    setSelectedId(fid);
    const sx = e.clientX, sy = e.clientY, sfx = item.x, sfy = item.y;
    const mm = (mv: MouseEvent) => {
      onFurnitureMove(fid, Math.max(0, sfx + (mv.clientX - sx) / zoom), Math.max(0, sfy + (mv.clientY - sy) / zoom));
    };
    const mu = () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
    window.addEventListener("mousemove", mm); window.addEventListener("mouseup", mu);
  }, [zoom, setSelectedId, onFurnitureMove]);

  if (!design) return <div className="flex-1 flex items-center justify-center text-sm text-[--tm]">No design selected</div>;

  const RW = design.roomWidth * SC, RL = design.roomLength * SC;

  return (
    <div
      ref={cvRef}
      className={`flex-1 overflow-auto relative${showGrid ? " canvas-grid" : ""}`}
      style={{ background: "var(--bg)", cursor: "default" }}
      onClick={() => setSelectedId(null)}
    >
      <div style={{ position: "relative", minWidth: RW + OX * 2 + 60, minHeight: RL + OY * 2 + 60, padding: `${OY}px ${OX}px` }}>
        {/* Room footprint */}
        <div style={{
          position: "absolute", left: OX, top: OY, width: RW, height: RL,
          background: design.wallColor + "22",
          border: "2px solid rgba(201,169,110,.35)",
          clipPath: CLIPS[design.shape] || "none",
          transition: "all .3s",
          boxShadow: "inset 0 0 40px rgba(0,0,0,.15)",
        }} />
        {/* Dimension labels */}
        <div style={{ position:"absolute", left:OX+RW/2, top:OY-20, transform:"translateX(-50%)", fontSize:10, color:"var(--gd)", fontFamily:"var(--font-dm-mono)", pointerEvents:"none" }}>{design.roomWidth}m</div>
        <div style={{ position:"absolute", left:OX-32, top:OY+RL/2, transform:"translate(-50%,-50%) rotate(-90deg)", fontSize:10, color:"var(--gd)", fontFamily:"var(--font-dm-mono)", pointerEvents:"none" }}>{design.roomLength}m</div>

        {/* Furniture items */}
        {design.furniture.map(item => {
          const fid = (item._id || item.id)!;
          const isSel = fid === selectedId;
          const fw = item.fw * zoom, fh = item.fh * zoom;
          return (
            <div key={fid}
              onMouseDown={e => handleMouseDown(e, item)}
              onClick={e => { e.stopPropagation(); setSelectedId(fid); }}
              style={{
                position: "absolute",
                left: OX + item.x * zoom,
                top: OY + item.y * zoom,
                width: fw, height: fh,
                background: item.color,
                opacity: item.opacity,
                borderRadius: 5,
                cursor: "move",
                userSelect: "none",
                outline: isSel ? "2px solid #c9a96e" : "none",
                outlineOffset: 2,
                zIndex: isSel ? 30 : 1,
                boxShadow: isSel
                  ? "0 0 0 4px rgba(201,169,110,.2), 0 6px 20px rgba(0,0,0,.6)"
                  : "0 2px 10px rgba(0,0,0,.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.max(11, Math.min(fw / 3, 22)),
                transition: "box-shadow .15s, outline .1s",
              }}
            >
              <span style={{ pointerEvents: "none" }}>{item.icon || "📦"}</span>
              {isSel && (
                <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, background:"#c9a96e", borderRadius:"2px 0 4px 0", cursor:"se-resize" }} />
              )}
              <span style={{
                position: "absolute", bottom: -16, left: "50%",
                transform: "translateX(-50%)", fontSize: 9,
                color: "var(--tm)", whiteSpace: "nowrap",
                fontFamily: "var(--font-dm-mono)", pointerEvents: "none",
              }}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
