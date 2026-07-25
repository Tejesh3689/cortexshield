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
  GripHorizontal,
} from "lucide-react";

// Dynamically import react-force-graph-2d to prevent SSR canvas issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// @ts-ignore
import { forceRadial, forceCollide, forceManyBody } from "d3-force-3d";
import { SkeletonLoader, ErrorBanner, EmptyStatePrompt, OfflineBanner } from "@/components/StatusBanners";

export interface MemoryNode {
  id: string;
  label: string;
  status: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED" | "EXTERNAL_FETCH";
  origin?: "EXTERNAL_FETCH" | string;
  type: "SHORT_TERM" | "LONG_TERM" | "VECTOR_EMBEDDING" | "POISONED_FRAGMENT" | "EXTERNAL_FETCH" | string;
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
  elementId?: string;
  source: string | MemoryNode;
  target: string | MemoryNode;
  label: string;
  status: "ACTIVE" | "FLAGGED_POISON" | "SUPERSEDED" | "EXTERNAL_FETCH";
  origin?: "EXTERNAL_FETCH" | string;
  trustScore: number;
  curvature?: number;
}

// Preset cluster positions so graph renders instantly as separated islands by default
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
  // Cluster 5: external_fetch_doc (Top Left)
  external_fetch_doc: { x: -160, y: -160 },
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
  {
    id: "external_fetch_doc",
    label: "external_web_scrape",
    status: "EXTERNAL_FETCH",
    origin: "EXTERNAL_FETCH",
    type: "EXTERNAL_FETCH",
    color: "#a855f7",
    val: 14,
    tenant: "tenant_pro_1",
    timestamp: "2026-07-25 07:05:00",
    content: "External Web Fetch: Content pulled autonomously from outside sources (Initial Trust Score: 0.1).",
  },
]);

const SEED_MEMORY_LINKS: MemoryLink[] = [
  { id: "link_user_blue_1", source: "user", target: "blue", label: "FAVORITE_COLOR (PRIMARY)", status: "ACTIVE", trustScore: 0.98 },
  { id: "link_user_blue_2", source: "user", target: "blue", label: "FAVORITE_COLOR (VERIFIED)", status: "ACTIVE", trustScore: 0.95 },
  { id: "link_user_blue_3", source: "user", target: "blue", label: "FAVORITE_COLOR (POISONED)", status: "FLAGGED_POISON", trustScore: 0.04 },
  { id: "link_alice_admin", source: "user_alice", target: "admin_role", label: "HAS_ROLE", status: "ACTIVE", trustScore: 0.96 },
  { id: "link_bob_sales", source: "user_bob", target: "sales_dept", label: "MEMBER_OF", status: "ACTIVE", trustScore: 0.94 },
  { id: "link_bob_eng", source: "user_bob", target: "engineering_dept", label: "MEMBER_OF", status: "ACTIVE", trustScore: 0.92 },
  { id: "link_sys_inj", source: "system_prompt", target: "ignore_previous_instructions", label: "INJECTION_ATTEMPT", status: "FLAGGED_POISON", trustScore: 0.02 },
  { id: "link_ext_fetch_1", source: "user_bob", target: "external_fetch_doc", label: "EXTERNAL_FETCH", status: "EXTERNAL_FETCH", origin: "EXTERNAL_FETCH", trustScore: 0.1 },
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
  const [graphViewMode, setGraphViewMode] = useState<"OBSIDIAN" | "DETAILED">("OBSIDIAN");

  // Self-healing remediation state
  const [isHealingEdge, setIsHealingEdge] = useState(false);
  const [healError, setHealError] = useState<string | null>(null);
  const [healSuccessMsg, setHealSuccessMsg] = useState<string | null>(null);

  // Draggable Legend position state
  const [legendPos, setLegendPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingLegend, setIsDraggingLegend] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number }>({
    mouseX: 0,
    mouseY: 0,
    elemX: 0,
    elemY: 0,
  });

  const fgRef = useRef<any>(null);
  const nodesCacheRef = useRef<Map<string, any>>(new Map());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const reconcileGraphNodes = useCallback((incomingNodes: MemoryNode[]): MemoryNode[] => {
    // 1. Identify main central root node (prefer 'user' or 'cortex_core' or first node)
    const mainNodeKey = incomingNodes.find((n) => n.id === "user" || n.id === "cortex_core" || n.label.toLowerCase().includes("user"))?.id || incomingNodes[0]?.id || "user";

    // 2. Separate peripheral nodes into concentric orbital tiers around main node
    const peripheralNodes = incomingNodes.filter((n) => (n.id || n.label) !== mainNodeKey);

    return incomingNodes.map((incoming, idx) => {
      const key = incoming.id || incoming.label;
      const isMainNode = key === mainNodeKey;
      const existing = nodesCacheRef.current.get(key);

      // Central Main Node sits dead center (0, 0)
      if (isMainNode) {
        if (existing) {
          existing.label = incoming.label;
          existing.status = incoming.status;
          existing.type = incoming.type;
          existing.content = incoming.content;
          existing.isMainNode = true;
          existing.isHub = true;
          existing.targetRadius = 0;
          existing.x = 0;
          existing.y = 0;
          existing.fx = 0;
          existing.fy = 0;
          return existing;
        }
        const mainNodeObj = {
          ...incoming,
          isMainNode: true,
          isHub: true,
          targetRadius: 0,
          x: 0,
          y: 0,
          fx: 0,
          fy: 0,
        };
        nodesCacheRef.current.set(key, mainNodeObj);
        return mainNodeObj;
      }

      // Calculate radial index and orbital shell radius
      const pIdx = peripheralNodes.findIndex((n) => (n.id || n.label) === key);
      const totalPeripheral = Math.max(peripheralNodes.length, 1);

      let targetRadius = 140;
      let phaseOffset = 0;
      const isHub = key.includes("blue") || key.includes("system_prompt") || key.includes("admin");

      if (isHub) {
        targetRadius = 100;
        phaseOffset = 0;
      } else if (key.includes("dept") || key.includes("role") || key.includes("alice") || key.includes("bob")) {
        targetRadius = 180;
        phaseOffset = Math.PI / 6;
      } else if (incoming.status === "FLAGGED_POISON") {
        targetRadius = 240;
        phaseOffset = Math.PI / 4;
      } else if (incoming.status === "EXTERNAL_FETCH") {
        targetRadius = 300;
        phaseOffset = Math.PI / 3;
      } else {
        targetRadius = 150 + (pIdx % 4) * 50;
        phaseOffset = (pIdx % 3) * (Math.PI / 5);
      }

      const angle = ((pIdx >= 0 ? pIdx : idx) / totalPeripheral) * 2 * Math.PI + phaseOffset;
      const initX = Math.cos(angle) * targetRadius;
      const initY = Math.sin(angle) * targetRadius;

      if (existing) {
        existing.label = incoming.label;
        existing.status = incoming.status;
        existing.type = incoming.type;
        existing.content = incoming.content;
        existing.timestamp = incoming.timestamp;
        existing.tenant = incoming.tenant;
        existing.targetRadius = targetRadius;
        existing.isHub = isHub;
        existing.isMainNode = false;

        if (existing.x !== undefined && existing.fx === undefined) {
          existing.fx = existing.x;
          existing.fy = existing.y;
        }
        return existing;
      }

      const newNode = {
        ...incoming,
        targetRadius,
        isHub,
        isMainNode: false,
        x: initX,
        y: initY,
        fx: initX,
        fy: initY,
      };
      nodesCacheRef.current.set(key, newNode);
      return newNode;
    });
  }, []);

  const handleNodeDrag = useCallback((node: any) => {
    if (!node) return;
    node.fx = node.x;
    node.fy = node.y;
    const key = node.id || node.label;
    if (key) {
      nodesCacheRef.current.set(key, node);
    }
  }, []);

  const handleNodeDragEnd = useCallback((node: any) => {
    if (!node) return;
    node.fx = node.x;
    node.fy = node.y;
    const key = node.id || node.label;
    if (key) {
      nodesCacheRef.current.set(key, node);
    }
  }, []);

  // Fetch real data from Neo4j API
  const fetchGraphData = useCallback(async () => {
    setIsRefreshing(true);
    setFetchError(null);

    // Lock current rendered node coordinates into cache
    if (fgRef.current && typeof fgRef.current.graphData === "function") {
      const currentNodes = fgRef.current.graphData().nodes || [];
      currentNodes.forEach((n: any) => {
        if (n && (n.id || n.label) && n.x !== undefined) {
          n.fx = n.x;
          n.fy = n.y;
          nodesCacheRef.current.set(n.id || n.label, n);
        }
      });
    }

    try {
      const res = await fetch(`/api/graph?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Unable to load graph — retrying in 5s");
      const json = await res.json();

      if (json.success && json.nodes && json.nodes.length > 0) {
        const positionedNodes = reconcileGraphNodes(json.nodes);
        setGraphData({
          nodes: positionedNodes,
          links: json.links || [],
        });
        setDataSource(json.source || "Neo4j Aura (Live)");
      } else {
        console.warn("Neo4j API empty or errored, using seed nodes");
        setDataSource("Seed Fallback (Neo4j Standby)");
      }
    } catch (err: any) {
      console.error("Failed to fetch graph data from API:", err);
      setFetchError("Unable to load graph — retrying in 5s");
      setDataSource("Seed Fallback (Neo4j Offline)");
    } finally {
      setLastUpdated(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }
  }, [reconcileGraphNodes]);

  const wsRef = useRef<WebSocket | null>(null);
  const [wsState, setWsState] = useState<"connected" | "reconnecting" | "disconnected">("disconnected");
  const [showLivePulse, setShowLivePulse] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchGraphData();

    let isMountedFlag = true;

    const connectWs = () => {
      if (!isMountedFlag) return;
      const baseWsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8200/ws/graph";
      const wsUrl = `${baseWsUrl}?tenant=tenant_pro_1`;

      try {
        setWsState("reconnecting");
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMountedFlag) setWsState("connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "graph_update" || data.event) {
              fetchGraphData();
              setShowLivePulse(true);
              setTimeout(() => setShowLivePulse(false), 2000);
            }
          } catch (err) {
            // ignore non-json
          }
        };

        ws.onclose = () => {
          if (isMountedFlag) {
            setWsState("reconnecting");
            setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          if (isMountedFlag) setWsState("reconnecting");
        };
      } catch (e) {
        if (isMountedFlag) {
          setWsState("reconnecting");
          setTimeout(connectWs, 3000);
        }
      }
    };

    connectWs();

    // Auto-poll fallback every 10 seconds so new edges from MCP/add_memory appear without manual refresh
    const pollInterval = setInterval(fetchGraphData, 10_000);

    const timer = setTimeout(() => {
      if (fgRef.current) {
        try {
          fgRef.current.d3Force("radial", forceRadial((d: any) => d.targetRadius || 200, 0, 0).strength(0.45));
          fgRef.current.d3Force("collide", forceCollide((d: any) => (d.val || 6) + 4).strength(0.8));
          fgRef.current.d3Force("charge", forceManyBody().strength(-40));
        } catch (e) {
          // d3 force init
        }
        fgRef.current.zoomToFit(600, 50);
      }
    }, 400);

    return () => {
      isMountedFlag = false;
      clearTimeout(timer);
      clearInterval(pollInterval);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [fetchGraphData]);

  // Legend Dragging Logic
  const handleLegendMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (e.button !== 0) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const parentRect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect() || { left: 0, top: 0 };

    const currentX = legendPos ? legendPos.x : rect.left - parentRect.left;
    const currentY = legendPos ? legendPos.y : rect.top - parentRect.top;

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: currentX,
      elemY: currentY,
    };
    setIsDraggingLegend(true);
  };

  useEffect(() => {
    if (!isDraggingLegend) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      setLegendPos({
        x: dragStartRef.current.elemX + deltaX,
        y: dragStartRef.current.elemY + deltaY,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      setIsDraggingLegend(false);
    };

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("mouseup", handleMouseUp, true);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("mouseup", handleMouseUp, true);
    };
  }, [isDraggingLegend]);

  // Self-Healing Handler for Poisoned Edges
  const handleHealEdge = async () => {
    if (!selectedLink) return;
    setIsHealingEdge(true);
    setHealError(null);
    setHealSuccessMsg(null);

    try {
      const edgeIdToHeal = selectedLink.elementId || selectedLink.id || "link_user_blue_3";
      const res = await fetch("/api/graph/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edge_element_id: edgeIdToHeal }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setHealSuccessMsg("Threat remediated. Edge quarantined.");

        // Immediately update selectedLink UI state
        setSelectedLink((prev) =>
          prev
            ? {
              ...prev,
              status: "SUPERSEDED",
              label: prev.label.replace("(POISONED)", "(SUPERSEDED)"),
              trustScore: 0.35,
            }
            : null
        );

        // Refetch Neo4j graph data to visually flip edge color from red to gray
        await fetchGraphData();
      } else {
        setHealError(json.error || "Failed to remediate poisoned edge.");
      }
    } catch (err: any) {
      setHealError(err.message || "Network error while remediating edge.");
    } finally {
      setIsHealingEdge(false);
    }
  };

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

  // Memoize graphData object reference to prevent ForceGraph2D from resetting camera on legend position state changes
  const forceGraphData = useMemo(() => ({
    nodes: filteredNodes,
    links: filteredLinksWithCurvature,
  }), [filteredNodes, filteredLinksWithCurvature]);

  // Click Handlers
  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    setSelectedLink(null);
    setHealError(null);
    setHealSuccessMsg(null);
    setIsDrawerOpen(true);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.5, 800);
    }
  };

  const handleLinkClick = (link: any) => {
    setSelectedLink(link);
    setSelectedNode(null);
    setHealError(null);
    setHealSuccessMsg(null);
    setIsDrawerOpen(true);
  };

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 60);
    }
  };

  // Custom Node Canvas Renderer (Supports both Obsidian View & Detailed View modes)
  const drawNodeCanvas = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || node.id;
    const isMain = node.isMainNode;
    const isHub = node.isHub || node.val >= 12;

    const isPoisoned = node.status === "FLAGGED_POISON";
    const isSuperseded = node.status === "SUPERSEDED";
    const isExternalFetch = node.status === "EXTERNAL_FETCH" || node.origin === "EXTERNAL_FETCH" || node.type === "EXTERNAL_FETCH";

    if (graphViewMode === "OBSIDIAN") {
      // 1. OBSIDIAN VIEW MODE (Clean, sleek, star-dot constellation style)
      const radius = isMain ? 5.5 : isHub ? 4 : 2.5;

      // Outer Ambient Aura Ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + (isMain ? 3.5 : isHub ? 2.5 : 1.5), 0, 2 * Math.PI, false);
      if (isPoisoned) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
      } else if (isSuperseded) {
        ctx.fillStyle = "rgba(100, 116, 139, 0.2)";
      } else if (isExternalFetch) {
        ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
      } else {
        ctx.fillStyle = isMain ? "rgba(16, 185, 129, 0.45)" : "rgba(16, 185, 129, 0.2)";
      }
      ctx.fill();

      // Star Dot Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = isPoisoned ? "#ef4444" : isSuperseded ? "#64748b" : isExternalFetch ? "#a855f7" : node.color || "#10b981";
      ctx.fill();
      ctx.lineWidth = 0.8 / globalScale;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.stroke();

      // Sleek Typography Label (NO dark background rectangle box!)
      const fontSize = (isMain ? 10 : isHub ? 9 : 8) / globalScale;
      ctx.font = `${isMain || isHub ? "bold" : "normal"} ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = isPoisoned ? "#fca5a5" : isExternalFetch ? "#e9d5ff" : isMain ? "#ffffff" : "rgba(226, 232, 240, 0.85)";
      ctx.fillText(label, node.x, node.y + radius + 2.5);
    } else {
      // 2. DETAILED VIEW MODE (Previous design with large spheres & dark background text badges)
      const radius = isMain ? 13 : isHub ? 9 : 6.5;
      const fontSize = (isMain ? 12 : isHub ? 10.5 : 9) / globalScale;
      ctx.font = `${isMain || isHub ? "bold" : "normal"} ${fontSize}px Inter, sans-serif`;

      // Outer Glow Ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + (isMain ? 7 : isHub ? 5 : 3), 0, 2 * Math.PI, false);
      if (isPoisoned) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
      } else if (isSuperseded) {
        ctx.fillStyle = "rgba(100, 116, 139, 0.2)";
      } else if (isExternalFetch) {
        ctx.fillStyle = "rgba(168, 85, 247, 0.35)";
      } else {
        ctx.fillStyle = isMain ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.25)";
      }
      ctx.fill();

      // Main Sphere Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fillStyle = isPoisoned ? "#ef4444" : isSuperseded ? "#64748b" : isExternalFetch ? "#a855f7" : node.color || "#10b981";
      ctx.fill();
      ctx.lineWidth = (isMain ? 2.5 : 1.5) / globalScale;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Text Badge Box
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
      ctx.fillStyle = isPoisoned ? "#fca5a5" : isExternalFetch ? "#e9d5ff" : "#e2e8f0";
      ctx.fillText(label, node.x, node.y + radius + 4 + bckgDimensions[1] / 2);
    }
  };

  if (!isMounted) {
    return (
      <div className="relative w-full h-[calc(100vh-65px)] bg-[#0b0f19] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-65px)] bg-[#0b0f19] overflow-hidden select-none font-sans">
      {/* Offline Banner Overlay */}
      {wsState === "disconnected" && (
        <div className="absolute top-2 left-6 right-6 z-30">
          <OfflineBanner isOffline={true} />
        </div>
      )}

      {/* Error Banner Overlay */}
      {fetchError && (
        <div className="absolute top-16 left-6 right-6 z-30">
          <ErrorBanner message={fetchError} onRetry={fetchGraphData} />
        </div>
      )}

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
            {["ALL", "ACTIVE", "FLAGGED_POISON", "EXTERNAL_FETCH", "SUPERSEDED"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedStatusFilter === status
                  ? "bg-[#1f2d47] text-white border border-[#10b981]/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                {status === "FLAGGED_POISON" ? "POISON" : status === "EXTERNAL_FETCH" ? "EXT FETCH" : status}
              </button>
            ))}
          </div>

          {/* Graph View Switcher Mode Buttons */}
          <div className="flex items-center bg-[#131b2e] p-1 rounded-xl border border-[#202e48]">
            <button
              onClick={() => setGraphViewMode("OBSIDIAN")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                graphViewMode === "OBSIDIAN"
                  ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Obsidian Star Constellation View"
            >
              <span>✨</span> Obsidian View
            </button>
            <button
              onClick={() => setGraphViewMode("DETAILED")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                graphViewMode === "DETAILED"
                  ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Detailed Spheres & Badges View"
            >
              <span>🔍</span> Detailed View
            </button>
          </div>

          {/* Reset Zoom Button */}
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2e] border border-[#202e48] text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all hover:bg-[#1a253d]"
            title="Reset 3D Zoom & Center"
          >
            <RotateCcw size={13} /> Reset
          </button>

          {/* Real-Time WebSocket Live Indicator Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#131b2e] border border-[#202e48] rounded-xl text-xs font-bold select-none">
            {wsState === "connected" ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="relative flex h-2.5 w-2.5">
                  {showLivePulse && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span>● Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span>● Reconnecting...</span>
              </div>
            )}
          </div>

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

      {/* Fullscreen Backdrop overlay while dragging legend box to absorb all canvas events */}
      {isDraggingLegend && (
        <div
          className="fixed inset-0 z-25 bg-transparent cursor-grabbing select-none"
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => {
            e.stopPropagation();
            setIsDraggingLegend(false);
          }}
        />
      )}

      {/* Movable / Draggable Floating Legend Box */}
      <div
        onMouseDown={handleLegendMouseDown}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={
          legendPos
            ? { position: "absolute", left: `${legendPos.x}px`, top: `${legendPos.y}px`, bottom: "auto" }
            : { position: "absolute", bottom: "24px", left: "24px" }
        }
        className={`${isDraggingLegend ? "z-30 cursor-grabbing" : "z-20 cursor-grab"
          } bg-[#0e1424]/90 backdrop-blur-md border border-[#1b273d] p-3.5 rounded-2xl shadow-xl space-y-2.5 text-xs text-slate-300 select-none hover:border-[#2a3c5a] transition-colors`}
      >
        <div className="flex items-center justify-between border-b border-[#1b273d] pb-1.5">
          <span className="font-bold text-white text-[11px] uppercase tracking-wider">
            Node Entity Status
          </span>
          <span title="Drag to move legend"><GripHorizontal size={14} className="text-slate-500 hover:text-slate-300" /></span>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span>Active Entity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span>Flagged Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
            <span className="text-purple-300 font-bold">External Fetch (Low Trust)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
            <span>Superseded</span>
          </div>
        </div>

        <div className="border-t border-[#1b273d] pt-2">
          <span className="font-bold text-white text-[11px] uppercase tracking-wider block mb-1.5">
            Relationship Edge Status (Lines)
          </span>
          <div className="flex flex-wrap items-center gap-3.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#10b981] inline-block" />
              <span>ACTIVE (Verified)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#ef4444] inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-red-400 font-bold">FLAGGED_POISON</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#a855f7] inline-block shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              <span className="text-purple-400 font-bold">EXTERNAL_FETCH</span>
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
            graphData={forceGraphData}
            nodeCanvasObject={drawNodeCanvas}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, (node.isMainNode ? 6 : 4) + 6, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            warmupTicks={200}
            cooldownTicks={0}
            cooldownTime={0}
            enablePointerInteraction={!isDraggingLegend}
            enableZoomInteraction={!isDraggingLegend}
            enablePanInteraction={!isDraggingLegend}
            onNodeClick={handleNodeClick}
            onLinkClick={handleLinkClick}
            onNodeDrag={handleNodeDrag}
            onNodeDragEnd={handleNodeDragEnd}
            // 1. Color Edges based on relationship status & origin
            linkColor={(link: any) => {
              if (graphViewMode === "OBSIDIAN") {
                if (link.status === "FLAGGED_POISON") return "rgba(239, 68, 68, 0.75)";
                if (link.status === "SUPERSEDED") return "rgba(100, 116, 139, 0.3)";
                if (link.status === "EXTERNAL_FETCH" || link.origin === "EXTERNAL_FETCH" || link.label?.includes("EXTERNAL")) return "rgba(168, 85, 247, 0.75)";
                return "rgba(16, 185, 129, 0.35)";
              }
              if (link.status === "FLAGGED_POISON") return "#ef4444";
              if (link.status === "SUPERSEDED") return "#64748b";
              if (link.status === "EXTERNAL_FETCH" || link.origin === "EXTERNAL_FETCH" || link.label?.includes("EXTERNAL")) return "#a855f7";
              return "#10b981";
            }}
            // 2. Render Parallel Edges as visually distinct curves using curvature offset
            linkCurvature={(link: any) => link.curvature || 0}
            linkWidth={(link: any) => {
              if (graphViewMode === "OBSIDIAN") {
                return link.status === "FLAGGED_POISON" ? 1.4 : link.status === "SUPERSEDED" ? 0.5 : link.status === "EXTERNAL_FETCH" || link.origin === "EXTERNAL_FETCH" ? 1.2 : 0.8;
              }
              return link.status === "FLAGGED_POISON" ? 3.5 : link.status === "SUPERSEDED" ? 1.8 : link.status === "EXTERNAL_FETCH" || link.origin === "EXTERNAL_FETCH" ? 3.0 : 2.5;
            }}
            linkDirectionalParticles={(link: any) => (link.status === "FLAGGED_POISON" ? 4 : link.status === "EXTERNAL_FETCH" || link.origin === "EXTERNAL_FETCH" ? 3 : link.status === "ACTIVE" ? 2 : 0)}
            linkDirectionalParticleSpeed={(link: any) => (link.status === "FLAGGED_POISON" ? 0.008 : link.status === "EXTERNAL_FETCH" ? 0.006 : 0.004)}
            linkDirectionalParticleColor={(link: any) => (link.status === "FLAGGED_POISON" ? "#ef4444" : link.status === "EXTERNAL_FETCH" || link.origin === "EXTERNAL_FETCH" ? "#a855f7" : "#10b981")}
            linkHoverPrecision={8}
            // 4. Hover Tooltip showing relationship trust_score and status directly
            linkLabel={(link: any) => `
              <div style="background:#0e1424; border:1px solid #1b273d; padding:8px 12px; border-radius:10px; font-family:monospace; font-size:11px; color:#f8fafc; box-shadow:0 10px 25px rgba(0,0,0,0.6);">
                <div style="font-weight:bold; font-size:12px; margin-bottom:4px; color:${link.status === 'FLAGGED_POISON' ? '#ef4444' : link.status === 'SUPERSEDED' ? '#94a3b8' : '#10b981'
              };">
                  ${link.status === 'FLAGGED_POISON' ? '⚠️ ' : ''}${link.label || 'RELATIONSHIP'}
                </div>
                <div>Status: <span style="font-weight:bold; color:${link.status === 'FLAGGED_POISON' ? '#ef4444' : link.status === 'SUPERSEDED' ? '#94a3b8' : '#34d399'
              }">${link.status || 'ACTIVE'}</span></div>
                <div>Trust Score: <span style="font-weight:bold; color:${link.trustScore < 0.3 ? '#ef4444' : '#60a5fa'}">${link.trustScore !== undefined ? link.trustScore : '0.98'
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
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedLink.status === "FLAGGED_POISON"
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
                    className={`font-bold ${selectedLink.status === "FLAGGED_POISON"
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
                    className={`font-bold ${(selectedLink.trustScore || 0) < 0.3 ? "text-red-400" : "text-blue-400"
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

              {/* Remediate Poisoned Edge Button - ONLY visible for FLAGGED_POISON edges */}
              {selectedLink.status === "FLAGGED_POISON" && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleHealEdge}
                    disabled={isHealingEdge}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/50 border border-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                  >
                    {isHealingEdge ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-red-200" />
                        <span>Remediating Poisoned Edge...</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={15} className="text-red-200 group-hover:scale-110 transition-transform" />
                        <span>Remediate Poisoned Edge</span>
                      </>
                    )}
                  </button>

                  {healError && (
                    <div className="p-2.5 bg-red-950/80 border border-red-800/60 rounded-xl text-red-300 text-[11px] flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      <span>{healError}</span>
                    </div>
                  )}

                  {healSuccessMsg && (
                    <div className="p-2.5 bg-emerald-950/80 border border-emerald-800/60 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      <span>{healSuccessMsg}</span>
                    </div>
                  )}
                </div>
              )}
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
