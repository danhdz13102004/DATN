"""Graph inspection API — exposes the live in-memory graph state for visualization."""

from datetime import datetime, timezone

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from app.ml.model_registry import model_registry
from app.services import recommendation_service as svc
from app.services.recommendation_service import run_graphsage_global

logger = logging.getLogger(__name__)

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
        {"resume_id": rid, "job_id": e["job_id"]}
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
        edges.append({"resume_id": resume_id, "job_id": job_id})
        if job_id in svc.raw_node_store:
            job_meta = svc.raw_node_store[job_id]
            nodes.append({
                "node_id":   job_id,
                "node_type": job_meta["node_type"],
                "encoded":   job_meta.get("encoded", False),
            })

    return nodes, edges


def _subgraph_for_job(job_id: str):
    """Return (nodes_list, edges_list) containing only the job + all resumes that applied to it."""
    if job_id not in svc.raw_node_store:
        return None, None

    job_meta = svc.raw_node_store[job_id]
    nodes = [{
        "node_id":   job_id,
        "node_type": job_meta["node_type"],
        "encoded":   job_meta.get("encoded", False),
    }]

    edges = []
    for resume_id, job_edges in svc.edge_store.items():
        for e in job_edges:
            if e["job_id"] == job_id:
                edges.append({"resume_id": resume_id, "job_id": job_id})
                if resume_id in svc.raw_node_store:
                    resume_meta = svc.raw_node_store[resume_id]
                    nodes.append({
                        "node_id":   resume_id,
                        "node_type": resume_meta["node_type"],
                        "encoded":   resume_meta.get("encoded", False),
                    })

    return nodes, edges


def _subgraph_for_node(node_id: str):
    """Return (nodes_list, edges_list) for a node of any type."""
    if node_id not in svc.raw_node_store:
        return None, None
    meta = svc.raw_node_store[node_id]
    if meta["node_type"] == "resume":
        return _subgraph_for_resume(node_id)
    else:
        return _subgraph_for_job(node_id)


# ── Graph refresh ─────────────────────────────────────────────────────────────

@router.post("/graph/refresh", response_model=dict)
def graph_refresh():
    """Re-run GraphSAGE over the full in-memory graph and update graphsage_store.

    Runs one forward pass over ALL nodes in feature_store using the complete
    edge graph. Useful after bulk job syncs to bring cold-start jobs into the
    same GNN embedding space as nodes that have interaction edges.

    Returns 503 if the service is in DEGRADED mode (models not loaded).
    """
    if not model_registry.is_loaded:
        raise HTTPException(
            status_code=503,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "DEGRADED", "message": "Models not loaded — service is in DEGRADED mode."},
                "meta":    None,
            },
        )

    graphsage_model = model_registry.get("graphsage")
    device          = model_registry.device

    try:
        updated_count = run_graphsage_global(graphsage_model, device)
    except Exception as exc:
        logger.exception("Graph refresh failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "REFRESH_ERROR", "message": str(exc)},
                "meta":    None,
            },
        ) from exc

    return {
        "success": True,
        "data": {
            "updated_nodes": updated_count,
            "generated_at":  _ts(),
        },
        "error": None,
        "meta":  None,
    }


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

@router.get("/graph/snapshot/{node_id}", response_model=dict)
def graph_snapshot_node(node_id: str):
    """Return the subgraph for a single node: the node + all its neighbors.

    Supports both resume and job nodes.
    """
    nodes, edges = _subgraph_for_node(node_id)

    if nodes is None:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data":    None,
                "error":   {"code": "NODE_NOT_FOUND", "message": f"Node '{node_id}' not found in graph."},
                "meta":    None,
            },
        )

    node_type = svc.raw_node_store[node_id]["node_type"]
    return {
        "success": True,
        "data": {
            "node_id":      node_id,
            "node_type":    node_type,
            "nodes":        nodes,
            "edges":        edges,
            "num_resumes":  sum(1 for n in nodes if n["node_type"] == "resume"),
            "num_jobs":     sum(1 for n in nodes if n["node_type"] == "job"),
            "num_edges":    len(edges),
            "generated_at": _ts(),
        },
        "error": None,
        "meta":  None,
    }


# ── Interactive HTML dashboard ────────────────────────────────────────────────

def _build_dashboard_html(focused_node_id: str = "", focused_node_type: str = "") -> str:
    """Generate the dashboard HTML.

    If focused_node_id is non-empty the dashboard boots in focused mode:
    it polls /graph/snapshot/<id> and only renders that node's subgraph.
    The search bar auto-populates and a back link appears.
    """
    focused_js       = focused_node_id.replace("'", "\\'")
    type_label       = "Resume" if focused_node_type == "resume" else ("Job" if focused_node_type == "job" else "Node")
    title_extra      = f" \u2014 {focused_node_id[:16]}\u2026" if focused_node_id else ""
    node_type_banner = f"{type_label}: <b id=\"focused-id\">{focused_node_id}</b>"
    back_btn         = (
        '<a href="/api/v1/graph/view" '
        'style="font-size:12px;color:#f7a34f;text-decoration:none;'
        'border:1px solid #f7a34f;padding:5px 12px;border-radius:6px;'
        'margin-left:8px;transition:background 0.2s;">\u2190 View All</a>'
        if focused_node_id else ""
    )
    focused_banner_display = "flex" if focused_node_id else "none"
    click_hint_display     = "none" if focused_node_id else "flex"

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
      padding: 10px 20px; background: #16213e;
      border-bottom: 1px solid #2a2a5a; flex-shrink: 0; flex-wrap: wrap;
    }}
    .brand {{ font-size: 16px; font-weight: 700; color: #7b8cff; letter-spacing: .5px; white-space: nowrap; }}
    .stat  {{ font-size: 13px; color: #a0a0c0; white-space: nowrap; background: #1a1a3a; padding: 4px 10px; border-radius: 4px; border: 1px solid #2a2a5a; }}
    .stat b {{ color: #e0e0e0; }}
    #search-wrap {{ display: flex; align-items: center; gap: 8px; margin-left: auto; }}
    #search-input {{
      background: #1e1e3e; border: 1px solid #3a3a6a; border-radius: 6px;
      color: #e0e0e0; font-size: 13px; padding: 6px 12px; width: 240px;
      outline: none; transition: border-color .2s;
    }}
    #search-input:focus {{ border-color: #7b8cff; }}
    #search-input::placeholder {{ color: #555580; }}
    .btn {{
      background: #3a4ab5; border: none; border-radius: 6px;
      color: #ffffff; font-size: 12px; font-weight: 600; padding: 6px 14px;
      cursor: pointer; transition: background .2s, transform .1s;
      display: flex; align-items: center; gap: 6px;
    }}
    .btn:hover:not(:disabled) {{ background: #5a6cd0; }}
    .btn:active:not(:disabled) {{ transform: scale(0.97); }}
    .btn:disabled {{ background: #2a2a4a; color: #666; cursor: not-allowed; }}
    .btn-outline {{ background: transparent; border: 1px solid #555580; color: #c0c0e0; }}
    .btn-outline:hover:not(:disabled) {{ background: #1e1e3e; border-color: #7b8cff; color: #fff; }}
    .btn-sage {{ background: #b54a3a; }}
    .btn-sage:hover:not(:disabled) {{ background: #d05c4a; }}
    
    #controls-wrap {{ display: flex; align-items: center; gap: 12px; margin-left: 10px; padding-left: 10px; border-left: 1px solid #3a3a6a; }}
    .toggle-label {{ font-size: 12px; color: #a0a0c0; display: flex; align-items: center; gap: 4px; cursor: pointer; user-select: none; }}
    .toggle-label input {{ cursor: pointer; accent-color: #7b8cff; }}

    #status {{ font-size: 12px; color: #555580; display: flex; align-items: center; gap: 6px; white-space: nowrap; margin-left: 10px; }}
    #dot {{
      width: 8px; height: 8px; border-radius: 50%;
      background: #44ff99; transition: background 0.3s;
    }}
    .pulsing {{ animation: pulse 2s infinite; }}
    @keyframes pulse {{ 0%,100%{{opacity:1}} 50%{{opacity:.3}} }}
    #focused-banner {{
      display: {focused_banner_display}; align-items: center; gap: 10px;
      padding: 8px 20px; background: #1a1a3a;
      border-bottom: 1px solid #3a3a7a; font-size: 13px; color: #a0a0d0; flex-shrink: 0;
    }}
    #focused-banner b {{ color: #7b8cff; font-family: monospace; font-size: 14px; }}
    #click-hint {{
      padding: 6px 20px; background: #13132a;
      border-bottom: 1px solid #1e1e3a; font-size: 12px; color: #6a7c9a;
      flex-shrink: 0; display: {click_hint_display}; align-items: center; gap: 8px;
    }}
    #legend {{
      display: flex; gap: 24px; align-items: center;
      padding: 8px 20px; background: #13132a;
      border-bottom: 1px solid #1e1e3a; flex-shrink: 0;
      font-size: 12px; color: #a0a0c0;
    }}
    .ldot {{
      display: inline-block; width: 12px; height: 12px;
      margin-right: 6px; vertical-align: middle;
    }}
    #graph {{ flex: 1; width: 100%; min-height: 0; background: #0b0b14; position: relative; }}
    #empty {{
      display: none; position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); text-align: center;
      color: #555580; pointer-events: none;
    }}
    #empty p {{ font-size: 14px; line-height: 1.8; margin-top: 10px; }}
    #empty code {{ color: #7b8cff; background: #1e1e3e; padding: 2px 6px; border-radius: 4px; }}
    #tip {{
      position: fixed; background: rgba(22, 22, 40, 0.95); border: 1px solid #4a4a7a;
      border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #e0e0e0;
      pointer-events: none; display: none; max-width: 300px; line-height: 1.6;
      z-index: 9999; box-shadow: 0 8px 32px rgba(0,0,0,.6); backdrop-filter: blur(4px);
    }}
  </style>
</head>
<body>

<div id="topbar">
  <span class="brand">&#x29C6; RecruitPro Graph</span>
  <span class="stat">&#x1F4C4; Resumes: <b id="s-r">&mdash;</b></span>
  <span class="stat">&#x1F4BC; Jobs: <b id="s-j">&mdash;</b></span>
  <span class="stat">&#x1F517; Edges: <b id="s-e">&mdash;</b></span>
  
  <div id="search-wrap">
    <input id="search-input" type="text" placeholder="Paste Node ID to focus&hellip;" value="{focused_js}" />
    <button class="btn" onclick="goFocused()">&#x1F50D; Focus</button>
    {back_btn}
  </div>

  <div id="controls-wrap">
    <button id="refresh-btn" class="btn btn-outline" onclick="manualRefresh()">
      &#x21BB; Refresh UI
    </button>
    <button id="sage-btn" class="btn btn-sage" onclick="runGraphSage()">
      &#x26A1; Sync GraphSAGE
    </button>
  </div>

  <div id="status"><div id="dot" class="pulsing"></div><span id="s-t">connecting&hellip;</span></div>
</div>

<div id="focused-banner">
  &#x1F3AF; Focused on {node_type_banner}
  &nbsp;|&nbsp; Viewing specialized subgraph
</div>

<div id="click-hint">
  &#x1F4A1; <b>Tip:</b> Click any node to drill down into its specific relations. Drag canvas to pan, scroll to zoom.
</div>

<div id="legend">
  <span><span class="ldot" style="background:#4a5ab5;border-radius:50%"></span>Resume Node</span>
  <span><span class="ldot" style="background:#b55520;border-radius:2px"></span>Job Node</span>
</div>

<div id="graph">
  <div id="empty">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7b8cff" stroke-width="1.5">
      <circle cx="5" cy="12" r="3"/><circle cx="19" cy="5" r="3"/><circle cx="19" cy="19" r="3"/>
      <line x1="7.5" y1="11" x2="16.5" y2="6.5"/>
      <line x1="7.5" y1="13" x2="16.5" y2="17.5"/>
    </svg>
    <p id="empty-msg">Graph is empty.<br>Ingest nodes via <code>POST /api/v1/add_node</code></p>
  </div>
</div>

<div id="tip"></div>

<script>
const POLL_MS    = 4000;
const FOCUSED_ID = '{focused_js}';
const tip        = document.getElementById("tip");
const empty      = document.getElementById("empty");
let d = {{}};  // Global data snapshot

let autoRefreshTimer = null;

// Control Logic
function toggleAutoRefresh() {{
  const isChecked = document.getElementById("auto-refresh-chk").checked;
  if (isChecked) {{
    document.getElementById("dot").classList.add("pulsing");
    autoRefreshTimer = setInterval(poll, POLL_MS);
  }} else {{
    document.getElementById("dot").classList.remove("pulsing");
    clearInterval(autoRefreshTimer);
  }}
}}

function manualRefresh() {{
  const btn = document.getElementById("refresh-btn");
  btn.disabled = true;
  btn.innerHTML = "&#x231B; Refreshing...";
  poll().finally(() => {{
    btn.disabled = false;
    btn.innerHTML = "&#x21BB; Refresh UI";
  }});
}}

async function runGraphSage() {{
  const btn = document.getElementById("sage-btn");
  btn.disabled = true;
  btn.innerHTML = "&#x231B; Syncing Models...";
  try {{
    const res = await fetch("/api/v1/graph/refresh", {{ method: "POST" }});
    const data = await res.json();
    if (data.success) {{
      alert("✅ GraphSAGE successfully generated embeddings for " + data.data.updated_nodes + " nodes.");
      poll(); 
    }} else {{
      alert("❌ Error syncing GraphSAGE: " + (data.error?.message || "Unknown error"));
    }}
  }} catch (err) {{
    alert("❌ Network error while syncing GraphSAGE.");
  }} finally {{
    btn.disabled = false;
    btn.innerHTML = "&#x26A1; Sync GraphSAGE";
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

// Graph Setup
const nodes = new vis.DataSet();
const edges = new vis.DataSet();

const net = new vis.Network(
  document.getElementById("graph"),
  {{ nodes, edges }},
  {{
    physics: {{
      enabled: true,
      solver: "forceAtlas2Based",
      forceAtlas2Based: {{
        gravitationalConstant: -120,
        centralGravity: 0.015,
        springLength: 150,
        springConstant: 0.06,
        damping: 0.15
      }},
      minVelocity: 0.75,
    }},
    layout: {{
      improvedLayout: true
    }},
    edges: {{
      arrows: {{ to: {{ enabled: true, scaleFactor: 0.8, type: "arrow" }} }},
      color:  {{ color: "#4a4a7a", highlight: "#7b8cff", hover: "#9a8cff", opacity: 0.75 }},
      smooth: {{ type: "dynamic" }},
      width: 1.5,
      selectionWidth: 3,
      hoverWidth: 2,
      font:   {{ size: 10, align: "middle", color: "#a0a0c0", strokeWidth: 0 }},
    }},
    nodes: {{
      font:    {{ color: "#ffffff", size: 12, face: "Segoe UI", multi: "html" }},
      shadow:  {{ enabled: true, color: "rgba(0,0,0,0.8)", x: 0, y: 4, size: 10 }},
      borderWidth: 2,
      borderWidthSelected: 4
    }},
    interaction: {{ hover: true, tooltipDelay: 50, hideEdgesOnDrag: true }},
  }}
);

// Event Listeners
net.on("click", p => {{
  if (!p.nodes.length) return;
  const n = nodes.get(p.nodes[0]);
  if (!n) return;
  window.location.href = "/api/v1/graph/view/" + encodeURIComponent(n.id);
}});

net.on("hoverNode", p => {{
  const n = nodes.get(p.node);
  if (!n) return;
  const edgeCount = (d.edges || []).filter(e => (n.nodeType === "resume" ? e.resume_id === n.id : e.job_id === n.id)).length;
  const icon = n.nodeType === "resume" ? "&#x1F4C4;" : "&#x1F4BC;";
  const label = n.nodeType === "resume" ? "Resume" : "Job";
  
  tip.innerHTML =
    "<div style='border-bottom:1px solid #4a4a7a; padding-bottom:6px; margin-bottom:6px;'>" +
    icon + " <b style='color:#7b8cff; font-size:14px;'>" + label + " Node</b></div>" +
    "<div style='color:#a0a0c0; font-family:monospace; margin-bottom:4px;'>ID: " + n.id + "</div>" +
    "<div style='color:#44ff99; font-size:12px;'>&#x2194; " + edgeCount + " connected relation" + (edgeCount !== 1 ? "s" : "") + "</div>" +
    "<div style='margin-top:8px; font-size:11px; color:#f7a34f;'><i>Click node to isolate graph...</i></div>";
  tip.style.display = "block";
}});

net.on("hoverEdge", p => {{
  const e = edges.get(p.edge);
  if (!e) return;
  const fromNode = nodes.get(e.from);
  const toNode = nodes.get(e.to);
  if (!fromNode || !toNode) return;

  tip.innerHTML =
    "<div style='border-bottom:1px solid #4a4a7a; padding-bottom:6px; margin-bottom:6px;'>" +
    "&#x1F517; <b style='color:#44ff99; font-size:14px;'>Application Edge</b></div>" +
    "<b>From:</b> <span style='font-family:monospace; color:#a0a0c0'>" + fromNode.id.slice(0, 16) + "...</span><br>" +
    "<b>To:</b> <span style='font-family:monospace; color:#a0a0c0; margin-left:14px;'>" + toNode.id.slice(0, 16) + "...</span>";
  tip.style.display = "block";
}});

net.on("blurNode", () => {{ tip.style.display = "none"; }});
net.on("blurEdge", () => {{ tip.style.display = "none"; }});
document.addEventListener("mousemove", e => {{
  tip.style.left = (e.clientX + 20) + "px";
  tip.style.top  = (e.clientY + 20) + "px";
}});

function applySnapshot(d) {{
  document.getElementById("s-r").textContent = d.num_resumes ?? (d.nodes || []).filter(n => n.node_type === "resume").length;
  document.getElementById("s-j").textContent = d.num_jobs    ?? (d.nodes || []).filter(n => n.node_type === "job").length;
  document.getElementById("s-e").textContent = d.num_edges   ?? (d.edges || []).length;
  document.getElementById("s-t").textContent = "Last sync: " + d.generated_at.split(" ")[1] + " UTC";
  document.getElementById("dot").style.background = "#44ff99";
  empty.style.display = (d.nodes?.length ?? 0) === 0 ? "block" : "none";

  const inN = new Set((d.nodes || []).map(n => n.node_id));
  for (const id of nodes.getIds()) {{ if (!inN.has(id)) nodes.remove(id); }}
  
  for (const n of (d.nodes || [])) {{
    const resume  = n.node_type === "resume";
    const encoded = n.encoded !== false;
    const shortId = n.node_id.slice(0, 8);
    
    const item = {{
      id:       n.node_id,
      label:    (resume ? "<b>R</b>\\n" : "<b>J</b>\\n") + shortId,
      nodeType: n.node_type,
      encoded:  encoded,
      shape:    resume ? "ellipse" : "box",
      margin:   resume ? undefined : {{ top: 8, right: 12, bottom: 8, left: 12 }},
      size:     resume ? 24 : undefined,
      opacity:  encoded ? 1.0 : 0.6,
      color: {{
        background: encoded ? (resume ? "#4a5ab5" : "#b55520") : (resume ? "#2a2a5a" : "#5a3010"),
        border:     encoded ? (resume ? "#7b8cff" : "#f7a34f") : "#ff9944",
        highlight:  {{ background: resume ? "#7b8cff" : "#f7a34f", border: "#ffffff" }},
        hover:      {{ background: resume ? "#5a6cd0" : "#d07030", border: "#ffffff" }},
      }},
      borderWidth:  encoded ? 1 : 2,
      borderDashes: encoded ? false : [5, 4],
    }};
    nodes.get(n.node_id) !== null ? nodes.update(item) : nodes.add(item);
  }}

  const eKey = e => e.resume_id + "__" + e.job_id;
  const inE  = new Set((d.edges || []).map(eKey));
  for (const id of edges.getIds()) {{ if (!inE.has(id)) edges.remove(id); }}
  
  for (const e of (d.edges || [])) {{
    const key = eKey(e);
    const item = {{
      id:    key,
      from:  e.resume_id,
      to:    e.job_id,
      title: "Apply",
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
          "Node <code>" + FOCUSED_ID + "</code><br>not found in graph.";
        empty.style.display = "block";
      }}
      throw new Error(r.statusText);
    }}
    const body = await r.json();
    d = body.data;  // Store globally for use in hover handlers
    applySnapshot(d);
    
    if (_firstLoad) {{
      _firstLoad = false;
      setTimeout(() => {{ 
        net.setSize("100%", "100%"); 
        net.fit({{ animation: {{ duration: 800, easingFunction: "easeInOutQuart" }} }}); 
      }}, 100);
    }}
  }} catch (err) {{
    document.getElementById("dot").style.background = "#ff4466";
    document.getElementById("s-t").textContent = "disconnected";
  }}
}}

// Initialize
poll();
toggleAutoRefresh(); // Starts the interval if checked
</script>
</body>
</html>"""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/graph/view", response_class=HTMLResponse, include_in_schema=False)
def graph_view():
    """Interactive live graph dashboard — full graph mode.

    Click any node to drill into its focused subgraph view.
    Accessible at http://localhost:8000/api/v1/graph/view
    """
    return HTMLResponse(content=_build_dashboard_html())


@router.get("/graph/view/{node_id}", response_class=HTMLResponse, include_in_schema=False)
def graph_view_focused(node_id: str):
    """Focused graph view for a single node.

    Shows the node and only its neighboring nodes (resume shows applied jobs;
    job shows all resumes that applied).
    Accessible at http://localhost:8000/api/v1/graph/view/<node_id>
    """
    if node_id in svc.raw_node_store:
        node_type = svc.raw_node_store[node_id]["node_type"]
    else:
        node_type = ""
    return HTMLResponse(content=_build_dashboard_html(focused_node_id=node_id, focused_node_type=node_type))