"""Graph visualizer for the RecruitPro AI service.

Fetches the live graph state from the running AI service and renders an
interactive HTML visualization showing resume nodes, job nodes, and
application edges.

Usage (from project root):
    # One-shot: generate graph.html then open it
    python ai-service/scripts/visualize_graph.py

    # Watch mode: re-render every N seconds
    python ai-service/scripts/visualize_graph.py --watch --interval 5

    # Point at a non-default host
    python ai-service/scripts/visualize_graph.py --host http://localhost:8000

Requirements (install once):
    pip install requests pyvis
"""

import argparse
import sys
import time
import webbrowser
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Missing dependency: pip install requests")

try:
    from pyvis.network import Network
except ImportError:
    sys.exit("Missing dependency: pip install pyvis")



# ── Defaults ──────────────────────────────────────────────────────────────────

DEFAULT_HOST = "http://localhost:8000"
OUTPUT_FILE  = Path(__file__).parent / "graph_output.html"


# ── Fetch graph snapshot from the service ─────────────────────────────────────

def fetch_snapshot(host: str, resume_id: str = "") -> dict:
    """Fetch graph snapshot. If resume_id is given, fetches the subgraph for that resume only."""
    if resume_id:
        url = f"{host}/api/v1/graph/snapshot/{resume_id}"
    else:
        url = f"{host}/api/v1/graph/snapshot"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 404:
            sys.exit(f"[ERROR] Resume '{resume_id}' not found in graph.")
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success"):
            raise RuntimeError(body.get("error", {}).get("message", "Unknown error"))
        return body["data"]
    except requests.exceptions.ConnectionError:
        sys.exit(f"[ERROR] Cannot connect to AI service at {host}. Is it running?")
    except requests.exceptions.HTTPError as e:
        sys.exit(f"[ERROR] HTTP {e.response.status_code}: {e.response.text}")


# ── Build and render the graph ────────────────────────────────────────────────

def render_html(snapshot: dict, output: Path, focused_resume_id: str = ""):
    """Build and write the interactive HTML graph from a snapshot dict.

    Uses net.add_node / net.add_edge directly instead of net.from_nx() because
    pyvis.from_nx() silently drops all node attributes (color, shape, size,
    title) — only the graph topology is transferred.

    If focused_resume_id is set, a focused-mode banner is shown at the top.
    """
    nodes = snapshot.get("nodes", [])
    edges = snapshot.get("edges", [])

    num_resumes = sum(1 for n in nodes if n["node_type"] == "resume")
    num_jobs    = sum(1 for n in nodes if n["node_type"] == "job")
    num_edges   = len(edges)
    ts          = snapshot.get("generated_at", "unknown")

    net = Network(
        height="750px",
        width="100%",
        directed=True,
        bgcolor="#1a1a2e",
        font_color="#e0e0e0",
    )

    # ── Add nodes directly (preserves all styling) ────────────────────────────
    for node in nodes:
        node_id   = node["node_id"]
        node_type = node["node_type"]
        encoded   = node.get("encoded", True)
        is_resume = node_type == "resume"

        label = f"{'R' if is_resume else 'J'}:{node_id[:10]}"
        title = (
            f"<b>{'Resume' if is_resume else 'Job'} node</b><br>"
            f"ID: {node_id}<br>"
            f"Status: {'Encoded' if encoded else 'Pending encoding'}"
        )

        net.add_node(
            node_id,
            label=label,
            title=title,
            color={
                "background": ("#3a4ab5" if encoded else "#2a2a5a") if is_resume
                              else ("#b55520" if encoded else "#5a3010"),
                "border":     "transparent" if encoded else "#ff9944",
                "highlight":  {"background": "#7b8cff" if is_resume else "#f7a34f"},
                "hover":      {"background": "#5a6cd0" if is_resume else "#d07030"},
            },
            size=22 if is_resume else 15,
            shape="dot" if is_resume else "diamond",
            opacity=1.0 if encoded else 0.5,
            borderWidth=0 if encoded else 2,
            font={"color": "#e0e0e0", "size": 11},
        )

    # ── Add edges directly ────────────────────────────────────────────────────
    for edge in edges:
        src    = edge["resume_id"]
        dst    = edge["job_id"]
        weight = edge.get("weight", 1.0)
        net.add_edge(
            src, dst,
            title=f"weight: {weight:.2f}",
            width=max(1.0, weight * 2.5),
            color={"color": "#3a3a6a", "highlight": "#7b8cff"},
            arrows="to",
        )

    # ── Physics: disable for <2 nodes (single node can fly off-screen) ────────
    if len(nodes) < 2:
        physics_opts = '"enabled": false'
    else:
        physics_opts = """
          "enabled": true,
          "barnesHut": {
            "gravitationalConstant": -5000,
            "centralGravity": 0.3,
            "springLength": 130,
            "springConstant": 0.04
          },
          "minVelocity": 0.75
        """

    net.set_options(f"""
    {{
      "physics": {{ {physics_opts} }},
      "interaction": {{
        "hover": true,
        "tooltipDelay": 100,
        "navigationButtons": true
      }},
      "nodes": {{ "shadow": {{ "enabled": true }} }},
      "edges": {{ "smooth": {{ "type": "dynamic" }} }}
    }}
    """)

    net.save_graph(str(output))

    # ── Patch in stats banner and empty-state overlay ─────────────────────────
    html = output.read_text(encoding="utf-8")

    empty_overlay = "" if nodes else """
    <div style="
        position:fixed; top:50%; left:50%;
        transform:translate(-50%,-50%);
        text-align:center; color:#555580;
        pointer-events:none; z-index:9998;
        font-family:monospace;">
        <p style="font-size:15px;">
            Graph is empty.<br>
            Add nodes via <span style="color:#7b8cff">POST /api/v1/add_node</span>
        </p>
    </div>
    """

    focused_banner = ""
    if focused_resume_id:
        focused_banner = f"""
    <div style="
        background:#1a1a3a; color:#a0a0d0;
        padding:5px 20px; font-family:monospace; font-size:12px;
        border-bottom:1px solid #3a3a7a;
        display:flex; align-items:center; gap:10px;
    ">
        &#x1F50D; Focused on resume: <b style="color:#7b8cff">{focused_resume_id}</b>
        &nbsp;|&nbsp; showing only this node and its applied jobs
    </div>
    """

    banner = f"""
    <div style="
        position:fixed; top:0; left:0; right:0; z-index:9999;
        background:#16213e; color:#e0e0e0;
        padding:8px 20px; font-family:monospace; font-size:13px;
        border-bottom:1px solid #4f8ef7;
        display:flex; gap:30px; align-items:center;
    ">
        <span style="color:#4f8ef7; font-weight:bold;">&#x29C6; RecruitPro Graph</span>
        <span>Resumes: <b>{num_resumes}</b></span>
        <span>Jobs: <b style="color:#f7a34f">{num_jobs}</b></span>
        <span>Edges: <b>{num_edges}</b></span>
        <span style="margin-left:auto; color:#888">Updated: {ts}</span>
    </div>
    <div style="height:44px"></div>
    {focused_banner}
    {empty_overlay}
    """
    html = html.replace("<body>", f"<body>{banner}", 1)
    output.write_text(html, encoding="utf-8")

    mode = f"[focused: {focused_resume_id[:16]}]" if focused_resume_id else "[full graph]"
    print(f"  {mode} Nodes: {num_resumes} resume(s), {num_jobs} job(s) | Edges: {num_edges}")
    print(f"  Output: {output}")


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Visualize the RecruitPro AI recommendation graph.")
    parser.add_argument("--host",      default=DEFAULT_HOST, help="AI service base URL")
    parser.add_argument("--output",    default=str(OUTPUT_FILE), help="Output HTML file path")
    parser.add_argument("--watch",     action="store_true",  help="Continuously re-render the graph")
    parser.add_argument("--interval",  type=int, default=5,  help="Refresh interval in seconds (watch mode)")
    parser.add_argument("--no-open",   action="store_true",  help="Do not auto-open the browser")
    parser.add_argument(
        "--resume-id", default="",
        metavar="UUID",
        help="Focus on a single resume node: show only that resume and its applied jobs.",
    )
    args = parser.parse_args()

    output    = Path(args.output)
    resume_id = args.resume_id.strip()
    first     = True

    if resume_id:
        print(f"[visualize_graph] Focused mode — resume: {resume_id}")
    print(f"[visualize_graph] Connecting to {args.host} ...")

    while True:
        print(f"\n[{time.strftime('%H:%M:%S')}] Fetching graph snapshot ...")
        snapshot = fetch_snapshot(args.host, resume_id=resume_id)
        render_html(snapshot, output, focused_resume_id=resume_id)

        if first and not args.no_open:
            webbrowser.open(output.as_uri())
            first = False

        if not args.watch:
            break

        print(f"  Watching — next refresh in {args.interval}s (Ctrl+C to stop)")
        time.sleep(args.interval)

    print("\nDone.")


if __name__ == "__main__":
    main()

