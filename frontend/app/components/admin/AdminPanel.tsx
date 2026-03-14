"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminAPI, getUser } from "@/lib/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import toast, { Toaster } from "react-hot-toast";

const PIE_COLORS = ["#c9a96e","#e8927c","#8bb89a","#4ecdc4","#6b4e8b","#8b6914"];
const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type Stats = {
  totalUsers:number; totalDesigns:number; activeDesigns:number;
  draftDesigns:number; archivedDesigns:number; totalFurnitureItems:number;
  monthlyData:{_id:{m:number;y:number};count:number}[];
  roomTypes:{_id:string;count:number}[];
  recentDesigns:{_id:string;name:string;client:string;designerName:string;status:string;furniture:unknown[];createdAt:string}[];
  topDesigners:{_id:string;name:string;email:string;designCount:number}[];
};
type User = {_id:string;name:string;email:string;role:string;isActive:boolean;designCount:number;lastLogin?:string;createdAt:string};
type Design = {_id:string;name:string;client:string;designerName:string;roomType:string;shape:string;status:string;furniture:unknown[];updatedAt:string};

export default function AdminPanel() {
  const router = useRouter();
  const user = getUser();
  const [tab, setTab] = useState<"overview"|"users"|"designs"|"settings">("overview");
  const [stats, setStats] = useState<Stats|null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/dashboard"); return; }
    loadStats();
  }, []);

  useEffect(() => { if (tab === "users") loadUsers(); }, [tab]);
  useEffect(() => { if (tab === "designs") loadDesigns(); }, [tab]);

  async function loadStats() {
    try { setStats(await adminAPI.stats()); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }
  async function loadUsers() {
    try { const d = await adminAPI.users(); setUsers(d.users); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function loadDesigns() {
    try { const d = await adminAPI.designs(); setDesigns(d.designs); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function toggleActive(id: string, current: boolean) {
    try {
      await adminAPI.updateUser(id, { isActive: !current });
      setUsers(u => u.map(x => x._id===id ? {...x,isActive:!current} : x));
      toast.success(`User ${!current?"activated":"disabled"}`);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function deleteUser(id: string) {
    try {
      await adminAPI.deleteUser(id);
      setUsers(u => u.filter(x => x._id!==id));
      setConfirmDel(null);
      toast.error("User deleted");
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const chartData = stats?.monthlyData.map(d => ({ name: MONTHS[d._id.m], count: d.count })) || [];
  const pieData = stats?.roomTypes.map(d => ({ name: d._id, value: d.count })) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Toaster position="bottom-right" toastOptions={{style:{background:"#221f1b",color:"#ede8df",border:"1px solid #3a342e",fontSize:12,borderRadius:10}}}/>

      {/* Sidebar */}
      <aside className="w-52 bg-surface border-r border-border flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-border">
          <div className="font-display italic text-2xl text-gold">lamp</div>
          <div className="text-[9px] text-[--tm] tracking-widest uppercase mt-0.5">Admin Console</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {([["overview","📊","Overview"],["users","👥","Users"],["designs","🎨","Designs"],["settings","⚙️","Settings"]] as const).map(([id,ic,lb]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-left transition-all border ${
                tab===id ? "bg-gold/15 text-gold border-gold/25" : "text-[--tm] hover:bg-surface2 hover:text-cream border-transparent"
              }`}>
              <span>{ic}</span>{lb}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button onClick={() => router.push("/dashboard")} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[--tm] hover:bg-surface2 hover:text-cream border border-transparent transition-all text-left"><span>🎨</span>Studio</button>
          <button onClick={() => { fetch("/api/auth/logout",{method:"POST"}); localStorage.clear(); router.push("/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[--tm] hover:bg-surface2 hover:text-cream border border-transparent transition-all text-left"><span>🚪</span>Sign Out</button>
        </div>
        <div className="p-4 border-t border-border flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold to-[--ro] flex items-center justify-center text-[10px] font-bold text-bg flex-shrink-0">
            {user?.name?.split(" ").map((n:string)=>n[0]).join("")||"A"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-cream truncate">{user?.name}</p>
            <p className="text-[10px] text-[--tm]">Administrator</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="animate-fade-up">
            <div className="mb-6">
              <h1 className="font-display italic text-3xl text-gold">Overview</h1>
              <p className="text-xs text-[--tm] mt-1">Platform analytics · MongoDB aggregation pipeline</p>
            </div>
            {loading ? (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {Array.from({length:6}).map((_,i) => (
                  <div key={i} className="card animate-pulse"><div className="h-8 bg-surface2 rounded w-16 mb-2"/><div className="h-5 bg-surface2 rounded w-24"/></div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  {[
                    {label:"Total Users",val:stats?.totalUsers,color:"#c9a96e",icon:"👥"},
                    {label:"Total Designs",val:stats?.totalDesigns,color:"#4ecdc4",icon:"🎨"},
                    {label:"Active",val:stats?.activeDesigns,color:"#6dbf8a",icon:"✅"},
                    {label:"Draft",val:stats?.draftDesigns,color:"#7a6340",icon:"📝"},
                    {label:"Archived",val:stats?.archivedDesigns,color:"#7d7468",icon:"📦"},
                    {label:"Furniture Items",val:stats?.totalFurnitureItems,color:"#e8927c",icon:"🛋️"},
                  ].map(({label,val,color,icon}) => (
                    <div key={label} className="card">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xl">{icon}</span>
                        <span className="text-[10px] text-[--tm] uppercase tracking-widest">{label}</span>
                      </div>
                      <div className="text-3xl font-semibold" style={{color}}>{val?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-cream mb-4">Monthly Designs</h3>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" tick={{fontSize:10,fill:"#7d7468"}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:10,fill:"#7d7468"}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{background:"#221f1b",border:"1px solid #3a342e",borderRadius:8,fontSize:11}}/>
                        <Bar dataKey="count" fill="#c9a96e" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-cream mb-4">Room Types</h3>
                    <div className="flex items-center gap-4">
                      <PieChart width={120} height={120}>
                        <Pie data={pieData} cx={55} cy={55} outerRadius={50} dataKey="value">
                          {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{background:"#221f1b",border:"1px solid #3a342e",borderRadius:8,fontSize:11}}/>
                      </PieChart>
                      <div className="flex-1 space-y-1.5">
                        {pieData.slice(0,5).map((d,i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                            <span className="text-[10px] text-[--ts] flex-1 truncate">{d.name}</span>
                            <span className="text-[10px] text-gold font-mono">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="card">
                    <h3 className="text-sm font-semibold text-cream mb-3">Recent Designs</h3>
                    {stats?.recentDesigns.slice(0,5).map(d => (
                      <div key={d._id} className="flex items-center justify-between py-2 border-b border-[--bs] last:border-0">
                        <div>
                          <p className="text-xs text-cream truncate max-w-44">{d.name}</p>
                          <p className="text-[10px] text-[--tm]">{d.designerName}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${d.status==="active"?"bg-success/20 text-success":d.status==="draft"?"bg-gold/20 text-gold":"bg-surface3 text-[--tm]"}`}>{d.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <h3 className="text-sm font-semibold text-cream mb-3">Top Designers</h3>
                    {stats?.topDesigners.slice(0,5).map((d,i) => (
                      <div key={d._id} className="flex items-center gap-2.5 py-2 border-b border-[--bs] last:border-0">
                        <span className="text-[11px] text-[--tm] font-mono w-4">#{i+1}</span>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold/50 to-[--ro]/50 flex items-center justify-center text-[10px] font-bold text-bg flex-shrink-0">{d.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-cream truncate">{d.name}</p>
                          <p className="text-[10px] text-[--tm] truncate">{d.email}</p>
                        </div>
                        <span className="text-xs text-gold font-mono">{d.designCount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="font-display italic text-3xl text-gold">Users</h1><p className="text-xs text-[--tm] mt-1">GET /api/admin/users</p></div>
              <input placeholder="Search…" className="inp w-48 text-xs" onChange={async e => {
                try { const d = await adminAPI.users(e.target.value); setUsers(d.users); } catch {}
              }}/>
            </div>
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-surface2">
                  {["User","Email","Role","Designs","Status","Last Login","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-[--tm]">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b border-[--bs] hover:bg-surface2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/50 to-[--ro]/50 flex items-center justify-center text-[10px] font-bold text-bg flex-shrink-0">{u.name[0]}</div>
                          <span className="text-xs font-medium text-cream">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[--tm] font-mono">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${u.role==="admin"?"bg-gold/20 text-gold":"bg-surface3 text-[--tm]"}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[--ts] font-mono">{u.designCount}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.isActive?"bg-success/20 text-success":"bg-error/20 text-error"}`}>{u.isActive?"Active":"Disabled"}</span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-[--tm]">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => toggleActive(u._id, u.isActive)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition-all ${u.isActive?"border-error/40 text-error hover:bg-error/10":"border-success/40 text-success hover:bg-success/10"}`}>
                            {u.isActive?"Disable":"Enable"}
                          </button>
                          <button onClick={() => setConfirmDel(u._id)}
                            className="text-[10px] px-2 py-0.5 rounded border border-error/40 text-error hover:bg-error/10 transition-all">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!users.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-[--tm]">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DESIGNS */}
        {tab === "designs" && (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="font-display italic text-3xl text-gold">Designs</h1><p className="text-xs text-[--tm] mt-1">GET /api/admin/designs</p></div>
              <select className="inp w-36 text-xs" onChange={async e => {
                try { const d = await adminAPI.designs(); setDesigns(d.designs.filter((x:Design) => !e.target.value || x.status===e.target.value)); } catch {}
              }}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {designs.map(d => (
                <div key={d._id} className="card hover:border-[--gd] transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-surface2 rounded-lg flex items-center justify-center text-xl">🏠</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${d.status==="active"?"bg-success/20 text-success":d.status==="draft"?"bg-gold/20 text-gold":"bg-surface3 text-[--tm]"}`}>{d.status}</span>
                  </div>
                  <h3 className="text-xs font-semibold text-cream mb-0.5 truncate">{d.name}</h3>
                  <p className="text-[10px] text-[--tm] mb-2">by {d.designerName}</p>
                  <div className="flex flex-wrap gap-1">
                    {[d.roomType, d.shape, `${d.furniture.length} items`].map(t => (
                      <span key={t} className="text-[10px] bg-surface2 px-1.5 py-0.5 rounded text-[--tm]">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
              {!designs.length && <div className="col-span-3 text-center py-12 text-xs text-[--tm]">No designs found</div>}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="animate-fade-up max-w-xl">
            <div className="mb-5"><h1 className="font-display italic text-3xl text-gold">Settings</h1></div>
            {[
              {title:"Database",rows:[{l:"MongoDB URI",v:"mongodb://localhost:27017/lamp-studio",t:"text"},{l:"Pool Size",v:"10",t:"number"}]},
              {title:"Authentication",rows:[{l:"JWT Expiry",v:"7d",t:"text"},{l:"Session Secret",v:"••••••••",t:"password"}]},
            ].map(({title,rows}) => (
              <div key={title} className="card mb-4">
                <h3 className="text-sm font-semibold text-cream mb-3">{title}</h3>
                {rows.map(r => (
                  <div key={r.l} className="flex items-center gap-4 mb-2.5 last:mb-0">
                    <label className="text-xs text-[--tm] w-32 flex-shrink-0">{r.l}</label>
                    <input type={r.t} defaultValue={r.v} className="inp flex-1 text-xs py-1.5"/>
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => toast.success("Settings saved (demo)")} className="btn-gold">Save Settings</button>
          </div>
        )}
      </main>

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setConfirmDel(null)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-80 shadow-2xl animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-display italic text-xl text-error mb-2">Delete User</h3>
            <p className="text-xs text-[--tm] mb-5">This action is permanent. All user data will be deleted.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDel(null)} className="btn-outline text-xs">Cancel</button>
              <button onClick={() => deleteUser(confirmDel)} className="px-4 py-2 bg-error text-white text-xs font-semibold rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}