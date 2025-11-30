# Canvas Developer Guide

## Overview
This document provides a comprehensive guide to the architecture canvas implementation in the Solutions Builder AI application. The canvas allows users to create, edit, and visualize cloud architecture diagrams with drag-and-drop functionality.

---

## Table of Contents
1. [Core Technologies & Packages](#core-technologies--packages)
2. [Architecture Overview](#architecture-overview)
3. [Canvas Implementation](#canvas-implementation)
4. [Data Flow](#data-flow)
5. [Custom Shapes System](#custom-shapes-system)
6. [Connection System](#connection-system)
7. [Import/Export Functionality](#importexport-functionality)
8. [Auto Layout Algorithm](#auto-layout-algorithm)
9. [Box Container System](#box-container-system)
10. [Styling & Theming](#styling--theming)
11. [Key Features](#key-features)

---

## Core Technologies & Packages

### Primary Framework
- **Angular 21.0.0** - Frontend framework with standalone components
  - `@angular/core` - Core Angular functionality
  - `@angular/common` - Common Angular directives and pipes
  - `@angular/forms` - Form handling (FormsModule)
  - `@angular/platform-browser` - Browser platform support
  - `@angular/platform-server` - Server-side rendering (SSR)

### Canvas Library
- **Drawflow 0.0.60** - Visual node-based workflow library
  - GitHub: https://github.com/jerosoler/Drawflow
  - NPM: `npm install drawflow`
  - Purpose: Provides the core canvas, node management, and connection drawing

### Build & Development Tools
- **TypeScript 5.9.2** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Node.js** - Runtime environment

### Styling
- **CSS3** - Custom styling with advanced features
  - CSS Grid & Flexbox for layouts
  - CSS Variables for theming
  - `::ng-deep` for penetrating Angular component encapsulation

---

## Architecture Overview

### Component Structure
```
CanvasComponent (canvas.component.ts)
├── Template: canvas.component.html
├── Styles: canvas.component.css
└── Custom Styles: trendy-cards.css
```

### Key Class Properties
```typescript
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('drawflowCanvas') drawflowCanvas!: ElementRef;
  
  editor: any;                    // Drawflow editor instance
  isBrowser: boolean;            // Platform check for SSR
  searchTerm: string;            // Service search filter
  
  // History Management
  private history: any[];
  private historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  
  // Visual Features
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  
  // Service Categories
  categories: ServiceCategory[];
}
```

---

## Canvas Implementation

### Initialization Flow

#### 1. Platform Check (ngOnInit)
```typescript
ngOnInit(): void {
  this.isBrowser = isPlatformBrowser(this.platformId);
}
```
- Checks if running in browser (not SSR)
- Required for DOM manipulation

#### 2. Drawflow Setup (ngAfterViewInit)
```typescript
ngAfterViewInit(): void {
  if (this.isBrowser && this.drawflowCanvas) {
    const container = this.drawflowCanvas.nativeElement;
    
    this.editor = new Drawflow(container);
    this.editor.reroute = true;
    this.editor.reroute_fix_curvature = true;
    this.editor.force_first_input = false;
    this.editor.editor_mode = 'edit';
    
    this.editor.start();
  }
}
```

### Configuration Options
- `reroute: true` - Allows connection path adjustments
- `reroute_fix_curvature: true` - Maintains smooth curves
- `force_first_input: false` - Allows connections to any input
- `editor_mode: 'edit'` - Enables editing (vs. 'view' mode)
- `curvature: 0.5` - Connection curve smoothness

---

## Data Flow

### Drawflow Data Structure
```typescript
{
  drawflow: {
    Home: {
      data: {
        "1": {
          id: 1,
          name: "node-name",
          data: {
            service: "Service Name",
            icon: "🖥️",
            color: "#0078D4",
            width: 200,
            height: 150
          },
          class: "cloud-node",
          html: "...",
          typenode: false,
          inputs: {
            input_1: { connections: [] }
          },
          outputs: {
            output_1: { connections: [{ node: "2", output: "input_1" }] }
          },
          pos_x: 100,
          pos_y: 200
        }
      }
    }
  }
}
```

### Node Creation Flow
1. User drags service from sidebar
2. `addNode(x, y, service, icon, color)` called
3. Node HTML generated based on type
4. Node added to Drawflow editor
5. Custom event handlers attached
6. History saved

---

## Custom Shapes System

### Available Shapes
1. **Rectangle** (▭) - Standard rectangular container
2. **Circle** (●) - Circular shape
3. **Diamond** (◆) - Diamond/rhombus shape
4. **Start** (▶) - Flow start indicator
5. **End** (⏹) - Flow end indicator
6. **Box** (⬜) - Large container for grouping (500x400px)

### Shape HTML Structure
```html
<div class="custom-shape shape-rectangle" style="border-left-color: ${color}">
  <div class="shape-header">
    <span class="node-icon">${icon}</span>
    <span class="node-title" contenteditable="true">${service}</span>
  </div>
  <div class="shape-body">
    <div class="node-category">CUSTOM SHAPE</div>
    <div class="node-description">
      <div class="node-description-text" contenteditable="true" 
           data-placeholder="Add task details here..."></div>
    </div>
  </div>
  <div class="resize-handle"></div>
</div>
```

### Shape CSS Classes
- `.shape-rectangle` - Rectangular shape with rounded corners
- `.shape-circle` - Perfect circle with border-radius: 50%
- `.shape-diamond` - Rotated square with transform: rotate(45deg)
- `.shape-box` - Large dashed border container, z-index: 0

---

## Connection System

### Multi-Directional Connections
Each node has **4 connection points**:
- **Left** (input_1) - Incoming connections
- **Top** (input_2) - Incoming connections
- **Right** (output_1) - Outgoing connections
- **Bottom** (output_2) - Outgoing connections

### Connection Point HTML
```typescript
const inputs = `
  <div class="inputs">
    <div class="input input_1" title="Connect from left"></div>
    <div class="input input_2" title="Connect from top"></div>
  </div>
`;

const outputs = `
  <div class="outputs">
    <div class="output output_1" title="Connect to right"></div>
    <div class="output output_2" title="Connect to bottom"></div>
  </div>
`;
```

### Connection Point Styling
```css
/* Base styling */
.drawflow-node .input,
.drawflow-node .output {
  width: 16px;
  height: 16px;
  background: #06b6d4;
  border: 3px solid #0e7490;
  border-radius: 50%;
  z-index: 10000;
  cursor: crosshair;
}

/* Positioned on 4 sides */
.drawflow-node .input_1 { left: -7px; top: 50%; }    /* Left */
.drawflow-node .input_2 { top: -7px; left: 50%; }    /* Top */
.drawflow-node .output_1 { right: -7px; top: 50%; }  /* Right */
.drawflow-node .output_2 { bottom: -7px; left: 50%; } /* Bottom */
```

---

## Import/Export Functionality

### Export Formats

#### 1. Simple JSON Format
```typescript
exportSimpleJSON(): void {
  const nodes = [
    {
      id: "node-1",
      name: "Azure VM",
      icon: "🖥️",
      color: "#0078D4",
      x: 100,
      y: 200,
      parentBox: "node-5"  // If inside a Box
    }
  ];
  
  const connections = [
    { from: "node-1", to: "node-2" }
  ];
}
```

#### 2. Full Drawflow Format
```typescript
exportFullDrawflow(): void {
  const exportData = this.editor.export();
  // Contains complete Drawflow data structure
}
```

### Import Logic

#### Detection Algorithm
```typescript
if (importData.drawflow) {
  // Full Drawflow format
  this.editor.import(importData);
} else if (importData.nodes && Array.isArray(importData.nodes)) {
  // Simplified format
  this.importFromSimplifiedJSON(importData);
}
```

#### Box Containment Detection
```typescript
// During export - detect nodes inside boxes
const nodeCenterX = node.pos_x + (nodeWidth / 2);
const nodeCenterY = node.pos_y + (nodeHeight / 2);

if (nodeCenterX >= boxX && nodeCenterX <= (boxX + boxWidth) &&
    nodeCenterY >= boxY && nodeCenterY <= (boxY + boxHeight)) {
  nodeData.parentBox = boxId;
}

// During import - mark nodes to prevent auto-layout movement
if (node.parentBox) {
  allNodes[lastNodeId].data.insideBox = true;
  allNodes[lastNodeId].data.parentBoxId = node.parentBox;
}
```

---

## Auto Layout Algorithm

### Algorithm: BFS (Breadth-First Search) Hierarchical Layout

#### Step 1: Separate Nodes
```typescript
const boxNodes: string[] = [];        // Box containers
const layoutNodes: string[] = [];     // Nodes to arrange
const nodesInsideBox: string[] = [];  // Nodes inside boxes
```

#### Step 2: Detect Box Containment
```typescript
// Check if node center is inside box boundaries
if (nodeCenterX >= boxX && nodeCenterX <= (boxX + boxWidth) &&
    nodeCenterY >= boxY && nodeCenterY <= (boxY + boxHeight)) {
  nodesInsideBox.push(nodeId);
}
```

#### Step 3: Build Connection Graph
```typescript
const nodeConnections: { 
  [key: string]: { incoming: string[], outgoing: string[] } 
} = {};
```

#### Step 4: Find Root Nodes
```typescript
const rootNodes = layoutNodes.filter(id => 
  nodeConnections[id].incoming.length === 0
);
```

#### Step 5: BFS Layering
```typescript
const layers: string[][] = [];
const visited = new Set<string>();

// Start from root nodes
let currentLayer = rootNodes;
let layerIndex = 0;

while (currentLayer.length > 0) {
  layers[layerIndex] = currentLayer;
  
  // Get next layer (children)
  const nextLayer = [];
  currentLayer.forEach(nodeId => {
    nodeConnections[nodeId].outgoing.forEach(targetId => {
      if (!visited.has(targetId)) {
        nextLayer.push(targetId);
        visited.add(targetId);
      }
    });
  });
  
  currentLayer = nextLayer;
  layerIndex++;
}
```

#### Step 6: Position Calculation
```typescript
const horizontalSpacing = 400;  // Between layers
const verticalSpacing = 200;    // Between nodes in layer

layers.forEach((layer, layerIndex) => {
  const x = startX + (layerIndex * horizontalSpacing);
  
  layer.forEach((nodeId, nodeIndex) => {
    const y = startY + (nodeIndex * verticalSpacing);
    
    // Update node position
    allNodes[nodeId].pos_x = x;
    allNodes[nodeId].pos_y = y;
  });
});
```

---

## Box Container System

### Box Shape Characteristics
- **Default Size**: 500px × 400px
- **Visual Style**: Dashed border, transparent background
- **Z-Index**: 0 (background layer)
- **Resizable**: Yes, with bottom-right handle

### Box Containment Logic

#### Detection (Center-Point Algorithm)
```typescript
const boxX = box.pos_x;
const boxY = box.pos_y;
const boxWidth = 500;
const boxHeight = 400;

const nodeCenterX = node.pos_x + (nodeWidth / 2);
const nodeCenterY = node.pos_y + (nodeHeight / 2);

const isInside = 
  nodeCenterX >= boxX && 
  nodeCenterX <= (boxX + boxWidth) &&
  nodeCenterY >= boxY && 
  nodeCenterY <= (boxY + boxHeight);
```

#### Auto-Layout Protection
```typescript
// Nodes inside boxes are excluded from auto-layout
if (node.data?.insideBox === true) {
  nodesInsideBox.push(id);
  // Skip this node in layout algorithm
}
```

---

## Styling & Theming

### CSS Architecture
```
trendy-cards.css
├── Node Styles (.cloud-node, .custom-shape)
├── Shape Variations (.shape-rectangle, .shape-circle, etc.)
├── Connection Points (.input, .output)
├── Connection Lines (.connection .main-path)
└── Box Container (.shape-box)
```

### Key CSS Features

#### 1. Z-Index Layering
```css
.shape-box { z-index: 0; }          /* Background */
.drawflow-node { z-index: 10; }     /* Regular nodes */
.inputs, .outputs { z-index: 9999; } /* Connection containers */
.input, .output { z-index: 10000; }  /* Connection points */
```

#### 2. Penetrating Encapsulation
```css
:host ::ng-deep .drawflow .drawflow-node {
  /* Styles that penetrate Angular component boundaries */
}
```

#### 3. Connection Point Visibility
```css
.drawflow-node .input,
.drawflow-node .output {
  position: absolute !important;
  pointer-events: auto !important;
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
}
```

---

## Key Features

### 1. Drag & Drop
- Services dragged from sidebar
- Dropped onto canvas at cursor position
- Automatic node creation with proper HTML

### 2. Editable Content
- Node titles: `contenteditable="true"`
- Description areas: `contenteditable="true"`
- Changes persist in node data

### 3. Resize Handles
```typescript
addResizeHandler(nodeId: string): void {
  const handle = document.querySelector(`#node-${nodeId} .resize-handle`);
  
  handle.addEventListener('mousedown', (e) => {
    // Track mouse movement
    // Update node width/height
    // Update connections
  });
}
```

### 4. Context Menu
- Right-click on nodes
- Delete, duplicate, edit options
- Position-aware menu display

### 5. Undo/Redo
```typescript
private history: any[] = [];
private historyIndex = -1;

saveHistory(): void {
  const currentState = this.editor.export();
  this.history.push(JSON.parse(JSON.stringify(currentState)));
}

undo(): void {
  this.historyIndex--;
  this.editor.import(this.history[this.historyIndex]);
}
```

### 6. Auto-Save
```typescript
private autoSaveInterval = setInterval(() => {
  const exportData = this.editor.export();
  localStorage.setItem('architecture-canvas-autosave', 
    JSON.stringify(exportData));
}, 30000); // Every 30 seconds
```

---

## Service Categories

### Predefined Categories
```typescript
categories: ServiceCategory[] = [
  {
    name: 'Custom Shapes',
    collapsed: false,
    items: [
      { name: 'Box', icon: '⬜', color: '#64748B', category: 'Container' },
      { name: 'Rectangle', icon: '▭', color: '#3B82F6', category: 'Shape' },
      { name: 'Circle', icon: '●', color: '#8B5CF6', category: 'Shape' },
      { name: 'Diamond', icon: '◆', color: '#EC4899', category: 'Shape' },
      { name: 'Start', icon: '▶', color: '#10B981', category: 'Flow' },
      { name: 'End', icon: '⏹', color: '#EF4444', category: 'Flow' }
    ]
  },
  {
    name: 'AWS Services',
    collapsed: false,
    items: [
      { name: 'EC2', icon: '🖥️', color: '#FF9900', category: 'Compute' },
      { name: 'S3', icon: '🪣', color: '#569A31', category: 'Storage' },
      { name: 'Lambda', icon: 'λ', color: '#FF9900', category: 'Compute' },
      // ... more AWS services
    ]
  },
  // ... Azure, GCP, Kubernetes categories
];
```

---

## API Reference

### Core Methods

#### `addNode(x: number, y: number, service: string, icon: string, color: string): void`
Creates a new node on the canvas.

#### `autoLayoutNodes(): void`
Automatically arranges nodes using BFS algorithm.

#### `exportSimpleJSON(): void`
Exports diagram to simplified JSON format.

#### `exportFullDrawflow(): void`
Exports complete Drawflow data structure.

#### `importDiagram(): void`
Opens file picker to import JSON diagram.

#### `saveCanvas(): void`
Saves current canvas to localStorage.

#### `loadCanvas(): void`
Loads canvas from localStorage.

#### `clearCanvas(): void`
Clears all nodes and connections.

---

## Debugging Tips

### Console Logging
The application includes comprehensive logging:
```typescript
console.log('📍 Importing node: ${name} at (${x}, ${y})');
console.log('📦 Box containment detected');
console.log('✅ Canvas refreshed');
```

### Browser DevTools
1. Open Console (F12)
2. Watch for export/import logs
3. Check element positioning
4. Inspect connection point visibility

### Common Issues
1. **Connections not visible**: Check z-index and pointer-events
2. **Nodes moving on import**: Check `insideBox` flag
3. **Auto-layout not working**: Check node connections graph
4. **Box not in background**: Verify z-index: 0 on `.shape-box`

---

## Performance Considerations

### Optimization Techniques
1. **Debounced Auto-Save**: Every 30 seconds
2. **Lazy Rendering**: Only visible nodes rendered
3. **Event Delegation**: Single listener for multiple nodes
4. **Minimal Re-renders**: Direct DOM manipulation where possible

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- SVG support for connections
- CSS Grid & Flexbox support

---

## Future Enhancements

### Planned Features
- [ ] Collaborative editing (WebSocket)
- [ ] Export to PNG/SVG
- [ ] Custom shape designer
- [ ] Template library
- [ ] Version control
- [ ] Comments/annotations
- [ ] Zoom/pan controls
- [ ] Minimap navigation

---

## Contributing

### Code Style
- TypeScript strict mode
- Angular style guide
- 2-space indentation
- Meaningful variable names
- Comprehensive comments

### Testing
- Unit tests for core functions
- E2E tests for user workflows
- Visual regression tests for UI

---

## License & Credits

### Drawflow License
Drawflow is MIT licensed. See: https://github.com/jerosoler/Drawflow

### Application
© 2025 Solutions Builder AI
Built with Angular and Drawflow

---

## Support & Documentation

- GitHub Issues: Report bugs and feature requests
- Documentation: This guide and inline code comments
- Community: Join discussions on implementation details

---

**Last Updated**: November 30, 2025
**Version**: 1.0.0
**Maintainer**: Development Team
