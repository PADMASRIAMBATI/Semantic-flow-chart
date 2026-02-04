import React, { useEffect, useRef, useState } from "react";
import { Network, DataSet } from "vis-network/standalone";

/* =========================================================
   1. GLOBAL ERROR SUPPRESSION
   This must be at the very top to kill the error for all users.
   ========================================================= */
if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    if (e.message.includes("ResizeObserver") || e.message.includes("loop limit exceeded")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

const DEPENDENCY_TO_WH_RELATION = {
  k1: "Who/What", k2: "Whom/What", k7t: "When", k7p: "Where",
  krvn: "How", k5: "From where", k2p: "To where", rt: "Purpose",
  rh: "Reason", ru: "Like what", k3: "With what", rv: "Compared to what",
  mod: "Modifier", quant: "Quantity", r6: "Of", rkl: "During",
  kriyaMUla: "Root Verb", verbalizer: "Verbalizer",
  op1: "Item", op2: "Item", op3: "Item", op4: "Item", op5: "Item",
  re: "Type"
};

const TAM_MAPPING = {
  yA_WA_2: "had", nA_cAhie_4: "must", nA_hE_1: "have_to", past: "was",
  yA_1: "ed", "0_gayA_1": "went", "0_xiyA_1": "gave", "0_sakA_1": "could",
  yA_WA_1: "did", yA_hE_2: "is_being", wA_hE_1: "is", "0_rahA_hogA_1": "will_have_been",
  pres: "is", wA_WA_1: "used_to", "0_jAwA_WA_1": "used_to_go", gA_2: "would",
  o_1: "should", o_2: "must", nA_hE_2: "have_to", nA_hogA_1: "must",
  nA_cAhie_2: "must", nA_cAhie_1: "should", "0_sakawA_hE_3": "may",
  nA_padZawA_hE_1: "have_to", nA_padZawA_WA_1: "had_to", nA_padZA_1: "had_to",
  yA_gayA_WA_1: "was", "0_cukA_hE_1": "have", "0_cukA_WA_1": "had",
  "0_gayA_WA_1": "had_gone", "0_rahA_hE_2": "has_been", yA_gayA_hE_2: "has_been",
  "0_rahA_WA_2": "had_been", "0_cukA_hogA_1": "will_have", yA_gayA_1: "got",
  wA_rahawA_hE_1: "keeps", "0_rahA_wA_1": "was", "0_rahA_hE_1": "is",
  yA_jAyegA_1: "will_be", gA_1: "will", "0_rahA_hogA_2": "shall_be",
  yA_hogA_1: "will_have", nA_cAhie_3: "have_to", nA_padZawA_hE_2: "must",
  nA_padZA_2: "must", nA_padZawA_WA_2: "have_to", nA_padZegA_1: "had_to",
  yA_hogA_2: "had_to", "0_sakawA_1": "will_have_to", "0_sakawA_WA_1": "might_have",
  "0_sakawA_hE_1": "can", "0_sakawA_hE_2": "could", yA_gayA_WA_2: "could",
  yA_jAwA_WA_1: "might", yA_jAwA_hE_1: "could", yA_gayA_hE_1: "can",
  yA_hE_1: "was", yA_hogA_3: "was", yAw_1: "had_been", aw_1: "is",
  awi_4: "are", a_1: "has", Iw_1: "must_have", wA_1: "will",
  syaw_1: "ed", syawi_1: "ed", awu_1: "ed", ew_1: "should",
};

export default function FlowChart({ externalInput }) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const networkRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentNodes = useRef(new DataSet());
  const currentEdges = useRef(new DataSet());
  const fullNodes = useRef({});
  const fullEdges = useRef([]);
  const expandedNodes = useRef(new Set());

  const cleanConcept = (raw) => {
    if (!raw) return "";
    if (raw.includes("[conj]")) return "and";
    let label = raw;
    let tam = "";
    for (const key in TAM_MAPPING) {
      if (raw.includes(`_${key}`)) {
        tam = TAM_MAPPING[key];
        label = raw.split(`_${key}`)[0];
        break;
      }
    }
    const match = label.match(/\(([^)]+)\)/);
    label = match ? match[1] : label;
    return tam ? `${label.split('_')[0].replace(/[0-9]/g, '')} (${tam})` : label.split('_')[0].replace(/[0-9]/g, '');
  };

  const parseInput = (text) => {
    const rawData = {};
    const lines = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("<") && !l.startsWith("#"));
    let rootId = null;

    lines.forEach(line => {
      const tokens = line.split(/\s+/);
      const id = tokens.find(t => /^\d+$/.test(t));
      const relToken = tokens.find(t => t.includes(":"));
      if (!id || !relToken) return;
      const [head, rel] = relToken.split(":");
      rawData[id] = { id, raw: tokens[0], head, rel, label: cleanConcept(tokens[0]) };
      if (head === "0" && rel === "main") rootId = id;
    });

    const nodes = {}; const edges = [];
    Object.values(rawData).forEach(node => {
      if (["begin", "verbalizer", "kriyaMUla"].includes(node.rel)) return;
      let displayLabel = node.label;
      if (!displayLabel || node.raw.startsWith("[")) {
        const desc = Object.values(rawData).find(n => n.head === node.id && ["begin", "verbalizer", "kriyaMUla"].includes(n.rel));
        displayLabel = desc ? desc.label : node.raw.replace(/[\[\]_0-9]/g, '');
      }
      nodes[node.id] = { id: node.id, label: displayLabel, shape: "box", margin: 12, font: { size: 18 }, color: { background: node.id === rootId ? "#e6ddff" : (displayLabel === "and" ? "#fff4e6" : "#ffffff"), border: displayLabel === "and" ? "#fd7e14" : "#7fb7be" } };
      if (node.head && node.head !== "0") {
        edges.push({ id: `e${node.head}-${node.id}`, from: node.head, to: node.id, label: DEPENDENCY_TO_WH_RELATION[node.rel] || node.rel, arrows: "to", color: "#adc2d1", font: { size: 12, background: "white", align: 'middle' } });
      }
    });
    return { nodes, edges, rootId };
  };

  const renderGraph = (text) => {
    if (!text || !graphRef.current) return;
    const { nodes, edges, rootId } = parseInput(text);
    if (!rootId) return;

    fullNodes.current = nodes;
    fullEdges.current = edges;
    expandedNodes.current.clear();
    currentNodes.current = new DataSet([nodes[rootId]]);
    currentEdges.current = new DataSet([]);

    // Logic: Delay initialization by one frame to avoid ResizeObserver conflict
    window.requestAnimationFrame(() => {
        if (networkRef.current) networkRef.current.destroy();

        const options = {
          autoResize: false, // CRITICAL: Stop the graph from auto-resizing itself
          layout: { 
            hierarchical: { 
              enabled: true, 
              direction: "UD", 
              sortMethod: "directed", // ENSURES SAME LINE ALIGNMENT
              levelSeparation: 150, 
              nodeSpacing: 350, 
              parentCentralization: true 
            } 
          },
          physics: false,
          interaction: { hover: true, zoomView: true, dragView: true },
          edges: { smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 0.5 } }
        };

        networkRef.current = new Network(graphRef.current, { nodes: currentNodes.current, edges: currentEdges.current }, options);

        networkRef.current.on("click", (params) => {
          if (!params.nodes.length) return;
          const nodeId = params.nodes[0];
          const children = fullEdges.current.filter(e => e.from === nodeId);
          if (!expandedNodes.current.has(nodeId)) {
            children.forEach(edge => {
              if (!currentNodes.current.get(edge.to)) currentNodes.current.add(fullNodes.current[edge.to]);
              if (!currentEdges.current.get(edge.id)) currentEdges.current.add(edge);
            });
            expandedNodes.current.add(nodeId);
          } else {
            const collapse = (id) => {
              fullEdges.current.filter(e => e.from === id).forEach(sc => {
                collapse(sc.to);
                currentNodes.current.remove(sc.to);
                currentEdges.current.remove(sc.id);
                expandedNodes.current.delete(sc.to);
              });
            };
            collapse(nodeId);
            expandedNodes.current.delete(nodeId);
          }
          setTimeout(() => networkRef.current?.fit({ animation: true }), 150);
        });
        
        setTimeout(() => networkRef.current?.fit(), 250);
    });
  };

  useEffect(() => {
    if (externalInput) renderGraph(externalInput);
    return () => networkRef.current?.destroy();
  }, [externalInput]);

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (networkRef.current) {
            networkRef.current.redraw();
            networkRef.current.fit();
        }
      }, 500); 
    };
    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", () => {
      setIsFullscreen(!!document.fullscreenElement);
      handleResize();
    });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: isFullscreen ? "100vh" : "600px", background: "#fff", display: "flex", flexDirection: "column", border: isFullscreen ? "none" : "1px solid #ddd", borderRadius: isFullscreen ? "0" : "8px", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
        <h4 style={{ margin: 0, color: "#444", fontSize: "14px" }}>NLP Evaluation Portal</h4>
        <button onClick={() => !document.fullscreenElement ? containerRef.current.requestFullscreen() : document.exitFullscreen()} style={{ padding: "8px 16px", cursor: "pointer", background: "#6c5ce7", color: "white", border: "none", borderRadius: "5px", fontWeight: "bold" }}>
          {isFullscreen ? "Exit Screen" : "Full Screen"}
        </button>
      </div>
      <div ref={graphRef} style={{ flex: 1, width: "100%", height: "100%" }} />
    </div>
  );
}