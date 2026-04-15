import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { ChartAdapterProps } from '../types';
import { formatCompact, isCurrencyKey } from '../utils';

// ── D3 adapter — chart types that need direct SVG control ─────────────────────
// Handles: treemap | sunburst | sankey | bump | force
//
// Each chart is a self-contained hook-based component that writes into an SVG ref.
// This keeps React in control of the DOM lifecycle while D3 owns the drawing.

// ── Shared: cleanup helper ─────────────────────────────────────────────────────
function useSvgRef(deps: any[]) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    return () => { if (ref.current) d3.select(ref.current).selectAll('*').remove(); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

// ── Treemap ───────────────────────────────────────────────────────────────────
// Data shape: [{ label, value, group? }]
// Canonical type: 'treemap'
function Treemap({ spec }: ChartAdapterProps) {
  const { data, xKey, dataKeys, colors, height, index } = spec;
  const colorOffset = (index ?? 0) % colors.length;
  const ref = useSvgRef([data, colors, height]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const el = ref.current;
    const width = el.clientWidth || 500;
    d3.select(el).selectAll('*').remove();

    const valueKey = dataKeys[0] || '';
    const groupKey = Object.keys(data[0]).find(k => k !== xKey && k !== valueKey) || xKey;

    // Build hierarchy
    const root = d3.hierarchy({
      name: 'root',
      children: data.map(d => ({
        name: String(d[xKey] ?? ''),
        value: typeof d[valueKey] === 'number' ? d[valueKey] : 0,
        group: String(d[groupKey] ?? ''),
        raw: d,
      })),
    }).sum(d => (d as any).value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<any>()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(2)
      .round(true)(root);

    const svg = d3.select(el);
    const isCurr = isCurrencyKey(valueKey);

    // Unique groups for color scale
    const groups = [...new Set(data.map(d => String(d[groupKey] ?? '')))];
    const colorScale = d3.scaleOrdinal<string>()
      .domain(groups)
      .range(colors.slice(colorOffset).concat(colors.slice(0, colorOffset)));

    const cell = svg.selectAll<SVGGElement, d3.HierarchyRectangularNode<any>>('g')
      .data(root.leaves() as d3.HierarchyRectangularNode<any>[])
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Rect
    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => colorScale(d.data.group))
      .attr('rx', 4)
      .attr('opacity', 0.88);

    // Label (only if cell is big enough)
    cell.filter(d => (d.x1 - d.x0) > 48 && (d.y1 - d.y0) > 28)
      .append('text')
      .attr('x', 6)
      .attr('y', 16)
      .attr('font-size', d => Math.min(13, Math.max(9, (d.x1 - d.x0) / 8)))
      .attr('font-weight', '600')
      .attr('fill', 'white')
      .attr('clip-path', _d => `inset(0 0 0 0 round 4px)`)
      .text(d => {
        const name = d.data.name;
        const maxLen = Math.floor((d.x1 - d.x0) / 7);
        return name.length > maxLen ? name.slice(0, maxLen - 1) + '…' : name;
      });

    // Value label
    cell.filter(d => (d.x1 - d.x0) > 48 && (d.y1 - d.y0) > 44)
      .append('text')
      .attr('x', 6)
      .attr('y', 30)
      .attr('font-size', 10)
      .attr('fill', 'rgba(255,255,255,0.8)')
      .text(d => (isCurr ? '$' : '') + formatCompact(d.data.value));

    // Tooltip via title
    cell.append('title')
      .text(d => `${d.data.name}\n${(isCurr ? '$' : '') + formatCompact(d.data.value)}`);

  }, [data, colors, height]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block' }} />;
}

// ── Sunburst ──────────────────────────────────────────────────────────────────
// Data shape: [{ name, parent, value }] (flat parent-child list) OR
//             [{ category, subcategory, value }] (2-level)
// Canonical type: 'sunburst'
function Sunburst({ spec }: ChartAdapterProps) {
  const { data, xKey, dataKeys, colors, height, index } = spec;
  const colorOffset = (index ?? 0) % colors.length;
  const ref = useSvgRef([data, colors, height]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const el = ref.current;
    const width = el.clientWidth || 500;
    const radius = Math.min(width, height) / 2;
    d3.select(el).selectAll('*').remove();

    const valueKey = dataKeys[0] || '';
    const keys = Object.keys(data[0]);
    // Try to find a 'parent' column, otherwise treat as 2-level: xKey=category, second string col=sub
    const hasParent = keys.includes('parent');
    const subKey = hasParent
      ? 'name'
      : (keys.find(k => k !== xKey && k !== valueKey && typeof data[0][k] === 'string') || xKey);

    // Build hierarchy from flat parent-child OR 2-level
    let root: d3.HierarchyNode<any>;
    if (hasParent) {
      const stratify = d3.stratify<any>()
        .id(d => d.name)
        .parentId(d => d.parent);
      root = stratify(data).sum(d => typeof d[valueKey] === 'number' ? d[valueKey] : 0);
    } else {
      // Group by xKey → subKey
      const grouped: Record<string, any[]> = {};
      data.forEach(d => {
        const cat = String(d[xKey] ?? 'Other');
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ name: String(d[subKey] ?? ''), value: typeof d[valueKey] === 'number' ? d[valueKey] : 0 });
      });
      root = d3.hierarchy({
        name: 'root',
        children: Object.entries(grouped).map(([cat, children]) => ({ name: cat, children })),
      }).sum((d: any) => d.value || 0);
    }

    d3.partition<any>().size([2 * Math.PI, radius])(root);

    const colorScale = d3.scaleOrdinal<string>()
      .domain(root.children?.map(d => d.data.name) || [])
      .range(colors.slice(colorOffset).concat(colors.slice(0, colorOffset)));

    const arc = d3.arc<d3.HierarchyRectangularNode<any>>()
      .startAngle(d => (d as any).x0)
      .endAngle(d => (d as any).x1)
      .padAngle(d => Math.min(((d as any).x1 - (d as any).x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => (d as any).y0)
      .outerRadius(d => Math.max((d as any).y0, (d as any).y1 - 2));

    const svg = d3.select(el)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    svg.append('g')
      .selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('fill', d => {
        let node: any = d;
        while (node.depth > 1) node = node.parent;
        return colorScale(node.data.name);
      })
      .attr('fill-opacity', d => Math.max(0, 1 - d.depth * 0.25))
      .attr('d', arc as any)
      .append('title')
      .text(d => `${d.ancestors().map((a: any) => a.data.name).reverse().slice(1).join(' › ')}\n${formatCompact(d.value || 0)}`);

    // Labels
    svg.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(root.descendants().filter(d => {
        const n = d as any;
        return d.depth && (n.y1 - n.y0) > 14 && (n.x1 - n.x0) * (n.y0 + n.y1) / 2 > 20;
      }))
      .join('text')
      .attr('transform', d => {
        const n = d as any;
        const x = (n.x0 + n.x1) / 2 * 180 / Math.PI;
        const y = (n.y0 + n.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr('dy', '0.35em')
      .attr('font-size', 10)
      .attr('fill', 'white')
      .attr('font-weight', '600')
      .text(d => {
        const n = d as any;
        const avail = (n.x1 - n.x0) * (n.y0 + n.y1) / 2;
        const name = d.data.name;
        return avail > 30 ? (name.length > 10 ? name.slice(0, 8) + '…' : name) : '';
      });

    // Center label
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', 13)
      .attr('font-weight', '700')
      .attr('fill', '#374151')
      .text(formatCompact(root.value || 0));

  }, [data, colors, height]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block' }} />;
}

// ── Sankey ────────────────────────────────────────────────────────────────────
// Data shape: [{ source, target, value }]
// Canonical type: 'sankey'
function Sankey({ spec }: ChartAdapterProps) {
  const { data, colors, height, index } = spec;
  const colorOffset = (index ?? 0) % colors.length;
  const ref = useSvgRef([data, colors, height]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const el = ref.current;
    const width = el.clientWidth || 500;
    d3.select(el).selectAll('*').remove();

    // Expect columns: source, target, value (or first 3 cols)
    const keys = Object.keys(data[0]);
    const srcKey = keys.find(k => /source|from|origin/i.test(k)) || keys[0];
    const tgtKey = keys.find(k => /target|to|dest/i.test(k) && k !== srcKey) || keys[1];
    const valKey = keys.find(k => typeof data[0][k] === 'number') || keys[2];

    // Build node list
    const nodeNames = [...new Set(data.flatMap(d => [String(d[srcKey] ?? ''), String(d[tgtKey] ?? '')]))];
    const nodeIndex = new Map(nodeNames.map((n, i) => [n, i]));

    const nodes = nodeNames.map(name => ({ name }));
    const links = data
      .filter(d => d[srcKey] != null && d[tgtKey] != null)
      .map(d => ({
        source: nodeIndex.get(String(d[srcKey])) ?? 0,
        target: nodeIndex.get(String(d[tgtKey])) ?? 0,
        value:  typeof d[valKey] === 'number' ? d[valKey] : 1,
      }));

    if (!links.length) return;

    // Manual Sankey layout (d3-sankey is a separate package; we implement a simple version)
    const pad = 24;
    const nodeW = 16;

    // Topological sort to assign x (column)
    const col: number[] = new Array(nodes.length).fill(0);
    let changed = true;
    while (changed) {
      changed = false;
      links.forEach(l => {
        if (col[l.target] <= col[l.source]) {
          col[l.target] = col[l.source] + 1;
          changed = true;
        }
      });
    }
    const maxCol = Math.max(...col);
    const colW = (width - pad * 2 - nodeW) / Math.max(maxCol, 1);

    // Group nodes by column, assign y
    const byCol: number[][] = Array.from({ length: maxCol + 1 }, () => []);
    nodes.forEach((_, i) => byCol[col[i]].push(i));

    const totalByCol: number[] = new Array(maxCol + 1).fill(0);
    links.forEach(l => { totalByCol[col[l.source]] += l.value; });

    const nodeY: number[] = new Array(nodes.length).fill(0);
    const nodeH: number[] = new Array(nodes.length).fill(0);
    const drawH = height - pad * 2;

    byCol.forEach((colNodes) => {
      const total = Math.max(1, colNodes.reduce((s, ni) => {
        const outVal = links.filter(l => l.source === ni).reduce((a, l) => a + l.value, 0);
        const inVal  = links.filter(l => l.target === ni).reduce((a, l) => a + l.value, 0);
        return s + Math.max(outVal, inVal, 1);
      }, 0));
      let y = pad;
      colNodes.forEach(ni => {
        const outVal = links.filter(l => l.source === ni).reduce((a, l) => a + l.value, 0);
        const inVal  = links.filter(l => l.target === ni).reduce((a, l) => a + l.value, 0);
        const h = Math.max(8, (Math.max(outVal, inVal, 1) / total) * drawH);
        nodeY[ni] = y;
        nodeH[ni] = h;
        y += h + 4;
      });
    });

    const nodeX = (ni: number) => pad + col[ni] * colW;

    const colorScale = d3.scaleOrdinal<string>()
      .domain(nodeNames)
      .range(colors.slice(colorOffset).concat(colors));

    const svg = d3.select(el);

    // Draw links
    const linkYOffset: Record<string, number> = {};
    const linkTargetOffset: Record<string, number> = {};
    nodes.forEach((_, ni) => { linkYOffset[ni] = nodeY[ni]; linkTargetOffset[ni] = nodeY[ni]; });

    links.forEach(l => {
      const x0 = nodeX(l.source) + nodeW;
      const x1 = nodeX(l.target);
      const total = Math.max(1, links.filter(ll => ll.source === l.source).reduce((s, ll) => s + ll.value, 0));
      const lh = (l.value / total) * nodeH[l.source];
      const y0 = linkYOffset[l.source];
      linkYOffset[l.source] += lh;

      const total2 = Math.max(1, links.filter(ll => ll.target === l.target).reduce((s, ll) => s + ll.value, 0));
      const lh2 = (l.value / total2) * nodeH[l.target];
      const y1 = linkTargetOffset[l.target];
      linkTargetOffset[l.target] += lh2;

      const path = d3.linkHorizontal()({ source: [x0, y0 + lh / 2], target: [x1, y1 + lh2 / 2] } as any);

      svg.append('path')
        .attr('d', path as string)
        .attr('stroke', colorScale(nodes[l.source].name))
        .attr('stroke-width', Math.max(1, (lh + lh2) / 2))
        .attr('stroke-opacity', 0.3)
        .attr('fill', 'none')
        .append('title')
        .text(`${nodes[l.source].name} → ${nodes[l.target].name}: ${formatCompact(l.value)}`);
    });

    // Draw nodes
    nodes.forEach((n, ni) => {
      const x = nodeX(ni);
      const y = nodeY[ni];
      const h = nodeH[ni];
      const fill = colorScale(n.name);

      svg.append('rect')
        .attr('x', x).attr('y', y)
        .attr('width', nodeW).attr('height', Math.max(4, h))
        .attr('fill', fill).attr('rx', 3);

      const isRight = col[ni] === maxCol;
      svg.append('text')
        .attr('x', isRight ? x - 5 : x + nodeW + 5)
        .attr('y', y + h / 2)
        .attr('text-anchor', isRight ? 'end' : 'start')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', '600')
        .attr('fill', '#374151')
        .text(n.name.length > 14 ? n.name.slice(0, 12) + '…' : n.name);
    });

  }, [data, colors, height]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block', overflow: 'visible' }} />;
}

// ── Bump / Ranking chart ──────────────────────────────────────────────────────
// Data shape: [{ period, entity, rank }] — shows how rankings change over time
// Canonical type: 'bump'
function BumpChart({ spec }: ChartAdapterProps) {
  const { data, xKey, dataKeys, colors, height, index } = spec;
  const colorOffset = (index ?? 0) % colors.length;
  const ref = useSvgRef([data, colors, height]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const el = ref.current;
    const width = el.clientWidth || 500;
    d3.select(el).selectAll('*').remove();

    const rankKey = dataKeys[0] || Object.keys(data[0]).find(k => /rank/i.test(k)) || dataKeys[0];
    const entityKey = Object.keys(data[0]).find(k => k !== xKey && k !== rankKey && typeof data[0][k] === 'string') || xKey;

    const periods  = [...new Set(data.map(d => String(d[xKey] ?? '')))];
    const entities = [...new Set(data.map(d => String(d[entityKey] ?? '')))];
    const maxRank  = d3.max(data, d => typeof d[rankKey] === 'number' ? d[rankKey] : 0) || entities.length;

    const pad = { top: 16, right: 90, bottom: 24, left: 40 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const xScale = d3.scalePoint<string>().domain(periods).range([0, innerW]).padding(0.3);
    const yScale = d3.scaleLinear().domain([1, maxRank]).range([0, innerH]);

    const colorScale = d3.scaleOrdinal<string>()
      .domain(entities)
      .range(colors.slice(colorOffset).concat(colors));

    const svg = d3.select(el)
      .append('g')
      .attr('transform', `translate(${pad.left},${pad.top})`);

    // X axis (periods)
    svg.append('g')
      .attr('transform', `translate(0,${innerH + 6})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('font-size', 11).attr('fill', '#64748b'));

    // Y axis (rank — inverted, 1 at top)
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(Math.min(maxRank, 8)).tickFormat(d => `#${d}`).tickSize(0))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('font-size', 10).attr('fill', '#94a3b8'));

    // Grid lines
    svg.append('g')
      .selectAll('line')
      .data(periods)
      .join('line')
      .attr('x1', d => xScale(d) ?? 0).attr('x2', d => xScale(d) ?? 0)
      .attr('y1', 0).attr('y2', innerH)
      .attr('stroke', '#f1f5f9').attr('stroke-width', 1);

    // Lines per entity
    const line = d3.line<{ period: string; rank: number }>()
      .x(d => xScale(d.period) ?? 0)
      .y(d => yScale(d.rank))
      .curve(d3.curveCatmullRom.alpha(0.5));

    entities.forEach(entity => {
      const entityData = periods
        .map(p => {
          const row = data.find(d => String(d[xKey]) === p && String(d[entityKey]) === entity);
          return row ? { period: p, rank: typeof row[rankKey] === 'number' ? row[rankKey] : null } : null;
        })
        .filter(Boolean) as { period: string; rank: number }[];

      if (entityData.length < 2) return;
      const col = colorScale(entity);

      svg.append('path')
        .datum(entityData)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', col)
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.85)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-linecap', 'round');

      // Dots
      svg.selectAll<SVGCircleElement, { period: string; rank: number }>(`circle.${entity.replace(/\W/g, '_')}`)
        .data(entityData)
        .join('circle')
        .attr('cx', d => xScale(d.period) ?? 0)
        .attr('cy', d => yScale(d.rank))
        .attr('r', 5)
        .attr('fill', col)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .append('title')
        .text(d => `${entity}: #${d.rank} (${d.period})`);

      // Right-side label
      const last = entityData[entityData.length - 1];
      svg.append('text')
        .attr('x', (xScale(last.period) ?? 0) + 10)
        .attr('y', yScale(last.rank))
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', '600')
        .attr('fill', col)
        .text(entity.length > 12 ? entity.slice(0, 10) + '…' : entity);
    });

  }, [data, colors, height]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block' }} />;
}

// ── Force-directed graph ──────────────────────────────────────────────────────
// Data shape: [{ source, target, value? }] (edge list)
// Canonical type: 'force'
function ForceGraph({ spec }: ChartAdapterProps) {
  const { data, colors, height, index } = spec;
  const colorOffset = (index ?? 0) % colors.length;
  const ref = useSvgRef([data, colors, height]);

  useEffect(() => {
    if (!ref.current || !data.length) return;
    const el = ref.current;
    const width = el.clientWidth || 500;
    d3.select(el).selectAll('*').remove();

    const keys = Object.keys(data[0]);
    const srcKey = keys.find(k => /source|from|origin/i.test(k)) || keys[0];
    const tgtKey = keys.find(k => /target|to|dest/i.test(k) && k !== srcKey) || keys[1];
    const valKey = keys.find(k => typeof data[0][k] === 'number') || '';

    const nodeNames = [...new Set(data.flatMap(d => [String(d[srcKey] ?? ''), String(d[tgtKey] ?? '')]))];
    const nodes = nodeNames.map(id => ({ id }));
    const links = data.map(d => ({
      source: String(d[srcKey] ?? ''),
      target: String(d[tgtKey] ?? ''),
      value:  valKey && typeof d[valKey] === 'number' ? d[valKey] : 1,
    }));

    // Degree map for node sizing
    const degree: Record<string, number> = {};
    links.forEach(l => {
      degree[l.source] = (degree[l.source] || 0) + 1;
      degree[l.target] = (degree[l.target] || 0) + 1;
    });

    const colorScale = d3.scaleOrdinal<string>()
      .domain(nodeNames)
      .range(colors.slice(colorOffset).concat(colors));

    const svg = d3.select(el);

    const sim = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20));

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', `arrow-${index ?? 0}`)
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 18).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#94a3b8');

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', d => Math.min(6, Math.max(1, Math.log(d.value + 1))))
      .attr('marker-end', `url(#arrow-${index ?? 0})`);

    const node = svg.append('g')
      .selectAll<SVGCircleElement, any>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d: any) => Math.max(8, Math.min(22, 6 + (degree[d.id] || 0) * 2.5)))
      .attr('fill', (d: any) => colorScale(d.id))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('cursor', 'grab')
      .call(
        d3.drag<SVGCircleElement, any>()
          .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    node.append('title').text((d: any) => `${d.id} (${degree[d.id] || 0} connections)`);

    const label = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('font-size', 10)
      .attr('font-weight', '600')
      .attr('fill', '#374151')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none')
      .text((d: any) => d.id.length > 10 ? d.id.slice(0, 8) + '…' : d.id);

    sim.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node
        .attr('cx', (d: any) => d.x = Math.max(20, Math.min(width - 20, d.x)))
        .attr('cy', (d: any) => d.y = Math.max(20, Math.min(height - 20, d.y)));
      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y - (Math.max(8, Math.min(22, 6 + (degree[d.id] || 0) * 2.5)) + 4));
    });

    // Stop simulation on unmount
    return () => { sim.stop(); };
  }, [data, colors, height]);

  return <svg ref={ref} width="100%" height={height} style={{ display: 'block' }} />;
}

// ── D3 Adapter router ─────────────────────────────────────────────────────────
export function D3Adapter({ spec }: ChartAdapterProps) {
  switch (spec.chart_type) {
    case 'treemap':  return <Treemap spec={spec} />;
    case 'sunburst': return <Sunburst spec={spec} />;
    case 'sankey':   return <Sankey spec={spec} />;
    case 'bump':     return <BumpChart spec={spec} />;
    case 'force':    return <ForceGraph spec={spec} />;
    default:
      return <div className="dp-empty">Unsupported D3 type: {spec.chart_type}</div>;
  }
}
