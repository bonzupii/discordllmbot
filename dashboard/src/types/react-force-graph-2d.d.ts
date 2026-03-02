/**
 * Type declarations for react-force-graph-2d
 */

declare module 'react-force-graph-2d' {
  import { FC, RefObject } from 'react';

  interface ForceGraphMethods {
    centerAt(x?: number, y?: number, durationMs?: number): this;
    zoom(zoom?: number, durationMs?: number): this;
    zoomToFit(durationMs?: number, padding?: number, nodeFilter?: (node: any) => boolean): this;
    pauseAnimation(): this;
    resumeAnimation(): this;
    width(): number;
    width(width: number): this;
    height(): number;
    height(height: number): this;
    graphData(): { nodes: any[]; links: any[] };
    graphData(data: { nodes: any[]; links: any[] }): this;
    onNodeClick(callback: (node: any, event: MouseEvent) => void): this;
    onNodeDrag(callback: (node: any) => void): this;
    onNodeDragEnd(callback: (node: any) => void): this;
    onBackgroundClick(callback: (event: MouseEvent) => void): this;
    onEngineStop(callback: () => void): this;
  }

  interface ForceGraphProps {
    width?: number;
    height?: number;
    graphData?: { nodes: any[]; links: any[] };
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeVal?: string | ((node: any) => number);
    nodeRelSize?: number;
    nodeCanvasObject?: (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => void;
    nodeCanvasObjectMode?: string | ((node: any) => string);
    linkLabel?: string | ((link: any) => string);
    linkColor?: string | ((link: any) => string);
    linkWidth?: string | number | ((link: any) => number);
    linkDirectionalArrowLength?: number | ((link: any) => number);
    linkDirectionalArrowColor?: string | ((link: any) => string);
    linkDirectionalArrowRelPos?: number | ((link: any) => number);
    linkCurvature?: number | ((link: any) => number);
    linkDirectionalParticles?: number | ((link: any) => number);
    linkDirectionalParticleSpeed?: number | ((link: any) => number);
    linkDirectionalParticleColor?: string | ((link: any) => string);
    linkDirectionalParticleWidth?: number | ((link: any) => number);
    backgroundColor?: string;
    onNodeClick?: (node: any, event: MouseEvent) => void;
    onNodeDrag?: (node: any) => void;
    onNodeDragEnd?: (node: any) => void;
    onNodeHover?: (node: any | null) => void;
    onLinkHover?: (link: any | null) => void;
    onBackgroundClick?: (event: MouseEvent) => void;
    onEngineStop?: () => void;
    cooldownTicks?: number;
    warmupTicks?: number;
    d3VelocityDecay?: number;
    d3AlphaDecay?: number;
    d3AlphaMin?: number;
    pauseAnimation?: () => void;
    resumeAnimation?: () => void;
    centerAt?: (x?: number, y?: number, durationMs?: number) => void;
    zoom?: (zoom?: number, durationMs?: number) => void;
    zoomToFit?: (durationMs?: number, padding?: number, nodeFilter?: (node: any) => boolean) => void;
    getGraphBbox?: () => { x: [number, number]; y: [number, number] };
    ref?: RefObject<ForceGraphMethods>;
  }

  const ForceGraph2D: FC<ForceGraphProps>;
  export default ForceGraph2D;
  export { ForceGraphMethods, ForceGraphProps };
}
