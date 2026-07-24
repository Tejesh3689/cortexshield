"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";

// Dynamically import force graph as it requires window/browser APIs
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

export default function GraphView() {
  const { getToken, orgId, userId } = useAuth();
  const tenantId = orgId || userId || "default_tenant";
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Fetch initial graph data from proxy-engine (server side proxy in Next.js or direct if configured)
    // For now we simulate an empty initial state to allow WS to populate
    setGraphData({ nodes: [], links: [] });
    
    // 2. Connect to realtime-gateway WebSocket
    // URL must be provided via NEXT_PUBLIC_WS_URL — no localhost fallback.
    const connectWs = async () => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (!wsUrl) {
        console.warn("NEXT_PUBLIC_WS_URL is not set — realtime graph updates disabled.");
        return;
      }
      const token = await getToken();
      const ws = new WebSocket(`${wsUrl}?token=${token}&tenant=${tenantId}`);
      
      ws.onmessage = (event) => {
        const update = JSON.parse(event.data);
        if (update.type === "node_added") {
          setGraphData(prev => {
            if (prev.nodes.find((n: any) => n.id === update.data.id)) return prev;
            return { ...prev, nodes: [...prev.nodes, update.data] };
          });
        } else if (update.type === "edge_added") {
          setGraphData(prev => {
            return { ...prev, links: [...prev.links, update.data] };
          });
        }
      };
      wsRef.current = ws;
    };
    
    connectWs();
    
    return () => {
      wsRef.current?.close();
    };
  }, [tenantId, getToken]);

  return (
    <div className="w-full h-full">
      {/* We use a simple layout for the premium dark mode graph */}
      <div className="absolute top-4 right-4 z-10 bg-slate-900/80 p-4 rounded border border-slate-700">
        <h3 className="text-white font-semibold">Live Graph</h3>
        <p className="text-xs text-slate-400">Nodes: {graphData.nodes.length} | Edges: {graphData.links.length}</p>
      </div>
      <ForceGraph3D
        graphData={graphData}
        nodeLabel="id"
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        backgroundColor="#020617" // tailwind slate-950
      />
    </div>
  );
}
