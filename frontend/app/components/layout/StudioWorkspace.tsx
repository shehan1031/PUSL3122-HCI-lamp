"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { designAPI, getUser } from "@/lib/client";
import toast, { Toaster } from "react-hot-toast";
import Canvas2D from "@/components/canvas/Canvas2D";

const Canvas3D = dynamic(() => import("@/components/canvas/Canvas3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center" style={{ background:"linear-gradient(180deg,#1a2535 0%,#0d1520 50%,#1a1208 100%)" }}>
      <div className="text-center">
        <div className="font-display italic text-3xl text-gold animate-pulse mb-2">lamp 3D</div>
        <p className="text-xs text-[--tm]">Initialising Three.js scene…</p>
      </div>
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────
type Fur = { id?:string; _id?:string; type:string; label:string; icon:string; x:number; y:number; fw:number; fh:number; color:string; opacity:number; rotation:number; };
type Design = { _id:string; name:string; client:string; roomType:string; shape:string; roomWidth:number; roomLength:number; wallColor:string; status:string; furniture:Fur[]; };

// ── Furniture catalogue ───────────────────────────────────────
const FUR_TYPES = [
  {type:"sofa",        icon:"🛋️",label:"Sofa",         fw:160,fh:70, color:"#e8927c"},
  {type:"armchair",    icon:"🪑",label:"Armchair",      fw:70, fh:70, color:"#4ecdc4"},
  {type:"coffee-table",icon:"🪵",label:"Coffee Table",  fw:95, fh:55, color:"#8b6914"},
  {type:"dining-table",icon:"🍽️",label:"Dining Table", fw:150,fh:100,color:"#8b6914"},
  {type:"bed",         icon:"🛏️",label:"Bed",           fw:180,fh:130,color:"#8bb89a"},
  {type:"wardrobe",    icon:"🚪",label:"Wardrobe",      fw:50, fh:120,color:"#5a4030"},
  {type:"bookshelf",   icon:"📚",label:"Bookshelf",     fw:50, fh:120,color:"#6b4e0f"},
  {type:"lamp",        icon:"💡",label:"Floor Lamp",    fw:28, fh:28, color:"#c9a96e"},
  {type:"plant",       icon:"🪴",label:"Plant",         fw:38, fh:38, color:"#5a9b4a"},
  {type:"tv-unit",     icon:"📺",label:"TV Unit",       fw:145,fh:45, color:"#3a3030"},
  {type:"desk",        icon:"🖥️",label:"Desk",          fw:110,fh:58, color:"#7a6040"},
  {type:"rug",         icon:"🟫",label:"Rug",           fw:200,fh:140,color:"#b09070"},
];
const WALL_COLORS = ["#f5efe6","#d4c5b0","#b8c9d0","#c5d0b8","#e8d0c0","#3d3530","#e0ddd5","#d8c8b8"];
const FUR_COLORS  = ["#e8927c","#8bb89a","#c9a96e","#4ecdc4","#6b4e8b","#8b6914","#5a4030","#5a9b4a","#b09070","#4a6080","#c09060","#8a7060"];

export default function StudioWorkspace() {
  const router = useRouter();
  const user = getUser();

  const [designs,      setDesigns]      = useState<Design[]>([]);
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [selectedId,   setSelectedId]   = useState<string|null>(null);
  const [view,         setView]         = useState<"2d"|"3d">("2d");
  const [zoom,         setZoom]         = useState(1);
  const [showGrid,     setShowGrid]     = useState(true);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [undoStack,    setUndoStack]    = useState<Fur[][]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newForm,      setNewForm]      = useState({ client:"", roomType:"Living Room", shape:"Rectangle" });
  const [treeOpen,     setTreeOpen]     = useState<Record<string,boolean>>({});

  const d = designs[activeIdx];
  const selectedItem = d?.furniture.find(f => (f._id||f.id) === selectedId);

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      let data = await designAPI.list();
      if (!data.length) {
        const def = await designAPI.create({
          name:"Living Room — Default", client:"Showcase Client",
          roomType:"Living Room", shape:"Rectangle",
          roomWidth:5.5, roomLength:4.2, wallColor:"#f5efe6", status:"active",
          furniture:[
            {type:"sofa",        icon:"🛋️",label:"Sofa",        x:120,y:80, fw:160,fh:70, color:"#e8927c",opacity:1,rotation:0},
            {type:"coffee-table",icon:"🪵",label:"Coffee Table", x:142,y:172,fw:95, fh:55, color:"#8b6914",opacity:1,rotation:0},
            {type:"armchair",    icon:"🪑",label:"Armchair",     x:252,y:162,fw:70, fh:70, color:"#4ecdc4",opacity:1,rotation:0},
            {type:"plant",       icon:"🪴",label:"Corner Plant", x:60, y:68, fw:38, fh:38, color:"#5a9b4a",opacity:1,rotation:0},
            {type:"lamp",        icon:"💡",label:"Floor Lamp",   x:316,y:70, fw:28, fh:28, color:"#c9a96e",opacity:1,rotation:0},
            {type:"bookshelf",   icon:"📚",label:"Bookshelf",    x:345,y:72, fw:50, fh:120,color:"#6b4e0f",opacity:1,rotation:0},
            {type:"rug",         icon:"🟫",label:"Area Rug",     x:90, y:140,fw:200,fh:140,color:"#c9a06a",opacity:0.7,rotation:0},
          ],
        });
        data = [def];
      }
      setDesigns(data);
    } catch { toast.error("Failed to load — is the backend running on port 4000?"); }
    setLoading(false);
  }

  // ── Helpers ────────────────────────────────────────────────
  function snap() {
    if (!d) return;
    setUndoStack(s => [...s.slice(-29), JSON.parse(JSON.stringify(d.furniture))]);
  }
  function undo() {
    if (!undoStack.length) return void toast("Nothing to undo", { icon:"↩" });
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    updateDesign(activeIdx, { furniture: prev });
    toast("Undone", { icon:"↩" });
  }
  function updateDesign(idx: number, patch: Partial<Design>) {
    setDesigns(ds => ds.map((x, i) => i === idx ? { ...x, ...patch } : x));
  }

  // ── Furniture ──────────────────────────────────────────────
  function addFurniture(type: string) {
    if (!d) return;
    snap();
    const cat = FUR_TYPES.find(f => f.type === type)!;
    const item: Fur = {
      id: "f" + Date.now(), type, icon:cat.icon, label:cat.label,
      x:80+Math.random()*120, y:60+Math.random()*80,
      fw:cat.fw, fh:cat.fh, color:cat.color, opacity:1, rotation:0,
    };
    updateDesign(activeIdx, { furniture:[...d.furniture, item] });
    setSelectedId(item.id!);
    toast.success(`${cat.icon} ${cat.label} added`);
  }

  const moveFurniture = useCallback((id: string, x: number, y: number) => {
    setDesigns(ds => ds.map((des, i) => i === activeIdx
      ? { ...des, furniture:des.furniture.map(f => (f._id||f.id)===id ? {...f,x,y} : f) }
      : des
    ));
  }, [activeIdx]);

  function patchFurniture(id: string, patch: Partial<Fur>) {
    setDesigns(ds => ds.map((des, i) => i === activeIdx
      ? { ...des, furniture:des.furniture.map(f => (f._id||f.id)===id ? {...f,...patch} : f) }
      : des
    ));
  }

  function deleteSelected() {
    if (!d || !selectedId) return;
    snap();
    updateDesign(activeIdx, { furniture:d.furniture.filter(f => (f._id||f.id) !== selectedId) });
    setSelectedId(null);
    toast.error("Item removed");
  }

  // ── Save / CRUD ────────────────────────────────────────────
  async function saveDesign() {
    if (!d) return;
    setSaving(true);
    try {
      const saved = await designAPI.update(d._id, {
        name:d.name, client:d.client, roomType:d.roomType, shape:d.shape,
        roomWidth:d.roomWidth, roomLength:d.roomLength, wallColor:d.wallColor,
        status:d.status, furniture:d.furniture,
      });
      updateDesign(activeIdx, saved);
      toast.success("Saved to MongoDB ✓");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    setSaving(false);
  }

  async function createDesign() {
    try {
      const nd = await designAPI.create({
        name:`${newForm.roomType} — ${newForm.client||"New Client"}`,
        client:newForm.client||"New Client",
        roomType:newForm.roomType, shape:newForm.shape,
        roomWidth:5, roomLength:4, wallColor:"#f5efe6",
        status:"draft", furniture:[],
      });
      setDesigns(ds => [...ds, nd]);
      setActiveIdx(designs.length);
      setShowNewModal(false);
      setNewForm({ client:"", roomType:"Living Room", shape:"Rectangle" });
      toast.success("Design created");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function deleteDesign() {
    if (!d || designs.length <= 1) return void toast.error("Cannot delete the only design");
    await designAPI.delete(d._id);
    const nd = designs.filter((_, i) => i !== activeIdx);
    setDesigns(nd);
    setActiveIdx(Math.max(0, activeIdx - 1));
    toast.error("Design deleted");
  }

  function logout() {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${API}/api/auth/logout`, { method:"POST", credentials:"include" });
    localStorage.removeItem("lamp_token");
    localStorage.removeItem("lamp_user");
    router.push("/login");
  }

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (["input","select","textarea"].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
      if (e.ctrlKey && e.key==="z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key==="s") { e.preventDefault(); saveDesign(); }
      if (e.key==="Delete" && selectedId) deleteSelected();
      if (e.key==="Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, d, undoStack]);

  if (loading) return (
    <div className="h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="font-display italic text-5xl text-gold animate-pulse mb-3">lamp</div>
        <p className="text-xs text-[--tm]">Loading your portfolio…</p>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg">
      <Toaster position="bottom-right" toastOptions={{
        style:{ background:"#221f1b",color:"#ede8df",border:"1px solid #3a342e",fontFamily:"var(--font-dm-sans)",fontSize:12,borderRadius:10 },
        success:{iconTheme:{primary:"#6dbf8a",secondary:"#221f1b"}},
        error:{iconTheme:{primary:"#e07070",secondary:"#221f1b"}},
      }}/>

      {/* ── TOP BAR ── */}
      <header className="h-14 bg-surface border-b border-border flex items-center px-5 gap-3 flex-shrink-0 z-50">
        <span className="font-display italic text-2xl text-gold">lamp</span>
        <div className="w-px h-5 bg-border"/>
        <div className="flex items-center gap-1.5 text-xs text-[--tm]">
          <span className="text-[--ts]">Portfolio</span>
          <span className="text-[--b]">›</span>
          <span className="text-[--ts] font-medium truncate max-w-52">{d?.name || "—"}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* 2D / 3D toggle */}
          <div className="flex bg-surface2 border border-border rounded-md overflow-hidden">
            {(["2d","3d"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-1.5 text-xs font-medium transition-all ${view===v?"bg-gold text-bg":"text-[--tm] hover:text-cream"}`}>
                {v==="2d"?"2D Layout":"3D Scene"}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-border"/>
          <button onClick={undo} title="Undo (Ctrl+Z)" className="w-8 h-8 flex items-center justify-center rounded-md text-[--tm] hover:bg-surface2 hover:text-cream transition-all text-base">↩</button>
          <button onClick={() => setShowNewModal(true)} className="btn-outline text-xs">+ New</button>
          <button onClick={saveDesign} disabled={saving} className="btn-gold flex items-center gap-1.5 text-xs disabled:opacity-60">
            💾 {saving?"Saving…":"Save"}
          </button>
          <div className="w-px h-5 bg-border"/>
          {/* Avatar */}
          <div className="relative group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-[--ro] flex items-center justify-center text-xs font-bold text-bg cursor-pointer select-none">
              {user?.name?.split(" ").map((n: string) => n[0]).join("") || "AC"}
            </div>
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface2 border border-border rounded-xl shadow-2xl py-1 invisible group-hover:visible z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium text-cream">{user?.name}</p>
                <p className="text-[10px] text-[--tm] capitalize">{user?.role}</p>
              </div>
              {user?.role==="admin" && (
                <button onClick={() => router.push("/admin")} className="w-full text-left px-3 py-2 text-xs text-[--tm] hover:text-cream hover:bg-surface3 transition-colors">
                  ⚡ Admin Panel
                </button>
              )}
              <button onClick={logout} className="w-full text-left px-3 py-2 text-xs text-[--tm] hover:text-cream hover:bg-surface3 transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── WORKSPACE ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR — Design Tree */}
        <aside className="w-56 bg-surface border-r border-border flex flex-col flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[--bs]">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[--tm]">Design Tree</span>
            <button onClick={() => setShowNewModal(true)} className="text-[10px] text-[--tm] hover:text-gold border border-border rounded px-1.5 py-0.5 transition-colors">+</button>
          </div>
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {/* Portfolio root */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-surface2 rounded-md"
              onClick={() => setTreeOpen(t => ({ ...t, root:!t.root }))}>
              <span className={`text-[9px] text-[--tm] transition-transform ${!treeOpen.root?"rotate-90":""}`}>▶</span>
              <span className="text-sm">🏢</span>
              <span className="text-xs text-gold font-semibold flex-1">Portfolio</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface3 text-[--tm] font-mono">{designs.length}</span>
            </div>
            {!treeOpen.root && designs.map((des, i) => (
              <div key={des._id} className="ml-3">
                <div onClick={() => { setActiveIdx(i); setSelectedId(null); }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-surface2 rounded-md ${i===activeIdx?"bg-gold/10":""}`}>
                  <span className={`text-[9px] text-[--tm] transition-transform ${!treeOpen[des._id]?"rotate-90":""}`}
                    onClick={e => { e.stopPropagation(); setTreeOpen(t => ({ ...t, [des._id]:!t[des._id] })); }}>▶</span>
                  <span className="text-sm">🏠</span>
                  <span className={`text-xs flex-1 truncate ${i===activeIdx?"text-gold":"text-[--ts]"}`}>{des.client}</span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${des.status==="active"?"bg-success":des.status==="draft"?"bg-gold":"bg-[--tm]"}`}/>
                  <span className="text-[10px] font-mono text-[--tm]">{des.furniture.length}</span>
                </div>
                {!treeOpen[des._id] && (
                  <div className="ml-4">
                    <div className="flex items-center gap-1.5 px-2 py-1 opacity-60 pointer-events-none">
                      <span className="opacity-0 text-[9px]">▶</span>
                      <span className="text-sm">📐</span>
                      <span className="text-[11px] text-[--ts]">{des.shape} · {des.roomWidth}×{des.roomLength}m</span>
                    </div>
                    {des.furniture.map(f => {
                      const fid = (f._id||f.id)!;
                      return (
                        <div key={fid} onClick={() => { setActiveIdx(i); setSelectedId(fid); }}
                          className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-surface2 rounded-md ${fid===selectedId?"bg-gold/10":""}`}>
                          <span className="opacity-0 text-[9px]">▶</span>
                          <span className="text-[11px]">{f.icon||"📦"}</span>
                          <span className={`text-[11px] flex-1 truncate ${fid===selectedId?"text-gold":"text-[--tm]"}`}>{f.label}</span>
                          <span className="w-2 h-2 rounded-full border border-white/10 flex-shrink-0" style={{ background:f.color }}/>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-[--bs] px-4 py-2 flex items-center gap-2 text-[10px] text-[--tm] font-mono">
            <span>{designs.length} designs</span><span className="text-[--b]">·</span>
            <span>{designs.reduce((a,x) => a+x.furniture.length, 0)} items</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success"/>MongoDB
            </span>
          </div>
        </aside>

        {/* CENTER — Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Canvas toolbar */}
          <div className="h-10 bg-surface border-b border-border flex items-center px-3 gap-1 flex-shrink-0">
            <button onClick={() => setZoom(z => Math.min(z*1.2,3))} className="w-7 h-7 flex items-center justify-center rounded text-[--tm] hover:bg-surface2 hover:text-cream text-lg">+</button>
            <button onClick={() => setZoom(z => Math.max(z/1.2,.3))} className="w-7 h-7 flex items-center justify-center rounded text-[--tm] hover:bg-surface2 hover:text-cream text-lg">−</button>
            <button onClick={() => setZoom(1)} className="w-7 h-7 flex items-center justify-center rounded text-[--tm] hover:bg-surface2 hover:text-cream text-sm">⊡</button>
            <div className="w-px h-4 bg-border mx-1"/>
            <button onClick={() => setShowGrid(g => !g)}
              className={`w-7 h-7 flex items-center justify-center rounded transition-all text-sm ${showGrid?"text-gold bg-gold/10":"text-[--tm] hover:bg-surface2"}`}>⊞</button>
            {view==="3d" && (
              <span className="ml-2 text-[10px] text-[--tm] font-mono bg-surface2 px-2 py-0.5 rounded border border-border">
                Three.js · PCF Shadows · ACES Filmic · Bloom
              </span>
            )}
            <span className="ml-auto text-[10px] text-[--tm] font-mono">
              {d?.roomWidth}m × {d?.roomLength}m · {d?.shape} · {d?.furniture.length||0} items · {Math.round(zoom*100)}%
            </span>
          </div>

          {/* Canvas */}
          {view==="2d" ? (
            <Canvas2D
              design={d}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onFurnitureMove={moveFurniture}
              zoom={zoom}
              showGrid={showGrid}
            />
          ) : (
            <Canvas3D
              activeDesign={d}
              selectedFurnitureId={selectedId}
              setSelectedFurniture={setSelectedId}
            />
          )}

          {/* Status bar */}
          <div className="h-7 bg-surface border-t border-border flex items-center px-4 gap-3 text-[10px] text-[--tm] font-mono flex-shrink-0">
            <span>Items: <b className="text-[--ts] font-normal">{d?.furniture.length||0}</b></span>
            <span>Room: <b className="text-[--ts] font-normal">{d?.roomWidth}×{d?.roomLength}m</b></span>
            <span>Shape: <b className="text-[--ts] font-normal">{d?.shape}</b></span>
            <span>Zoom: <b className="text-[--ts] font-normal">{Math.round(zoom*100)}%</b></span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success"/>
              Express API · PATCH /api/designs/{d?._id?.slice(-8)}
            </span>
          </div>
        </div>

        {/* RIGHT PANEL — Properties */}
        <aside className="w-64 bg-surface border-l border-border flex flex-col overflow-y-auto flex-shrink-0">

          {/* Room specs */}
          <div className="border-b border-[--bs] px-4 py-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-3">🏠 Room</p>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {["Rectangle","L-Shape","T-Shape"].map(s => (
                <button key={s} onClick={() => d && updateDesign(activeIdx, { shape:s })}
                  className={`border rounded-md py-2 text-center text-[10px] transition-all ${d?.shape===s?"border-gold bg-gold/10 text-gold":"border-border text-[--tm] hover:border-[--gd]"}`}>
                  <div className="text-base">{s==="Rectangle"?"▭":s==="L-Shape"?"⌐":"⊤"}</div>{s}
                </button>
              ))}
            </div>
            {["roomWidth","roomLength"].map(k => (
              <div key={k} className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-[--tm] w-16 flex-shrink-0">{k==="roomWidth"?"Width":"Length"} (m)</span>
                <input type="number" min={2} max={20} step={.1}
                  value={(d as Record<string,unknown>)?.[k] as number || 5}
                  onChange={e => d && updateDesign(activeIdx, { [k]:parseFloat(e.target.value)||4 })}
                  className="inp flex-1 text-[11px] py-1.5"/>
              </div>
            ))}
            <div>
              <div className="text-[11px] text-[--tm] mb-1.5">Wall Color</div>
              <div className="flex flex-wrap gap-1.5">
                {WALL_COLORS.map(c => (
                  <button key={c} onClick={() => d && updateDesign(activeIdx, { wallColor:c })}
                    className="w-5 h-5 rounded border-2 transition-transform hover:scale-110"
                    style={{ background:c, borderColor:d?.wallColor===c?"#c9a96e":"transparent" }}/>
                ))}
                <input type="color" value={d?.wallColor||"#f5efe6"}
                  onChange={e => d && updateDesign(activeIdx, { wallColor:e.target.value })}
                  className="w-5 h-5 cursor-pointer rounded"/>
              </div>
            </div>
          </div>

          {/* Furniture palette */}
          <div className="border-b border-[--bs] px-4 py-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-3">🛋️ Furniture</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FUR_TYPES.map(({ type, icon, label }) => (
                <button key={type} onClick={() => addFurniture(type)}
                  className="bg-surface2 border border-border rounded-md px-2 py-2 text-center hover:border-[--gd] hover:bg-surface3 active:scale-95 transition-all">
                  <div className="text-lg">{icon}</div>
                  <div className="text-[10px] text-[--tm]">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected item properties */}
          {selectedItem && (
            <div className="border-b border-[--bs] px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-3">✦ Selected</p>
              <input value={selectedItem.label}
                onChange={e => patchFurniture((selectedItem._id||selectedItem.id)!, { label:e.target.value })}
                className="inp text-xs py-1.5 mb-2"/>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {["fw","fh"].map((k,i) => (
                  <div key={k}>
                    <div className="text-[10px] text-[--tm] mb-1">{i===0?"W":"D"} (m)</div>
                    <input type="number" step=".1"
                      value={((selectedItem as Record<string,unknown>)[k] as number/70).toFixed(1)}
                      onChange={e => patchFurniture((selectedItem._id||selectedItem.id)!, { [k]:parseFloat(e.target.value)*70||40 })}
                      className="inp text-xs py-1.5"/>
                  </div>
                ))}
              </div>
              <div className="mb-2">
                <div className="text-[10px] text-[--tm] mb-1.5">Color</div>
                <div className="flex flex-wrap gap-1.5">
                  {FUR_COLORS.map(c => (
                    <button key={c} onClick={() => patchFurniture((selectedItem._id||selectedItem.id)!, { color:c })}
                      className="w-5 h-5 rounded border-2 transition-transform hover:scale-110"
                      style={{ background:c, borderColor:selectedItem.color===c?"#c9a96e":"transparent" }}/>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] text-[--tm]">Opacity</div>
                  <span className="text-[10px] text-[--tm] font-mono">{Math.round(selectedItem.opacity*100)}%</span>
                </div>
                <input type="range" min={10} max={100} value={Math.round(selectedItem.opacity*100)}
                  onChange={e => patchFurniture((selectedItem._id||selectedItem.id)!, { opacity:parseInt(e.target.value)/100 })}
                  className="w-full"/>
              </div>
              <button onClick={deleteSelected}
                className="w-full py-1.5 text-xs text-error border border-red-900/40 rounded-md hover:bg-red-900/10 transition-colors">
                🗑 Delete Item
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-3">📐 Actions</p>
            {[
              { label:"💾 Save to MongoDB", fn: saveDesign },
              { label:"⧉ Duplicate Design", fn: async () => {
                if (!d) return;
                const c = await designAPI.create({ ...d, name:d.name+" (Copy)", _id:undefined, status:"draft" });
                setDesigns(ds => [...ds, c]);
                toast.success("Duplicated");
              }},
              { label:"🗑 Delete Design", fn: deleteDesign, danger:true },
            ].map(({ label, fn, danger }) => (
              <button key={label} onClick={fn}
                className={`w-full text-left px-3 py-2 text-xs border rounded-md mb-1.5 transition-all ${danger
                  ?"text-error border-red-900/40 hover:bg-red-900/10"
                  :"text-[--tm] border-border hover:text-cream hover:border-[--gd]"}`}>
                {label}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* ── NEW DESIGN MODAL ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setShowNewModal(false)}>
          <div className="bg-surface border border-border rounded-2xl p-7 w-[420px] shadow-2xl animate-fade-up" onClick={e => e.stopPropagation()}>
            <h2 className="font-display italic text-2xl text-gold mb-5">New Design</h2>
            <div className="mb-4">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Client Name</label>
              <input value={newForm.client} onChange={e => setNewForm(f => ({ ...f, client:e.target.value }))} className="inp" placeholder="e.g. Johnson Residence"/>
            </div>
            <div className="mb-4">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-1.5">Room Type</label>
              <select value={newForm.roomType} onChange={e => setNewForm(f => ({ ...f, roomType:e.target.value }))} className="inp">
                {["Living Room","Bedroom","Dining Room","Home Office","Kitchen"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-[--tm] mb-2">Shape</label>
              <div className="grid grid-cols-3 gap-2">
                {["Rectangle","L-Shape","T-Shape"].map(s => (
                  <button key={s} onClick={() => setNewForm(f => ({ ...f, shape:s }))}
                    className={`border rounded-lg py-2.5 text-xs transition-all ${newForm.shape===s?"border-gold bg-gold/10 text-gold":"border-border text-[--tm]"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewModal(false)} className="btn-outline">Cancel</button>
              <button onClick={createDesign} className="btn-gold">Create Design</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
