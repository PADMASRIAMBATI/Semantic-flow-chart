import React, { useEffect, useRef } from "react";
import { Network, DataSet } from "vis-network/standalone";

const DEPENDENCY_TO_WH_RELATION = {
  k1: "Who/What", k2: "Whom/What", k7t: "When", k7p: "Where",
  krvn: "How", k5: "From where", k2p: "To where", rt: "Purpose",
  mod: "Modifier", k3: "With what", 
};

export default function FlowChart({ externalInput }) {
  const graphRef = useRef(null);
  const networkRef = useRef(null);
  const currentNodes = useRef(new DataSet());
  const currentEdges = useRef(new DataSet());
  const fullNodes = useRef(new DataSet());
  const fullEdges = useRef(new DataSet());
  const expandedNodes = useRef(new Set());

  const cleanConcept = (rawConcept) => {
    if (!rawConcept) return "";
    // Priority: Extract English in parentheses: lakadZahArA_1(woodcutter_1)
    const parenMatch = rawConcept.match(/\(([^)]+)\)/);
    let label = parenMatch ? parenMatch[1] : rawConcept;
    return label.split('_')[0].replace(/[0-9]/g, '');
  };

  const parseInput = (text) => {
    const nodes = []; const edges = []; let rootId = null;
    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
      line = line.trim();
      if (!line || line.startsWith("<") || line.startsWith("#")) return;
      const tokens = line.split(/\s+/);
      const id = tokens.find(t => /^\d+$/.test(t));
      const relToken = tokens.find(t => t.includes(":"));
      if (!id || !relToken) return;
      const [head, rel] = relToken.split(":");
      const nodeObj = { id, label: cleanConcept(tokens[0]), shape: "box", margin: 10, font: { size: 18 } };
      if (head === "0" && rel === "main") {
        rootId = id;
        nodeObj.color = { background: "#e6ddff", border: "#9b85d9" };
      }
      nodes.push(nodeObj);
      if (head !== "0") {
        edges.push({ from: head, to: id, label: DEPENDENCY_TO_WH_RELATION[rel] || rel, arrows: "to" });
      }
    });
    return { nodes, edges, rootId };
  };

  const renderGraph = (text) => {
    if (!text) return;
    const { nodes, edges, rootId } = parseInput(text);
    fullNodes.current = new DataSet(nodes);
    fullEdges.current = new DataSet(edges);
    currentNodes.current = new DataSet([fullNodes.current.get(rootId)]);
    currentEdges.current = new DataSet([]);
    expandedNodes.current.clear();

    if (networkRef.current) networkRef.current.destroy();
    networkRef.current = new Network(graphRef.current, { nodes: currentNodes.current, edges: currentEdges.current }, {
      layout: { hierarchical: { enabled: true, direction: "UD", sortMethod: "directed" } }
    });

    networkRef.current.on("click", (params) => {
      if (!params.nodes.length) return;
      const nodeId = params.nodes[0];
      const children = fullEdges.current.get({ filter: e => e.from === nodeId });
      if (!expandedNodes.current.has(nodeId)) {
        children.forEach(e => {
          if (!currentNodes.current.get(e.to)) currentNodes.current.add(fullNodes.current.get(e.to));
          currentEdges.current.add(e);
        });
        expandedNodes.current.add(nodeId);
      } else {
        const collapse = (id) => {
          const inner = fullEdges.current.get({ filter: e => e.from === id });
          inner.forEach(c => {
            currentNodes.current.remove(c.to);
            currentEdges.current.remove(c.id);
            collapse(c.to);
          });
        };
        collapse(nodeId);
        expandedNodes.current.delete(nodeId);
      }
    });
  };

  useEffect(() => { if (externalInput) renderGraph(externalInput); }, [externalInput]);

  return <div ref={graphRef} style={{ height: "450px", background: "#fdfdfd" }} />;
}