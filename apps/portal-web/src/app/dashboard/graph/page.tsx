"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Brain,
  Database,
  Search,
  RotateCw,
  RefreshCw,
  X,
  PanelRightOpen,
  PanelRightClose,
  Sparkles,
  ShieldAlert,
  Clock,
} from "lucide-react";

// Dynamically import 2D Force Graph to ensure zero SSR/WebGL bundle export issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export interface MemoryNode {
  id: string;
  label: string;
  status: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED";
  type: "SHORT_TERM" | "LONG_TERM" | "VECTOR_EMBEDDING" | "POISONED_FRAGMENT" | string;
  color?: string;
  val: number;
  memoryHash: string;
  vectorDimension: string;
  similarityScore: number;
  decayFactor: number;
  retentionPolicy: string;
  accessCount: number;
  tenant: string;
  timestamp: string;
  content: string;
  source?: string;
  x?: number;
  y?: number;
}

export interface MemoryLink {
  id?: string;
  source: string | MemoryNode | any;
  target: string | MemoryNode | any;
  label?: string;
  status?: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED";
  trustScore?: number;
  curvature?: number;
}

// Fallback memory nodes seed dataset if API is loading or offline
const SEED_MEMORY_NODES: MemoryNode[] = [
  {
    id: "user",
    label: "user (Entity)",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    memoryHash: "0x8F4B-99A1-USER",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.98,
    decayFactor: 0.99,
    retentionPolicy: "Active Context",
    accessCount: 4210,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "Entity: user (Active entity node in system vector memory graph)",
  },
  {
    id: "blue",
    label: "blue (Entity)",
    status: "ACTIVE",
    type: "Entity",
    color: "#3b82f6",
    val: 14,
    memoryHash: "0x3A11-54B9-BLUE",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.94,
    decayFactor: 0.95,
    retentionPolicy: "Active Context",
    accessCount: 312,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "Entity: blue (Active entity node target)",
  },
  {
    id: "system_prompt",
    label: "system_prompt",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    memoryHash: "0x4B22-88C1-ST02",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.94,
    decayFactor: 0.92,
    retentionPolicy: "Session Scope",
    accessCount: 540,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "System instruction guardrail root entity.",
  },
];

const SEED_MEMORY_LINKS: MemoryLink[] = [
  { source: "user", target: "blue", label: "FAVORITE_COLOR (PRIMARY)", status: "ACTIVE", trustScore: 0.98 },
  { source: "user", target: "blue", label: "FAVORITE_COLOR (VERIFIED)", status: "ACTIVE", trustScore: 0.95 },
  { source: "user", target: "blue", label: "FAVORITE_COLOR (POISONED)", status: "FLAGGED_POISON", trustScore: 0.04 },
  { source: "user", target: "system_prompt", label: "ISSUES_INSTRUCTION", status: "ACTIVE", trustScore: 0.92 },
];

export default function MemoryGraphView() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [dataSource, setDataSource] = useState<string>("Connecting to Neo4j...");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [graphData, setGraphData] = useState<{ nodes: MemoryNode[]; links: MemoryLink[] }>({
    nodes: SEED_MEMORY_NODES,
    links: SEED_MEMORY_LINKS,
  });
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(SEED_MEMORY_NODES[0]);
  const [selectedLink, setSelectedLink] = useState<MemoryLink | null>(SEED_MEMORY_LINKS[2]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fgRef = useRef<any>(null);

  // Fetch real data from Neo4j API
  const fetchGraphData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/graph");
      const json = await res.json();

      if (json.success && json.nodes && json.nodes.length > 0) {
        setGraphData({
          nodes: json.nodes,
          links: json.links || [],
        });
        setDataSource(json.source || "Neo4j Aura (Live)");
        if (json.nodes.length > 0) {
          setSelectedNode(json.nodes[0]);
        }
      } else {
        console.warn("Neo4j API empty or errored, using seed nodes");
        setDataSource("Seed Fallback (Neo4j Standby)");
      }
    } catch (err) {
      console.error("Failed to fetch graph data from API:", err);
      setDataSource("Seed Fallback (Neo4j Offline)");
    } finally {
      setLastUpdated(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchGraphData();

    const timer = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(800, 60);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [fetchGraphData]);

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((node) => {
      if (selectedStatusFilter !== "ALL" && node.status !== selectedStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          node.label.toLowerCase().includes(q) ||
          node.id.toLowerCase().includes(q) ||
          (node.memoryHash && node.memoryHash.toLowerCase().includes(q)) ||
          (node.content && node.content.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [graphData.nodes, selectedStatusFilter, searchQuery]);

  // Compute parallel curvature offsets for duplicate relationships (e.g. 3 links between user & blue)
  const filteredLinksWithCurvature = useMemo(() => {
    const validNodeIds = new Set(filteredNodes.map((n) => n.id));
    const baseLinks = graphData.links.filter((l) => {
      const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
      const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;
      return validNodeIds.has(srcId) && validNodeIds.has(tgtId);
    });

    // Group links by pair of nodes
    const pairGroups: Record<string, any[]> = {};
    baseLinks.forEach((l: any) => {
      const srcId = typeof l.source === "object" ? l.source.id : l.source;
      const tgtId = typeof l.target === "object" ? l.target.id : l.target;
      const pairKey = [srcId, tgtId].sort().join("~");
      if (!pairGroups[pairKey]) pairGroups[pairKey] = [];
      pairGroups[pairKey].push(l);
    });

    // Assign curvature offsets to parallel edges
    return baseLinks.map((link: any) => {
      const srcId = typeof link.source === "object" ? link.source.id : link.source;
      const tgtId = typeof link.target === "object" ? link.target.id : link.target;
      const pairKey = [srcId, tgtId].sort().join("~");
      const group = pairGroups[pairKey] || [];
      const index = group.indexOf(link);
      const count = group.length;

      let curvature = 0;
      if (count > 1) {
        // Spread curvature symmetrically (-0.28, 0, 0.28)
        const step = 0.28;
        const middle = (count - 1) / 2;
        curvature = (index - middle) * step;
      }

      return {
        ...link,
        curvature,
      };
    });
  }, [graphData.links, filteredNodes]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as MemoryNode);
    setSelectedLink(null);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.4, 800);
    }
  }, []);

  const handleLinkClick = useCallback((link: any) => {
    setSelectedLink(link as MemoryLink);
  }, []);

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 60);
    }
  };

  // Node rendering algorithm
  const drawNodeCanvas = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSelected = selectedNode && selectedNode.id === node.id;
      const radius = node.val ? node.val : 14;

      let statusColor = "#10b981"; // default ACTIVE green
      let glowColor = "rgba(16, 185, 129, 0.4)";
      let strokeColor = "#ffffff";

      if (node.status === "FLAGGED_POISON" || node.type === "POISONED_FRAGMENT") {
        statusColor = "#ef4444"; // Danger Red
        glowColor = "rgba(239, 68, 68, 0.75)";
        strokeColor = "#fee2e2";
      } else if (node.status === "SUPERSEDED") {
        statusColor = "#64748b"; // Slate Gray
        glowColor = "rgba(100, 116, 139, 0.3)";
        strokeColor = "#94a3b8";
      } else if (node.color) {
        statusColor = node.color;
      }

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI, false);
        ctx.fillStyle = glowColor;
        ctx.fill();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = statusColor;
      ctx.fill();

      // Node Border Stroke
      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = isSelected ? "#ffffff" : strokeColor;
      ctx.stroke();

      // Node Label Rendering below node
      if (globalScale > 0.65) {
        const label = node.label || node.id;
        const fontSize = 12 / globalScale;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(11, 15, 25, 0.85)";
        ctx.fillRect(
          node.x - textWidth / 2 - 4 / globalScale,
          node.y + radius + 4 / globalScale,
          textWidth + 8 / globalScale,
          fontSize + 6 / globalScale
        );

        ctx.fillStyle = "#a7f3d0";
        ctx.fillText(label, node.x, node.y + radius + 12 / globalScale);
      }
    },
    [selectedNode]
  );

  const poisonRelCount = useMemo(() => {
    return graphData.links.filter((l) => l.status === "FLAGGED_POISON").length;
  }, [graphData.links]);

  return (
    <div className="relative w-full h-[calc(100vh-1px)] bg-[#0b0f19] text-slate-100 font-sans overflow-hidden select-none">
      {/* Top Navigation & Filter Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-[#0e1424]/95 backdrop-blur-md border-b border-[#1b273d] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        {/* Left: Memory Graph Title & Search */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-[#10b981] font-mono font-black text-lg">
            <Brain className="text-[#10b981]" size={24} />
            <span>NEO4J MEMORY GRAPH</span>
          </div>

          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search node ID, relationship..."
              className="w-full bg-[#131b2e] border border-[#202e48] rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-[#10b981]"
            />
          </div>
        </div>

        {/* Center: Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-[#131b2e] p-1.5 rounded-xl border border-[#202e48]">
          {[
            { id: "ALL", label: "All Items", badge: "bg-slate-700 text-slate-200" },
            { id: "ACTIVE", label: "ACTIVE", badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" },
            { id: "FLAGGED_POISON", label: "FLAGGED POISON", badge: "bg-red-500/20 text-red-400 border border-red-500/40" },
            { id: "SUPERSEDED", label: "SUPERSEDED", badge: "bg-slate-600/30 text-slate-400 border border-slate-500/40" },
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatusFilter(status.id)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                selectedStatusFilter === status.id
                  ? `${status.badge} font-bold shadow-md ring-1 ring-white/20`
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1a253b]"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* Right Action Controls & Manual Refresh */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 bg-[#131b2e] px-3 py-1.5 rounded-lg border border-[#202e48]">
            <Clock size={13} className="text-[#10b981]" />
            <span>Updated: {lastUpdated || "Live"}</span>
          </div>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-all ${
              isDrawerOpen
                ? "bg-[#1f2d47] border-[#10b981] text-[#10b981]"
                : "bg-[#131b2e] border-[#202e48] text-slate-400 hover:text-slate-200"
            }`}
          >
            {isDrawerOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            <span>{isDrawerOpen ? "Hide Details" : "Inspect Details"}</span>
          </button>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white rounded-lg text-xs"
          >
            <RotateCw size={14} /> Reset View
          </button>

          <button
            onClick={fetchGraphData}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10b981] text-[#0b0f19] font-bold rounded-lg text-xs shadow-md hover:bg-[#34d399] transition-all ${
              isRefreshing ? "animate-pulse" : ""
            }`}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Refresh Neo4j</span>
          </button>
        </div>
      </header>

      {/* Top Left Telemetry & Data Source Banner */}
      <div className="absolute top-20 left-6 z-10 w-80 bg-[#0e1424]/90 backdrop-blur-md border border-[#1b273d] rounded-2xl p-4 shadow-2xl space-y-3 font-mono">
        <div className="flex justify-between items-center border-b border-[#1b273d] pb-2">
          <span className="text-[11px] uppercase text-slate-400 font-bold flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#10b981]" /> Neo4j Telemetry
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {dataSource.includes("Live") ? "ONLINE" : "STANDBY"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-[#131b2e] border border-[#202e48] p-2.5 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase">Entity Nodes</p>
            <p className="text-base font-bold text-white mt-0.5">{filteredNodes.length}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#202e48] p-2.5 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase">Parallel Edges</p>
            <p className="text-base font-bold text-[#10b981] mt-0.5">{filteredLinksWithCurvature.length}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#202e48] p-2.5 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase">Poisoned Edges</p>
            <p className="text-base font-bold text-red-400 mt-0.5 flex items-center justify-center gap-1">
              <ShieldAlert size={14} className="text-red-400" />
              {poisonRelCount}
            </p>
          </div>
          <div className="bg-[#131b2e] border border-[#202e48] p-2.5 rounded-xl">
            <p className="text-[10px] text-slate-400 uppercase">Engine Source</p>
            <p className="text-[10px] font-bold text-cyan-400 truncate mt-0.5">{dataSource}</p>
          </div>
        </div>
      </div>

      {/* Main Force Graph Canvas with Relationship Edge Color & Parallel Curvature */}
      <div className={`h-full transition-all duration-300 ${isDrawerOpen ? "w-[calc(100%-380px)]" : "w-full"}`}>
        {isMounted && (
          <ForceGraph2D
            ref={fgRef}
            graphData={{ nodes: filteredNodes, links: filteredLinksWithCurvature }}
            nodeCanvasObject={drawNodeCanvas}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, (node.val || 14) + 6, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            // 1. Color Edges based on relationship status
            linkColor={(link: any) => {
              if (link.status === "FLAGGED_POISON") return "#ef4444"; // Vibrant Red for Poison
              if (link.status === "SUPERSEDED") return "#64748b"; // Muted Slate Gray
              return "#10b981"; // Emerald Green / Teal for Active
            }}
            // 2. Render Parallel Edges as visually distinct curves using curvature offset
            linkCurvature={(link: any) => link.curvature || 0}
            linkWidth={(link: any) => (link.status === "FLAGGED_POISON" ? 3.8 : link.status === "SUPERSEDED" ? 1.8 : 2.5)}
            linkDirectionalParticles={(link: any) => (link.status === "FLAGGED_POISON" ? 4 : link.status === "ACTIVE" ? 2 : 0)}
            linkDirectionalParticleSpeed={(link: any) => (link.status === "FLAGGED_POISON" ? 0.008 : 0.004)}
            linkDirectionalParticleColor={(link: any) => (link.status === "FLAGGED_POISON" ? "#ef4444" : "#10b981")}
            linkHoverPrecision={8}
            // 4. Hover Tooltip showing relationship trust_score and status directly
            linkLabel={(link: any) => `
              <div style="background:#0e1424; border:1px solid #1b273d; padding:8px 12px; border-radius:10px; font-family:monospace; font-size:11px; color:#f8fafc; box-shadow:0 10px 25px rgba(0,0,0,0.6);">
                <div style="font-weight:bold; font-size:12px; margin-bottom:4px; color:${
                  link.status === 'FLAGGED_POISON' ? '#ef4444' : link.status === 'SUPERSEDED' ? '#94a3b8' : '#10b981'
                };">
                  ${link.status === 'FLAGGED_POISON' ? '⚠️ ' : ''}${link.label || 'RELATIONSHIP'}
                </div>
                <div>Status: <span style="font-weight:bold; color:${
                  link.status === 'FLAGGED_POISON' ? '#ef4444' : link.status === 'SUPERSEDED' ? '#94a3b8' : '#34d399'
                }">${link.status || 'ACTIVE'}</span></div>
                <div>Trust Score: <span style="font-weight:bold; color:${link.trustScore < 0.3 ? '#ef4444' : '#60a5fa'}">${
                  link.trustScore !== undefined ? link.trustScore : '0.98'
                }</span></div>
                <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Click edge to view in inspector</div>
              </div>
            `}
            backgroundColor="#0b0f19"
          />
        )}
      </div>

      {/* Right Side Drawer - Selected Node or Relationship Edge Inspection */}
      {isDrawerOpen && (
        <aside className="absolute top-20 right-6 z-30 w-88 bg-[#0e1424]/95 backdrop-blur-md border border-[#1b273d] rounded-2xl p-5 shadow-2xl space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto font-mono transition-all">
          <div className="flex items-center justify-between border-b border-[#1b273d] pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Database size={16} className="text-[#10b981]" /> Graph Inspector
            </h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-lg bg-[#131b2e] border border-[#202e48] text-slate-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {selectedLink ? (
            /* Relationship Edge Details Card */
            <div className="space-y-4 text-xs">
              <div className="bg-[#131b2e] border border-red-500/30 p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm truncate">{selectedLink.label || "RELATIONSHIP"}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedLink.status === "FLAGGED_POISON"
                        ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                        : selectedLink.status === "SUPERSEDED"
                        ? "bg-slate-600/30 text-slate-400 border border-slate-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    }`}
                  >
                    {selectedLink.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Edge Relationship Inspector</p>
              </div>

              <div className="space-y-2 border-b border-[#1b273d] pb-3 text-[11px]">
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Relationship Status</span>
                  <span
                    className={`font-bold ${
                      selectedLink.status === "FLAGGED_POISON"
                        ? "text-red-400"
                        : selectedLink.status === "SUPERSEDED"
                        ? "text-slate-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {selectedLink.status || "ACTIVE"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Trust Score</span>
                  <span
                    className={`font-bold ${
                      (selectedLink.trustScore || 0) < 0.3 ? "text-red-400" : "text-blue-400"
                    }`}
                  >
                    {selectedLink.trustScore !== undefined ? selectedLink.trustScore : 0.98}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Source Node</span>
                  <span className="text-slate-200 font-bold">
                    {typeof selectedLink.source === "object" ? selectedLink.source.id : selectedLink.source}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Target Node</span>
                  <span className="text-slate-200 font-bold">
                    {typeof selectedLink.target === "object" ? selectedLink.target.id : selectedLink.target}
                  </span>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            /* Entity Node Details Card */
            <div className="space-y-4 text-xs">
              <div className="bg-[#131b2e] border border-[#202e48] p-3.5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-md"
                      style={{
                        backgroundColor:
                          selectedNode.status === "FLAGGED_POISON"
                            ? "#ef4444"
                            : selectedNode.status === "SUPERSEDED"
                            ? "#64748b"
                            : "#10b981",
                      }}
                    />
                    <h4 className="font-bold text-white text-sm truncate">{selectedNode.label || selectedNode.id}</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    {selectedNode.status || "ACTIVE"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Node ID: {selectedNode.id}</p>
              </div>

              <div className="space-y-2 border-b border-[#1b273d] pb-3 text-[11px]">
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Memory Hash</span>
                  <span className="text-[#10b981] font-bold">{selectedNode.memoryHash}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Node Status</span>
                  <span className="font-bold text-emerald-400">{selectedNode.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Vector Embeddings</span>
                  <span className="text-slate-200 text-[10px]">{selectedNode.vectorDimension}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Cosine Similarity</span>
                  <span className="text-blue-400 font-bold">{selectedNode.similarityScore}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1">Payload Content Snippet</label>
                <div className="bg-[#070a12] border border-[#1b273d] p-3 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                  {selectedNode.content}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Click any node or relationship link to inspect metadata.</p>
          )}
        </aside>
      )}

      {/* 3. Updated Dual Visual Legend (Node Status & Relationship Edge Status) */}
      <div className="absolute bottom-6 left-6 z-10 bg-[#0e1424]/90 backdrop-blur-md border border-[#1b273d] rounded-2xl p-4 w-80 space-y-3 text-xs font-mono shadow-2xl">
        {/* Node Section */}
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5">
            NODE STATUS LEGEND
          </span>
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="font-bold text-emerald-400">ACTIVE NODE</span>
            <span className="text-[10px] text-slate-400">(user, blue)</span>
          </div>
        </div>

        <div className="border-t border-[#1b273d] pt-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5">
            RELATIONSHIP EDGE STATUS LEGEND
          </span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-4 h-1 rounded bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="font-bold text-emerald-400">ACTIVE REL</span>
              <span className="text-[10px] text-slate-400">(Trust Score: ~0.98)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-4 h-1 rounded bg-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
              <span className="font-bold text-red-400">FLAGGED POISON EDGE</span>
              <span className="text-[10px] text-slate-400">(Trust Score: ~0.04)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-4 h-1 rounded bg-[#64748b]" />
              <span className="font-bold text-slate-400">SUPERSEDED REL</span>
              <span className="text-[10px] text-slate-400">(Trust Score: ~0.35)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
