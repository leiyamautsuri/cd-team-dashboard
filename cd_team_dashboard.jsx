import { useState, useEffect, useCallback } from "react";

// ── Color tokens ──────────────────────────────────────────────
const C = {
  purple: { light: "#EEEDFE", mid: "#7F77DD", dark: "#3C3489", text: "#26215C" },
  teal:   { light: "#E1F5EE", mid: "#1D9E75", dark: "#0F6E56", text: "#04342C" },
  amber:  { light: "#FAEEDA", mid: "#EF9F27", dark: "#854F0B", text: "#412402" },
  coral:  { light: "#FAECE7", mid: "#D85A30", dark: "#993C1D", text: "#4A1B0C" },
  gray:   { light: "#F1EFE8", mid: "#888780", dark: "#5F5E5A", text: "#2C2C2A" },
  blue:   { light: "#E6F1FB", mid: "#378ADD", dark: "#185FA5", text: "#042C53" },
};

const STATUS_MAP = {
  "完了":   { bg: C.teal.light,   tc: C.teal.dark,   bar: C.teal.mid },
  "進行中": { bg: C.purple.light, tc: C.purple.dark,  bar: C.purple.mid },
  "未着手": { bg: C.gray.light,   tc: C.gray.dark,    bar: C.gray.mid },
};

// ── Default data ──────────────────────────────────────────────
const DEFAULT_DATA = {
  wbs: [
    { id:1,  task:"GAH 月次企画・運営",         owner:"両名",    due:"毎月",   status:"進行中", pct:60,  pac:"03" },
    { id:2,  task:"SN Igniter Q2刷新",          owner:"Manager", due:"5月",    status:"進行中", pct:50,  pac:"03" },
    { id:3,  task:"MTH 運営体制構築",            owner:"両名",    due:"6月",    status:"進行中", pct:40,  pac:"02" },
    { id:4,  task:"PAH Monthly化・体制構築",     owner:"両名",    due:"6月",    status:"進行中", pct:40,  pac:"03" },
    { id:5,  task:"RTO Comms設計・実施",         owner:"Manager", due:"7月",    status:"進行中", pct:30,  pac:"03" },
    { id:6,  task:"月間MVP表彰運営",             owner:"花井",    due:"毎月",   status:"進行中", pct:60,  pac:"03" },
    { id:7,  task:"Inside SN コンテンツ公開",    owner:"花井",    due:"随時",   status:"完了",   pct:100, pac:"03" },
    { id:8,  task:"PAC Dashboard開発",           owner:"両名",    due:"6月",    status:"進行中", pct:40,  pac:"03" },
    { id:9,  task:"偏愛マップApp開発",           owner:"花井",    due:"5月",    status:"完了",   pct:100, pac:"03" },
    { id:10, task:"Claude Code活用・効率化",     owner:"Manager", due:"下半期", status:"未着手", pct:0,   pac:"03" },
  ],
  okr: [
    {
      id: "mgr", member: "Manager", initials: "Mgr",
      color: C.purple,
      objectives: [
        { id:"m1", obj:"PAC #03: コミュニケーション設計のリード", krs: [
          { id:"m1k1", kr:"GAH・MTH・PAH 月次安定運用達成", pct:60 },
          { id:"m1k2", kr:"RTO Comms 全フェーズ実施完了",   pct:30 },
        ]},
        { id:"m2", obj:"チームの仕組み化・スケール", krs: [
          { id:"m2k1", kr:"PAC Dashboard リリース & 運用開始",    pct:40 },
          { id:"m2k2", kr:"花井の自律的オーナーシップ 3件以上", pct:67 },
        ]},
      ],
    },
    {
      id: "kh", member: "花井 Hanai", initials: "KH",
      color: C.amber,
      objectives: [
        { id:"h1", obj:"コンテンツ&コネクション施策の実行", krs: [
          { id:"h1k1", kr:"Inside SN 重点採用職種コンテンツ公開", pct:100 },
          { id:"h1k2", kr:"偏愛マップApp リリース完了",            pct:100 },
        ]},
        { id:"h2", obj:"Commsプラットフォーム品質向上", krs: [
          { id:"h2k1", kr:"PAH MVP表彰 モチベーション指標改善",      pct:50 },
          { id:"h2k2", kr:"SN Igniter 演出クオリティ向上 (Q1→Q2)", pct:50 },
        ]},
      ],
    },
  ],
  lastUpdated: null,
  updatedBy: null,
};

// ── Helpers ───────────────────────────────────────────────────
function avg(nums) {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function Avatar({ initials, color, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color.light, color: color.dark,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 600, flexShrink: 0,
      border: `1.5px solid ${color.mid}22`,
    }}>{initials}</div>
  );
}

function Badge({ label, bg, tc }) {
  return (
    <span style={{
      padding: "2px 7px", borderRadius: 6,
      fontSize: 10, fontWeight: 600,
      background: bg, color: tc,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function ProgressBar({ pct, color, height = 4 }) {
  return (
    <div style={{ background: "#f0f0f0", borderRadius: height, overflow: "hidden", height }}>
      <div style={{ width: `${pct}%`, height, background: color, borderRadius: height, transition: "width .4s ease" }} />
    </div>
  );
}

// ── PAC Section ───────────────────────────────────────────────
function PacSection() {
  const items = [
    { num:"01", title:"評価・報酬の再設計と定着", en:"Redesign & Embed Evaluation/Compensation",
      desc:"新グレード・評価・報酬制度のローンチ。相対評価トレーニング実施。",
      role:"他チーム主導", roleColor: C.amber, highlight: false },
    { num:"02", title:"マネジメント力の強化", en:"Strengthen Management Capabilities",
      desc:"ハイポテンシャル人材の可視化。MTH等を通じた全社視点の育成。",
      role:"CD支援", roleColor: C.purple, highlight: false },
    { num:"03", title:"組織の分断解消とコミュニケーション設計", en:"Resolve Silos & Design Communication",
      desc:"GAH・MTH等対話の場の再設計。意図的な透明性と構造化Commsの両立。",
      role:"CD主担当", roleColor: C.teal, highlight: true },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{
        padding: "8px 12px", borderRadius: 8,
        background: C.teal.light, borderLeft: `3px solid ${C.teal.mid}`,
        marginBottom: 4,
      }}>
        <div style={{ fontSize:10, color: C.teal.dark, fontWeight:600, marginBottom:2 }}>PAC ミッション</div>
        <div style={{ fontSize:11.5, fontWeight:600, color: C.teal.text, lineHeight:1.4 }}>
          事業と社員の可能性を最大化し、その実現を支える
        </div>
      </div>
      {items.map(p => (
        <div key={p.num} style={{
          display:"flex", gap:10, alignItems:"flex-start",
          padding: "8px 10px", borderRadius: 8,
          background: p.highlight ? C.teal.light : "transparent",
          border: `1px solid ${p.highlight ? C.teal.mid+"44" : "#e8e8e8"}`,
          transition: "background .2s",
        }}>
          <div style={{ fontSize:18, fontWeight:700, color: p.highlight ? C.teal.mid : "#ccc", lineHeight:1, minWidth:24 }}>{p.num}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:1 }}>{p.title}</div>
            <div style={{ fontSize:10, color:"#999", marginBottom:3 }}>{p.en}</div>
            <div style={{ fontSize:10.5, color:"#666", lineHeight:1.5 }}>{p.desc}</div>
          </div>
          <Badge label={p.role} bg={p.roleColor.light} tc={p.roleColor.dark} />
        </div>
      ))}
    </div>
  );
}

// ── Roadmap Section ───────────────────────────────────────────
function RoadmapSection() {
  const months = ["4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const now = new Date().getMonth() + 1; // 1-12
  // April=4, map to index: month-4 out of 9
  const nowIdx = Math.min(Math.max(now - 4, 0), 8);

  const rows = [
    { cat:"LEVER 1 — Culture Activation", color: C.purple.mid, items:[
      { label:"GAH 月次運営",   s:0,   e:100 },
      { label:"SN Igniter",     s:0,   e:11, gaps:[{s:11,e:33},{s:44,e:66},{s:77,e:100}] },
    ]},
    { cat:"LEVER 2 — Communication Design", color: C.teal.mid, items:[
      { label:"MTH 企画運営",   s:0,   e:100 },
      { label:"PAH Monthly化",  s:0,   e:100 },
      { label:"RTO Comms",      s:0,   e:44 },
      { label:"PAC Dashboard",  s:0,   e:33, ext:{s:33,e:100,op:.4} },
    ]},
    { cat:"LEVER 3 — Connection Building", color: C.coral.mid, items:[
      { label:"Inside SN",      s:0,   e:100 },
      { label:"SmartClub他",    s:0,   e:100 },
    ]},
    { cat:"AI / その他", color: C.blue.mid, items:[
      { label:"偏愛マップApp",  s:0,   e:22 },
      { label:"Claude Code活用",s:33,  e:100, op:.7 },
    ]},
  ];

  return (
    <div>
      {/* Month headers */}
      <div style={{ display:"flex", paddingLeft:80, marginBottom:6 }}>
        {months.map((m,i) => (
          <div key={i} style={{
            flex:1, textAlign:"center", fontSize:9, color:"#aaa",
            fontWeight: i===nowIdx ? 700 : 400,
            color: i===nowIdx ? C.teal.dark : "#aaa",
          }}>{m}</div>
        ))}
      </div>
      {/* Today marker line */}
      <div style={{ position:"relative" }}>
        <div style={{
          position:"absolute", top:0, bottom:0,
          left: `calc(80px + ${(nowIdx / 9) * (100 - 80/680*100)}%)`,
          width:1, background: C.teal.mid+"88", zIndex:2, pointerEvents:"none",
        }} />
      {rows.map((cat, ci) => (
        <div key={ci}>
          <div style={{ fontSize:9, fontWeight:700, color: cat.color, letterSpacing:".06em",
            paddingLeft:80, marginTop: ci>0?10:2, marginBottom:4 }}>{cat.cat}</div>
          {cat.items.map((r, ri) => (
            <div key={ri} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
              <div style={{ width:78, textAlign:"right", fontSize:10, color:"#777", lineHeight:1.2, flexShrink:0 }}>{r.label}</div>
              <div style={{ flex:1, height:8, background:"#f0f0f0", borderRadius:4, position:"relative", overflow:"hidden" }}>
                <div style={{
                  position:"absolute", left:`${r.s}%`, width:`${r.e-r.s}%`,
                  height:8, background:cat.color, borderRadius:4,
                  opacity: r.op||1,
                }} />
                {r.ext && <div style={{
                  position:"absolute", left:`${r.ext.s}%`, width:`${r.ext.e-r.ext.s}%`,
                  height:8, background:cat.color, borderRadius:4, opacity:r.ext.op,
                }} />}
                {r.gaps && r.gaps.map((g,gi) => (
                  <div key={gi} style={{
                    position:"absolute", left:`${g.s}%`, width:`${g.e-g.s}%`,
                    height:8, background:cat.color, borderRadius:4, opacity:.35,
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      </div>
      <div style={{ fontSize:9, color:C.teal.dark, marginTop:6, paddingLeft:80 }}>
        ↑ 縦線 = 今月 (現在位置)　　※下半期は6月レビュー後に優先課題を再整理予定
      </div>
    </div>
  );
}

// ── WBS Table ─────────────────────────────────────────────────
function WbsSection({ wbs, onUpdate }) {
  const [editing, setEditing] = useState(null); // index
  const [draft, setDraft] = useState({});

  function startEdit(i) {
    setDraft({ status: wbs[i].status, pct: wbs[i].pct });
    setEditing(i);
  }
  function save() {
    const next = wbs.map((w, i) => i === editing ? { ...w, ...draft, pct: Number(draft.pct) } : w);
    onUpdate(next);
    setEditing(null);
  }

  const done = wbs.filter(w => w.status === "完了").length;

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 54px 46px 58px 42px",
        gap:3, fontSize:9, fontWeight:700, color:"#aaa", paddingBottom:5,
        borderBottom:"1px solid #f0f0f0", letterSpacing:".05em" }}>
        <span>タスク</span><span>担当</span><span style={{textAlign:"center"}}>期限</span>
        <span style={{textAlign:"center"}}>ステータス</span><span style={{textAlign:"right"}}>進捗</span>
      </div>
      {wbs.map((w, i) => {
        const sc = STATUS_MAP[w.status] || STATUS_MAP["未着手"];
        return (
          <div key={w.id} style={{
            display:"grid", gridTemplateColumns:"1fr 54px 46px 58px 42px",
            gap:3, alignItems:"center", padding:"5px 0",
            borderBottom:"1px solid #f8f8f8", fontSize:10.5,
          }}>
            <div>
              <div style={{ lineHeight:1.3 }}>{w.task}</div>
              <div style={{ fontSize:9, color: C.teal.mid, fontWeight:600 }}>PAC {w.pac}</div>
            </div>
            <div style={{ color:"#888", fontSize:10 }}>{w.owner}</div>
            <div style={{ textAlign:"center", color:"#999", fontSize:10 }}>{w.due}</div>
            <div style={{ textAlign:"center" }}>
              {editing === i ? (
                <select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value}))}
                  style={{ fontSize:9, padding:"1px 3px", border:"1px solid #ddd", borderRadius:4 }}>
                  {["完了","進行中","未着手"].map(s=><option key={s}>{s}</option>)}
                </select>
              ) : (
                <Badge label={w.status} bg={sc.bg} tc={sc.tc} />
              )}
            </div>
            <div style={{ textAlign:"right" }}>
              {editing === i ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                  <input type="range" min={0} max={100} step={5} value={draft.pct}
                    onChange={e=>setDraft(d=>({...d,pct:e.target.value}))}
                    style={{ width:40, cursor:"pointer" }} />
                  <span style={{ fontSize:9 }}>{draft.pct}%</span>
                  <div style={{ display:"flex", gap:3 }}>
                    <button onClick={save} style={{ fontSize:9, padding:"1px 5px", background:C.teal.mid, color:"#fff", border:"none", borderRadius:3, cursor:"pointer" }}>保存</button>
                    <button onClick={()=>setEditing(null)} style={{ fontSize:9, padding:"1px 5px", background:"#eee", border:"none", borderRadius:3, cursor:"pointer" }}>✕</button>
                  </div>
                </div>
              ) : (
                <div onClick={()=>startEdit(i)} style={{ cursor:"pointer" }} title="クリックして編集">
                  <ProgressBar pct={w.pct} color={sc.bar} />
                  <div style={{ fontSize:9, color:"#bbb", marginTop:1 }}>{w.pct}%</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop:8, fontSize:10, color:"#aaa" }}>
        ✅ {done}/{wbs.length} タスク完了　　<span style={{color:"#ccc"}}>各行をクリックして進捗を更新</span>
      </div>
    </div>
  );
}

// ── OKR Section ───────────────────────────────────────────────
function OkrSection({ okr, onUpdate }) {
  const [editing, setEditing] = useState(null); // "mi_oi_ki"
  const [draftPct, setDraftPct] = useState(0);

  function startEdit(mi,oi,ki,pct){ setEditing(`${mi}_${oi}_${ki}`); setDraftPct(pct); }
  function save(mi,oi,ki){
    const next = okr.map((m,mii)=> mii!==mi ? m : {
      ...m, objectives: m.objectives.map((o,oii)=> oii!==oi ? o : {
        ...o, krs: o.krs.map((k,kii)=> kii!==ki ? k : {...k, pct: Number(draftPct)})
      })
    });
    onUpdate(next);
    setEditing(null);
  }

  const allPcts = okr.flatMap(m => m.objectives.flatMap(o => o.krs.map(k => k.pct)));
  const overall = avg(allPcts);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10,
        padding:"6px 10px", background:C.purple.light, borderRadius:8 }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.purple.dark }}>{overall}%</div>
        <div>
          <ProgressBar pct={overall} color={C.purple.mid} height={6} />
          <div style={{ fontSize:9, color:C.purple.dark, marginTop:2 }}>チーム OKR 平均達成率</div>
        </div>
      </div>
      {okr.map((m, mi) => (
        <div key={m.id} style={{
          background: m.color.light+"66", borderRadius:10, padding:"8px 10px", marginBottom:8,
          border:`1px solid ${m.color.mid}22`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
            <Avatar initials={m.initials} color={m.color} size={26} />
            <div style={{ fontWeight:600, fontSize:12 }}>{m.member}</div>
            <div style={{ marginLeft:"auto", fontSize:10, color:m.color.dark, fontWeight:600 }}>
              {avg(m.objectives.flatMap(o=>o.krs.map(k=>k.pct)))}%
            </div>
          </div>
          {m.objectives.map((o, oi) => (
            <div key={o.id} style={{ marginBottom:6 }}>
              <div style={{ fontSize:10, fontWeight:600, color:"#777", marginBottom:4, lineHeight:1.3 }}>{o.obj}</div>
              {o.krs.map((k, ki) => {
                const eKey = `${mi}_${oi}_${ki}`;
                const c = k.pct>=80?C.teal.mid:k.pct>=50?C.purple.mid:C.amber.mid;
                return (
                  <div key={k.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                    <div style={{ flex:1, fontSize:10, color:"#555", lineHeight:1.3 }}>{k.kr}</div>
                    {editing===eKey ? (
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <input type="range" min={0} max={100} step={5} value={draftPct}
                          onChange={e=>setDraftPct(e.target.value)}
                          style={{ width:50, cursor:"pointer" }} />
                        <span style={{ fontSize:9, minWidth:26 }}>{draftPct}%</span>
                        <button onClick={()=>save(mi,oi,ki)} style={{ fontSize:9, padding:"1px 5px", background:C.teal.mid, color:"#fff", border:"none", borderRadius:3, cursor:"pointer" }}>保存</button>
                        <button onClick={()=>setEditing(null)} style={{ fontSize:9, padding:"1px 4px", background:"#eee", border:"none", borderRadius:3, cursor:"pointer" }}>✕</button>
                      </div>
                    ) : (
                      <div onClick={()=>startEdit(mi,oi,ki,k.pct)}
                        style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer" }} title="クリックして更新">
                        <div style={{ width:52, height:4, background:"#e8e8e8", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ width:`${k.pct}%`, height:4, background:c, borderRadius:2, transition:"width .3s" }} />
                        </div>
                        <span style={{ fontSize:10, fontWeight:600, color:c, minWidth:28 }}>{k.pct}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
      <div style={{ fontSize:9, color:"#ccc", marginTop:4 }}>各KRをクリックして達成率を更新</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview | wbs | okr

  // Load from storage on mount
  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get("cd-dashboard-data", true);
        if (result && result.value) {
          setData(JSON.parse(result.value));
        }
      } catch (e) {
        // No data yet, use defaults
      }
      setLoading(false);
    }
    load();
  }, []);

  // Save to shared storage
  const save = useCallback(async (newData) => {
    setSaving(true);
    try {
      await window.storage.set("cd-dashboard-data", JSON.stringify(newData), true);
      setSaveMsg("✓ 保存しました");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (e) {
      setSaveMsg("保存に失敗しました");
    }
    setSaving(false);
  }, []);

  function updateWbs(newWbs) {
    const next = { ...data, wbs: newWbs, lastUpdated: new Date().toISOString() };
    setData(next);
    save(next);
  }

  function updateOkr(newOkr) {
    const next = { ...data, okr: newOkr, lastUpdated: new Date().toISOString() };
    setData(next);
    save(next);
  }

  const wbsDone = data.wbs.filter(w => w.status === "完了").length;
  const allKrPcts = data.okr.flatMap(m => m.objectives.flatMap(o => o.krs.map(k => k.pct)));
  const okrAvg = avg(allKrPcts);

  const tabs = [
    { id:"overview", label:"概要" },
    { id:"wbs",      label:"WBS" },
    { id:"okr",      label:"OKR" },
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200,
      fontFamily:"system-ui", color:"#aaa", fontSize:13 }}>
      データを読み込み中…
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      fontSize: 13, color:"#1a1a1a", maxWidth:860, margin:"0 auto", padding:"1rem .5rem",
    }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:14, paddingBottom:12, borderBottom:"1.5px solid #f0f0f0" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-.02em" }}>
            Communication Design Team
          </div>
          <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>
            People and Culture Division　·　Report to Chiharu Yamamoto (CHRO)　·　2026
          </div>
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          {[{i:"CY",c:C.purple},{i:"Mgr",c:C.teal},{i:"KH",c:C.amber}].map(a=>(
            <Avatar key={a.i} initials={a.i} color={a.c} size={28} />
          ))}
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          { label:"PAC 重点課題 2026", value:"3", note:"CD主担当: #03", color:C.teal },
          { label:"WBSタスク完了",     value:`${wbsDone}/${data.wbs.length}`, note:`${Math.round(wbsDone/data.wbs.length*100)}% 達成`, color:C.purple },
          { label:"OKR 平均達成率",    value:`${okrAvg}%`, note:"Manager + 花井", color:C.amber },
        ].map((k,i) => (
          <div key={i} style={{
            padding:"10px 14px", borderRadius:10,
            background: k.color.light, border:`1px solid ${k.color.mid}33`,
          }}>
            <div style={{ fontSize:22, fontWeight:700, color:k.color.dark }}>{k.value}</div>
            <div style={{ fontSize:11, fontWeight:600, color:"#555", marginTop:2 }}>{k.label}</div>
            <div style={{ fontSize:10, color:k.color.mid, marginTop:1 }}>{k.note}</div>
          </div>
        ))}
      </div>

      {/* ── Correlation bar ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
        background:"#f8f8f8", borderRadius:8, marginBottom:14, flexWrap:"wrap",
      }}>
        {["会社戦略","PAC重点課題 #03","CD Team 3 Levers","Roadmap","WBS","個人OKR"].map((s,i,arr)=>(
          <span key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10, color: i===0||i===arr.length-1?"#aaa":C.teal.dark, fontWeight: i>0&&i<arr.length-1?600:400 }}>{s}</span>
            {i<arr.length-1 && <span style={{color:"#ccc",fontSize:10}}>→</span>}
          </span>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex", gap:2, marginBottom:12 }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer", fontSize:12,
            fontWeight: activeTab===t.id ? 700 : 400,
            background: activeTab===t.id ? C.teal.mid : "#f5f5f5",
            color: activeTab===t.id ? "#fff" : "#777",
            transition:"all .15s",
          }}>{t.label}</button>
        ))}
        <div style={{ marginLeft:"auto", fontSize:10, color: saving?"#aaa":C.teal.mid, display:"flex", alignItems:"center", gap:4 }}>
          {saving && <span>保存中…</span>}
          {saveMsg && <span>{saveMsg}</span>}
          {data.lastUpdated && !saving && !saveMsg && (
            <span style={{color:"#ccc"}}>最終更新: {new Date(data.lastUpdated).toLocaleString("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
          )}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "overview" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ background:"#fff", border:"1px solid #f0f0f0", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", marginBottom:10 }}>
              📌 PAC 2026 重点課題
            </div>
            <PacSection />
          </div>
          <div style={{ background:"#fff", border:"1px solid #f0f0f0", borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", marginBottom:10 }}>
              🗺 CD Team Roadmap 2026
            </div>
            <RoadmapSection />
          </div>
        </div>
      )}

      {activeTab === "wbs" && (
        <div style={{ background:"#fff", border:"1px solid #f0f0f0", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", marginBottom:10 }}>
            ✅ WBS — タスク管理
          </div>
          <WbsSection wbs={data.wbs} onUpdate={updateWbs} />
        </div>
      )}

      {activeTab === "okr" && (
        <div style={{ background:"#fff", border:"1px solid #f0f0f0", borderRadius:12, padding:"14px 16px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:".06em", marginBottom:10 }}>
            🎯 個人 OKR 2026
          </div>
          <OkrSection okr={data.okr} onUpdate={updateOkr} />
        </div>
      )}

      <div style={{ marginTop:10, fontSize:9, color:"#ddd", textAlign:"center" }}>
        このダッシュボードのデータはClaudeのクラウドストレージに保存されます。編集内容はChiharu・Manager・花井の3名で共有されます。
      </div>
    </div>
  );
}
