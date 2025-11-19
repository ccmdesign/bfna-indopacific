

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
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;');

    // Add X axis with even-year ticks only
    const minYear = d3.min(data, d => d.year.getFullYear())!;
    const maxYear = d3.max(data, d => d.year.getFullYear())!;
    const startYear = minYear % 2 === 0 ? minYear : minYear + 1; // Start from first even year
    const evenYears = d3.range(startYear, maxYear + 1, 2).map(year => new Date(year, 0, 1));
    
    const xAxis = d3.axisBottom(x)
      .tickValues(evenYears)
      .tickSizeOuter(0);
    svg.append('g')
      .attr('transform', `translate(0,${height - marginBottom})`)
      .call(xAxis)
      .call((g: any) => g.selectAll('text').attr('fill', '#fff').style('font-family', 'Encode Sans, sans-serif').style('font-size', '12px'))
      .call((g: any) => g.selectAll('line').attr('stroke', 'rgba(255, 255, 255, 0.2)'))
      .call((g: any) => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.2)'));

    // Add Y axis
    svg.append('g')
      .attr('transform', `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(5)) // limit to a few percentage ticks
      .call((g: any) => g.select('.domain').remove())
      .call((g: any) => g.selectAll('.tick line').clone()
          .attr('x2', width - marginLeft - marginRight)
          .attr('stroke-opacity', 0.1)
          .attr('stroke', '#fff'))
      .call((g: any) => g.selectAll('text').attr('fill', '#fff').style('font-family', 'Encode Sans, sans-serif').style('font-size', '12px'))
      .call((g: any) => g.append('text')
          .attr('x', -marginLeft)
          .attr('y', height - marginBottom + 30) // Position at bottom
          .attr('fill', '#fff')
          .attr('text-anchor', 'start')
          .style('font-family', 'Encode Sans, sans-serif')
          .style('font-size', '12px')
          .text('Renewable Energy Share (%)'));

    // Add gradient definitions for vertical year lines
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'yearLineGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'white')
      .attr('stop-opacity', 0.3);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'white')
      .attr('stop-opacity', 0);

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

    // Line generator
    const line = d3.line<any>()
      .defined(d => !isNaN(d))
      .x((d, i) => x(data[i].year))
      .y(d => y(d));

    // Draw lines
    const path = svg.append('g')
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .selectAll('path')
      .data(series)
      .join('path')
      .style('mix-blend-mode', 'normal')
      .attr('stroke', '#fff')
      .attr('d', (d: any) => line(d.values))
      .style('opacity', 1)
      .style('transition', 'opacity 0.3s ease')
      .on('mouseenter', function(event, d) {
        // Fade all other lines to 30% opacity
        path.style('opacity', 0.3);
        // Keep hovered line at full opacity
        d3.select(this).style('opacity', 1);
      })
      .on('mouseleave', function() {
        // Restore all lines to full opacity
        path.style('opacity', 1);
      });

    // Add Labels at the end of lines
    const labels = svg.append('g')
      .selectAll('text')
      .data(series)
      .join('text')
      .attr('x', (d: any) => width - marginRight + 5) // Position label within right margin space
      .attr('y', (d: any) => y(d.values[d.values.length - 1])) // Use numeric last value for vertical position
      .attr('dy', '0') // No vertical offset
      .attr('dominant-baseline', 'middle') // Center text vertically on the point
      .attr('text-anchor', 'start') // Align text to the left
      .attr('fill', '#fff')
      .style('font-family', 'Encode Sans, sans-serif')
      .style('font-size', '12px')
      .style('font-weight', '300')
      .style('cursor', 'pointer') // Show pointer cursor on hover
      .text((d: any) => d.name)
      .on('mouseenter', function(event, d) {
        // Fade all lines to 30% opacity
        path.style('opacity', 0.3);
        // Find and highlight the corresponding line
        path.filter((pathData: any) => pathData.name === d.name)
          .style('opacity', 1);
      })
      .on('mouseleave', function() {
        // Restore all lines to full opacity
        path.style('opacity', 1);
      });

    // Hover interaction
    const hoverGroup = svg.append('g')
      .style('display', 'none');

    hoverGroup.append('line')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
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