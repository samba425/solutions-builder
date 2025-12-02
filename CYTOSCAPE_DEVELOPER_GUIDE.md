# Cytoscape Canvas - Complete Developer Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [Core Features](#core-features)
6. [Component Structure](#component-structure)
7. [Working with Cytoscape.js](#working-with-cytoscapejs)
8. [Styling & Theming](#styling--theming)
9. [Event Handling](#event-handling)
10. [Extensions](#extensions)
11. [Export & Import](#export--import)
12. [Grouping System](#grouping-system)
13. [Layout Algorithms](#layout-algorithms)
14. [Sample Architectures](#sample-architectures)
15. [Troubleshooting](#troubleshooting)
16. [API Reference](#api-reference)
17. [Best Practices](#best-practices)

---

## Overview

The Cytoscape Canvas is an advanced architecture diagram builder built with **Cytoscape.js**, a powerful graph theory library for visualization and analysis. It provides a professional, interactive canvas for designing cloud architecture solutions with drag-and-drop components, connections, grouping, and export capabilities.

### Key Capabilities
- ✅ **Interactive Node Manipulation** - Drag, drop, select, and customize nodes
- ✅ **Connection Drawing** - Visual edge creation with edgehandles extension
- ✅ **Grouping System** - Create compound nodes with parent-child relationships
- ✅ **Auto-Arrange Layouts** - Smart positioning with COSE algorithm
- ✅ **Export/Import** - JSON format with full data preservation
- ✅ **PNG Export** - Download diagrams as images
- ✅ **Zoom & Pan** - Enhanced navigation (0.1x to 5x zoom)
- ✅ **Component Library** - 50+ cloud service components from AWS, GCP, Azure, Cisco
- ✅ **Hover Tooltips** - Node details display on hover
- ✅ **Responsive Design** - Works on desktop and tablet

---

## Architecture

### Component Hierarchy
```
app/
├── components/
│   └── cytoscape-canvas/
│       ├── cytoscape-canvas.component.ts      # Main component logic
│       ├── cytoscape-canvas.component.html    # Template with toolbar & canvas
│       └── cytoscape-canvas.component.css     # Scoped styles
├── data/
│   └── components-data.ts                     # Component library definitions
└── models/
    └── component.model.ts                     # TypeScript interfaces
```

### Data Flow
```
Component Library → User Selection → Canvas (Cytoscape.js) → Export/Save
                                            ↓
                                    Event Handlers
                                            ↓
                            Updates (Position, Style, Connections)
```

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Cytoscape.js** | 3.33.1 | Core graph visualization library |
| **cytoscape-edgehandles** | 4.0.1 | Drawing connections between nodes |
| **cytoscape-autopan-on-drag** | 2.2.1 | Auto-pan when dragging near edges |
| **Angular** | 21.0.0 | Component framework |
| **TypeScript** | 5.6.2 | Type-safe development |
| **Font Awesome** | 6.x | Icons for components |

### Why Cytoscape.js?

**Cytoscape.js** was chosen over other canvas libraries because:
1. **Compound Nodes** - Native support for grouping (parent-child relationships)
2. **Layout Algorithms** - Multiple built-in layouts (COSE, breadthfirst, grid, etc.)
3. **Graph Theory** - Advanced algorithms for network analysis
4. **Extension Ecosystem** - Rich plugins (edgehandles, autopan, etc.)
5. **Performance** - Handles thousands of nodes efficiently
6. **Event System** - Comprehensive event handling for interactions
7. **Styling** - CSS-like styling with selectors
8. **Export** - PNG, JSON, and other format support

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install cytoscape@3.33.1
npm install cytoscape-edgehandles@4.0.1
npm install cytoscape-autopan-on-drag@2.2.1
npm install @types/cytoscape --save-dev
```

### 2. Import in Component

```typescript
import Cytoscape, { Core, EdgeSingular, NodeSingular } from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import autopanOnDrag from 'cytoscape-autopan-on-drag';

// Register extensions
Cytoscape.use(edgehandles);
Cytoscape.use(autopanOnDrag);
```

### 3. Initialize Canvas

```typescript
ngAfterViewInit() {
  this.cy = Cytoscape({
    container: document.getElementById('cy'),
    style: this.getCytoscapeStyles(),
    layout: { name: 'preset' },
    minZoom: 0.1,
    maxZoom: 5,
    wheelSensitivity: 0.15
  });
  
  this.initializeExtensions();
  this.attachEventHandlers();
}
```

---

## Core Features

### 1. Component Library

**Location**: `src/app/data/components-data.ts`

Each component has:
```typescript
export interface ComponentItem {
  id: string;              // Unique identifier
  name: string;            // Display name
  category: string;        // Category (Infrastructure, AI/ML, etc.)
  icon: string;            // Font Awesome class (fab fa-aws)
  color: string;           // Brand color (#FF9900)
  description: string;     // Brief description
  provider: string;        // Provider name (AWS, GCP, Azure, Cisco)
}
```

**Categories**:
1. Infrastructure (AWS EC2, GCP Compute Engine, Azure VM, Kubernetes)
2. AI & ML (SageMaker, Vertex AI, Azure ML, TensorFlow)
3. Storage (S3, Cloud Storage, Azure Blob, MongoDB, PostgreSQL)
4. Networking (API Gateway, Load Balancer, CloudFront, VPN)
5. Serverless (Lambda, Cloud Functions, Azure Functions)
6. Data Processing (Spark, Kafka, Airflow, Databricks)
7. Databases (RDS, Cloud SQL, DynamoDB, Cosmos DB)
8. Cisco Products (Catalyst, Webex, Meraki, SecureX)

### 2. Node Management

#### Adding Nodes to Canvas
```typescript
addComponentToCanvas(component: ComponentItem) {
  const nodeId = `node-${Date.now()}`;
  
  this.cy.add({
    group: 'nodes',
    data: {
      id: nodeId,
      label: component.name,
      icon: component.icon,
      color: component.color,
      componentProperties: {
        category: component.category,
        provider: component.provider,
        description: component.description
      }
    },
    position: { x: 400, y: 300 }
  });
}
```

#### Node Structure
```typescript
{
  group: 'nodes',
  data: {
    id: string,              // Unique ID
    label: string,           // Display name
    icon: string,            // Font Awesome class
    color: string,           // Node color
    parent?: string,         // Parent node ID (for groups)
    componentProperties: {
      category: string,
      provider: string,
      description: string
    }
  },
  position: { x: number, y: number }
}
```

### 3. Connection System

#### Drawing Connections
Uses **cytoscape-edgehandles** extension:

```typescript
this.eh = this.cy.edgehandles({
  canConnect: (sourceNode, targetNode) => {
    // Prevent self-loops
    if (sourceNode.id() === targetNode.id()) return false;
    
    // Disable auto-connect for groups
    if (sourceNode.data('isGroup') || targetNode.data('isGroup')) {
      return false;
    }
    
    return !sourceNode.same(targetNode);
  },
  edgeParams: (sourceNode, targetNode) => {
    return { 
      data: { 
        label: 'Connection',
        parent: sourceNode.data('parent') || targetNode.data('parent')
      } 
    };
  },
  hoverDelay: 150,
  snap: true,
  snapThreshold: 50,
  snapFrequency: 15,
  noEdgeEventsInDraw: true,
  disableBrowserGestures: true
});
```

#### Connection Properties
```typescript
{
  group: 'edges',
  data: {
    id: string,              // Unique ID
    source: string,          // Source node ID
    target: string,          // Target node ID
    label: string,           // Connection label
    parent?: string,         // Parent group ID
    color?: string,          // Line color
    width?: number,          // Line width
    style?: string           // 'solid' | 'dashed' | 'dotted'
  }
}
```

### 4. Grouping System

#### Creating Groups
```typescript
createGroup() {
  const groupId = `group-${Date.now()}`;
  
  this.cy.add({
    group: 'nodes',
    data: {
      id: groupId,
      label: 'New Group',
      isGroup: true,
      groupName: 'New Group',
      color: '#3b82f6'
    },
    position: { x: 400, y: 300 }
  });
}
```

#### Adding Nodes to Groups
```typescript
addToGroup(nodeId: string, groupId: string) {
  const node = this.cy.getElementById(nodeId);
  const group = this.cy.getElementById(groupId);
  
  if (node && group && group.data('isGroup')) {
    node.move({ parent: groupId });
    
    // Update group size
    const bbox = group.children().boundingBox();
    group.style({
      'width': bbox.w + 100,
      'height': bbox.h + 100
    });
  }
}
```

#### Group Features
- **Compound Nodes** - Groups are parent nodes containing child nodes
- **Move Together** - Moving a group moves all children
- **Visual Distinction** - Groups have borders and labels
- **Customization** - Name, color, and size customization via modal

### 5. Hover Tooltips

Shows node details in top-right corner on hover:

```typescript
this.cy.on('mouseover', 'node', (event) => {
  const node = event.target;
  
  if (!node.data('isGroup')) {
    this.hoveredNode = {
      name: node.data('label'),
      category: node.data('componentProperties')?.category || 'N/A',
      provider: node.data('componentProperties')?.provider || 'N/A',
      description: node.data('componentProperties')?.description || 'No description'
    };
  }
});

this.cy.on('mouseout', 'node', () => {
  this.hoveredNode = null;
});
```

HTML Display:
```html
<div *ngIf="hoveredNode" class="node-tooltip">
  <h4>{{ hoveredNode.name }}</h4>
  <p><strong>Category:</strong> {{ hoveredNode.category }}</p>
  <p><strong>Provider:</strong> {{ hoveredNode.provider }}</p>
  <p><strong>Description:</strong> {{ hoveredNode.description }}</p>
</div>
```

---

## Styling & Theming

### Cytoscape Style Configuration

```typescript
getCytoscapeStyles() {
  return [
    // Regular Nodes
    {
      selector: 'node[!isGroup]',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'color': '#ffffff',
        'font-size': '14px',
        'font-weight': 'bold',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': '140px',
        'width': '150',
        'height': '150',
        'border-width': '3',
        'border-color': '#64748b',
        'border-opacity': 0.5,
        'shape': 'roundrectangle'
      }
    },
    
    // Group Nodes
    {
      selector: 'node[isGroup]',
      style: {
        'background-color': 'data(color)',
        'background-opacity': 0.2,
        'border-width': '3',
        'border-color': 'data(color)',
        'border-style': 'dashed',
        'label': 'data(groupName)',
        'font-size': '18px',
        'font-weight': 'bold',
        'color': 'data(color)',
        'text-valign': 'top',
        'text-halign': 'center',
        'padding': '50px',
        'shape': 'roundrectangle'
      }
    },
    
    // Edges (Connections)
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#06b6d4',
        'target-arrow-color': '#06b6d4',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '12px',
        'color': '#ffffff',
        'text-background-color': '#1e293b',
        'text-background-opacity': 0.8,
        'text-background-padding': '5px',
        'text-rotation': 'autorotate'
      }
    },
    
    // Selected Nodes
    {
      selector: 'node:selected',
      style: {
        'border-width': '4',
        'border-color': '#22d3ee',
        'border-opacity': 1
      }
    },
    
    // Selected Edges
    {
      selector: 'edge:selected',
      style: {
        'line-color': '#22d3ee',
        'target-arrow-color': '#22d3ee',
        'width': 4
      }
    }
  ];
}
```

### Custom CSS Classes

```css
/* Canvas Container */
#cy {
  width: 100%;
  height: calc(100vh - 100px);
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-radius: 12px;
}

/* Toolbar */
.toolbar {
  background: rgba(30, 41, 59, 0.95);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
}

/* Node Tooltip */
.node-tooltip {
  position: fixed;
  top: 100px;
  right: 20px;
  background: rgba(30, 41, 59, 0.95);
  border: 2px solid #06b6d4;
  border-radius: 12px;
  padding: 20px;
  max-width: 350px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}
```

---

## Event Handling

### Node Events

```typescript
attachEventHandlers() {
  // Node Selection
  this.cy.on('select', 'node', (event) => {
    const node = event.target;
    this.selectedNode = node;
    console.log('Node selected:', node.id());
  });
  
  // Node Deselection
  this.cy.on('unselect', 'node', (event) => {
    this.selectedNode = null;
  });
  
  // Node Drag
  this.cy.on('drag', 'node', (event) => {
    const node = event.target;
    console.log('Node dragged:', node.position());
  });
  
  // Node Double-Click
  this.cy.on('dblclick', 'node', (event) => {
    const node = event.target;
    if (node.data('isGroup')) {
      this.openCustomizeGroupModal(node);
    }
  });
  
  // Node Hover
  this.cy.on('mouseover', 'node', (event) => {
    const node = event.target;
    this.showNodeTooltip(node);
  });
  
  this.cy.on('mouseout', 'node', () => {
    this.hideNodeTooltip();
  });
}
```

### Edge Events

```typescript
// Edge Creation
this.cy.on('ehcomplete', (event, sourceNode, targetNode, addedEdge) => {
  console.log('Edge created:', addedEdge.id());
  
  // Assign parent to edge if nodes are in same group
  const sourceParent = sourceNode.data('parent');
  const targetParent = targetNode.data('parent');
  
  if (sourceParent && sourceParent === targetParent) {
    addedEdge.move({ parent: sourceParent });
  }
});

// Edge Selection
this.cy.on('select', 'edge', (event) => {
  const edge = event.target;
  this.selectedEdge = edge;
});

// Edge Double-Click
this.cy.on('dblclick', 'edge', (event) => {
  const edge = event.target;
  this.openCustomizeEdgeModal(edge);
});
```

### Canvas Events

```typescript
// Canvas Click (deselect)
this.cy.on('tap', (event) => {
  if (event.target === this.cy) {
    this.cy.elements().unselect();
  }
});

// Zoom Event
this.cy.on('zoom', () => {
  console.log('Zoom level:', this.cy.zoom());
});

// Pan Event
this.cy.on('pan', () => {
  console.log('Pan position:', this.cy.pan());
});
```

---

## Extensions

### 1. cytoscape-edgehandles

**Purpose**: Draw connections between nodes by dragging from one node to another.

**Configuration**:
```typescript
this.eh = this.cy.edgehandles({
  canConnect: (sourceNode, targetNode) => {
    return !sourceNode.same(targetNode);
  },
  edgeParams: (sourceNode, targetNode) => {
    return { data: { label: 'Connection' } };
  },
  hoverDelay: 150,
  snap: true,
  snapThreshold: 50,
  snapFrequency: 15,
  noEdgeEventsInDraw: true,
  disableBrowserGestures: true
});
```

**Usage**:
```typescript
// Enable draw mode
enableDrawMode() {
  this.drawModeEnabled = true;
  this.eh.enableDrawMode();
}

// Disable draw mode
disableDrawMode() {
  this.drawModeEnabled = false;
  this.eh.disableDrawMode();
}
```

### 2. cytoscape-autopan-on-drag

**Purpose**: Automatically pan the canvas when dragging nodes near the edges.

**Configuration**:
```typescript
this.cy.autopanOnDrag({
  enabled: true,
  selector: 'node',
  speed: 1
});
```

---

## Export & Import

### JSON Export

**Simple Format** (custom format for easy editing):

```typescript
exportToSimpleFormat() {
  const nodes = this.cy.nodes().map(node => ({
    id: node.id(),
    name: node.data('label'),
    icon: node.data('icon'),
    color: node.data('color'),
    x: node.position('x'),
    y: node.position('y'),
    width: node.width(),
    height: node.height(),
    parent: node.data('parent'),
    isGroup: node.data('isGroup'),
    groupName: node.data('groupName'),
    componentProperties: node.data('componentProperties')
  }));
  
  const connections = this.cy.edges().map(edge => ({
    from: edge.source().id(),
    to: edge.target().id(),
    label: edge.data('label'),
    color: edge.style('line-color'),
    width: parseFloat(edge.style('width')),
    style: edge.style('line-style'),
    parent: edge.data('parent')
  }));
  
  return JSON.stringify({ nodes, connections }, null, 2);
}
```

**Cytoscape Format** (native format):

```typescript
exportToCytoscapeFormat() {
  return JSON.stringify(this.cy.json(), null, 2);
}
```

### JSON Import

```typescript
importFromSimpleFormat(jsonData: any) {
  this.cy.elements().remove();
  
  // Import nodes
  jsonData.nodes.forEach((node: any) => {
    this.cy.add({
      group: 'nodes',
      data: {
        id: node.id,
        label: node.name,
        icon: node.icon,
        color: node.color,
        parent: node.parent,
        isGroup: node.isGroup,
        groupName: node.groupName,
        componentProperties: node.componentProperties
      },
      position: { x: node.x, y: node.y }
    });
  });
  
  // Import connections
  jsonData.connections.forEach((conn: any) => {
    this.cy.add({
      group: 'edges',
      data: {
        id: `edge-${Date.now()}-${Math.random()}`,
        source: conn.from,
        target: conn.to,
        label: conn.label,
        parent: conn.parent
      }
    });
  });
  
  // Auto-arrange
  this.autoArrangeAfterImport();
}
```

### PNG Export

```typescript
exportAsPNG() {
  const png = this.cy.png({
    output: 'base64uri',
    bg: '#0f172a',
    full: true,
    scale: 2,
    maxWidth: 4000,
    maxHeight: 4000
  });
  
  const link = document.createElement('a');
  link.href = png;
  link.download = 'architecture-diagram.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

---

## Layout Algorithms

### COSE Layout (Default for Auto-Arrange)

**Purpose**: Compound Spring Embedder - creates compact layouts with short edges.

```typescript
autoArrangeAfterImport() {
  const hasGroups = this.cy.nodes('[isGroup]').length > 0;
  
  if (hasGroups) {
    this.cy.layout({
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 20,
      fit: true,
      padding: 50,
      randomize: false,
      componentSpacing: 150,
      nodeRepulsion: 8000,
      edgeElasticity: 100,
      nestingFactor: 1.2,
      gravity: 80,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0
    }).run();
  } else {
    this.cy.layout({
      name: 'breadthfirst',
      directed: true,
      padding: 50,
      spacingFactor: 1.5
    }).run();
  }
  
  setTimeout(() => {
    this.cy.fit(undefined, 50);
  }, 1100);
}
```

### Other Available Layouts

#### Breadthfirst
```typescript
this.cy.layout({
  name: 'breadthfirst',
  directed: true,
  padding: 50,
  spacingFactor: 1.5
}).run();
```

#### Grid
```typescript
this.cy.layout({
  name: 'grid',
  padding: 50,
  avoidOverlap: true,
  condense: false
}).run();
```

#### Circle
```typescript
this.cy.layout({
  name: 'circle',
  padding: 50,
  avoidOverlap: true
}).run();
```

#### Concentric
```typescript
this.cy.layout({
  name: 'concentric',
  padding: 50,
  minNodeSpacing: 100,
  concentric: (node: any) => node.degree()
}).run();
```

---

## Sample Architectures

### Location
`/samples/` directory contains three pre-built architecture templates:

1. **simple-3-tier.json** - Basic 3-tier web application
2. **medium-serverless.json** - AWS serverless architecture
3. **complex-multi-cloud.json** - Enterprise multi-cloud setup

### Usage

```typescript
loadSample(filename: string) {
  fetch(`/samples/${filename}`)
    .then(response => response.json())
    .then(data => {
      this.importFromSimpleFormat(data);
    });
}
```

### Creating Custom Samples

Follow this JSON structure:

```json
{
  "nodes": [
    {
      "id": "node-1",
      "name": "Component Name",
      "icon": "fab fa-aws",
      "color": "#FF9900",
      "x": 400,
      "y": 100,
      "width": 150,
      "height": 150,
      "componentProperties": {
        "category": "Infrastructure",
        "provider": "AWS",
        "description": "Brief description"
      }
    }
  ],
  "connections": [
    {
      "from": "node-1",
      "to": "node-2",
      "label": "Connection Label",
      "color": "#06b6d4",
      "width": 3,
      "style": "solid"
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

#### 1. Canvas Not Rendering
**Problem**: Canvas appears empty or doesn't initialize.

**Solution**:
```typescript
// Ensure container exists before initializing
ngAfterViewInit() {
  setTimeout(() => {
    const container = document.getElementById('cy');
    if (container) {
      this.cy = Cytoscape({ container, ...config });
    }
  }, 100);
}
```

#### 2. Extensions Not Working
**Problem**: Edgehandles or autopan not functioning.

**Solution**:
```typescript
// Register extensions before initializing Cytoscape
import Cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import autopanOnDrag from 'cytoscape-autopan-on-drag';

Cytoscape.use(edgehandles);
Cytoscape.use(autopanOnDrag);
```

#### 3. Event Handlers Not Working After Import
**Problem**: Drag, hover, or other events stop working after importing.

**Solution**:
```typescript
importFromSimpleFormat(data: any) {
  this.cy.elements().remove();
  // ... import logic ...
  
  // Reinitialize event handlers
  this.attachEventHandlers();
  this.initializeExtensions();
}
```

#### 4. PNG Export Download Not Working
**Problem**: PNG export doesn't trigger download.

**Solution**:
```typescript
exportAsPNG() {
  const png = this.cy.png({
    output: 'base64uri',  // Use base64uri, not blob
    bg: '#0f172a',
    full: true,
    scale: 2
  });
  
  // Create and append link to DOM
  const link = document.createElement('a');
  link.href = png;
  link.download = 'diagram.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

#### 5. Groups Not Moving Children
**Problem**: Moving a group doesn't move child nodes.

**Solution**:
```typescript
// Ensure parent is set correctly on child nodes
addToGroup(nodeId: string, groupId: string) {
  const node = this.cy.getElementById(nodeId);
  node.move({ parent: groupId });  // Use .move() not .data()
}
```

---

## API Reference

### Core Methods

#### Component Management
```typescript
// Add component to canvas
addComponentToCanvas(component: ComponentItem): void

// Remove selected node
deleteSelectedNode(): void

// Clear all elements
clearCanvas(): void
```

#### Group Management
```typescript
// Create new group
createGroup(): void

// Customize group
openCustomizeGroupModal(node: NodeSingular): void

// Add node to group
addNodeToGroup(nodeId: string, groupId: string): void
```

#### Connection Management
```typescript
// Enable draw mode
enableDrawMode(): void

// Disable draw mode
disableDrawMode(): void

// Toggle draw mode
toggleDrawMode(): void

// Delete selected edge
deleteSelectedEdge(): void
```

#### Export/Import
```typescript
// Export to simple JSON format
exportToSimpleFormat(): string

// Export to Cytoscape format
exportToCytoscapeFormat(): string

// Export as PNG
exportAsPNG(): void

// Import from simple format
importFromSimpleFormat(data: any): void

// Import from Cytoscape format
importFromCytoscapeFormat(data: any): void
```

#### Layout
```typescript
// Auto-arrange elements
autoArrangeAfterImport(): void

// Fit canvas to view
fitCanvas(): void

// Center canvas
centerCanvas(): void
```

#### Zoom & Pan
```typescript
// Zoom in
zoomIn(): void

// Zoom out
zoomOut(): void

// Reset zoom
resetZoom(): void

// Center on node
centerOnNode(nodeId: string): void
```

### Cytoscape.js Core API

Refer to [Cytoscape.js Documentation](https://js.cytoscape.org/) for complete API reference.

**Most Used Methods**:
```typescript
// Element Selection
cy.getElementById(id)
cy.nodes()
cy.edges()
cy.elements()
cy.$('selector')

// Element Manipulation
element.position({ x, y })
element.data('key', value)
element.style('property', value)
element.remove()
element.move({ parent: 'parentId' })

// Layout
cy.layout({ name: 'cose', ...options }).run()

// Export
cy.json()
cy.png({ options })

// Events
cy.on('event', handler)
cy.off('event', handler)

// Zoom & Pan
cy.zoom()
cy.zoom(level)
cy.pan()
cy.pan({ x, y })
cy.fit()
cy.center()
```

---

## Best Practices

### 1. Component Design
✅ **DO**:
- Use clear, descriptive component names
- Include provider and category metadata
- Use Font Awesome icons consistently
- Apply brand colors for providers

❌ **DON'T**:
- Use emojis as icons
- Mix different icon styles
- Omit component descriptions

### 2. Grouping
✅ **DO**:
- Group related components logically (e.g., Frontend Tier, Data Layer)
- Use descriptive group names
- Keep groups visually distinct with colors
- Size groups appropriately

❌ **DON'T**:
- Create nested groups beyond 1 level
- Make groups too small for their children
- Use similar colors for adjacent groups

### 3. Connections
✅ **DO**:
- Label connections descriptively (e.g., "API Call", "Query", "HTTPS")
- Use different line styles for different types (solid, dashed, dotted)
- Keep connection labels short
- Assign connections to parent groups when nodes are in same group

❌ **DON'T**:
- Create connection loops (node to itself)
- Use overly long connection labels
- Draw connections between groups unnecessarily

### 4. Layout
✅ **DO**:
- Use auto-arrange after importing
- Manually adjust for optimal readability
- Keep related components close
- Use consistent spacing

❌ **DON'T**:
- Overlap nodes unnecessarily
- Place nodes randomly
- Ignore visual hierarchy

### 5. Export/Import
✅ **DO**:
- Use simple JSON format for easy editing
- Include all metadata (parent, componentProperties)
- Test imports after export
- Use descriptive filenames

❌ **DON'T**:
- Hand-edit Cytoscape native format
- Omit parent relationships
- Skip validation before import

### 6. Performance
✅ **DO**:
- Limit diagrams to ~100 nodes for optimal performance
- Use compound nodes for large groups
- Debounce frequent events
- Clean up event listeners on destroy

❌ **DON'T**:
- Create thousands of nodes
- Attach heavy event handlers
- Forget to destroy Cytoscape instance

### 7. User Experience
✅ **DO**:
- Provide hover tooltips
- Show loading states
- Handle errors gracefully
- Provide undo/redo functionality

❌ **DON'T**:
- Block UI during operations
- Hide error messages
- Ignore user feedback

---

## Advanced Techniques

### 1. Custom Node Shapes

```typescript
// Add custom shape in style
{
  selector: 'node.custom-shape',
  style: {
    'shape': 'polygon',
    'shape-polygon-points': [-1, -1, 1, -1, 0.5, 1, -0.5, 1]
  }
}
```

### 2. Animated Edges

```typescript
{
  selector: 'edge.animated',
  style: {
    'line-dash-pattern': [10, 10],
    'line-dash-offset': 24
  }
}

// Animate in CSS
@keyframes dash {
  to {
    stroke-dashoffset: 0;
  }
}
```

### 3. Context Menu

```typescript
this.cy.on('cxttap', 'node', (event) => {
  const node = event.target;
  
  // Show custom context menu
  this.showContextMenu(event.position, node);
});
```

### 4. Batch Operations

```typescript
// Batch updates for better performance
this.cy.batch(() => {
  nodes.forEach(node => {
    this.cy.add(node);
  });
  
  edges.forEach(edge => {
    this.cy.add(edge);
  });
});
```

### 5. Search & Filter

```typescript
searchNodes(query: string) {
  const matching = this.cy.nodes().filter(node => {
    return node.data('label').toLowerCase().includes(query.toLowerCase());
  });
  
  // Highlight matching nodes
  this.cy.elements().removeClass('highlighted');
  matching.addClass('highlighted');
  
  // Fit to matching nodes
  this.cy.fit(matching, 50);
}
```

---

## Resources

### Official Documentation
- [Cytoscape.js Docs](https://js.cytoscape.org/)
- [Cytoscape.js GitHub](https://github.com/cytoscape/cytoscape.js)
- [Edgehandles Extension](https://github.com/cytoscape/cytoscape.js-edgehandles)
- [Autopan Extension](https://github.com/iVis-at-Bilkent/cytoscape.js-autopan-on-drag)

### Tutorials
- [Cytoscape.js Getting Started](https://js.cytoscape.org/#getting-started)
- [Layout Algorithms Guide](https://js.cytoscape.org/#layouts)
- [Style Guide](https://js.cytoscape.org/#style)

### Community
- [Stack Overflow - cytoscape.js tag](https://stackoverflow.com/questions/tagged/cytoscape.js)
- [GitHub Discussions](https://github.com/cytoscape/cytoscape.js/discussions)

---

## Conclusion

The Cytoscape Canvas provides a powerful, flexible platform for designing cloud architecture diagrams. By following this guide, you can:

✅ Create interactive, professional architecture diagrams  
✅ Leverage grouping for complex hierarchies  
✅ Export/import designs in multiple formats  
✅ Customize layouts and styling  
✅ Build upon the component library  
✅ Extend functionality with Cytoscape.js extensions  

For additional help or feature requests, please refer to the project repository or contact the development team.

---

**Last Updated**: December 2025  
**Version**: 1.0.0  
**Maintainer**: Solutions Builder AI Team
