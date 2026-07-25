"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ShieldAlert,
  Database,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  RotateCcw,
  Zap,
} from "lucide-react";

// Dynamically import react-force-graph-2d to prevent SSR canvas issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export interface MemoryNode {
  id: string;
  label: string;
  status: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED";
  type: "SHORT_TERM" | "LONG_TERM" | "VECTOR_EMBEDDING" | "POISONED_FRAGMENT" | string;
  color?: string;
  val: number;
  retentionPolicy?: string;
  accessCount?: number;
  tenant: string;
  timestamp: string;
  content: string;
  source?: string;
  x?: number;
  y?: number;
}

export interface MemoryLink {
  id?: string;
  source: string | MemoryNode;
  target: string | MemoryNode;
  label: string;
  status: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED";
  trustScore: number;
  curvature?: number;
}

// Preset cluster positions so graph renders instantly as separated islands by default without 3-node seed intermediate state
const PRESET_CLUSTER_COORDINATES: Record<string, { x: number; y: number }> = {
  // Cluster 1: user & blue (Bottom Center)
  user: { x: -30, y: 140 },
  blue: { x: -120, y: 130 },

  // Cluster 2: user_alice & admin_role (Bottom Right)
  user_alice: { x: 180, y: 100 },
  admin_role: { x: 220, y: 160 },

  // Cluster 3: user_bob, sales_dept, engineering_dept (Middle Left)
  user_bob: { x: -190, y: -20 },
  sales_dept: { x: -150, y: -100 },
  engineering_dept: { x: -230, y: 40 },

  // Cluster 4: system_prompt & ignore_previous_instructions (Top Right)
  system_prompt: { x: 160, y: -160 },
  ignore_previous_instructions: { x: 240, y: -120 },
};

function assignPresetCoordinates(nodes: MemoryNode[]): MemoryNode[] {
  return nodes.map((node, idx) => {
    const key = node.id || node.label;
    const preset = PRESET_CLUSTER_COORDINATES[key];
    if (preset) {
      return { ...node, x: preset.x, y: preset.y };
    }
    const angle = (idx / Math.max(nodes.length, 1)) * 2 * Math.PI;
    const radius = 180;
    return {
      ...node,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });
}

// Complete multi-cluster node dataset so default view matches final state immediately
const SEED_MEMORY_NODES: MemoryNode[] = assignPresetCoordinates([
  {
    id: "user",
    label: "user (Entity)",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
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
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "Entity: blue (Active entity node target)",
  },
  {
    id: "user_alice",
    label: "user_alice",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "User Alice entity node with active role permissions.",
  },
  {
    id: "admin_role",
    label: "admin_role",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "System Administrator role entity node.",
  },
  {
    id: "user_bob",
    label: "user_bob",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "User Bob entity node associated with sales and engineering.",
  },
  {
    id: "sales_dept",
    label: "sales_dept",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "Sales Department organizational node.",
  },
  {
    id: "engineering_dept",
    label: "engineering_dept",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "Engineering Department organizational node.",
  },
  {
    id: "system_prompt",
    label: "system_prompt",
    status: "ACTIVE",
    type: "Entity",
    color: "#10b981",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "System instruction guardrail root entity.",
  },
  {
    id: "ignore_previous_instructions",
    label: "ignore_previous_instructions",
    status: "FLAGGED_POISON",
    type: "POISONED_FRAGMENT",
    color: "#ef4444",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:00:00",
    content: "Poisoned prompt injection fragment detected.",
  },
]);

const SEED_MEMORY_LINKS: MemoryLink[] = [
  { source: "user", target: "blue", label: "FAVORITE_COLOR (PRIMARY)", status: "ACTIVE", trustScore: 0.98 },
  { source: "user", target: "blue", label: "FAVORITE_COLOR (VERIFIED)", status: "ACTIVE", trustScore: 0.95 },
  { source: "user", target: "blue", label: "FAVORITE_COLOR (POISONED)", status: "FLAGGED_POISON", trustScore: 0.04 },
  { source: "user_alice", target: "admin_role", label: "HAS_ROLE", status: "ACTIVE", trustScore: 0.96 },
  { source: "user_bob", target: "sales_dept", label: "MEMBER_OF", status: "ACTIVE", trustScore: 0.94 },
  { source: "user_bob", target: "engineering_dept", label: "MEMBER_OF", status: "ACTIVE", trustScore: 0.92 },
  { source: "system_prompt", target: "ignore_previous_instructions", label: "INJECTION_ATTEMPT", status: "FLAGGED_POISON", trustScore: 0.02 },
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
        const positionedNodes = assignPresetCoordinates(json.nodes);
        setGraphData({
          nodes: positionedNodes,
          links: json.links || [],
        });
        setDataSource(json.source || "Neo4j Aura (Live)");
        if (positionedNodes.length > 0) {
          setSelectedNode(positionedNodes[0]);
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
        fgRef.current.zoomToFit(600, 50);
      }
    }, 400);

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
        // Distribute curvatures evenly: e.g. for 3 links: -0.28, 0, 0.28
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

  // Click Handlers
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    setSelectedLink(null);
    setIsDrawerOpen(true);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  };

  const handleLinkClick = (link: any) => {
    setSelectedLink(link);
    setSelectedNode(null);
    setIsDrawerOpen(true);
  };

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 60);
    }
  };

  // Custom Node Canvas Renderer
  const drawNodeCanvas = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || node.id;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;

    const isPoisoned = node.status === "FLAGGED_POISON";
    const isSuperseded = node.status === "SUPERSEDED";
    const radius = node.val || 14;

    // Outer Glow Ring
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
    if (isPoisoned) {
      ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    } else if (isSuperseded) {
      ctx.fillStyle = "rgba(100, 116, 139, 0.2)";
    } else {
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
    }
    ctx.fill();

    // Node Main Body
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    if (isPoisoned) {
      ctx.fillStyle = "#ef4444"; // Red for Poison
    } else if (isSuperseded) {
      ctx.fillStyle = "#64748b"; // Gray for Superseded
    } else {
      ctx.fillStyle = node.color || "#10b981"; // Green/Blue for Active
    }
    ctx.fill();
    ctx.lineWidth = 2 / globalScale;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Text Label Shadow Box
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth + 8, fontSize + 4];

    ctx.fillStyle = "rgba(8, 13, 26, 0.85)";
    ctx.fillRect(
      node.x - bckgDimensions[0] / 2,
      node.y + radius + 4,
      bckgDimensions[0],
      bckgDimensions[1]
    );

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isPoisoned ? "#fca5a5" : "#e2e8f0";
    ctx.fillText(label, node.x, node.y + radius + 4 + bckgDimensions[1] / 2);
  };

  if (!isMounted) {
    return (
      <div className="relative w-full h-[calc(100vh-65px)] bg-[#0b0f19] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-[#10b981] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-65px)] bg-[#0b0f19] overflow-hidden select-none font-sans" suppressHydrationWarning>
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4 bg-[#0e1424]/90 backdrop-blur-md border border-[#1b273d] p-3 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[#10b981]">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">CortexShield Memory Graph</h1>
            <p className="text-[11px] text-slate-400">
              Relationship-Centric Cognitive Integrity Firewall • {graphData.nodes.length} Nodes • {filteredLinksWithCurvature.length} Edges
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search node or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#131b2e] border border-[#202e48] text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-[#10b981] w-44 sm:w-56 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center bg-[#131b2e] p-1 rounded-xl border border-[#202e48]">
            {["ALL", "ACTIVE", "FLAGGED_POISON", "SUPERSEDED"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  selectedStatusFilter === status
                    ? "bg-[#1f2d47] text-white border border-[#10b981]/50 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {status === "FLAGGED_POISON" ? "POISON" : status}
              </button>
            ))}
          </div>

          {/* Reset Zoom Button */}
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all hover:bg-[#1a253d]"
            title="Reset 3D Zoom & Center"
          >
            <RotateCcw size={13} /> Reset
          </button>

          {/* Refresh Neo4j Button */}
          <button
            onClick={fetchGraphData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Syncing..." : "Refresh Neo4j"}
          </button>
        </div>
      </div>

      {/* Floating Legend Box with Distinct Node vs Relationship Edge Legend */}
      <div className="absolute bottom-6 left-6 z-20 bg-[#0e1424]/90 backdrop-blur-md border border-[#1b273d] p-3.5 rounded-2xl shadow-xl space-y-2.5 text-xs text-slate-300">
        <div>
          <span className="font-bold text-white text-[11px] uppercase tracking-wider block mb-1.5">
            Node Entity Status
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Active Entity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span>Flagged Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
              <span>Superseded</span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#1b273d] pt-2">
          <span className="font-bold text-white text-[11px] uppercase tracking-wider block mb-1.5">
            Relationship Edge Status (Lines)
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#10b981] inline-block" />
              <span>ACTIVE (Verified)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#ef4444] inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-red-400 font-bold">FLAGGED_POISON</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#64748b] inline-block" />
              <span>SUPERSEDED</span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#1b273d] pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
          <span>Updated: {lastUpdated || "Just now"}</span>
          <div className="flex items-center gap-1">
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
            warmupTicks={200}
            cooldownTicks={0}
            cooldownTime={0}
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
                  <span className="text-slate-400">Node Status</span>
                  <span className="font-bold text-emerald-400">{selectedNode.status}</span>
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
    </div>
  );
}
