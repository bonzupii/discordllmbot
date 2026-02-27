/**
 * Graph Visualization Component
 * Displays the hypergraph as an interactive force-directed network
 * @module pages/Memory/GraphVisualization
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  Fade,
  Grid,
} from '@mui/material';
import {
  RestartAlt as ResetIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
} from '@mui/icons-material';
import ForceGraph2D from 'react-force-graph-2d';
import api from '@services/api';

interface GraphNode {
  id: number;
  nodeid: string;
  nodetype: string;
  name: string;
  metadata: Record<string, unknown>;
  val?: number; // For node sizing
  color?: string;
}

interface GraphLink {
  source: number | string;
  target: number | string;
  value: number; // For link thickness
  label: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphVisualizationProps {
  guildId: string;
  channelId: string;
}

const NODE_COLORS: Record<string, string> = {
  user: '#3b82f6',     // Blue
  channel: '#10b981',  // Green
  topic: '#f59e0b',    // Orange
  emotion: '#ef4444',  // Red
  event: '#8b5cf6',    // Purple
  concept: '#ec4899',  // Pink
};

export function GraphVisualization({ guildId, channelId }: GraphVisualizationProps) {
  const [rawData, setRawData] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const fgRef = useRef<any>();

  useEffect(() => {
    if (guildId) {
      loadGraphData();
    }
  }, [guildId, channelId]);

  const loadGraphData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hypergraph/${guildId}/graph`, {
        params: { channelId, limit: 300 }
      });
      setRawData(response.data);
    } catch (error) {
      console.error('Failed to load graph', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform raw data into graph format (nodes + links)
  const graphData = useMemo(() => {
    if (!rawData) return { nodes: [], links: [] };

    const nodes: GraphNode[] = rawData.nodes.map((n: any) => ({
      ...n,
      color: NODE_COLORS[n.nodetype] || '#6b7280',
      val: 1, // Default base size
    }));

    const links: GraphLink[] = [];
    const nodeSet = new Set(nodes.map(n => n.id));

    // Hyperedges connect multiple nodes. 
    // In a standard graph, we represent this as links between nodes sharing an edge.
    rawData.edges.forEach((edge: any) => {
      const edgeNodes = edge.connections
        .map((c: any) => c.nodeid)
        .filter((id: number) => nodeSet.has(id));

      // Create links between all pairs in the hyperedge (clique expansion)
      for (let i = 0; i < edgeNodes.length; i++) {
        for (let j = i + 1; j < edgeNodes.length; j++) {
          links.push({
            source: edgeNodes[i],
            target: edgeNodes[j],
            value: edge.urgency || 1,
            label: edge.summary,
          });
        }
        
        // Boost node value based on connections
        const node = nodes.find(n => n.id === edgeNodes[i]);
        if (node) node.val = (node.val || 1) + 0.5;
      }
    });

    // Filtering
    const filteredNodes = filterType === 'all' 
      ? nodes 
      : nodes.filter(n => n.nodetype === filterType);
    
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = links.filter(l => 
      filteredNodeIds.has(l.source as number) && filteredNodeIds.has(l.target as number)
    );

    return { nodes: filteredNodes, links: filteredLinks };
  }, [rawData, filterType]);

  const handleNodeClick = (node: any) => {
    // Center camera on node
    fgRef.current.centerAt(node.x, node.y, 1000);
    fgRef.current.zoom(2, 1000);
  };

  const handleReset = () => {
    fgRef.current.zoomToFit(400);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading interactive graph...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Controls */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            {Object.keys(NODE_COLORS).map(type => (
              <MenuItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}s</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Reset View">
            <IconButton onClick={handleReset} size="small"><ResetIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Zoom In">
            <IconButton onClick={() => fgRef.current.zoom(fgRef.current.zoom() * 1.5, 400)} size="small"><ZoomInIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton onClick={() => fgRef.current.zoom(fgRef.current.zoom() / 1.5, 400)} size="small"><ZoomOutIcon /></IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ ml: 'auto', flexWrap: 'wrap', gap: 1 }}>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <Chip
              key={type}
              label={type}
              size="small"
              sx={{
                bgcolor: color,
                color: 'white',
                opacity: filterType === 'all' || filterType === type ? 1 : 0.2,
                fontSize: '0.65rem'
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Graph Canvas */}
      <Paper
        variant="outlined"
        sx={{
          height: 600,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#0f172a', // Dark slate background for better contrast
          borderRadius: 2
        }}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeLabel={(node: any) => `
            <div style="background: #1e293b; color: white; padding: 8px; border-radius: 4px; border: 1px solid #334155;">
              <b style="color: ${node.color}">${node.name}</b><br/>
              <span style="font-size: 0.8em; opacity: 0.8">${node.nodetype}</span>
            </div>
          `}
          nodeRelSize={6}
          nodeVal={node => node.val || 1}
          nodeColor={node => node.color}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

            // Draw circle
            const r = Math.sqrt(node.val || 1) * 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label, node.x, node.y + r + fontSize + 2);
          }}
          nodeCanvasObjectMode={() => 'after'}
          linkColor={() => 'rgba(255, 255, 255, 0.15)'}
          linkWidth={link => Math.sqrt(link.value) * 0.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={d => d.value * 0.001}
          linkDirectionalParticleWidth={2}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          onEngineStop={() => {
            if (fgRef.current) {
              fgRef.current.zoomToFit(400, 100);
            }
          }}
        />

        {/* Legend Overlay */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            pointerEvents: 'none',
            bgcolor: 'rgba(15, 23, 42, 0.8)',
            p: 1.5,
            borderRadius: 1,
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 0.5 }}>
            • Scroll to zoom, drag to pan
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mb: 0.5 }}>
            • Drag nodes to pin them
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>
            • Click node to focus
          </Typography>
        </Box>

        {/* Overlay for node count */}
        <Box sx={{ position: 'absolute', top: 12, right: 12, pointerEvents: 'none' }}>
          <Chip 
            label={`${graphData.nodes.length} entities • ${graphData.links.length} relationships`}
            sx={{ bgcolor: 'rgba(15, 23, 42, 0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}
            size="small"
          />
        </Box>
      </Paper>

      {/* Detail Stats */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">Network Density</Typography>
            <Typography variant="h6">
              {graphData.nodes.length > 0 
                ? (graphData.links.length / (graphData.nodes.length * (graphData.nodes.length - 1) / 2 || 1)).toFixed(3)
                : '0.000'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">Avg. Connectivity</Typography>
            <Typography variant="h6">
              {graphData.nodes.length > 0 
                ? (graphData.links.length * 2 / graphData.nodes.length).toFixed(1)
                : '0.0'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">Most Central Type</Typography>
            <Typography variant="h6" sx={{ color: NODE_COLORS[filterType] || 'inherit' }}>
              {filterType === 'all' ? 'Mixed' : filterType.toUpperCase()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
