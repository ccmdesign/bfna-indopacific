#!/usr/bin/env python3
"""
Extract polygon JSON from strait SVG files.
Each SVG has layers with different classes:
  - Yellow fill (#fcee21) + red stroke (#cc0026) = boundary
  - Green stroke (#00ee19), no fill = entry/exit edges
  - Blue stroke (#2c3eff), no fill = additional edges or islands

Output format matches data/straits/{id}-polygon.json:
{
  "viewBox": [0, 0, 1080, 1080],
  "boundary": [[x, y], ...],
  "islands": [[[x, y], ...], ...],
  "entryEdge": [[x, y], ...],
  "exitEdge": [[x, y], ...]
}
"""

import xml.etree.ElementTree as ET
import json
import re
import sys
from svgpathtools import parse_path

SAMPLE_INTERVAL = 2  # px between samples along curves


def path_to_points(d_attr, sample_interval=SAMPLE_INTERVAL):
    """Convert SVG path d attribute to array of [x, y] points."""
    if not d_attr:
        return []
    path = parse_path(d_attr)
    points = []
    for seg in path:
        length = seg.length()
        if length == 0:
            start = seg.start
            points.append([round(start.real, 1), round(start.imag, 1)])
            continue
        n_samples = max(1, int(length / sample_interval))
        for i in range(n_samples):
            t = i / n_samples
            pt = seg.point(t)
            points.append([round(pt.real, 1), round(pt.imag, 1)])
    # Add final point
    if path:
        end = path[-1].end
        points.append([round(end.real, 1), round(end.imag, 1)])

    # Deduplicate consecutive identical points
    deduped = [points[0]]
    for p in points[1:]:
        if p != deduped[-1]:
            deduped.append(p)
    return deduped


def polyline_to_points(points_attr):
    """Convert SVG polyline points attribute to array of [x, y]."""
    nums = re.findall(r'[-+]?[0-9]*\.?[0-9]+', points_attr)
    points = []
    for i in range(0, len(nums), 2):
        points.append([round(float(nums[i]), 1), round(float(nums[i + 1]), 1)])
    return points


def get_elements(svg_path):
    """Parse SVG and return classified elements."""
    tree = ET.parse(svg_path)
    root = tree.getroot()
    ns = 'http://www.w3.org/2000/svg'

    # Get style text to map classes to colors
    style_text = ''
    for elem in root.iter():
        tag = elem.tag.replace(f'{{{ns}}}', '')
        if tag == 'style':
            style_text = elem.text or ''

    # Parse styles to determine which class is boundary vs edges
    # boundary = yellow fill (#fcee21) + red stroke (#cc0026)
    # entry/exit = green stroke (#00ee19), no fill
    # islands/other = blue stroke (#2c3eff), no fill

    elements = []
    for elem in root.iter():
        tag = elem.tag.replace(f'{{{ns}}}', '')
        if tag not in ('path', 'polyline', 'line', 'polygon'):
            continue
        cls = elem.get('class', '')
        eid = elem.get('id', '')
        d = elem.get('d', '')
        pts_attr = elem.get('points', '')

        if tag == 'polyline' and pts_attr:
            points = polyline_to_points(pts_attr)
        elif tag == 'line':
            x1 = float(elem.get('x1', 0))
            y1 = float(elem.get('y1', 0))
            x2 = float(elem.get('x2', 0))
            y2 = float(elem.get('y2', 0))
            points = [[round(x1, 1), round(y1, 1)], [round(x2, 1), round(y2, 1)]]
        elif d:
            points = path_to_points(d)
        else:
            continue

        elements.append({
            'tag': tag,
            'class': cls,
            'id': eid,
            'points': points,
            'n_points': len(points),
        })

    return elements, style_text


def classify_elements(elements, style_text):
    """Classify elements into boundary, islands, entry, exit based on style."""
    # Parse CSS rules in order, accumulating properties per class
    class_props = {}
    for match in re.finditer(r'((?:\.\w+,?\s*)+)\{([^}]+)\}', style_text):
        selectors = match.group(1)
        props = match.group(2)
        fill = re.search(r'fill:\s*([^;\n}]+)', props)
        stroke = re.search(r'stroke:\s*([^;\n}]+)', props)
        for sel_match in re.finditer(r'\.(\w+)', selectors):
            cls_name = sel_match.group(1)
            if cls_name not in class_props:
                class_props[cls_name] = {}
            # Later rules override earlier ones (CSS cascade)
            if fill:
                class_props[cls_name]['fill'] = fill.group(1).strip()
            if stroke:
                class_props[cls_name]['stroke'] = stroke.group(1).strip()

    boundary = None
    islands = []
    green_edges = []
    blue_edges = []

    for elem in elements:
        cls = elem['class'].strip()
        props = class_props.get(cls, {})
        fill = props.get('fill', None)
        stroke = props.get('stroke', None)
        is_boundary_class = fill == '#fcee21' and stroke == '#cc0026'
        is_green = stroke == '#00ee19' and (fill == 'none' or fill is None)
        is_blue = stroke == '#2c3eff' and (fill == 'none' or fill is None)

        # Also check: yellow fill elements with green stroke are islands
        is_island = fill == '#fcee21' and stroke == '#00ee19'

        if is_boundary_class:
            if boundary is None or elem['n_points'] > boundary['n_points']:
                boundary = elem
        elif is_island:
            islands.append(elem)
        elif is_green:
            green_edges.append(elem)
        elif is_blue:
            blue_edges.append(elem)
        else:
            # Fallback: largest yellow-filled path is boundary
            if fill == '#fcee21' and (boundary is None or elem['n_points'] > boundary['n_points']):
                boundary = elem

    return boundary, islands, green_edges, blue_edges


# Per-strait configuration for how to assign edges
STRAIT_CONFIG = {
    'bab-el-mandeb': {
        'description': 'Entry from NW coast (Africa), exit to SE (ocean)',
        # Entry = the st1 path (coastline), Exit = the st1 polyline (canvas edge)
        'entry_selector': 'path',  # The path with green stroke
        'exit_selector': 'polyline',  # The polyline with green stroke
    },
    'malacca': {
        'description': 'Entry from NW (Indian Ocean), exit to SE (South China Sea)',
        # Green = entry (NW), Blue = exit (SE)
        'entry_color': 'green',
        'exit_color': 'blue',
    },
    'taiwan': {
        'description': 'Entry from SW, exit to NE through Taiwan Strait',
        # Multiple green paths - need to identify which is entry vs exit
    },
    'lombok': {
        'description': 'Entry from N (Java Sea), exit to S (Indian Ocean)',
        # Green = entry, Blue = exit/islands
    },
    'luzon': {
        'description': 'Entry from W (South China Sea), exit to E (Pacific)',
    },
}


def process_strait(name):
    svg_path = f'public/assets/straits/{name}.svg'
    print(f'\nProcessing {name}...')

    elements, style_text = get_elements(svg_path)
    boundary, islands, green_edges, blue_edges = classify_elements(elements, style_text)

    if not boundary:
        print(f'  ERROR: No boundary found for {name}')
        return None

    print(f'  Boundary: {boundary["n_points"]} points')
    print(f'  Islands: {len(islands)} ({", ".join(str(i["n_points"]) + " pts" for i in islands)})')
    print(f'  Green edges: {len(green_edges)} ({", ".join(str(e["n_points"]) + " pts" for e in green_edges)})')
    print(f'  Blue edges: {len(blue_edges)} ({", ".join(str(e["n_points"]) + " pts" for e in blue_edges)})')

    # Assign entry and exit edges based on strait
    entry_edge = []
    exit_edge = []

    if name == 'bab-el-mandeb':
        # Green path = coastline entry, green polyline = canvas-edge exit
        for e in green_edges:
            if e['tag'] == 'polyline':
                exit_edge = e['points']
            else:
                entry_edge = e['points']
    elif name == 'malacca':
        # Combine green edges for entry, blue edges for exit
        # Pick the two longest green paths as entry segments
        green_sorted = sorted(green_edges, key=lambda e: e['n_points'], reverse=True)
        blue_sorted = sorted(blue_edges, key=lambda e: e['n_points'], reverse=True)
        if green_sorted:
            entry_edge = green_sorted[0]['points']
        if blue_sorted:
            exit_edge = blue_sorted[0]['points']
    elif name == 'taiwan':
        # Sort green edges by size, largest two are entry and exit
        green_sorted = sorted(green_edges, key=lambda e: e['n_points'], reverse=True)
        if len(green_sorted) >= 2:
            # The longer one (coastline) is entry, shorter is exit
            entry_edge = green_sorted[0]['points']
            exit_edge = green_sorted[1]['points']
        elif len(green_sorted) == 1:
            entry_edge = green_sorted[0]['points']
    elif name == 'lombok':
        # Green = entry (north), Blue = exit edges, st1 paths may be islands
        green_sorted = sorted(green_edges, key=lambda e: e['n_points'], reverse=True)
        blue_sorted = sorted(blue_edges, key=lambda e: e['n_points'], reverse=True)
        if green_sorted:
            entry_edge = green_sorted[0]['points']
        # For blue: the longest path that looks like an edge (not island-shaped)
        if blue_sorted:
            exit_edge = blue_sorted[0]['points']
        # Remaining blue paths might be islands
        for be in blue_sorted[1:]:
            if be['n_points'] > 20:
                islands.append(be)
    elif name == 'luzon':
        green_sorted = sorted(green_edges, key=lambda e: e['n_points'], reverse=True)
        if len(green_sorted) >= 1:
            entry_edge = green_sorted[0]['points']
        # Check for blue edges
        if blue_edges:
            exit_edge = blue_edges[0]['points']
        elif len(green_sorted) >= 2:
            exit_edge = green_sorted[1]['points']

    result = {
        'viewBox': [0, 0, 1080, 1080],
        'boundary': boundary['points'],
        'islands': [i['points'] for i in islands],
        'entryEdge': entry_edge,
        'exitEdge': exit_edge,
    }

    print(f'  Entry edge: {len(entry_edge)} points')
    print(f'  Exit edge: {len(exit_edge)} points')

    return result


def main():
    straits = ['bab-el-mandeb', 'malacca', 'taiwan', 'lombok', 'luzon']

    if len(sys.argv) > 1:
        straits = sys.argv[1:]

    for name in straits:
        result = process_strait(name)
        if result:
            out_path = f'data/straits/{name}-polygon.json'
            with open(out_path, 'w') as f:
                json.dump(result, f, indent=2)
            print(f'  Wrote {out_path}')


if __name__ == '__main__':
    main()
