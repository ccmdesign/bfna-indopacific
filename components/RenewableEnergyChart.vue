

<template>
  <div class="chart-wrapper">
    <div ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<style>
.chart-wrapper {
  width: 100%;
  height: 100%; /* Fill container */
  background: transparent;
  color: white;
  position: relative;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.chart-svg {
  max-width: 100%;
  height: auto;
  overflow: visible;
  font: 16px sans-serif;
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9); /* Dark background */
  color: white;
  padding: 10px;
  border-radius: 4px;
  pointer-events: none;
  font-size: 12px;
  font-family: 'Encode Sans', sans-serif;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  border: 1px solid #333;
  min-width: 150px;
}

/* Axis styles */
.axis-label {
  fill: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  font-family: 'Encode Sans', sans-serif;
}

.axis-x .axis-label {
  font-size: 16px;
}


.axis-y .axis-label {
  font-size: 16px;
}

.line-label {
  fill: red;
}

.axis-line {
  stroke-width: 1;
  stroke-dasharray: 1 4;
}

.axis-domain {
  stroke-width: 1;
  stroke: rgba(255, 255, 255, 1);
  opacity: 0.2;
}

.axis-grid-line {
  stroke: rgba(255, 255, 255, 0.2);
  stroke-dasharray: 1 4;
}

.axis-y .tick line:first-child {
  stroke: transparent;
}

/* Chart title */
.chart-title {
  fill: #fff;
  font-family: 'Encode Sans', sans-serif;
  font-size: 16px;
}

/* Chart lines */
.chart-lines {
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.chart-line {
  mix-blend-mode: normal;
  stroke: rgba(255, 255, 255, 0.8);
  opacity: 1;
  transition: opacity 0.3s ease;
}

.chart-line-dimmed {
  opacity: 0.3;
}

/* Line labels */
.line-label {
  fill: #fff;
  font-family: 'Encode Sans', sans-serif;
  font-size: 16px;
  font-weight: 300;
  cursor: pointer;
}

/* Hover line */
.hover-line {
  stroke: #fff;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}
</style>

<script setup lang="ts">
import * as d3 from 'd3';
import { onMounted, ref, onUnmounted } from 'vue';

const chartContainer = ref<HTMLElement | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

onMounted(async () => {
  if (!chartContainer.value) return;

  // Load and parse data
  const rawData = await d3.csv('/dataset.csv');
  
  // Transform data
  const columns = rawData.columns.slice(1);
  const data = rawData.map(d => {
    const year = new Date(+d.Year!, 0, 1);
    const obj: any = { year };
    columns.forEach(col => {
      obj[col] = +d[col]!;
    });
    return obj;
  });

  const series = columns.map(name => ({
    name,
    values: data.map(d => d[name])
  }));

  // Chart dimensions
  const marginTop = 0;
  const marginRight = 0; // increased to provide more space for labels
  const marginBottom = 0;
  const marginLeft = 0;
  
  const draw = () => {
    if (!chartContainer.value) return;
    chartContainer.value.innerHTML = '';

    const width = chartContainer.value.clientWidth;
    const height = 600;

    if (width === 0) {
        setTimeout(draw, 100);
        return;
    }

    // Scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.year) as [Date, Date])
      .range([marginLeft, width - marginRight]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s.values)) as number]).nice()
      .range([height - marginBottom, marginTop]);

    // SVG container
    const svg = d3.select(chartContainer.value)
      .append('svg')
      .attr('class', 'chart-svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Add X axis with even-year ticks only
    const minYear = d3.min(data, d => d.year.getFullYear())!;
    const maxYear = d3.max(data, d => d.year.getFullYear())!;
    const startYear = minYear % 2 === 0 ? minYear : minYear + 1; // Start from first even year
    const evenYears = d3.range(startYear, maxYear + 1, 2).map(year => new Date(year, 0, 1));
    
    const xAxis = d3.axisBottom(x)
      .tickValues(evenYears)
      .tickSize(0) // Remove default tick size
      .tickSizeOuter(0);
    
    const xAxisGroup = svg.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(xAxis)
      .call((g: any) => g.selectAll('text')
        .attr('class', 'axis-label')
        .attr('dy', '1.25em')) // Move labels 4px down (adding to default offset)
      .call((g: any) => g.select('.domain').attr('class', 'axis-domain'));
    
    // Add custom vertical tick lines that span the full chart height
    xAxisGroup.selectAll('.tick')
      .append('line')
      .attr('class', 'axis-line')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', -(height - marginBottom - marginTop)) // Extend to top
      .attr('y2', 0)
      .attr('stroke', 'url(#axisLineGradient)')
      .attr('stroke-dasharray', '1 4');

    // Add Y axis with % formatting
    svg.append('g')
      .attr('class', 'axis axis-y')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat((d: any) => `${d}%`)) // Add % to tick labels
      .call((g: any) => g.select('.domain').remove())
      .call((g: any) => g.selectAll('.tick line').clone()
          .attr('class', 'axis-grid-line')
          .attr('x2', width - marginLeft - marginRight))
      .call((g: any) => g.selectAll('text').attr('class', 'axis-label'));

    // Add chart title at the top center
    svg.append('text')
      .attr('class', 'chart-title')
      .attr('x', width / 2)
      .attr('y', marginTop + 20)
      .attr('text-anchor', 'middle')
      .text('Renewable Energy Share');

    // Add vertical gradient lines for each year
    const allYears = data.map(d => d.year);
    svg.append('g')
      .selectAll('line.year-line')
      .data(allYears)
      .join('line')
      .attr('class', 'year-line')
      .attr('x1', d => x(d))
      .attr('x2', d => x(d))
      .attr('y1', marginTop)
      .attr('y2', height - marginBottom)
      .attr('stroke', 'url(#yearLineGradient)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4');

    // Custom Color Palette - Refined for better visibility on dark background
    const colorMap: Record<string, string> = {
      'European Union': '#00E5FF', // Cyan Accent
      'Australia': '#FF4081', // Pink Accent
      'China': '#FF9100', // Orange Accent
      'United States': '#D500F9', // Purple Accent
      'Japan': '#2979FF', // Blue Accent
      'India': '#FFEA00', // Yellow Accent
      'Indonesia': '#00E676', // Green Accent
      'Thailand': '#FF1744', // Red Accent
      'Taiwan': '#18FFFF', // Light Cyan Accent
      'South Korea': '#651FFF' // Deep Purple Accent
    };
    
    const color = (name: string) => colorMap[name] || '#ccc';

    // Line generator with smooth curves
    const line = d3.line<any>()
      .defined(d => !isNaN(d))
      .x((d, i) => x(data[i].year))
      .y(d => y(d))
      .curve(d3.curveCatmullRom); // Makes lines smooth with bezier curves

    // Draw invisible hover paths with 6px width for easier interaction
    const hoverPaths = svg.append('g')
      .attr('class', 'chart-hover-areas')
      .attr('fill', 'none')
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('d', (d: any) => line(d.values))
      .attr('stroke', 'transparent')
      .attr('stroke-width', 6)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer');

    // Draw visible lines
    const path = svg.append('g')
      .attr('class', 'chart-lines')
      .attr('fill', 'none')
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('class', 'chart-line')
      .attr('d', (d: any) => line(d.values))
      .style('pointer-events', 'none'); // Disable pointer events on visible lines

    // Add hover events to invisible hover paths
    hoverPaths
      .on('mouseenter', function(event, d) {
        // Fade all other lines to 30% opacity
        path.classed('chart-line-dimmed', true);
        // Keep hovered line at full opacity
        path.filter((pathData: any) => pathData.name === d.name)
          .classed('chart-line-dimmed', false);
      })
      .on('mouseleave', function() {
        // Restore all lines to full opacity
        path.classed('chart-line-dimmed', false);
      });

    // Add Labels at the end of lines
    const labels = svg.append('g')
      .attr('class', 'line-labels')
      .selectAll('text')
      .data(series)
      .join('text')
      .attr('class', 'line-label')
      .attr('x', (d: any) => width - marginRight + 9) // Position label 9px to the right (was 5px)
      .attr('y', (d: any) => y(d.values[d.values.length - 1])) // Use numeric last value for vertical position
      .attr('dy', '0') // No vertical offset
      .attr('dominant-baseline', 'middle') // Center text vertically on the point
      .attr('text-anchor', 'start') // Align text to the left
      .text((d: any) => d.name)
      .on('mouseenter', function(event, d) {
        // Fade all lines to 30% opacity
        path.classed('chart-line-dimmed', true);
        // Find and highlight the corresponding line
        path.filter((pathData: any) => pathData.name === d.name)
          .classed('chart-line-dimmed', false);
      })
      .on('mouseleave', function() {
        // Restore all lines to full opacity
        path.classed('chart-line-dimmed', false);
      });

    // Collision detection and resolution for labels
    const minSpacing = 8; // Minimum spacing between labels in pixels
    const labelHeight = 16; // Font size of labels
    
    // Get label positions and bounding boxes
    const labelData = labels.nodes().map((node: any, i: number) => {
      const bbox = node.getBBox();
      if (!bbox) return null;
      const yAttr = node.getAttribute('y');
      if (!yAttr) return null;
      const seriesItem = series[i];
      if (!seriesItem) return null;
      
      return {
        node,
        index: i,
        y: parseFloat(yAttr),
        originalY: parseFloat(yAttr),
        height: bbox.height,
        name: seriesItem.name
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by y position
    labelData.sort((a, b) => a.y - b.y);

    // Iterative collision resolution
    const maxIterations = 10;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let hadCollision = false;

      for (let i = 0; i < labelData.length - 1; i++) {
        const current = labelData[i];
        const next = labelData[i + 1];
        
        if (!current || !next) continue;
        
        const currentBottom = current.y + current.height / 2;
        const nextTop = next.y - next.height / 2;
        const gap = nextTop - currentBottom;

        if (gap < minSpacing) {
          hadCollision = true;
          // Calculate how much we need to move them apart
          const overlap = minSpacing - gap;
          const moveAmount = overlap / 2;

          // Move current up and next down
          current.y -= moveAmount;
          next.y += moveAmount;
        }
      }

      // If no collisions detected, we're done
      if (!hadCollision) break;

      // Re-sort after adjustments
      labelData.sort((a, b) => a.y - b.y);
    }

    // Apply adjusted positions
    labelData.forEach(item => {
      if (item && item.node) {
        d3.select(item.node).attr('y', item.y);
      }
    });

    // Hover interaction
    const hoverGroup = svg.append('g')
      .attr('class', 'hover-group')
      .style('display', 'none');

    hoverGroup.append('line')
      .attr('class', 'hover-line')
      .attr('y1', marginTop)
      .attr('y2', height - marginBottom);

    const tooltip = d3.select(chartContainer.value)
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    svg.on('pointerenter', () => {
        hoverGroup.style('display', null);
        tooltip.style('opacity', 1);
      })
      .on('pointerleave', () => {
        hoverGroup.style('display', 'none');
        tooltip.style('opacity', 0);
        path.attr('stroke-width', 2);
      })
      .on('pointermove', (event) => {
        const [xm] = d3.pointer(event);
        const i = d3.bisectCenter(data.map(d => x(d.year)), xm);
        
        hoverGroup.attr('transform', `translate(${x(data[i].year)},0)`);

        const sortedSeries = series.slice().sort((a, b) => b.values[i] - a.values[i]);
        
        let tooltipHtml = `<strong>${data[i].year.getFullYear()}</strong><br>`;
        sortedSeries.forEach(s => {
            tooltipHtml += `<div style="display: flex; align-items: center; gap: 5px;">
              <span style="width: 10px; height: 10px; background-color: ${color(s.name)}; display: inline-block;"></span>
              <span>${s.name}: ${s.values[i]}%</span>
            </div>`;
        });

        const [xPos, yPos] = d3.pointer(event, chartContainer.value);
        
        // Prevent tooltip from going off screen
        const tooltipWidth = 200;
        let left = xPos + 15;
        if (left + tooltipWidth > width) {
            left = xPos - tooltipWidth - 15;
        }

        tooltip
          .html(tooltipHtml)
          .style('left', `${left}px`)
          .style('top', `${yPos}px`);
      });
  };

  draw();

  resizeObserver.value = new ResizeObserver(() => {
    draw();
  });
  resizeObserver.value.observe(chartContainer.value);
});

onUnmounted(() => {
  if (resizeObserver.value && chartContainer.value) {
    resizeObserver.value.unobserve(chartContainer.value);
  }
});
</script>