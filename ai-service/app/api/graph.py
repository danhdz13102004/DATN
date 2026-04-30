"""Graph inspection API — exposes the live in-memory graph state for visualization."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.services import recommendation_service as svc

router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _all_nodes_and_edges():
    """Return (nodes_list, edges_list) for the full graph."""
    nodes = [
        {
            "node_id":   nid,
            "node_type": meta["node_type"],
            "encoded":   meta.get("encoded", False),
        }
        for nid, meta in svc.raw_node_store.items()
    ]
    edges = [
        {"resume_id": rid, "job_id": e["job_id"], "weight": e["weight"]}
        for rid, job_edges in svc.edge_store.items()
        for e in job_edges
    ]
    return nodes, edges


def _subgraph_for_resume(resume_id: str):
    """Return (nodes_list, edges_list) containing only the resume + its job neighbors."""
    if resume_id not in svc.raw_node_store:
        return None, None

    resume_meta = svc.raw_node_store[resume_id]
    nodes = [{
        "node_id":   resume_id,
        "node_type": resume_meta["node_type"],
        "encoded":   resume_meta.get("encoded", False),
    }]

    edges = []
    for e in svc.edge_store.get(resume_id, []):
        job_id = e["job_id"]
        edges.append({"resume_id": resume_id, "job_id": job_id, "weight": e["weight"]})
        if job_id in svc.raw_node_store:
            job_meta = svc.raw_node_store[job_id]
            nodes.append({
                "node_id":   job_id,
                "node_type": job_meta["node_type"],
                "encoded":   job_meta.get("encoded", False),
            })

    return nodes, edges


# ── Full graph snapshot ────────────────────────────────────────────────────────

@router.get("/graph/snapshot", response_model=dict)
def graph_snapshot():
    """Return the current in-memory graph: all nodes and edges.

    Reads from raw_node_store so all registered nodes are visible immediately,
    even in DEGRADED mode (models not loaded). 'encoded' flag indicates whether
    the node has a real NLP embedding available for recommendations.
    """
    nodes, edges = _all_nodes_and_edges()
    return {
        "success": True,
        "data": {
            "nodes":       nodes,
            "edges":       edges,
            "num_resumes": sum(1 for n in nodes if n["node_type"] == "resume"),
            "num_jobs":    sum(1 for n in nodes if n["node_type"] == "job"),
            "num_edges":   len(edges),
            "generated_at": _ts(),
        },
        "error": None,
        "meta":  None,
    }


# ── Per-resume subgraph snapshot ───────────────────────────────────────────────

@router.get("/graph/snapshot/{resume_id}", response_model=dict)
def graph_snapshot_node(resume_id: str):
    """Return the subgraph for a single resume: the resume node + all job nodes it applied to."""
    nodes, edges = _subgraph_for_resume(resume_id)

    if nodes is None:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "NODE_NOT_FOUND", "message": f"Resume '{resume_id}' not found in graph."},
                "meta":    None,
            },
        )

    return {
        "success": True,
        "data": {
            "resume_id":   resume_id,
            "nodes":       nodes,
            "edges":       edges,
            "num_resumes": 1,
            "num_jobs":    sum(1 for n in nodes if n["node_type"] == "job"),
            "num_edges":   len(edges),
            "generated_at": _ts(),
        },
        "error": None,
        "meta":  None,
    }


# ── Interactive HTML dashboard ────────────────────────────────────────────────

def _build_dashboard_html(focused_resume_id: str = "") -> str:
    """Generate the dashboard HTML.

    If focused_resume_id is non-empty the dashboard boots in focused mode:
    it polls /graph/snapshot/<id> and only renders that resume's subgraph.
    The search bar auto-populates and a back link appears.
    """
    focused_js  = focused_resume_id.replace("'", "\\'")
    title_extra = f" \u2014 {focused_resume_id[:16]}\u2026" if focused_resume_id else ""
    back_btn    = (
        '<a href="/api/v1/graph/view" '
        'style="font-size:12px;color:#f7a34f;text-decoration:none;'
        'border:1px solid #f7a34f;padding:3px 10px;border-radius:4px;'
        'margin-left:8px;">\u2190 All nodes</a>'
        if focused_resume_id else ""
    )
    focused_banner_display = "flex" if focused_resume_id else "none"
    click_hint_display     = "none" if focused_resume_id else "flex"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RecruitPro &mdash; AI Graph Viewer{title_extra}</title>
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html {{ height: 100%; }}
    body {{
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f0f1a; color: #e0e0e0;
      height: 100%; display: flex; flex-direction: column; overflow: hidden;
    }}
    #topbar {{
      display: flex; align-items: center; gap: 16px;
      padding: 8px 20px; background: #16213e;
      border-bottom: 1px solid #2a2a5a; flex-shrink: 0; flex-wrap: wrap;
    }}
    .brand {{ font-size: 15px; font-weight: 700; color: #7b8cff; letter-spacing: .5px; white-space: nowrap; }}
    .stat  {{ font-size: 13px; color: #a0a0c0; white-space: nowrap; }}
    .stat b {{ color: #e0e0e0; }}
    #search-wrap {{ display: flex; align-items: center; gap: 6px; margin-left: auto; }}
    #search-input {{
      background: #1e1e3e; border: 1px solid #3a3a6a; border-radius: 6px;
      color: #e0e0e0; font-size: 12px; padding: 5px 10px; width: 260px;
      outline: none; transition: border-color .2s;
    }}
    #search-input:focus {{ border-color: #7b8cff; }}
    #search-input::placeholder {{ color: #555580; }}
    #search-btn {{
      background: #3a4ab5; border: none; border-radius: 6px;
      color: #e0e0e0; font-size: 12px; padding: 5px 12px;
      cursor: pointer; transition: background .2s;
    }}
    #search-btn:hover {{ background: #5a6cd0; }}
    #status {{ font-size: 12px; color: #555580; display: flex; align-items: center; gap: 6px; white-space: nowrap; }}
    #dot {{
      width: 8px; height: 8px; border-radius: 50%;
      background: #44ff99; animation: pulse 2s infinite;
    }}
    @keyframes pulse {{ 0%,100%{{opacity:1}} 50%{{opacity:.3}} }}
    #focused-banner {{
      display: {focused_banner_display}; align-items: center; gap: 10px;
      padding: 5px 20px; background: #1a1a3a;
      border-bottom: 1px solid #3a3a7a; font-size: 12px; color: #a0a0d0; flex-shrink: 0;
    }}
    #focused-banner b {{ color: #7b8cff; font-family: monospace; }}
    #click-hint {{
      padding: 5px 20px; background: #13132a;
      border-bottom: 1px solid #1e1e3a; font-size: 11px; color: #44556a;
      flex-shrink: 0; display: {click_hint_display}; align-items: center; gap: 8px;
    }}
    #legend {{
      display: flex; gap: 20px; align-items: center;
      padding: 5px 20px; background: #13132a;
      border-bottom: 1px solid #1e1e3a; flex-shrink: 0;
      font-size: 12px; color: #a0a0c0;
    }}
    .ldot {{
      display: inline-block; width: 11px; height: 11px;
      border-radius: 50%; margin-right: 4px; vertical-align: middle;
    }}
    #graph {{ flex: 1; width: 100%; min-height: 0; background: #0f0f1a; position: relative; }}
    #empty {{
      display: none; position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); text-align: center;
      color: #555580; pointer-events: none;
    }}
    #empty p {{ font-size: 13px; line-height: 1.8; }}
    #empty code {{ color: #7b8cff; background: #1e1e3e; padding: 1px 5px; border-radius: 3px; }}
    #tip {{
      position: fixed; background: #1e1e3e; border: 1px solid #3a3a6a;
      border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #c0c0e0;
      pointer-events: none; display: none; max-width: 280px; line-height: 1.8;
      z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,.5);
    }}
  </style>
</head>
<body>

<div id="topbar">
  <span class="brand">&#x29C6; RecruitPro Graph</span>
  <span class="stat">&#x1F9D1; Resumes: <b id="s-r">&mdash;</b></span>
  <span class="stat">&#x1F4BC; Jobs: <b id="s-j">&mdash;</b></span>
  <span class="stat">&#x1F517; Edges: <b id="s-e">&mdash;</b></span>
  <div id="search-wrap">
    <input id="search-input" type="text" placeholder="Paste resume ID to focus&hellip;" value="{focused_resume_id}" />
    <button id="search-btn" onclick="goFocused()">Focus</button>
    {back_btn}
  </div>
  <div id="status"><div id="dot"></div><span id="s-t">connecting&hellip;</span></div>
</div>

<div id="focused-banner">
  &#x1F50D; Focused on resume: <b id="focused-id">{focused_resume_id}</b>
  &nbsp;|&nbsp; showing only this node and its applied jobs
</div>

<div id="click-hint">
  &#x1F4A1; Click any <span style="color:#7b8cff">resume node</span> to focus on its relations
</div>

<div id="legend">
  <span><span class="ldot" style="background:#7b8cff"></span>Resume node</span>
  <span><span class="ldot" style="background:#f7a34f;border-radius:2px"></span>Job node</span>
  <span><span class="ldot" style="background:#2a2a5a;border:2px dashed #ff9944"></span>Pending embedding</span>
  <span style=\"display:flex;gap:12px;align-items:center;\">
    Edge weight:
    <span style=\"display:flex;align-items:center;gap:4px;\"><span style=\"height:2px;width:20px;background:#ff4466\"></span><span style=\"font-size:11px;color:#888\">view</span></span>
    <span style=\"display:flex;align-items:center;gap:4px;\"><span style=\"height:4px;width:20px;background:#ffaa44\"></span><span style=\"font-size:11px;color:#888\">save</span></span>
    <span style=\"display:flex;align-items:center;gap:4px;\"><span style=\"height:6px;width:20px;background:#44ff99\"></span><span style=\"font-size:11px;color:#888\">apply</span></span>
  </span>
  <span style=\"margin-left:auto;font-size:11px;color:#666;\">Auto-refresh: 4s</span>
</div>

<div id="graph">
  <div id="empty">
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#7b8cff" stroke-width="1.4">
      <circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/>
      <line x1="7.5" y1="11" x2="16.5" y2="6.5"/>
      <line x1="7.5" y1="13" x2="16.5" y2="17.5"/>
    </svg>
    <p id="empty-msg">Graph is empty.<br>Add nodes via <code>POST /api/v1/add_node</code></p>
  </div>
</div>

<div id="tip"></div>

<script>
const POLL_MS    = 4000;
const FOCUSED_ID = '{focused_js}';
const tip        = document.getElementById("tip");
const empty      = document.getElementById("empty");
let d = {{}};  // Global data snapshot

// Helper: return RGB color based on weight (0.1 → red, 0.7 → orange, 1.0 → green)
function getWeightColor(weight) {{
  const w = Math.max(0.1, Math.min(1.0, weight));
  if (w < 0.4) {{
    // Red → Orange (0.1 to 0.4)
    const t = (w - 0.1) / 0.3;
    const r = 255;
    const g = Math.round(68 + (170 - 68) * t);
    const b = 70;
    return `rgb(${{r}},${{g}},${{b}})`;
  }} else if (w < 0.8) {{
    // Orange → Yellow-Green (0.4 to 0.8)
    const t = (w - 0.4) / 0.4;
    const r = Math.round(255 - (255 - 170) * t);
    const g = Math.round(170 + (255 - 170) * t);
    const b = Math.round(70 - 70 * t);
    return `rgb(${{r}},${{g}},${{b}})`;
  }} else {{
    // Yellow-Green → Green (0.8 to 1.0)
    const t = (w - 0.8) / 0.2;
    const r = Math.round(170 - (170 - 68) * t);
    const g = 255;
    const b = Math.round(0 + 100 * t);
    return `rgb(${{r}},${{g}},${{b}})`;
  }}
}}

function goFocused() {{
  const val = document.getElementById("search-input").value.trim();
  if (!val) {{ window.location.href = "/api/v1/graph/view"; return; }}
  window.location.href = "/api/v1/graph/view/" + encodeURIComponent(val);
}}
document.getElementById("search-input").addEventListener("keydown", e => {{
  if (e.key === "Enter") goFocused();
}});

const nodes = new vis.DataSet();
const edges = new vis.DataSet();

const net = new vis.Network(
  document.getElementById("graph"),
  {{ nodes, edges }},
  {{
    physics: {{
      enabled: true,
      barnesHut: {{ gravitationalConstant: -6000, centralGravity: 0.25,
                   springLength: 160, springConstant: 0.04, damping: 0.09 }},
      minVelocity: 0.5,
    }},
    edges: {{
      arrows: {{ to: {{ enabled: true, scaleFactor: 0.6 }} }},
      color:  {{ color: "#3a3a6a", highlight: "#7b8cff", hover: "#9a8cff" }},
      smooth: {{ type: \"continuous\" }},
      font:   {{ size: 10, align: \"middle\", color: \"#e0e0e0\" }},
    }},
    nodes: {{
      font:    {{ color: "#e0e0e0", size: 11 }},
      shadow:  {{ enabled: true, color: "rgba(0,0,0,.6)", x: 2, y: 2, size: 8 }},
    }},
    interaction: {{ hover: true, tooltipDelay: 60, hideEdgesOnDrag: false }},
  }}
);

net.on("click", p => {{
  if (!p.nodes.length) return;
  const n = nodes.get(p.nodes[0]);
  if (!n || n.nodeType !== "resume") return;
  window.location.href = "/api/v1/graph/view/" + encodeURIComponent(n.id);
}});

net.on("hoverNode", p => {{
  const n = nodes.get(p.node);
  if (!n) return;
  const resume = n.nodeType === "resume";
  const edgeCount = (d.edges || []).filter(e => (resume ? e.resume_id === n.id : e.job_id === n.id)).length;
  tip.innerHTML =
    "<b style='color:#7b8cff'>" + (resume ? "Resume" : "Job") + " node</b><br>" +
    "ID: " + n.id.slice(0, 20) + (n.id.length > 20 ? "..." : "") + "<br>" +
    "<span style='color:#aaa;font-size:11px'>" + edgeCount + " relation" + (edgeCount !== 1 ? "s" : "") + "</span>" +
    (resume ? "<br><span style='color:#aaf;font-size:11px'>Click to focus</span>" : "");
  tip.style.display = "block";
}});

net.on("hoverEdge", p => {{
  const e = edges.get(p.edge);
  if (!e) return;
  const fromNode = nodes.get(e.from);
  const toNode = nodes.get(e.to);
  if (!fromNode || !toNode) return;
  const w = e.width / 5;
  tip.innerHTML =
    "<b style='color:#44ff99'>Edge</b><br>" +
    "Weight: <b style='color:#ffaa44'>" + w.toFixed(3) + "</b><br>" +
    "Action: <span style='color:#7b8cff'>" + (w < 0.2 ? "view" : w < 0.85 ? "save" : "apply") + "</span><br>" +
    "From: " + fromNode.id.slice(0, 12) + "...<br>" +
    "To: " + toNode.id.slice(0, 12) + "...";
  tip.style.display = "block";
}});
net.on("blurNode", () => {{ tip.style.display = "none"; }});
net.on("blurEdge", () => {{ tip.style.display = "none"; }});
document.addEventListener("mousemove", e => {{
  tip.style.left = (e.clientX + 16) + "px";
  tip.style.top  = (e.clientY + 14) + "px";
}});

function applySnapshot(d) {{
  document.getElementById("s-r").textContent = d.num_resumes ?? (d.nodes || []).filter(n => n.node_type === "resume").length;
  document.getElementById("s-j").textContent = d.num_jobs    ?? (d.nodes || []).filter(n => n.node_type === "job").length;
  document.getElementById("s-e").textContent = d.num_edges   ?? (d.edges || []).length;
  document.getElementById("s-t").textContent = d.generated_at;
  document.getElementById("dot").style.background = "#44ff99";
  empty.style.display = (d.nodes?.length ?? 0) === 0 ? "block" : "none";

  const inN = new Set((d.nodes || []).map(n => n.node_id));
  for (const id of nodes.getIds()) {{ if (!inN.has(id)) nodes.remove(id); }}
  for (const n of (d.nodes || [])) {{
    const resume  = n.node_type === "resume";
    const encoded = n.encoded !== false;
    const item = {{
      id:       n.node_id,
      label:    (resume ? "R" : "J") + "\\n" + n.node_id.slice(0, 10),
      nodeType: n.node_type,
      encoded:  encoded,
      shape:    resume ? "dot" : "diamond",
      size:     resume ? 22 : 15,
      opacity:  encoded ? 1.0 : 0.45,
      color: {{
        background: encoded ? (resume ? "#3a4ab5" : "#b55520") : (resume ? "#2a2a5a" : "#5a3010"),
        border:     encoded ? "transparent" : "#ff9944",
        highlight:  {{ background: resume ? "#7b8cff" : "#f7a34f" }},
        hover:      {{ background: resume ? "#5a6cd0" : "#d07030" }},
      }},
      borderWidth:  encoded ? 0 : 2,
      borderDashes: encoded ? false : [4, 3],
      title: (encoded ? "✅ Encoded" : "⏳ Pending") + " | " + (resume ? "Resume" : "Job") + " | " + n.node_id,
    }};
    nodes.get(n.node_id) !== null ? nodes.update(item) : nodes.add(item);
  }}

  const eKey = e => e.resume_id + "__" + e.job_id;
  const inE  = new Set((d.edges || []).map(eKey));
  for (const id of edges.getIds()) {{ if (!inE.has(id)) edges.remove(id); }}
  for (const e of (d.edges || [])) {{
    const key   = eKey(e);
    const w     = Math.max(0.1, Math.min(1.0, e.weight));
    const width = Math.max(1.5, w * 5);
    const color = getWeightColor(w);
    const item = {{
      id:    key,
      from:  e.resume_id,
      to:    e.job_id,
      width: width,
      color: {{ color: color, highlight: \"#88ff99\", hover: \"#aaffbb\" }},
      title: `Weight: ${{w.toFixed(3)}} | Action: ${{ w < 0.2 ? \"view\" : w < 0.85 ? \"save\" : \"apply\" }}`,
      label: w.toFixed(2),
      font:  {{ size: 10, color: \"#e0e0e0\", background: {{ enabled: true, color: \"#1e1e3e\" }} }},
    }};
    edges.get(key) !== null ? edges.update(item) : edges.add(item);
  }}
}}

let _firstLoad = true;

async function poll() {{
  const url = FOCUSED_ID
    ? "/api/v1/graph/snapshot/" + encodeURIComponent(FOCUSED_ID)
    : "/api/v1/graph/snapshot";
  try {{
    const r = await fetch(url);
    if (!r.ok) {{
      if (r.status === 404) {{
        document.getElementById("empty-msg").innerHTML =
          "Resume <code>" + FOCUSED_ID + "</code><br>not found in graph.";
        empty.style.display = "block";
      }}
      throw new Error(r.statusText);
    }}
    const body = await r.json();
    d = body.data;  // Store globally for use in hover handlers
    applySnapshot(d);
    if (_firstLoad) {{
      _firstLoad = false;
      // Force vis to recalculate canvas size and fit all nodes into view.
      // This is needed because flex layout may give the container 0 height
      // at the time vis.Network was constructed.
      setTimeout(() => {{ net.setSize("100%", "100%"); net.fit({{ animation: {{ duration: 600, easingFunction: "easeInOutQuad" }} }}); }}, 100);
    }}
  }} catch (err) {{
    document.getElementById("dot").style.background = "#ff4466";
    document.getElementById("s-t").textContent = "disconnected";
  }}
}}

poll();
setInterval(poll, POLL_MS);
</script>
</body>
</html>"""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/graph/view", response_class=HTMLResponse, include_in_schema=False)
def graph_view():
    """Interactive live graph dashboard — full graph mode.

    Click any resume node to drill into its focused subgraph view.
    Accessible at http://localhost:8000/api/v1/graph/view
    """
    return HTMLResponse(content=_build_dashboard_html())


@router.get("/graph/view/{resume_id}", response_class=HTMLResponse, include_in_schema=False)
def graph_view_focused(resume_id: str):
    """Focused graph view for a single resume node.

    Shows the resume and only the job nodes it has applied to.
    Accessible at http://localhost:8000/api/v1/graph/view/<resume_id>
    """
    return HTMLResponse(content=_build_dashboard_html(focused_resume_id=resume_id))
