"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Brain,
  Database,
  Search,
  RotateCw,
  Trash2,
  Pin,
  RefreshCw,
  Activity,
  Zap,
  Sliders,
  CheckCircle2,
  X,
  PanelRightOpen,
  PanelRightClose
} from "lucide-react";

// Dynamically import 2D Force Graph to ensure zero SSR/WebGL bundle export issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export interface MemoryNode {
  id: string;
  label: string;
  type: "SHORT_TERM" | "LONG_TERM" | "VECTOR_EMBEDDING" | "POISONED_FRAGMENT";
  color: string;
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
  x?: number;
  y?: number;
}

export interface MemoryLink {
  source: string | MemoryNode | any;
  target: string | MemoryNode | any;
}

// Memory Nodes seed dataset matching the user's provided diagram (Teal #5cd3c1 & Purple #737ccf)
const SEED_MEMORY_NODES: MemoryNode[] = [
  {
    id: "mem_central_core",
    label: "Central Memory Hub",
    type: "SHORT_TERM",
    color: "#5cd3c1",
    val: 16,
    memoryHash: "0x8F4B-99A1-CORE",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.98,
    decayFactor: 0.99,
    retentionPolicy: "Central State Buffer",
    accessCount: 4210,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-24 15:20:00",
    content: "Central neural memory hub routing short-term conversational context and long-term entity associations.",
  },
  {
    id: "mem_short_01",
    label: "Prompt Context: Session #1042",
    type: "SHORT_TERM",
    color: "#5cd3c1",
    val: 12,
    memoryHash: "0x3A11-54B9-ST01",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.91,
    decayFactor: 0.88,
    retentionPolicy: "24-Hour Active Sliding Window",
    accessCount: 312,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-24 15:18:12",
    content: "User query context regarding database connection parameters and active socket connection pools.",
  },
  {
    id: "mem_short_02",
    label: "Active System Role Directives",
    type: "SHORT_TERM",
    color: "#5cd3c1",
    val: 12,
    memoryHash: "0x4B22-88C1-ST02",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.94,
    decayFactor: 0.92,
    retentionPolicy: "Session Scope",
    accessCount: 540,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-24 15:19:05",
    content: "System guardrail: Enforce cryptographic provenance check on all tool invocations and memory nodes.",
  },
  {
    id: "mem_short_03",
    label: "Tool Execution Output Cache",
    type: "SHORT_TERM",
    color: "#5cd3c1",
    val: 11,
    memoryHash: "0x9F33-11D4-ST03",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.89,
    decayFactor: 0.84,
    retentionPolicy: "Ephemeral Buffer",
    accessCount: 189,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-24 15:15:40",
    content: "Execution output from billing meter usage service returning HTTP 200 payload.",
  },
  {
    id: "mem_short_04",
    label: "User Query Intent Vectors",
    type: "SHORT_TERM",
    color: "#5cd3c1",
    val: 11,
    memoryHash: "0x1E55-77F2-ST04",
    vectorDimension: "1536 (text-embedding-3-large)",
    similarityScore: 0.93,
    decayFactor: 0.90,
    retentionPolicy: "24-Hour Active Sliding Window",
    accessCount: 275,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-24 15:12:00",
    content: "Semantic cluster representing user query intent for 2D/3D memory graph inspection dashboard.",
  },
  {
    id: "mem_long_01",
    label: "User Preferences & Profile",
    type: "LONG_TERM",
    color: "#737ccf",
    val: 13,
    memoryHash: "0x8A88-33E1-LT01",
    vectorDimension: "1536 (BGE-large-en-v1.5)",
    similarityScore: 0.86,
    decayFactor: 0.98,
    retentionPolicy: "Permanent Knowledge Store",
    accessCount: 1250,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-20 10:00:00",
    content: "Persistent user profile settings, visual themes, and workspace authorization records.",
  },
  {
    id: "mem_long_02",
    label: "CortexShield Security Rules",
    type: "LONG_TERM",
    color: "#737ccf",
    val: 13,
    memoryHash: "0x7C99-22B4-LT02",
    vectorDimension: "1536 (BGE-large-en-v1.5)",
    similarityScore: 0.97,
    decayFactor: 0.99,
    retentionPolicy: "Permanent Knowledge Store",
    accessCount: 3840,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-21 08:30:00",
    content: "Security rule index for prompt injection prevention, SQL filtering, and session token validation.",
  },
  {
    id: "mem_long_03",
    label: "Graph Node Ontology",
    type: "LONG_TERM",
    color: "#737ccf",
    val: 12,
    memoryHash: "0x6D44-99A8-LT03",
    vectorDimension: "1536 (BGE-large-en-v1.5)",
    similarityScore: 0.92,
    decayFactor: 0.97,
    retentionPolicy: "Permanent Knowledge Store",
    accessCount: 940,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-22 14:10:00",
    content: "Ontology schema defining entity relationships, cypher node keys, and decay metrics.",
  },
  {
    id: "mem_long_04",
    label: "Stripe Meter Integration Vault",
    type: "LONG_TERM",
    color: "#737ccf",
    val: 12,
    memoryHash: "0x5E22-11C9-LT04",
    vectorDimension: "1536 (BGE-large-en-v1.5)",
    similarityScore: 0.88,
    decayFactor: 0.96,
    retentionPolicy: "Encrypted Vault",
    accessCount: 620,
    tenant: "Tenant_Main_Prod",
    timestamp: "2026-07-23 11:45:00",
    content: "Encrypted API references for subscription usage tracking and billing aggregation.",
  },
  {
    id: "mem_poisoned_01",
    label: "Untrusted Injection Fragment",
    type: "POISONED_FRAGMENT",
    color: "#ff5c5c",
    val: 11,
    memoryHash: "0x99XX-ERR0-POIS",
    vectorDimension: "1536 (Unindexed)",
    similarityScore: 0.12,
    decayFactor: 0.05,
    retentionPolicy: "Quarantined / Flagged",
    accessCount: 12,
    tenant: "Tenant_External_Untrusted",
    timestamp: "2026-07-24 14:05:00",
    content: "Suspicious prompt injection fragment attempting to leak environment variables.",
  },
];

const SEED_MEMORY_LINKS: MemoryLink[] = [
  { source: "mem_central_core", target: "mem_short_01" },
  { source: "mem_central_core", target: "mem_short_02" },
  { source: "mem_central_core", target: "mem_short_03" },
  { source: "mem_central_core", target: "mem_short_04" },
  { source: "mem_central_core", target: "mem_long_01" },
  { source: "mem_central_core", target: "mem_long_02" },
  { source: "mem_central_core", target: "mem_long_03" },
  { source: "mem_central_core", target: "mem_long_04" },
  { source: "mem_central_core", target: "mem_poisoned_01" },
  { source: "mem_short_01", target: "mem_long_01" },
  { source: "mem_short_02", target: "mem_long_02" },
  { source: "mem_short_03", target: "mem_long_04" },
  { source: "mem_long_02", target: "mem_long_03" },
];

export default function MemoryGraphView() {
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [graphData, setGraphData] = useState<{ nodes: MemoryNode[]; links: MemoryLink[] }>({
    nodes: SEED_MEMORY_NODES,
    links: SEED_MEMORY_LINKS,
  });
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(SEED_MEMORY_NODES[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fgRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setIsMounted(true);

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      console.warn("NEXT_PUBLIC_WS_URL is not set — realtime graph updates disabled.");
      return;
    }

    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        if (update.type === "node_added") {
          setGraphData((prev) => {
            if (prev.nodes.find((n) => n.id === update.data.id)) return prev;
            return { ...prev, nodes: [...prev.nodes, update.data] };
          });
        } else if (update.type === "edge_added") {
          setGraphData((prev) => ({ ...prev, links: [...prev.links, update.data] }));
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const handleUpdateNode = (updated: MemoryNode) => {
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === updated.id ? updated : n)),
    }));
    setSelectedNode(updated);
  };

  const filteredNodes = useMemo(() => {
    return graphData.nodes.filter((node) => {
      const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            node.memoryHash.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === "ALL" || node.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [graphData.nodes, searchQuery, selectedType]);

  const filteredLinks = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return graphData.links.filter(link => 
      nodeIds.has(typeof link.source === 'object' ? (link.source as any).id : link.source) && 
      nodeIds.has(typeof link.target === 'object' ? (link.target as any).id : link.target)
    );
  }, [graphData.links, filteredNodes]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 600);
    }
  }, []);

  const handlePromoteToLongTerm = useCallback(() => {
    if (!selectedNode) return;
    const updated = { ...selectedNode, type: "LONG_TERM" as const, color: "#737ccf" };
    handleUpdateNode(updated);
  }, [selectedNode]);

  const handlePruneNode = useCallback(() => {
    if (!selectedNode) return;
    setGraphData(prev => ({
      nodes: prev.nodes.filter(n => n.id !== selectedNode.id),
      links: prev.links.filter(l => 
        (typeof l.source === 'object' ? (l.source as any).id : l.source) !== selectedNode.id && 
        (typeof l.target === 'object' ? (l.target as any).id : l.target) !== selectedNode.id
      )
    }));
    setSelectedNode(null);
  }, [selectedNode]);

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 60);
    }
  };

  const handleRefreshIndex = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1200);
  };

  // Custom node canvas drawing matching clean colored circles (Teal #5cd3c1 & Purple #737ccf)
  const drawNodeCanvas = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const isSelected = selectedNode && selectedNode.id === node.id;
    const radius = node.val ? node.val : 12;

    // Outer Glow if selected
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
      ctx.fillStyle = "rgba(92, 211, 193, 0.4)";
      ctx.fill();
    }

    // Node Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color || "#5cd3c1";
    ctx.fill();

    // Node Border
    ctx.lineWidth = isSelected ? 2.5 : 1;
    ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
    ctx.stroke();

    // Node Label
    if (globalScale > 0.85) {
      const label = node.label;
      const fontSize = 11 / globalScale;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(label, node.x, node.y + radius + 12);
    }
  }, [selectedNode]);

  return (
    <div className="relative w-full h-[calc(100vh-1px)] bg-[#0b0f19] text-slate-100 font-sans overflow-hidden select-none">
      {/* Top Header Navigation & Filter Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-[#0e1424]/95 backdrop-blur-md border-b border-[#1b273d] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        {/* Left: Memory Graph Title & Search */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-[#5cd3c1] font-mono font-black text-lg">
            <Brain className="text-[#5cd3c1]" size={22} />
            <span>MEMORY GRAPH</span>
          </div>

          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory text, hashes..."
              className="w-full bg-[#131b2e] border border-[#202e48] rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-[#5cd3c1]"
            />
          </div>
        </div>

        {/* Center: Memory Node Category Filter Buttons */}
        <div className="flex items-center gap-1 bg-[#131b2e] p-1 rounded-xl border border-[#202e48]">
          {[
            { id: "ALL", label: "All Memory Nodes" },
            { id: "SHORT_TERM", label: "Short-Term (#5cd3c1)" },
            { id: "LONG_TERM", label: "Long-Term (#737ccf)" },
            { id: "POISONED_FRAGMENT", label: "Flagged (#ff5c5c)" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedType === cat.id
                  ? "bg-[#1f2d47] text-white font-bold border-b-2 border-[#5cd3c1] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Right Action Buttons & Drawer Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-mono transition-all ${
              isDrawerOpen
                ? "bg-[#1f2d47] border-[#5cd3c1] text-[#5cd3c1]"
                : "bg-[#131b2e] border-[#202e48] text-slate-400 hover:text-slate-200"
            }`}
          >
            {isDrawerOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            <span>{isDrawerOpen ? "Hide Metadata" : "Inspect Metadata"}</span>
          </button>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white rounded-lg text-xs font-mono"
          >
            <RotateCw size={14} /> Reset View
          </button>

          <button
            onClick={handleRefreshIndex}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 bg-[#5cd3c1] text-[#0b0f19] font-bold rounded-lg text-xs font-mono shadow-md hover:bg-[#73e0cf] ${
              isRefreshing ? "animate-pulse" : ""
            }`}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Re-Index</span>
          </button>
        </div>
      </header>

      {/* Top Left Floating Metrics Overlay */}
      <div className="absolute top-20 left-6 z-10 w-72 bg-[#0e1424]/85 backdrop-blur-md border border-[#1b273d] rounded-xl p-4 shadow-xl space-y-3 font-mono">
        <div className="flex justify-between items-center border-b border-[#1b273d] pb-2">
          <span className="text-[11px] uppercase text-slate-400 font-bold flex items-center gap-1.5">
            <Activity size={14} className="text-[#5cd3c1]" /> Memory Telemetry
          </span>
          <span className="text-xs text-[#5cd3c1] font-bold">ACTIVE</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-[#131b2e] border border-[#202e48] p-2 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase">Nodes Count</p>
            <p className="text-sm font-bold text-white">{filteredNodes.length}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#202e48] p-2 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase">Edges Count</p>
            <p className="text-sm font-bold text-[#5cd3c1]">{filteredLinks.length}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#202e48] p-2 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase">Retention</p>
            <p className="text-sm font-bold text-[#737ccf]">98.4%</p>
          </div>
          <div className="bg-[#131b2e] border border-[#202e48] p-2 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase">Poisoned</p>
            <p className="text-sm font-bold text-red-400">1</p>
          </div>
        </div>
      </div>

      {/* Main Force Graph Canvas Container (Dynamic Width based on Drawer state) */}
      <div className={`h-full transition-all duration-300 ${isDrawerOpen ? "w-[calc(100%-380px)]" : "w-full"}`}>
        {isMounted && (
          <ForceGraph2D
            ref={fgRef}
            graphData={{ nodes: filteredNodes, links: filteredLinks }}
            nodeCanvasObject={drawNodeCanvas}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, (node.val || 12) + 5, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            onNodeClick={handleNodeClick}
            linkColor={() => "rgba(203, 213, 225, 0.6)"}
            linkWidth={2}
            backgroundColor="#0b0f19"
          />
        )}
      </div>

      {/* Right Memory Node Metadata Side Drawer with Close Button */}
      {isDrawerOpen && (
        <aside className="absolute top-20 right-6 z-30 w-88 bg-[#0e1424]/95 backdrop-blur-md border border-[#1b273d] rounded-2xl p-5 shadow-2xl space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto font-mono transition-all">
          {/* Drawer Header with Close 'X' Button */}
          <div className="flex items-center justify-between border-b border-[#1b273d] pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Database size={16} className="text-[#5cd3c1]" /> Memory Node Metadata
            </h3>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-lg bg-[#131b2e] border border-[#202e48] text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all"
              title="Close Metadata Panel"
            >
              <X size={16} />
            </button>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              {/* Selected Node Header Badge */}
              <div className="bg-[#131b2e] border border-[#202e48] p-3 rounded-xl flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0 shadow-md border border-white/40"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <div className="overflow-hidden">
                  <h4 className="font-bold text-white truncate text-sm">{selectedNode.label}</h4>
                  <p className="text-[10px] text-slate-400">{selectedNode.type}</p>
                </div>
              </div>

              {/* Field Metadata Table */}
              <div className="space-y-2 border-b border-[#1b273d] pb-3">
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Memory Hash</span>
                  <span className="text-[#5cd3c1] font-bold">{selectedNode.memoryHash}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Vector Embeddings</span>
                  <span className="text-slate-200 text-[10px]">{selectedNode.vectorDimension}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Cosine Similarity</span>
                  <span className="text-[#737ccf] font-bold">{selectedNode.similarityScore}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Decay Factor</span>
                  <span className="text-slate-200">{selectedNode.decayFactor}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Retention Policy</span>
                  <span className="text-slate-300 text-[10px]">{selectedNode.retentionPolicy}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#172238]">
                  <span className="text-slate-400">Access Hit Count</span>
                  <span className="text-cyan-400 font-bold">{selectedNode.accessCount}</span>
                </div>
              </div>

              {/* Memory Snippet Box */}
              <div>
                <label className="text-[10px] uppercase text-slate-400 block mb-1">Memory Content Snippet</label>
                <div className="bg-[#070a12] border border-[#1b273d] p-3 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                  {selectedNode.content}
                </div>
              </div>

              {/* Functional Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handlePromoteToLongTerm}
                  className="w-full bg-[#737ccf] hover:bg-[#858de0] text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <Pin size={14} /> Promote to Long-Term Memory
                </button>
                <button
                  onClick={handlePruneNode}
                  className="w-full border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Prune Memory Chunk
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-xs font-mono">Select any node in the graph to inspect metadata.</p>
          )}
        </aside>
      )}

      {/* Bottom Left Memory Legend Panel */}
      <div className="absolute bottom-6 left-6 z-10 bg-[#0e1424]/90 backdrop-blur-md border border-[#1b273d] rounded-xl p-4 w-64 space-y-2 text-xs font-mono shadow-lg">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">
          MEMORY NODES LEGEND
        </span>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#5cd3c1]" />
          <span>Short-Term Context (#5cd3c1)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#737ccf]" />
          <span>Long-Term Storage (#737ccf)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <span className="w-3 h-3 rounded-full bg-[#ff5c5c]" />
          <span>Poisoned Fragment (#ff5c5c)</span>
        </div>
      </div>
    </div>
  );
}
