import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, PLATFORM_ID, Inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape';
// @ts-ignore
import edgehandles from 'cytoscape-edgehandles';
// @ts-ignore
import nodeResize from 'cytoscape-node-resize';
// @ts-ignore
import gridGuide from 'cytoscape-grid-guide';
// @ts-ignore
import undoRedo from 'cytoscape-undo-redo';
// @ts-ignore
import contextMenus from 'cytoscape-context-menus';
// @ts-ignore
import clipboard from 'cytoscape-clipboard';
// @ts-ignore
import cyNavigator from 'cytoscape-navigator';
// @ts-ignore
import autopanOnDrag from 'cytoscape-autopan-on-drag';
import { ComponentsApiService, Component as ComponentData, Category } from '../../services/components-api.service';

interface ServiceCategory {
  name: string;
  collapsed: boolean;
  items: ServiceItem[];
}

interface ServiceItem {
  id: string;
  name: string;
  icon: string;
  faIcon?: string;
  color: string;
  category: string;
  description?: string;
  provider?: string;
  definition?: string;
  learnMoreLink?: string;
  shape?: string; // For basic shapes
  properties?: {
    [key: string]: {
      type: 'text' | 'number' | 'select' | 'textarea';
      label: string;
      options?: string[];
      default?: any;
      placeholder?: string;
      min?: number;
      max?: number;
    }
  };
}

@Component({
  selector: 'app-cytoscape-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cytoscape-canvas.component.html',
  styleUrls: ['./cytoscape-canvas.component.css']
})
export class CytoscapeCanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cytoscapeContainer', { static: false }) cytoscapeContainer!: ElementRef;
  
  cy: Core | null = null;
  isBrowser: boolean;
  searchTerm = '';
  
  // History Management
  private history: any[] = [];
  private historyIndex = -1;
  private maxHistory = 50;
  canUndo = false;
  canRedo = false;
  
  // Prevent double-click interference
  private isDoubleClicking = false;
  
  // Context Menu
  contextMenu = { 
    visible: false, 
    x: 0, 
    y: 0, 
    nodeId: null as string | null,
    edgeId: null as string | null,
    type: 'node' as 'node' | 'edge' | 'canvas'
  };

  // Edit Modal
  editModal = {
    visible: false,
    nodeId: null as string | null,
    nodeName: '',
    nodeDescription: '',
    nodeProvider: '',
    nodeDefinition: '',
    nodeProperties: {} as any,
    nodePropertyValues: {} as any
  };

  edgeEditModal = {
    visible: false,
    edgeId: null as string | null,
    edgeLabel: '',
    edgeColor: '#06b6d4',
    edgeStyle: 'solid', // solid, dashed, dotted
    edgeWidth: 3
  };

  // Shape Selector Modal
  shapeModal = {
    visible: false,
    selectedNodes: [] as any[]
  };

  // Border Style Modal for container shapes
  borderStyleModal = {
    visible: false,
    selectedNodes: [] as any[],
    currentStyle: 'solid' as 'solid' | 'dashed' | 'dotted' | 'double',
    currentWidth: 3
  };

  // Group Modal for customizing groups
  groupModal = {
    visible: false,
    groupName: 'Group',
    groupColor: '#818cf8',
    borderStyle: 'dashed' as 'solid' | 'dashed' | 'dotted' | 'double',
    borderWidth: 3,
    backgroundColor: 'transparent',
    showLabel: true,
    selectedNodes: [] as any[]
  };

  // Node Tooltip - Shows on click
  nodeTooltip = {
    visible: false,
    x: 0,
    y: 0,
    nodeData: null as any,
    properties: [] as Array<{key: string, value: any}>
  };

  availableBorderStyles = [
    { name: 'solid', label: 'Solid', icon: '━━━', example: 'solid' },
    { name: 'dashed', label: 'Dashed', icon: '╍╍╍', example: 'dashed' },
    { name: 'dotted', label: 'Dotted', icon: '┄┄┄', example: 'dotted' },
    { name: 'double', label: 'Double', icon: '═══', example: 'double' }
  ];

  availableShapes = [
    { name: 'rectangle', label: 'Rectangle', icon: '▭' },
    { name: 'roundrectangle', label: 'Rounded Rectangle', icon: '▢' },
    { name: 'ellipse', label: 'Ellipse', icon: '⬭' },
    { name: 'triangle', label: 'Triangle', icon: '▲' },
    { name: 'diamond', label: 'Diamond', icon: '◆' },
    { name: 'pentagon', label: 'Pentagon', icon: '⬟' },
    { name: 'hexagon', label: 'Hexagon', icon: '⬡' },
    { name: 'heptagon', label: 'Heptagon', icon: '⯁' },
    { name: 'octagon', label: 'Octagon', icon: '⯃' },
    { name: 'star', label: 'Star', icon: '★' },
    { name: 'vee', label: 'Vee', icon: '⋁' },
    { name: 'rhomboid', label: 'Rhomboid', icon: '▱' }
  ];
  
  // Visual Features
  showGrid = true;
  showLabels = true;
  snapToGrid = false;
  gridSize = 20;
  
  // Theme
  isDarkTheme = true; // Default to dark theme
  
  // Copy/Paste
  private clipboard: any[] = [];
  
  // Auto-save
  private autoSaveInterval: any;
  lastSaved: string = '';
  
  // Service Categories - dynamically loaded from backend API or static data
  categories: ServiceCategory[] = [];
  
  // Loading state
  isLoadingComponents = true;
  loadingError: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private componentsApi: ComponentsApiService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadComponentsFromAPI();
  }

  /**
   * Load components from the backend API (or static fallback)
   */
  loadComponentsFromAPI(): void {
    this.isLoadingComponents = true;
    this.loadingError = null;
    
    this.componentsApi.getAllComponents().subscribe({
      next: (data) => {
        console.log('✅ Components data received:', data);
        
        // Clear existing categories
        this.categories = [];

        // Add Basic Shapes category first
        this.categories.push({
          name: 'Basic Shapes',
          collapsed: false,
          items: this.availableShapes.map(shape => ({
            id: `shape-${shape.name}`,
            name: shape.label,
            icon: shape.icon,
            color: '#818cf8',
            category: 'shapes',
            description: `${shape.label} shape`,
            shape: shape.name // Add shape property to identify it
          }))
        });

        // Group components by category
        const componentsByCategory: { [key: string]: ServiceItem[] } = {};
        
        Object.values(data.components).forEach((component: ComponentData) => {
          const categoryKey = component.category;
          if (!componentsByCategory[categoryKey]) {
            componentsByCategory[categoryKey] = [];
          }
          componentsByCategory[categoryKey].push(component as ServiceItem);
        });

        // Create categories using categories metadata
        const sortedCategories = Object.entries(data.categories)
          .sort(([, a], [, b]) => a.order - b.order);

        sortedCategories.forEach(([key, categoryInfo]) => {
          const components = componentsByCategory[key] || [];
          if (components.length > 0) {
            this.categories.push({
              name: categoryInfo.name,
              collapsed: false,
              items: components
            });
          }
        });

        this.isLoadingComponents = false;
        this.cdr.detectChanges();
        console.log('✅ Categories organized:', this.categories);
      },
      error: (error) => {
        console.error('❌ Failed to load components:', error);
        this.loadingError = 'Failed to load components. Please check your connection.';
        this.isLoadingComponents = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Refresh components from backend
   */
  refreshComponents(): void {
    this.componentsApi.refreshComponents().subscribe({
      next: (data) => {
        console.log('🔄 Components refreshed:', data);
        this.loadComponentsFromAPI();
      },
      error: (error) => {
        console.error('❌ Failed to refresh components:', error);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser && this.cytoscapeContainer) {
      this.initCytoscape();
      this.setupAutoSave();
    }
  }

  ngOnDestroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    if (this.cy) {
      this.cy.destroy();
    }
  }

  initCytoscape(): void {
    const container = this.cytoscapeContainer.nativeElement;
    
    // Register only working extensions
    cytoscape.use(edgehandles);
    
    // Try to register optional extensions (fail silently if they don't work)
    try {
      if (typeof autopanOnDrag !== 'undefined') {
        cytoscape.use(autopanOnDrag);
        console.log('✅ Autopan registered');
      }
    } catch (e) {
      console.log('⚠️ Autopan not available');
    }
    
    this.cy = cytoscape({
      container: container,
      
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => {
              // Shape containers have transparent background
              return ele.data('isShape') ? 'transparent' : '#ffffff';
            },
            'label': (ele: any) => {
              // Shapes have no label by default
              if (ele.data('isShape')) return '';
              const service = ele.data('service') || '';
              return service;
            },
            'text-valign': 'center',
            'text-halign': 'center',
            'text-margin-y': (ele: any) => ele.data('isShape') ? 0 : 40,
            'color': '#1f2937',
            'font-size': '13px',
            'font-weight': '600' as any,
            'text-outline-width': 0,
            'width': '140px',
            'height': '140px',
            'shape': 'roundrectangle' as any,
            'border-width': (ele: any) => ele.data('isShape') ? 3 : 3,
            'border-color': (ele: any) => ele.data('color') || '#e5e7eb',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'background-opacity': (ele: any) => ele.data('isShape') ? 0 : 1,
            'border-opacity': 1,
            'padding': '10px',
            'line-height': 1.2,
            'text-justification': 'center',
            'z-index': 999,
            'transition-property': 'none' as any,
            'transition-duration': '0ms' as any,
            'background-image': (ele: any) => {
              // Shapes have no icon
              if (ele.data('isShape')) return 'none';
              const color = ele.data('color') || '#3b82f6';
              const faIcon = ele.data('faIcon') || ele.data('icon') || '';
              return this.generateCardBackgroundSVG(faIcon, color);
            },
            'background-fit': 'cover',
            'background-clip': 'node',
            'background-width': '100%',
            'background-height': '100%',
            // Add overlay for connection ports hint
            'overlay-opacity': 0,
            'overlay-color': '#06b6d4',
            'overlay-padding': '8px'
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#06b6d4',
            'overlay-opacity': 0.3,
            'overlay-padding': '10px'
          }
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.4,
            'overlay-color': '#06b6d4'
          }
        },
        {
          selector: 'node[isShape]',
          style: {
            'background-color': 'transparent',
            'background-opacity': 0,
            'background-image': 'none',
            'background-fill': 'solid' as any,
            'label': ''
          }
        },
        {
          selector: 'node.box',
          style: {
            'width': '300px',
            'height': '200px',
            'shape': 'rectangle' as any,
            'background-color': 'rgba(100, 116, 139, 0.1)',
            'background-opacity': 0.1,
            'border-width': 3,
            'border-style': 'dashed',
            'border-color': '#64748B',
            'text-valign': 'top',
            'text-margin-y': -10,
            'events': 'yes',
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node.circle',
          style: {
            'shape': 'ellipse' as any,
            'width': '100px',
            'height': '100px'
          }
        },
        {
          selector: 'node.diamond',
          style: {
            'shape': 'diamond' as any,
            'width': '120px',
            'height': '120px'
          }
        },
        {
          selector: 'node.triangle',
          style: {
            'shape': 'triangle' as any,
            'width': '100px',
            'height': '100px'
          }
        },
        {
          selector: 'node.rectangle',
          style: {
            'shape': 'rectangle' as any,
            'width': '140px',
            'height': '80px'
          }
        },
        {
          selector: 'node.roundrectangle',
          style: {
            'shape': 'roundrectangle' as any,
            'width': '140px',
            'height': '80px'
          }
        },
        {
          selector: 'node.ellipse',
          style: {
            'shape': 'ellipse' as any,
            'width': '120px',
            'height': '80px'
          }
        },
        {
          selector: 'node.pentagon',
          style: {
            'shape': 'pentagon' as any,
            'width': '110px',
            'height': '110px'
          }
        },
        {
          selector: 'node.hexagon',
          style: {
            'shape': 'hexagon' as any,
            'width': '110px',
            'height': '110px'
          }
        },
        {
          selector: 'node.heptagon',
          style: {
            'shape': 'heptagon' as any,
            'width': '110px',
            'height': '110px'
          }
        },
        {
          selector: 'node.octagon',
          style: {
            'shape': 'octagon' as any,
            'width': '110px',
            'height': '110px'
          }
        },
        {
          selector: 'node.star',
          style: {
            'shape': 'star' as any,
            'width': '120px',
            'height': '120px'
          }
        },
        {
          selector: 'node.vee',
          style: {
            'shape': 'vee' as any,
            'width': '110px',
            'height': '90px'
          }
        },
        {
          selector: 'node.rhomboid',
          style: {
            'shape': 'rhomboid' as any,
            'width': '130px',
            'height': '80px'
          }
        },
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
            'color': '#94a3b8',
            'text-background-color': '#1e293b',
            'text-background-opacity': 0.8,
            'text-background-padding': '4px',
            'events': 'yes',  // Make sure edges can receive events
            'overlay-padding': '10px',  // Increase clickable area
            'overlay-opacity': 0  // Keep overlay invisible
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#22d3ee',
            'target-arrow-color': '#22d3ee',
            'width': 5
          }
        },
        {
          selector: ':selected',
          style: {
            'border-width': 5,
            'border-color': '#22d3ee'
          }
        },
        {
          selector: '.highlighted',
          style: {
            'line-color': '#10b981',
            'target-arrow-color': '#10b981',
            'width': 5,
            'z-index': 9999
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#10b981',
            'border-width': 5
          }
        },
        {
          selector: 'node.search-highlight',
          style: {
            'border-color': '#f59e0b',
            'border-width': 6,
            'background-color': '#fbbf24',
            'color': '#000000',
            'text-outline-color': '#f59e0b'
          }
        },
        {
          selector: ':parent',
          style: {
            'background-opacity': 0, // Fully transparent background by default
            'background-color': 'transparent',
            'border-width': 3,
            'border-color': (ele: any) => ele.data('color') || '#818cf8',
            'border-style': (ele: any) => ele.data('borderStyle') || 'dashed',
            'border-opacity': 1,
            'padding': 50, // Padding around children
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': -20,
            'font-size': '16px',
            'font-weight': 'bold',
            'compound-sizing-wrt-labels': 'include', // Include label in size calculation
            'min-width': '200px',
            'min-height': '150px',
            'min-width-bias-left': 50,
            'min-width-bias-right': 50,
            'min-height-bias-top': 50,
            'min-height-bias-bottom': 50,
            // Prevent shrinking when children move or connections are made
            'bounds-expansion': 50, // Extra space around children bounds
            'z-index': 0 // Put groups below children
          } as any
        },
        {
          selector: ':child', // Child nodes inside groups
          style: {
            'z-index': 100 // Put children above their parents
          }
        },
        {
          selector: ':parent:selected',
          style: {
            'border-color': '#22d3ee',
            'border-width': 4,
            'border-opacity': 1
          }
        },
        {
          selector: '.eh-handle',
          style: {
            'background-color': '#22d3ee',
            'width': 12,
            'height': 12,
            'shape': 'ellipse',
            'overlay-opacity': 0,
            'border-width': 3,
            'border-opacity': 0
          }
        },
        {
          selector: '.eh-hover',
          style: {
            'background-color': '#22d3ee',
            // Prevent size change on hover
            'width': '140px',
            'height': '140px'
          }
        },
        {
          selector: '.eh-source',
          style: {
            'border-width': 4,
            'border-color': '#22d3ee',
            'shape': 'roundrectangle' as any,
            // Keep original size during connection
            'width': '140px',
            'height': '140px',
            'min-width': '140px' as any,
            'min-height': '140px' as any
          }
        },
        {
          selector: '.eh-target',
          style: {
            'border-width': 4,
            'border-color': '#10b981',
            'shape': 'roundrectangle' as any,
            // Keep original size during connection
            'width': '140px',
            'height': '140px',
            'min-width': '140px' as any,
            'min-height': '140px' as any
          }
        },
        {
          selector: '.eh-preview, .eh-ghost-edge',
          style: {
            'line-color': '#22d3ee',
            'target-arrow-color': '#22d3ee',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'width': 2,
            'opacity': 0.6,
            'z-index': 1  // Keep below nodes
          }
        },
        {
          selector: '.eh-ghost-edge.eh-preview-active',
          style: {
            'line-color': '#22d3ee',
            'target-arrow-color': '#22d3ee',
            'width': 2,
            'opacity': 0.6,
            'z-index': 1
          }
        },
        {
          selector: '.eh-preview-active',
          style: {
            'opacity': 1,
            'z-index': 1
          }
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0,
            'z-index': 999
          }
        }
      ],
      
      layout: {
        name: 'preset'
      },
      
      // Enable user interactions
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: true,
      
      // IMPORTANT: Allow nodes to be moved/dragged
      autoungrabify: false,
      autounselectify: false,
      
      // Disable all transitions/animations to prevent size changes during interactions
      pixelRatio: 'auto',
      motionBlur: false,
      
      minZoom: 0.1,              // Lower min zoom to see more
      maxZoom: 5,                // Higher max zoom to see details
      wheelSensitivity: 0.15     // Smoother zoom control
    });

    // Initialize edgehandles for drag-to-connect
    const eh = (this.cy as any).edgehandles({
      canConnect: function(sourceNode: any, targetNode: any) {
        console.log('🔍 Checking connection:', {
          source: sourceNode.data('label') || sourceNode.data('groupName'),
          sourceParent: sourceNode.parent().id(),
          target: targetNode.data('label') || targetNode.data('groupName'),
          targetParent: targetNode.parent().id(),
          sameGroup: sourceNode.parent().id() === targetNode.parent().id()
        });
        
        // Don't allow self-connections
        if (sourceNode.same(targetNode)) {
          console.log('❌ Self-connection not allowed');
          return false;
        }
        
        // Allow ALL connections:
        // - Between nodes in same group ✅
        // - Between nodes in different groups ✅
        // - To/from group containers ✅
        // - Between regular nodes ✅
        
        // Prevent duplicate edges
        const existingEdge = sourceNode.edgesTo(targetNode);
        if (existingEdge.length > 0) {
          console.log('❌ Edge already exists');
          return false;
        }
        
        console.log('✅ Connection allowed');
        return true;
      },
      edgeParams: function(sourceNode: any, targetNode: any) {
        // If both nodes are in the same group, edge should also be in that group
        const sourceParent = sourceNode.parent();
        const targetParent = targetNode.parent();
        const sameParent = sourceParent.length > 0 && targetParent.length > 0 && sourceParent.id() === targetParent.id();
        
        const edgeData: any = {
          id: `edge-${Date.now()}`,
          source: sourceNode.id(),
          target: targetNode.id(),
          label: ''
        };
        
        // If nodes are in same group, set edge parent to that group
        if (sameParent) {
          edgeData.parent = sourceParent.id();
          console.log('📍 Edge will be inside group:', sourceParent.data('groupName'));
        }
        
        return {
          data: edgeData
        };
      },
      hoverDelay: 50,
      snap: true,
      snapThreshold: 50,
      snapFrequency: 15,
      noEdgeEventsInDraw: true,  // Don't hide elements during draw
      disableBrowserGestures: true,
      handleNodes: 'node', // Show handles on ALL nodes including groups
      handlePosition: function(node: any) {
        return 'middle top';  // Top center of node
      },
      handleInDrawMode: true,  // Show handles in draw mode
      edgeType: function(sourceNode: any) {
        return 'flat';
      },
      loopAllowed: function() { return false; },
      nodeLoopOffset: -50,
      preview: true,  // Show preview line
      handleSize: 30,  // Larger handles for easier targeting
      handleColor: '#06b6d4',
      handleLineType: 'straight',
      handleLineWidth: 3,
      handleIcon: false,
      cxt: false,
      // Don't restore sizes - nodes should maintain their dimensions
      complete: (sourceNode: any, targetNode: any, addedEdge: any) => {
        // Just save the connection to history
        if (this.cy) {
          this.saveHistory();
        }
      }
    });

    // Store edgehandles instance for later use
    (this.cy as any).edgehandles_instance = eh;

    // Enable edgehandles but NOT draw mode
    // This allows normal dragging while showing handles on hover
    eh.enable();
    
    console.log('✅ Edgehandles enabled - Drag nodes normally, hover to see connection handles');

    // ============================================
    // INITIALIZE EXTENSIONS (SAFE MODE)
    // ============================================
    console.log('🔧 Initializing extensions...');

    // Try Autopan - Auto-scroll on drag (SIMPLE & SAFE)
    try {
      if (this.cy && (this.cy as any).autopanOnDrag) {
        (this.cy as any).autopanOnDrag({
          enabled: true,
          selector: 'node',
          speed: 1
        });
        console.log('✅ Autopan enabled');
      }
    } catch (e) {
      console.log('⚠️ Autopan not available:', e);
    }

    console.log('✅ Extensions initialized');

    // Setup event handlers
    this.setupEventHandlers();
    
    // Try to load saved data
    this.loadCanvas();
    
    console.log('✅ Cytoscape initialized - Edgehandles active with smart detection');
  }

  setupEventHandlers(): void {
    if (!this.cy) return;

    const eh = (this.cy as any).edgehandles_instance;
    
    // Smart edge detection for connections vs dragging
    this.cy.on('mousedown', 'node', (event) => {
      const node = event.target;
      const mousePos = event.position;
      const nodePos = node.position();
      const nodeWidth = node.width();
      const nodeHeight = node.height();
      
      // For groups: ONLY allow dragging/selecting, NEVER auto-enable connection mode
      // User must explicitly use edge handles to connect groups
      if (node.data('isGroup') && node.isParent()) {
        if (eh) {
          eh.disableDrawMode();
          console.log('👆 Group clicked - Drag/Select mode only', node.data('groupName'));
        }
        return; // Exit early for groups
      }
      
      // Calculate distance from mouse to node center (for regular nodes only)
      const dx = mousePos.x - nodePos.x;
      const dy = mousePos.y - nodePos.y;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate node "radius" (average of width/height)
      const nodeRadius = Math.min(nodeWidth, nodeHeight) / 2;
      
      // Edge threshold - clicks within this distance from edge trigger connection mode
      const edgeThreshold = 20;
      
      // For regular nodes: edge click = connect, center click = drag
      if (distanceFromCenter > nodeRadius - edgeThreshold) {
        // Click is near the edge - enable connection mode
        if (eh) {
          eh.enableDrawMode();
          console.log('🔗 Edge clicked - Connection mode', node.data('label'));
        }
      } else {
        // Click is in the center - disable draw mode for dragging
        if (eh) {
          eh.disableDrawMode();
          console.log('👆 Center clicked - Drag mode', node.data('label'));
        }
      }
    });
    
    // Re-enable draw mode on mouseup to prepare for next interaction
    this.cy.on('mouseup', () => {
      // Small delay to let drag complete
      setTimeout(() => {
        if (eh) {
          eh.disableDrawMode();
        }
      }, 100);
    });

    // Resize functionality - detect edge/corner clicks
    let resizing = false;
    let resizeNode: any = null;
    let startMousePos = { x: 0, y: 0 };
    let startNodePos = { x: 0, y: 0 };
    let startSize = { width: 0, height: 0 };
    let resizeEdge = ''; // 'right', 'bottom', 'corner'

    this.cy.on('select', 'node', (event) => {
      const node = event.target;
      console.log(`✅ Node selected: ${node.data('label')} - Drag edges/corners to resize`);
    });

    // Detect if mouse is near edge/corner of node for resize
    this.cy.on('mousedown', 'node', (event): any => {
      const node = event.target;
      const mousePos = event.position;
      const nodePos = node.position();
      const nodeWidth = node.width();
      const nodeHeight = node.height();
      
      // Skip resize logic for group nodes - they should be freely draggable
      if (node.data('isGroup') && node.isParent()) {
        // Allow group nodes to be dragged without resize interference
        return true;
      }
      
      // Don't intercept events on child nodes - let them handle connections
      const isShape = node.data('isShape');
      const isParent = node.isParent();
      if (isShape && isParent && this.cy) {
        // For shape containers with children, only allow resize on edges, not on children
        const clickedOnChild = this.cy.nodes().some((child: any) => {
          if (child.data('parent') === node.id()) {
            const childPos = child.position();
            const childWidth = child.width();
            const childHeight = child.height();
            return (
              mousePos.x >= childPos.x - childWidth / 2 &&
              mousePos.x <= childPos.x + childWidth / 2 &&
              mousePos.y >= childPos.y - childHeight / 2 &&
              mousePos.y <= childPos.y + childHeight / 2
            );
          }
          return false;
        });
        
        if (clickedOnChild) {
          // Let the child handle the event (for connections)
          return true;
        }
      }
      
      // Calculate distances to edges
      const leftEdge = nodePos.x - nodeWidth / 2;
      const rightEdge = nodePos.x + nodeWidth / 2;
      const topEdge = nodePos.y - nodeHeight / 2;
      const bottomEdge = nodePos.y + nodeHeight / 2;
      
      const edgeThreshold = 15; // pixels from edge to trigger resize
      
      // Check if click is near right edge
      const nearRightEdge = Math.abs(mousePos.x - rightEdge) < edgeThreshold;
      const nearBottomEdge = Math.abs(mousePos.y - bottomEdge) < edgeThreshold;
      const nearLeftEdge = Math.abs(mousePos.x - leftEdge) < edgeThreshold;
      const nearTopEdge = Math.abs(mousePos.y - topEdge) < edgeThreshold;
      
      // Determine resize direction
      if ((nearRightEdge || nearBottomEdge || nearLeftEdge || nearTopEdge) && node.selected()) {
        event.preventDefault();
        event.stopPropagation();
        
        resizing = true;
        resizeNode = node;
        startMousePos = { x: mousePos.x, y: mousePos.y };
        startNodePos = { x: nodePos.x, y: nodePos.y };
        startSize = { width: nodeWidth, height: nodeHeight };
        
        // Determine which edge/corner
        if (nearRightEdge && nearBottomEdge) {
          resizeEdge = 'corner-rb';
          console.log('🔧 RESIZE MODE: Bottom-right corner');
        } else if (nearRightEdge && nearTopEdge) {
          resizeEdge = 'corner-rt';
          console.log('🔧 RESIZE MODE: Top-right corner');
        } else if (nearLeftEdge && nearBottomEdge) {
          resizeEdge = 'corner-lb';
          console.log('🔧 RESIZE MODE: Bottom-left corner');
        } else if (nearLeftEdge && nearTopEdge) {
          resizeEdge = 'corner-lt';
          console.log('🔧 RESIZE MODE: Top-left corner');
        } else if (nearRightEdge) {
          resizeEdge = 'right';
          console.log('🔧 RESIZE MODE: Right edge');
        } else if (nearBottomEdge) {
          resizeEdge = 'bottom';
          console.log('🔧 RESIZE MODE: Bottom edge');
        } else if (nearLeftEdge) {
          resizeEdge = 'left';
          console.log('🔧 RESIZE MODE: Left edge');
        } else if (nearTopEdge) {
          resizeEdge = 'top';
          console.log('🔧 RESIZE MODE: Top edge');
        }
        
        // Disable other interactions
        resizeNode.ungrabify();
        const eh = (this.cy as any).edgehandles_instance;
        if (eh) eh.disableDrawMode();
        
        return false;
      }
      return true;
    });

    this.cy.on('mousemove', (event) => {
      if (resizing && resizeNode) {
        const currentMousePos = event.position;
        const dx = currentMousePos.x - startMousePos.x;
        const dy = currentMousePos.y - startMousePos.y;
        
        let newWidth = startSize.width;
        let newHeight = startSize.height;
        let newX = startNodePos.x;
        let newY = startNodePos.y;
        
        // Calculate new size based on resize direction
        switch(resizeEdge) {
          case 'right':
            newWidth = Math.max(50, startSize.width + dx * 2);
            break;
          case 'bottom':
            newHeight = Math.max(30, startSize.height + dy * 2);
            break;
          case 'left':
            newWidth = Math.max(50, startSize.width - dx * 2);
            break;
          case 'top':
            newHeight = Math.max(30, startSize.height - dy * 2);
            break;
          case 'corner-rb':
            newWidth = Math.max(50, startSize.width + dx * 2);
            newHeight = Math.max(30, startSize.height + dy * 2);
            break;
          case 'corner-rt':
            newWidth = Math.max(50, startSize.width + dx * 2);
            newHeight = Math.max(30, startSize.height - dy * 2);
            break;
          case 'corner-lb':
            newWidth = Math.max(50, startSize.width - dx * 2);
            newHeight = Math.max(30, startSize.height + dy * 2);
            break;
          case 'corner-lt':
            newWidth = Math.max(50, startSize.width - dx * 2);
            newHeight = Math.max(30, startSize.height - dy * 2);
            break;
        }
        
        resizeNode.style({
          'width': newWidth + 'px',
          'height': newHeight + 'px'
        });
        
        // Update position if resizing from left or top
        if (resizeEdge.includes('left')) {
          newX = startNodePos.x + (startSize.width - newWidth) / 2;
        }
        if (resizeEdge.includes('top')) {
          newY = startNodePos.y + (startSize.height - newHeight) / 2;
        }
        
        if (newX !== startNodePos.x || newY !== startNodePos.y) {
          resizeNode.position({ x: newX, y: newY });
        }
      }
    });

    this.cy.on('mouseup', () => {
      if (resizing && resizeNode) {
        resizeNode.grabify();
        
        // Save the resized dimensions to node data so they persist in exports
        const finalWidth = resizeNode.width();
        const finalHeight = resizeNode.height();
        resizeNode.data('width', `${finalWidth}px`);
        resizeNode.data('height', `${finalHeight}px`);
        
        console.log(`✅ Node resized to ${Math.round(finalWidth)}px x ${Math.round(finalHeight)}px`);
        this.saveHistory();
        this.saveCanvas();
        resizing = false;
        resizeNode = null;
        resizeEdge = '';
      }
    });

    // Right-click context menu
    this.cy.on('cxttap', 'node', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const node = event.target;
      console.log('🖱️ Right-click on node:', node.data('label'));
      setTimeout(() => {
        this.showContextMenu(event.originalEvent as MouseEvent, node.id(), 'node');
      }, 10);
    });

    // Right-click on edge to insert node
    this.cy.on('cxttap', 'edge', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const edge = event.target;
      console.log('🖱️ Right-click on edge:', edge.id());
      setTimeout(() => {
        this.showContextMenu(event.originalEvent as MouseEvent, edge.id(), 'edge');
      }, 10);
    });

    // Right-click on canvas background (for grouping)
    this.cy.on('cxttap', (event) => {
      if (event.target === this.cy && this.cy) {
        const selectedNodes = this.cy.$(':selected').nodes();
        if (selectedNodes.length > 1) {
          event.preventDefault();
          console.log('🖱️ Right-click on canvas with', selectedNodes.length, 'nodes selected');
          setTimeout(() => {
            this.showContextMenu(event.originalEvent as MouseEvent, '', 'canvas');
          }, 10);
        }
      }
    });

    // Hover to show tooltip with node details
    this.cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      
      // Get all node data
      const data = node.data();
      
      // Build properties array
      const properties: Array<{key: string, value: any}> = [];
      
      // Helper function to format values
      const formatValue = (val: any): string => {
        if (val === null || val === undefined) return 'N/A';
        if (typeof val === 'object') return JSON.stringify(val, null, 2);
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return String(val);
      };
      
      // Add standard fields
      if (data.label) properties.push({ key: 'Name', value: formatValue(data.label) });
      if (data.service) properties.push({ key: 'Service', value: formatValue(data.service) });
      if (data.category) properties.push({ key: 'Category', value: formatValue(data.category) });
      if (data.provider) properties.push({ key: 'Provider', value: formatValue(data.provider) });
      if (data.description) properties.push({ key: 'Description', value: formatValue(data.description) });
      if (data.definition) properties.push({ key: 'Definition', value: formatValue(data.definition) });
      
      // Add custom properties
      if (data.properties && typeof data.properties === 'object') {
        Object.keys(data.properties).forEach(key => {
          const val = data.properties[key];
          if (val !== undefined && val !== null && val !== '') {
            properties.push({ 
              key: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 
              value: formatValue(val)
            });
          }
        });
      }
      
      // Show tooltip at fixed position (top-right of canvas)
      this.nodeTooltip = {
        visible: true,
        x: 0, // Will be positioned by CSS
        y: 0, // Will be positioned by CSS
        nodeData: data,
        properties: properties
      };
      
      this.cdr.detectChanges();
    });

    // Hide tooltip when mouse leaves node
    this.cy.on('mouseout', 'node', (event) => {
      this.nodeTooltip.visible = false;
      this.cdr.detectChanges();
    });

    // Double-click to edit name and description
    this.cy.on('dbltap', 'node', (event) => {
      console.log('🖱️🖱️ Double-click detected on node!');
      const node = event.target;
      
      // Set flag to prevent context menu from appearing
      this.isDoubleClicking = true;
      
      // Close context menu if open
      this.contextMenu.visible = false;
      
      // Open edit modal
      console.log('Opening edit modal for node:', node.data('label'));
      this.openEditModal(node);
      
      // Reset flag after a short delay
      setTimeout(() => {
        this.isDoubleClicking = false;
      }, 300);
      
      // Prevent default after opening modal
      event.preventDefault();
      event.stopPropagation();
    });

    // Double-click on edge to edit connection
    this.cy.on('dbltap', 'edge', (event) => {
      console.log('🖱️🖱️ Double-click detected on edge!');
      const edge = event.target;
      
      // Set flag to prevent context menu from appearing
      this.isDoubleClicking = true;
      
      // Close context menu if open
      this.contextMenu.visible = false;
      
      // Open edge edit modal
      console.log('Opening edge edit modal for edge:', edge.id());
      this.openEdgeEditModal(edge);
      
      // Reset flag after a short delay
      setTimeout(() => {
        this.isDoubleClicking = false;
      }, 300);
      
      // Prevent default after opening modal
      event.preventDefault();
      event.stopPropagation();
    });

    // Click on canvas to hide context menu (but not on nodes or edges)
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.contextMenu.visible = false;
        this.nodeTooltip.visible = false;
        this.cdr.detectChanges();
      }
    });

    // Drag-to-parent: When a node is released, check if it's over another node
    this.cy.on('free', 'node', (event) => {
      const draggedNode = event.target;
      
      // Skip if this is a parent (group) node - they handle their own children
      if (draggedNode.isParent()) {
        return;
      }
      
      const draggedPos = draggedNode.position();
      
      // Find if this node overlaps with any shape nodes (potential parents)
      const potentialParents = this.cy!.nodes().filter((node: any) => {
        if (node.id() === draggedNode.id()) return false;
        if (!node.data('isShape') && !node.data('isGroup')) return false; // Only shapes/groups can be parents
        
        // Don't allow a node to become its own parent
        if (node.id() === draggedNode.id()) return false;
        
        const nodeBB = node.boundingBox();
        
        // Check if dragged node center is within the parent's bounds
        return draggedPos.x >= nodeBB.x1 && 
               draggedPos.x <= nodeBB.x2 && 
               draggedPos.y >= nodeBB.y1 && 
               draggedPos.y <= nodeBB.y2;
      });
      
      if (potentialParents.length > 0) {
        // Find the smallest parent (most specific container)
        let closestParent = potentialParents[0];
        let smallestArea = closestParent.width() * closestParent.height();
        
        potentialParents.forEach((parent: any) => {
          const area = parent.width() * parent.height();
          if (area < smallestArea) {
            smallestArea = area;
            closestParent = parent;
          }
        });
        
        // Set parent
        const currentParent = draggedNode.data('parent');
        if (currentParent !== closestParent.id()) {
          draggedNode.move({ parent: closestParent.id() });
          console.log(`📦 Node "${draggedNode.data('label') || draggedNode.id()}" moved into "${closestParent.data('service') || closestParent.data('groupName')}"`);
          this.saveHistory();
          this.saveCanvas();
        }
      } else {
        // Remove parent if node is dragged outside (but only if it's not in a group)
        const currentParent = draggedNode.data('parent');
        if (currentParent) {
          const parentNode = this.cy!.$id(currentParent);
          // Only auto-remove from non-group parents (shapes)
          if (parentNode && !parentNode.data('isGroup')) {
            draggedNode.move({ parent: null });
            console.log(`📤 Node "${draggedNode.data('label') || draggedNode.id()}" moved out of parent`);
            this.saveHistory();
            this.saveCanvas();
          }
        }
      }
    });

    // Click on canvas to hide context menu (but not on nodes or edges)
    this.cy.on('tap', (event) => {
      // Only hide on background clicks, with a small delay to prevent conflicts
      if (event.target === this.cy) {
        console.log('🖱️ Click on empty canvas - hiding context menu');
        setTimeout(() => {
          this.contextMenu.visible = false;
        }, 50);
      }
    });

    // Hide context menu on left-click of nodes or edges (but not right-click)
    this.cy.on('tap', 'node, edge', (event) => {
      const mouseEvent = event.originalEvent as MouseEvent;
      // Only hide on left-click (button 0), not right-click (button 2)
      if (mouseEvent && mouseEvent.button === 0) {
        // Don't hide if we're double-clicking
        if (!this.isDoubleClicking) {
          setTimeout(() => {
            this.contextMenu.visible = false;
          }, 50);
        }
      }
    });

    // Save history on node move
    this.cy.on('dragfree', 'node', () => {
      this.saveHistory();
    });

    // Save history when new edge is created via drag
    this.cy.on('ehcomplete', (event: any, sourceNode: any, targetNode: any, addedEdge: any) => {
      console.log('✅ Connection created:', sourceNode.id(), '→', targetNode.id());
      
      // Force all nodes back to original size (but not parent/group nodes)
      if (this.cy) {
        this.cy.$('node').forEach((node: any) => {
          // Skip parent (group) nodes - they should auto-size
          if (!node.isParent()) {
            node.style({
              'width': '140px',
              'height': '140px'
            });
          }
        });
      }
      
      this.saveHistory();
    });

    // Force dimensions when connection starts
    this.cy.on('ehstart', (event: any, sourceNode: any) => {
      if (this.cy) {
        // Lock all node dimensions (but not parent/group nodes)
        this.cy.$('node').forEach((node: any) => {
          // Skip parent (group) nodes - they should auto-size
          if (!node.isParent()) {
            node.style({
              'width': '140px',
              'height': '140px'
            });
          }
        });
      }
    });

    // Force dimensions during dragging
    this.cy.on('ehdrag', (event: any) => {
      if (this.cy) {
        // Keep forcing dimensions during drag
        this.cy.$('node').forEach((node: any) => {
          node.style({
            'width': '140px',
            'height': '140px'
          });
        });
      }
    });

    // Force dimensions when connection cancelled
    this.cy.on('ehcancel', (event: any, sourceNode: any) => {
      if (this.cy) {
        this.cy.$('node').forEach((node: any) => {
          node.style({
            'width': '140px',
            'height': '140px'
          });
        });
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        this.redo();
      }
      // Delete: Delete selected (but not when typing in input/textarea)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        if (!isTyping) {
          e.preventDefault();
          this.deleteSelected();
        }
      }
      // Ctrl+A: Select all
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        this.selectAll();
      }
      // Escape: Deselect all
      if (e.key === 'Escape') {
        this.deselectAll();
      }
      // Ctrl+S: Save as JSON
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.exportJSON();
      }
      // Ctrl+E: Export as PNG
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        this.exportAsPNG();
      }
      // Ctrl+C: Copy
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        this.copySelected();
      }
      // Ctrl+V: Paste
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        this.paste();
      }
      // Ctrl+G: Group selected nodes
      if (e.ctrlKey && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        this.groupSelectedNodes();
      }
      // Ctrl+Shift+G: Ungroup selected nodes
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        this.ungroupSelectedNodes();
      }
      // Ctrl+D: Duplicate
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        this.duplicateSelected();
      }
      // Ctrl+F: Search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.searchNodes();
      }
      // Ctrl+L: Toggle labels
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        this.toggleLabels();
      }
      // Ctrl+G: Toggle grid snap
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        this.toggleGridSnap();
      }
    });
  }

  // Helper method to convert Font Awesome class to unicode character
  getFontAwesomeUnicode(faIcon: string): string {
    const iconMap: { [key: string]: string } = {
      'fab fa-aws': '\uf375',
      'fab fa-microsoft': '\uf3ca',
      'fab fa-google': '\uf1a0',
      'fab fa-meta': '\uf31e',
      'fas fa-brain': '\uf5dc',
      'fas fa-comments': '\uf086',
      'fas fa-database': '\uf1c0',
      'fas fa-server': '\uf233',
      'fas fa-microchip': '\uf2db',
      'fas fa-cube': '\uf1b2',
      'fas fa-network-wired': '\uf6ff',
      'fas fa-stream': '\uf550',
      'fas fa-fire': '\uf06d'
    };
    return iconMap[faIcon] || '●';
  }

  // Helper method to generate icon as data URL using canvas
  generateFontAwesomeIconDataURL(faIcon: string, color: string): string {
    if (!this.isBrowser) return '';
    
    try {
      // Create a temporary canvas
      const canvas = document.createElement('canvas');
      canvas.width = 140;
      canvas.height = 140;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return '';
      
      // Draw colored header background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 140, 49);
      
      // Draw white body
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 49, 140, 91);
      
      // Create temporary element to render Font Awesome icon
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.innerHTML = `<i class="${faIcon}" style="font-size: 28px; color: white;"></i>`;
      document.body.appendChild(tempDiv);
      
      // Wait for font to load and render
      setTimeout(() => {
        // Draw the icon text (Font Awesome renders as text)
        ctx.fillStyle = 'white';
        ctx.font = '900 28px "Font Awesome 6 Free", "Font Awesome 6 Brands"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Get the unicode character
        const unicode = this.getFontAwesomeUnicode(faIcon);
        ctx.fillText(unicode, 70, 24);
        
        document.body.removeChild(tempDiv);
      }, 10);
      
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Failed to generate icon:', e);
      return '';
    }
  }

  // Helper method to get Font Awesome SVG path data
  getFontAwesomeSVGPath(faIcon: string): { path: string, viewBox: string } {
    // Font Awesome official SVG path data
    const iconPaths: { [key: string]: { path: string, viewBox: string } } = {
      'fab fa-aws': {
        viewBox: '0 0 640 512',
        path: 'M180.4 267C179.7 289.6 191 299.7 191.3 306C191.2 307.3 190.7 308.5 190 309.6C189.3 310.7 188.3 311.6 187.2 312.2L174.4 321.2C172.7 322.4 170.8 323 168.8 323.1C168.4 323.1 160.6 324.9 148.3 297.5C140.8 306.9 131.3 314.4 120.4 319.5C109.5 324.6 97.7 327.2 85.7 327C69.4 327.9 25.3 317.8 27.6 270.8C26 232.5 61.7 208.7 98.5 210.8C105.6 210.8 120.1 211.2 145.5 217.1L145.5 201.5C148.2 175 130.8 154.5 100.7 157.6C98.3 157.6 81.3 157.1 54.9 167.7C47.5 171.1 46.6 170.5 44.1 170.5C36.7 170.5 39.7 149 41.2 146.3C46.4 139.9 77.1 127.9 107.1 128.1C127.2 126.3 147.2 132.5 162.8 145.4C169.1 152.5 174 160.8 177 169.8C180 178.8 181.2 188.3 180.5 197.8L180.5 267.1zM94 299.4C126.4 298.9 140.2 279.4 143.3 268.9C145.8 258.8 145.4 252.5 145.4 241.5C135.7 239.2 121.8 236.6 105.8 236.6C90.6 235.5 63 242.2 64.1 268.9C62.9 285.7 75.2 300.3 94.1 299.4zM264.9 322.5C257 323.2 253.4 317.6 252.2 312.1L202.4 147.4C201.4 144.6 200.8 141.8 200.5 138.8C200.3 137.6 200.6 136.4 201.3 135.4C202 134.4 203.1 133.8 204.3 133.6C204.5 133.6 202.2 133.6 226.5 133.6C235.3 132.7 238.1 139.6 239.1 144L274.9 284.8L308.1 144C308.6 140.8 311 132.9 320.9 133.8L338.1 133.8C340.3 133.6 349.2 133.3 350.8 144.2L384.1 286.7L421 144.1C421.5 141.9 423.7 132.7 433.7 133.7L453.4 133.7C454.3 133.6 459.6 132.9 458.7 142.3C458.3 144.1 462.1 131.6 405.9 312.2C404.8 317.7 401.1 323.3 393.2 322.6L374.5 322.6C363.6 323.8 362 312.9 361.8 311.9L328.6 174.8L295.8 311.8C295.6 312.9 294.1 323.7 283.1 322.5L264.8 322.5L264.8 322.5zM538.4 328.1C532.5 328.1 504.5 327.8 481 315.8C478.7 314.8 476.7 313.2 475.3 311C473.9 308.8 473.2 306.4 473.2 303.9L473.2 293.2C473.2 284.7 479.4 286.3 482 287.3C492 291.4 498.5 294.4 510.8 296.9C547.5 304.4 563.6 294.6 567.5 292.4C580.7 284.6 581.7 266.7 572.8 257.5C562.3 248.7 557.3 248.4 519.7 236.5C515.1 235.2 476 222.9 475.9 184.1C475.3 155.9 500.9 127.9 545.4 128.1C558.1 128.1 591.8 132.2 601 143.7C602.4 145.8 603 148.3 602.9 150.7L602.9 160.8C602.9 165.2 601.3 167.5 598 167.5C590.3 166.6 576.6 156.3 548.8 156.7C541.9 156.3 508.9 157.6 510.4 181.7C510 200.7 537 207.8 540.1 208.6C576.6 219.6 588.7 221.4 603.2 238.2C620.3 260.4 611.1 286.5 607.5 293.6C588.4 331.1 539.1 328 538.2 328zM578.6 433C508.6 484.7 406.9 512.2 320.1 512.2C203 513 89.8 469.9 2.8 391.5C-3.7 385.6 2 377.5 10 382C106.5 437.2 215.7 466.2 326.9 466.1C409.9 465.7 492 448.8 568.5 416.6C580.3 411.6 590.3 424.4 578.6 433zM607.8 399.7C598.8 388.2 548.5 394.3 526 397C519.2 397.8 518.1 391.9 524.2 387.5C564.3 359.3 630.1 367.4 637.6 376.9C645.1 386.4 635.5 452.3 598 483.8C592.2 488.7 586.7 486.1 589.3 479.7C597.7 458.4 616.7 411.2 607.7 399.7z'
      },
      'fab fa-microsoft': {
        viewBox: '0 0 448 512',
        path: 'M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z'
      },
      'fab fa-google': {
        viewBox: '0 0 488 512',
        path: 'M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z'
      },
      'fab fa-meta': {
        viewBox: '0 0 640 512',
        path: 'M640 317.9C640 409.2 600.6 466.4 529.7 466.4C467.1 466.4 433.9 431.8 372.8 329.8L341.4 277.2C312.1 226.8 288.9 195.8 249.7 195.8C216.3 195.8 197.5 223.8 197.5 275.4C197.5 333.1 220.7 380.4 220.7 430.8C220.7 474.4 196.3 496 148.9 496C93.1 496 0 456 0 286.2C0 144.9 91.1 32 209.1 32C281.7 32 318.1 71.1 378.1 168.1L408.1 220.1C437.1 270.1 460.1 301.1 499.1 301.1C532.1 301.1 551.1 273.1 551.1 221.1C551.1 163.1 529.1 116.1 529.1 66.1C529.1 22.1 552.1 0 600.1 0C655.1 0 640 40 640 210.1V317.9z'
      },
      'fas fa-brain': {
        viewBox: '0 0 512 512',
        path: 'M184 0c30.9 0 56 25.1 56 56V456c0 30.9-25.1 56-56 56c-28.9 0-52.7-21.9-55.7-50.1c-5.2 1.4-10.7 2.1-16.3 2.1c-35.3 0-64-28.7-64-64c0-7.4 1.3-14.6 3.6-21.2C21.4 367.4 0 338.2 0 304c0-31.9 18.7-59.5 45.8-72.3C37.1 220.8 32 207 32 192c0-30.7 21.6-56.3 50.4-62.6C80.8 123.9 80 118 80 112c0-29.9 20.6-55.1 48.3-62.1C131.3 21.9 155.1 0 184 0zM328 0c28.9 0 52.6 21.9 55.7 49.9c27.8 7 48.3 32.1 48.3 62.1c0 6-.8 11.9-2.4 17.4c28.8 6.2 50.4 31.9 50.4 62.6c0 15-5.1 28.8-13.8 39.7C493.3 244.5 512 272.1 512 304c0 34.2-21.4 63.4-51.6 74.8c2.3 6.6 3.6 13.8 3.6 21.2c0 35.3-28.7 64-64 64c-5.6 0-11.1-.7-16.3-2.1c-3 28.2-26.8 50.1-55.7 50.1c-30.9 0-56-25.1-56-56V56c0-30.9 25.1-56 56-56z'
      },
      'fas fa-comments': {
        viewBox: '0 0 640 512',
        path: 'M208 352c114.9 0 208-78.8 208-176S322.9 0 208 0S0 78.8 0 176c0 38.6 14.7 74.3 39.6 103.4c-3.5 9.4-8.7 17.7-14.2 24.7c-4.8 6.2-9.7 11-13.3 14.3c-1.8 1.6-3.3 2.9-4.3 3.7c-.5 .4-.9 .7-1.1 .8l-.2 .2 0 0 0 0C1 327.2-1.4 334.4 .8 340.9S9.1 352 16 352c21.8 0 43.8-5.6 62.1-12.5c9.2-3.5 17.8-7.4 25.3-11.4C134.1 343.3 169.8 352 208 352zM448 176c0 112.3-99.1 196.9-216.5 207C255.8 457.4 336.4 512 432 512c38.2 0 73.9-8.7 104.7-23.9c7.5 4 16 7.9 25.2 11.4c18.3 6.9 40.3 12.5 62.1 12.5c6.9 0 13.1-4.5 15.2-11.1c2.1-6.6-.2-13.8-5.8-17.9l0 0 0 0-.2-.2c-.2-.2-.6-.4-1.1-.8c-1-.8-2.5-2-4.3-3.7c-3.6-3.3-8.5-8.1-13.3-14.3c-5.5-7-10.7-15.4-14.2-24.7c24.9-29 39.6-64.7 39.6-103.4c0-92.8-84.9-168.9-192.6-175.5c.4 5.1 .6 10.3 .6 15.5z'
      },
      'fas fa-database': {
        viewBox: '0 0 448 512',
        path: 'M448 80v48c0 44.2-100.3 80-224 80S0 172.2 0 128V80C0 35.8 100.3 0 224 0S448 35.8 448 80zM393.2 214.7c20.8-7.4 39.9-16.9 54.8-28.6V288c0 44.2-100.3 80-224 80S0 332.2 0 288V186.1c14.9 11.8 34 21.2 54.8 28.6C99.7 230.7 159.5 240 224 240s124.3-9.3 169.2-25.3zM0 346.1c14.9 11.8 34 21.2 54.8 28.6C99.7 390.7 159.5 400 224 400s124.3-9.3 169.2-25.3c20.8-7.4 39.9-16.9 54.8-28.6V432c0 44.2-100.3 80-224 80S0 476.2 0 432V346.1z'
      },
      'fas fa-microchip': {
        viewBox: '0 0 512 512',
        path: 'M176 24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64c-35.3 0-64 28.7-64 64H24c-13.3 0-24 10.7-24 24s10.7 24 24 24H64v64H24c-13.3 0-24 10.7-24 24s10.7 24 24 24H64v64H24c-13.3 0-24 10.7-24 24s10.7 24 24 24H64c0 35.3 28.7 64 64 64v40c0 13.3 10.7 24 24 24s24-10.7 24-24V448h64v40c0 13.3 10.7 24 24 24s24-10.7 24-24V448h64v40c0 13.3 10.7 24 24 24s24-10.7 24-24V448c35.3 0 64-28.7 64-64h40c13.3 0 24-10.7 24-24s-10.7-24-24-24H448V272h40c13.3 0 24-10.7 24-24s-10.7-24-24-24H448V160h40c13.3 0 24-10.7 24-24s-10.7-24-24-24H448c0-35.3-28.7-64-64-64V24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H272V24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H160V24zM160 128H352c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32V160c0-17.7 14.3-32 32-32z'
      },
      'fas fa-server': {
        viewBox: '0 0 512 512',
        path: 'M64 32C28.7 32 0 60.7 0 96v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V352c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z'
      },
      'fas fa-stream': {
        viewBox: '0 0 512 512',
        path: 'M16 96c0-17.7 14.3-32 32-32l416 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L48 128c-17.7 0-32-14.3-32-32zM256 224c17.7 0 32 14.3 32 32s-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l208 0zM16 416c0-17.7 14.3-32 32-32l416 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L48 448c-17.7 0-32-14.3-32-32z'
      },
      'fas fa-fire': {
        viewBox: '0 0 448 512',
        path: 'M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z'
      }
    };

    return iconPaths[faIcon] || iconPaths['fas fa-server']; // Default fallback
  }

  // Helper method to generate combined SVG with proper icon rendering
  generateCardBackgroundSVG(faIcon: string, color: string): string {
    // Get the Font Awesome SVG path
    const iconData = this.getFontAwesomeSVGPath(faIcon);
    
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
      <!-- White background only -->
      <rect x="0" y="0" width="140" height="140" fill="#ffffff"/>
      <!-- Icon in the center with color -->
      <svg x="54" y="54" width="32" height="32" viewBox="${iconData.viewBox}">
        <path d="${iconData.path}" fill="${color}"/>
      </svg>
    </svg>`;
    
    const encoded = encodeURIComponent(svgContent);
    return `data:image/svg+xml,${encoded}`;
  }

  // Old method - can be removed
  getIconImageUrl(faIcon: string, color: string): string {
    // Get the actual SVG path for each Font Awesome icon
    let iconPath = '';
    
    switch (faIcon) {
      case 'fab fa-aws':
        // Official AWS logo SVG path from Font Awesome
        iconPath = `<path d="M3.5 11.5c-.3 0-.5.2-.5.5v1c0 .3.2.5.5.5s.5-.2.5-.5v-1c0-.3-.2-.5-.5-.5zm3 0c-.3 0-.5.2-.5.5v1c0 .3.2.5.5.5s.5-.2.5-.5v-1c0-.3-.2-.5-.5-.5zm-6 4c0 .8.7 1.5 1.5 1.5h13c.8 0 1.5-.7 1.5-1.5v-7c0-.8-.7-1.5-1.5-1.5H2c-.8 0-1.5.7-1.5 1.5v7zM9.5 12c0-.6-.4-1-1-1s-1 .4-1 1 .4 1 1 1 1-.4 1-1zm4 0c0-.6-.4-1-1-1s-1 .4-1 1 .4 1 1 1 1-.4 1-1z" fill="white" transform="translate(6,8) scale(1.2)"/>`;
        break;
      case 'fab fa-microsoft':
        // Official Microsoft logo SVG from Font Awesome
        iconPath = `<path d="M11.4 0H0v11.4h11.4V0zm1.2 0v11.4H24V0H12.6zM11.4 12.6H0V24h11.4V12.6zm1.2 0V24H24V12.6H12.6z" fill="white" transform="translate(4,4) scale(0.9)"/>`;
        break;
      case 'fab fa-google':
        // Official Google logo SVG from Font Awesome  
        iconPath = `<path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="white" transform="translate(4,4) scale(0.8)"/>`;
        break;
      case 'fab fa-meta':
        // Meta logo
        iconPath = `<path d="M12.7 1.4c-1.9 0-3.4.8-4.5 2.3-1.1 1.5-1.8 3.5-2.1 5.8-.6 4.6.8 9.1 4 11.5 1.6 1.2 3.5 1.9 5.5 1.9s3.9-.7 5.5-1.9c3.2-2.4 4.6-6.9 4-11.5-.3-2.3-1-4.3-2.1-5.8-1.1-1.5-2.6-2.3-4.5-2.3-1.5 0-2.8.6-3.9 1.8-1.1-1.2-2.4-1.8-3.9-1.8z" fill="white" transform="translate(2,2) scale(0.9)"/>`;
        break;
      case 'fas fa-brain':
        // Official Brain icon SVG from Font Awesome
        iconPath = `<path d="M544 0c-12.4 0-24.3 3.2-34.5 8.8C490.8 3.2 470.7 0 448 0 377.3 0 320 57.3 320 128c0 13.5 2.1 26.6 6 38.8-21.5-8.8-45-13.8-69-13.8C150.7 153 64 239.7 64 346s86.7 193 193 193c48.8 0 93.2-18.4 127.3-48.6C418.6 521.6 463.2 544 512 544c88.4 0 160-71.6 160-160 0-11.2-1.2-22.2-3.4-32.8C699.5 332.2 720 299.8 720 262c0-53-43-96-96-96-11.2 0-22 1.9-32 5.5V128c0-70.7-57.3-128-128-128z" fill="white" transform="translate(2,4) scale(0.04)"/>`;
        break;
      case 'fas fa-comments':
        // Official Comments icon SVG from Font Awesome
        iconPath = `<path d="M416 192c0-88.4-93.1-160-208-160S0 103.6 0 192c0 34.3 14.1 65.9 38 92-13.4 30.2-35.5 54.2-35.8 54.5-2.2 2.3-2.8 5.7-1.5 8.7 1.3 3 4.1 4.8 7.3 4.8 66.3 0 116-31.8 140.6-51.4 32.7 12.3 69 19.4 107.4 19.4 114.9 0 208-71.6 208-160zm96 224c0-70.7-57.3-128-128-128-13.3 0-26.1 2.1-38.2 6.1C372.1 263.2 416 224.4 416 192c0-8.8-1.1-17.4-3.2-25.8 100.8-7.5 187.2 54.4 187.2 113.8 0 30.2-14.1 57.4-38 77.8 13.4 26.4 35.5 47.4 35.8 47.7 2.2 2 2.8 5 1.5 7.6-1.3 2.6-4.1 4.2-7.3 4.2-66.3 0-116-27.8-140.6-45 17.3-6.9 33.5-15.9 48-26.7 37.9 15.6 82.2 24.4 128.6 24.4z" fill="white" transform="translate(2,6) scale(0.05)"/>`;
        break;
      case 'fas fa-database':
        // Official Database icon SVG from Font Awesome
        iconPath = `<path d="M448 73.143v45.714C448 159.143 347.667 192 224 192S0 159.143 0 118.857V73.143C0 32.857 100.333 0 224 0s224 32.857 224 73.143zM448 176v102.857C448 319.143 347.667 352 224 352S0 319.143 0 278.857V176c48.125 33.143 136.208 48.572 224 48.572S399.875 209.143 448 176zm0 160v102.857C448 479.143 347.667 512 224 512S0 479.143 0 438.857V336c48.125 33.143 136.208 48.572 224 48.572S399.875 369.143 448 336z" fill="white" transform="translate(4,5) scale(0.055)"/>`;
        break;
      case 'fas fa-microchip':
        // Official Microchip icon SVG from Font Awesome
        iconPath = `<path d="M416 48v416c0 26.51-21.49 48-48 48H144c-26.51 0-48-21.49-48-48V48c0-26.51 21.49-48 48-48h224c26.51 0 48 21.49 48 48zm96 58v12c0 6.627-5.373 12-12 12h-84v-24h84c6.627 0 12 5.373 12 12zm0 96v12c0 6.627-5.373 12-12 12h-84v-24h84c6.627 0 12 5.373 12 12zm0 96v12c0 6.627-5.373 12-12 12h-84v-24h84c6.627 0 12 5.373 12 12zm0 96v12c0 6.627-5.373 12-12 12h-84v-24h84c6.627 0 12 5.373 12 12zM0 106v12c0 6.627 5.373 12 12 12h84v-24H12c-6.627 0-12 5.373-12 12zm0 96v12c0 6.627 5.373 12 12 12h84v-24H12c-6.627 0-12 5.373-12 12zm0 96v12c0 6.627 5.373 12 12 12h84v-24H12c-6.627 0-12 5.373-12 12zm0 96v12c0 6.627 5.373 12 12 12h84v-24H12c-6.627 0-12 5.373-12 12zM192 144c0-8.84 7.16-16 16-16h96c8.84 0 16 7.16 16 16v224c0 8.84-7.16 16-16 16h-96c-8.84 0-16-7.16-16-16V144z" fill="white" transform="translate(5,5) scale(0.045)"/>`;
        break;
      case 'fas fa-server':
        // Official Server icon SVG from Font Awesome
        iconPath = `<path d="M480 160H32c-17.673 0-32-14.327-32-32V64c0-17.673 14.327-32 32-32h448c17.673 0 32 14.327 32 32v64c0 17.673-14.327 32-32 32zm-48-88c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm112 248H32c-17.673 0-32-14.327-32-32v-64c0-17.673 14.327-32 32-32h448c17.673 0 32 14.327 32 32v64c0 17.673-14.327 32-32 32zm-48-88c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm112 248H32c-17.673 0-32-14.327-32-32v-64c0-17.673 14.327-32 32-32h448c17.673 0 32 14.327 32 32v64c0 17.673-14.327 32-32 32zm-48-88c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24zm-64 0c-13.255 0-24 10.745-24 24s10.745 24 24 24 24-10.745 24-24-10.745-24-24-24z" fill="white" transform="translate(4,4) scale(0.045)"/>`;
        break;
      case 'fas fa-stream':
        // Official Stream icon SVG from Font Awesome
        iconPath = `<path d="M16 128h416c8.84 0 16-7.16 16-16V80c0-8.84-7.16-16-16-16H16C7.16 64 0 71.16 0 80v32c0 8.84 7.16 16 16 16zm480 80H80c-8.84 0-16 7.16-16 16v32c0 8.84 7.16 16 16 16h416c8.84 0 16-7.16 16-16v-32c0-8.84-7.16-16-16-16zm-64 176H16c-8.84 0-16 7.16-16 16v32c0 8.84 7.16 16 16 16h416c8.84 0 16-7.16 16-16v-32c0-8.84-7.16-16-16-16z" fill="white" transform="translate(5,7) scale(0.05)"/>`;
        break;
      case 'fas fa-fire':
        // Official Fire icon SVG from Font Awesome
        iconPath = `<path d="M216.3 158.4c.5-1 .5-2.2 0-3.2-8.3-16.8-13.9-34.7-16.5-53.2-.3-2.3-2.7-3.5-4.6-2.3-17.2 11.1-33.5 24.6-48.1 39.8-40.7 42.4-65.1 98.4-65.1 159.5 0 106 86 192 192 192s192-86 192-192c0-170.9-168-193.8-249.7-140.6zM296 448c-79.5 0-144-64.5-144-144 0-28.4 6.5-55.4 18.1-79.4 11.6 13.6 25 26.1 40.1 37.1 3.8 2.8 9.1.3 9.3-4.4 1.1-21.3 5.6-41.9 13.4-61.2 21.3 26.6 46.8 49.7 75.6 68.3 1.7 1.1 4-.5 3.5-2.5-2.5-9.7-3.8-19.8-3.8-30.1 0-63.4 48.1-116.9 110.4-123.5C465.7 118.1 512 181.8 512 256c0 79.5-64.5 144-144 144z" fill="white" transform="translate(4,4) scale(0.045)"/>`;
        break;
      default:
        // Default cube icon
        iconPath = `<path d="M16 2l-8 4v8l8 4 8-4V6l-8-4zm0 2.5L22 7v6.5l-6 3V10l-6-3 6-2.5z" fill="white" transform="translate(2,2) scale(1.3)"/>`;
    }
    
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">
      <!-- Colored header section (35% = 49px) -->
      <rect x="0" y="0" width="140" height="49" fill="${color}"/>
      <!-- White body section -->
      <rect x="0" y="49" width="140" height="91" fill="#ffffff"/>
      <!-- Icon in header (centered, scaled to fit) -->
      <g transform="translate(55, 10) scale(1.5)">
        ${iconPath}
      </g>
    </svg>`;
    
    const encoded = encodeURIComponent(svgContent);
    return `data:image/svg+xml,${encoded}`;
  }

  // Helper method to generate SVG data URI for Font Awesome icons
  generateIconSVG(faIcon: string, color: string): string {
    // Create simple SVG icons based on the Font Awesome class
    let svgContent = '';
    
    switch (faIcon) {
      case 'fab fa-aws':
        // AWS logo - simplified orange smile
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <path d="M20 35 Q32 42 44 35" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M25 28 L30 32 M39 28 L34 32" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`;
        break;
      case 'fab fa-microsoft':
        // Microsoft logo - 4 squares
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <rect x="18" y="18" width="12" height="12" fill="${color}"/>
          <rect x="34" y="18" width="12" height="12" fill="${color}"/>
          <rect x="18" y="34" width="12" height="12" fill="${color}"/>
          <rect x="34" y="34" width="12" height="12" fill="${color}"/>
        </svg>`;
        break;
      case 'fab fa-google':
        // Google logo - simplified G
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="16" fill="none" stroke="${color}" stroke-width="4"/>
          <path d="M32 22 L32 32 L44 32" stroke="${color}" stroke-width="4" fill="none"/>
        </svg>`;
        break;
      case 'fas fa-brain':
        // Brain icon
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <path d="M24 20 Q16 20 16 28 Q16 36 24 36 Q24 44 32 44 Q40 44 40 36 Q48 36 48 28 Q48 20 40 20 Q40 12 32 12 Q24 12 24 20" fill="${color}"/>
        </svg>`;
        break;
      case 'fas fa-comments':
        // Chat bubbles
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <rect x="12" y="18" width="28" height="18" rx="4" fill="${color}"/>
          <polygon points="20,36 24,42 28,36" fill="${color}"/>
          <rect x="24" y="28" width="28" height="18" rx="4" fill="${color}" opacity="0.7"/>
        </svg>`;
        break;
      case 'fas fa-database':
        // Database icon
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <ellipse cx="32" cy="22" rx="16" ry="6" fill="${color}"/>
          <rect x="16" y="22" width="32" height="20" fill="${color}"/>
          <ellipse cx="32" cy="42" rx="16" ry="6" fill="${color}"/>
          <ellipse cx="32" cy="32" rx="16" ry="6" fill="${color}" opacity="0.6"/>
        </svg>`;
        break;
      case 'fas fa-server':
        // Server icon
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <rect x="16" y="16" width="32" height="10" rx="2" fill="${color}"/>
          <rect x="16" y="28" width="32" height="10" rx="2" fill="${color}"/>
          <rect x="16" y="40" width="32" height="10" rx="2" fill="${color}"/>
          <circle cx="22" cy="21" r="2" fill="white"/>
          <circle cx="22" cy="33" r="2" fill="white"/>
          <circle cx="22" cy="45" r="2" fill="white"/>
        </svg>`;
        break;
      case 'fas fa-cube':
        // Cube/box icon
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <polygon points="32,16 48,26 48,42 32,52 16,42 16,26" fill="${color}"/>
          <polygon points="32,16 48,26 32,36 16,26" fill="${color}" opacity="0.8"/>
          <line x1="32" y1="36" x2="32" y2="52" stroke="white" stroke-width="2"/>
        </svg>`;
        break;
      case 'fas fa-network-wired':
        // Network icon
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <line x1="16" y1="32" x2="48" y2="32" stroke="${color}" stroke-width="3"/>
          <circle cx="16" cy="32" r="4" fill="${color}"/>
          <circle cx="32" cy="32" r="4" fill="${color}"/>
          <circle cx="48" cy="32" r="4" fill="${color}"/>
          <line x1="32" y1="28" x2="32" y2="20" stroke="${color}" stroke-width="2"/>
          <circle cx="32" cy="16" r="4" fill="${color}"/>
          <line x1="32" y1="36" x2="32" y2="44" stroke="${color}" stroke-width="2"/>
          <circle cx="32" cy="48" r="4" fill="${color}"/>
        </svg>`;
        break;
      default:
        // Default: circle
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="20" fill="${color}"/>
        </svg>`;
    }
    
    // Convert to data URI
    const encoded = encodeURIComponent(svgContent);
    return `data:image/svg+xml,${encoded}`;
  }

  // Drag & Drop from sidebar
  onDragStart(event: DragEvent, item: ServiceItem): void {
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('text/plain', JSON.stringify(item));
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!this.cy) return;
    
    // Don't add nodes if edit modal or context menu is open
    if (this.editModal.visible || this.contextMenu.visible) {
      console.log('⚠️ Skipping node drop - modal/menu is open');
      return;
    }

    const data = event.dataTransfer!.getData('text/plain');
    if (!data) return; // No data to drop
    
    const item: ServiceItem = JSON.parse(data);

    const container = this.cytoscapeContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    
    // Use pan and zoom to convert coordinates
    const pan = this.cy.pan();
    const zoom = this.cy.zoom();
    
    const x = ((event.clientX - rect.left) - pan.x) / zoom;
    const y = ((event.clientY - rect.top) - pan.y) / zoom;

    this.addNode(x, y, item);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  addNode(x: number, y: number, item: ServiceItem): void {
    if (!this.cy) return;

    const nodeId = `node-${Date.now()}`;
    const service = item.name;
    const icon = item.icon;
    const color = item.color;
    const description = item.description || '';
    
    // Check if this is a basic shape
    let shape = 'roundrectangle';
    let cssClass = '';
    
    if (item.shape) {
      // This is a basic shape from the shapes category
      shape = item.shape;
      cssClass = item.shape;
    }
    else if (service === 'Circle') {
      shape = 'ellipse';
      cssClass = 'circle';
    }
    else if (service === 'Diamond') {
      shape = 'diamond';
      cssClass = 'diamond';
    }
    else if (service === 'Start') {
      shape = 'triangle';
      cssClass = 'triangle';
    }
    else if (service === 'End') {
      shape = 'rectangle';
      cssClass = 'rectangle';
    }
    else if (service === 'Rectangle') {
      shape = 'rectangle';
      cssClass = 'rectangle';
    }
    else if (service === 'Box') {
      shape = 'rectangle';
      cssClass = 'box';
    }

    // Initialize property values from defaults
    const propertyValues: { [key: string]: any } = {};
    if (item.properties) {
      Object.keys(item.properties).forEach(key => {
        const propConfig = item.properties![key];
        propertyValues[key] = propConfig.default || '';
      });
    }

    const isShapeContainer = item.shape ? true : false;
    console.log(`➕ Adding node: ${service}, isShape: ${isShapeContainer}, icon: ${item.faIcon || icon}`);
    
    const newNode = this.cy.add({
      group: 'nodes',
      data: {
        id: nodeId,
        label: item.shape ? '' : service, // Empty label for basic shapes
        color: color,
        shape: shape,
        service: service,
        icon: item.shape ? '' : icon, // No icon for basic shapes
        faIcon: item.faIcon || icon,
        description: description,
        provider: '',
        definition: '',
        properties: item.properties || {},
        propertyValues: propertyValues,
        isShape: isShapeContainer // Flag to identify basic shapes
      },
      position: { x, y },
      classes: cssClass,
      grabbable: true,
      selectable: true,
      locked: false
    });

    // Make basic shapes resizable and able to contain other nodes
    if (item.shape) {
      // Set larger default size for container shapes
      const shapeWidth = '250px';
      const shapeHeight = '200px';
      
      // Store dimensions and border style in node data
      newNode.data('width', shapeWidth);
      newNode.data('height', shapeHeight);
      newNode.data('borderStyle', 'dashed');
      
      newNode.style({
        'width': shapeWidth,
        'height': shapeHeight,
        'background-color': 'transparent',
        'background-opacity': 0, // Fully transparent
        'background-image': 'none',
        'border-width': 3,
        'border-style': 'dashed',
        'border-color': color,
        'border-opacity': 0.9,
        'label': ''
      });
      console.log(`✅ Added ${shape} shape (container-ready) with dashed border`);
    } else {
      // Regular component nodes - apply card styling with icon and label
      newNode.data('width', '140px');
      newNode.data('height', '140px');
      newNode.data('borderStyle', 'solid');
      
      newNode.style({
        'width': '140px',
        'height': '140px',
        'background-color': '#ffffff',
        'background-opacity': 1,
        'background-image': this.generateCardBackgroundSVG(item.faIcon || icon, color),
        'background-fit': 'cover',
        'background-clip': 'node',
        'border-width': 3,
        'border-style': 'solid',
        'border-color': color,
        'border-opacity': 1,
        'label': service,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-margin-y': 40,
        'color': '#1f2937',
        'font-size': '13px',
        'font-weight': '600'
      });
      console.log(`✅ Added ${service} component with icon: ${item.faIcon || icon}`);
    }

    // Force Box nodes to be grabbable
    if (service === 'Box') {
      newNode.ungrabify();
      newNode.grabify();
      console.log('📦 Box node created and made grabbable');
    }

    this.saveHistory();
    if (!item.shape) {
      console.log(`✅ Added ${service} node with shape: ${shape}, class: ${cssClass}`);
    }
  }

  // Note: connectNodes() is no longer needed - using drag-to-connect with edgehandles
  // Connections are now created by dragging from one node to another

  // Auto Layout
  autoLayout(): void {
    if (!this.cy) return;

    const layout = this.cy.layout({
      name: 'breadthfirst',
      directed: true,
      spacingFactor: 1.5,
      padding: 50,
      animate: true,
      animationDuration: 500
    });

    layout.run();
    this.saveHistory();
  }

  // Auto-arrange layout after import with compact spacing and better zoom
  autoArrangeAfterImport(): void {
    if (!this.cy) return;

    // Check if there are any groups
    const groups = this.cy.nodes().filter((n: any) => n.data('isGroup') || n.isParent());
    const hasGroups = groups.length > 0;

    if (hasGroups) {
      // Use cose (compound spring embedder) for better group layouts - more compact
      const layout = this.cy.layout({
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        // Compact spacing settings
        nodeRepulsion: 8000,          // Reduced from default to make more compact
        idealEdgeLength: 100,          // Shorter edges
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 1,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
        // Respect compound nodes
        nodeOverlap: 10,
        padding: 30,                   // Reduced padding for compact layout
        randomize: false
      });
      layout.run();
    } else {
      // For simple diagrams, use breadthfirst with compact settings
      const layout = this.cy.layout({
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.2,           // Tighter spacing
        padding: 30,                   // Less padding
        animate: true,
        animationDuration: 800,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true
      });
      layout.run();
    }

    // Fit to screen after layout completes
    setTimeout(() => {
      this.fitToScreen();
      console.log('✅ Auto-arranged with compact layout and fitted to screen');
    }, 1100);
  }

  // Clear canvas
  clearCanvas(): void {
    if (confirm('Are you sure you want to clear the canvas?')) {
      this.cy?.elements().remove();
      this.saveHistory();
    }
  }

  // Export as JSON (Optimized - supports simple format)
  exportJSON(): void {
    if (!this.cy) return;

    // Ask user which format they want
    const format = prompt(
      'Choose export format:\n\n' +
      '1. Simple format (nodes + connections)\n' +
      '2. Cytoscape format (elements)\n\n' +
      'Enter 1 or 2:',
      '1'
    );

    if (!format || (format !== '1' && format !== '2')) {
      return;
    }

    let dataStr: string;
    let fileName: string;

    if (format === '1') {
      // Simple format: { nodes: [], connections: [] }
      const nodes = this.cy.nodes().map((node: any) => {
        const nodeData: any = {
          id: node.id(),
          name: node.data('label'),
          icon: node.data('icon') || '📦',
          color: node.data('color') || '#3B82F6',
          x: Math.round(node.position().x),
          y: Math.round(node.position().y)
        };

        // Always add width and height (rounded to whole numbers)
        const width = node.data('width') || node.style('width') || '140px';
        const height = node.data('height') || node.style('height') || '140px';
        const widthNum = Math.round(parseFloat(width));
        const heightNum = Math.round(parseFloat(height));
        nodeData.width = widthNum;
        nodeData.height = heightNum;

        // Save parent relationship for nodes inside groups
        if (node.data('parent')) {
          nodeData.parent = node.data('parent');
        }
        
        // Save group properties
        if (node.data('isGroup')) {
          nodeData.isGroup = true;
        }
        if (node.data('groupName')) {
          nodeData.groupName = node.data('groupName');
        }
        if (node.data('groupColor')) {
          nodeData.groupColor = node.data('groupColor');
        }
        if (node.data('groupBorderStyle')) {
          nodeData.groupBorderStyle = node.data('groupBorderStyle');
        }
        if (node.data('groupBackgroundColor')) {
          nodeData.groupBackgroundColor = node.data('groupBackgroundColor');
        }

        // Add component properties as single object
        const componentProps: any = {};
        if (node.data('description')) componentProps.description = node.data('description');
        if (node.data('provider')) componentProps.provider = node.data('provider');
        if (node.data('definition')) componentProps.definition = node.data('definition');
        const nodeProps = node.data('properties') || {};
        if (Object.keys(nodeProps).length > 0) {
          componentProps.properties = nodeProps;
          componentProps.propertyValues = node.data('propertyValues') || {};
        }
        
        if (Object.keys(componentProps).length > 0) {
          nodeData.componentProperties = componentProps;
        }

        return nodeData;
      });

      const connections = this.cy.edges().map((edge: any) => {
        const conn: any = {
          from: edge.data('source'),
          to: edge.data('target')
        };
        
        if (edge.data('label')) conn.label = edge.data('label');
        if (edge.data('lineColor')) conn.color = edge.data('lineColor');
        if (edge.data('lineStyle')) conn.style = edge.data('lineStyle');
        if (edge.data('lineWidth')) conn.width = edge.data('lineWidth');
        
        return conn;
      });

      const simpleData = { nodes, connections };
      dataStr = JSON.stringify(simpleData, null, 2);
      fileName = `architecture-simple-${Date.now()}.json`;
      
      console.log('✅ Simple format exported');
      console.log(`📦 ${nodes.length} nodes, ${connections.length} connections`);
      
    } else {
      // Cytoscape format: { version: '1.0', elements: [] }
      const elements = this.cy.elements().jsons();
      
      const minimalData = {
        version: '1.0',
        elements: elements.map((ele: any) => {
          if (ele.group === 'nodes') {
            const nodeData: any = {
              id: ele.data.id,
              label: ele.data.label,
              color: ele.data.color,
              shape: ele.data.shape,
              service: ele.data.service,
              icon: ele.data.icon
            };

            // Always add width and height (rounded to whole numbers)
            const width = ele.data.width || ele.style?.width || '140px';
            const height = ele.data.height || ele.style?.height || '140px';
            const widthNum = Math.round(parseFloat(width));
            const heightNum = Math.round(parseFloat(height));
            nodeData.width = widthNum;
            nodeData.height = heightNum;

            // Add component properties as single object
            const componentProps: any = {};
            if (ele.data.description) componentProps.description = ele.data.description;
            if (ele.data.provider) componentProps.provider = ele.data.provider;
            if (ele.data.definition) componentProps.definition = ele.data.definition;
            const eleProps = ele.data.properties || {};
            if (Object.keys(eleProps).length > 0) {
              componentProps.properties = eleProps;
              componentProps.propertyValues = ele.data.propertyValues || {};
            }
            
            if (Object.keys(componentProps).length > 0) {
              nodeData.componentProperties = componentProps;
            }

            return {
              group: 'nodes',
              data: nodeData,
              position: ele.position,
              classes: ele.classes
            };
          } else {
            return {
              group: 'edges',
              data: {
                id: ele.data.id,
                source: ele.data.source,
                target: ele.data.target,
                label: ele.data.label || '',
                lineColor: ele.data.lineColor || '#06b6d4',
                lineStyle: ele.data.lineStyle || 'solid',
                lineWidth: ele.data.lineWidth || 3
              }
            };
          }
        })
      };

      dataStr = JSON.stringify(minimalData, null, 2);
      fileName = `architecture-cytoscape-${Date.now()}.json`;
      
      console.log('✅ Cytoscape format exported');
      console.log(`📦 ${elements.length} elements`);
    }

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  // Import JSON (supports multiple formats)
  importDiagram(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event: any) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          // Clear current diagram
          this.cy?.elements().remove();
          
          // Check format and import accordingly
          if (importData.nodes && importData.connections) {
            // Simple format: { nodes: [], connections: [] }
            console.log('📥 Importing simple format...');
            
            // Import nodes
            importData.nodes.forEach((node: any) => {
              // Check if this is a group/container node - use saved flag or fallback to heuristics
              const isGroup = node.isGroup || node.id.startsWith('group-') || node.name === '' || node.icon === '📦';
              
              const nodeData: any = {
                id: node.id,
                label: isGroup ? '' : (node.name || node.label || node.id),
                color: node.color || '#3B82F6',
                shape: node.shape || 'roundrectangle',
                service: node.name || node.label || 'Custom',
                icon: isGroup ? '' : (node.icon || '📦'),
                faIcon: isGroup ? '' : (node.icon || '📦'),
                isShape: isGroup // Mark groups as shapes
              };

              // Restore group properties
              if (isGroup) {
                if (node.groupName) nodeData.groupName = node.groupName;
                if (node.groupColor) nodeData.groupColor = node.groupColor;
                if (node.groupBorderStyle) nodeData.groupBorderStyle = node.groupBorderStyle;
                if (node.groupBackgroundColor) nodeData.groupBackgroundColor = node.groupBackgroundColor;
                nodeData.isGroup = true;
              }

              // Save parent relationship to restore later
              if (node.parent) {
                nodeData.parent = node.parent;
              }

              // Restore component properties from single object
              if (node.componentProperties) {
                nodeData.description = node.componentProperties.description || '';
                nodeData.provider = node.componentProperties.provider || '';
                nodeData.definition = node.componentProperties.definition || '';
                nodeData.properties = node.componentProperties.properties || {};
                nodeData.propertyValues = node.componentProperties.propertyValues || {};
              }

              // Restore custom size
              if (node.width) nodeData.width = `${node.width}px`;
              if (node.height) nodeData.height = `${node.height}px`;
              if (isGroup) {
                nodeData.borderStyle = 'dashed';
              }

              const addedNode = this.cy?.add({
                group: 'nodes',
                data: nodeData,
                position: {
                  x: node.x || Math.random() * 800 + 100,
                  y: node.y || Math.random() * 600 + 100
                }
                // Don't set grabbable/selectable/locked here - let group styling handle it
              });

              // Apply custom size and styling
              if (addedNode && addedNode.length > 0) {
                const n = addedNode[0];
                
                if (isGroup) {
                  // Restore group styling with saved properties
                  const groupColor = nodeData.groupColor || node.color || '#818cf8';
                  const groupBorderStyle = nodeData.groupBorderStyle || 'dashed';
                  const groupBgColor = nodeData.groupBackgroundColor || 'transparent';
                  const groupLabel = nodeData.groupName || '';
                  
                  n.style({
                    'width': node.width || '250px',
                    'height': node.height || '200px',
                    'background-color': groupBgColor,
                    'background-opacity': groupBgColor === 'transparent' ? 0 : 0.1,
                    'background-image': 'none',
                    'border-width': 3,
                    'border-style': groupBorderStyle,
                    'border-color': groupColor,
                    'border-opacity': 0.9,
                    'label': groupLabel,
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'font-size': '16px',
                    'font-weight': 'bold',
                    'color': groupColor,
                    'z-index': 0,
                    'padding': '50px'
                  } as any);
                  
                  // Make groups draggable and selectable like our working groups
                  n.grabify();
                  n.selectify();
                  n.unlock();
                  
                  console.log(`✅ Imported group: ${node.id} (${groupLabel}) - draggable and connectable`);
                } else {
                  // Regular node styling: with card background
                  if (node.width || node.height) {
                    n.style({
                      'width': node.width || '140px',
                      'height': node.height || '140px'
                    });
                  }
                  
                  // Regenerate background
                  const bgSvg = this.generateCardBackgroundSVG(nodeData.icon, nodeData.color);
                  n.style('background-image', bgSvg);
                  console.log(`✅ Imported node: ${node.name} with icon`);
                }
              }
            });
            
            // Import connections
            importData.connections.forEach((conn: any) => {
              try {
                const edgeData: any = {
                  id: conn.id || `edge-${conn.from}-${conn.to}-${Date.now()}`,
                  source: conn.from || conn.source,
                  target: conn.to || conn.target,
                  label: conn.label || '',
                  lineColor: conn.color || '#06b6d4',
                  lineStyle: conn.style || 'solid',
                  lineWidth: conn.width || 3
                };
                
                // Preserve parent relationship for edges inside groups
                if (conn.parent) {
                  edgeData.parent = conn.parent;
                }
                
                const addedEdge = this.cy?.add({
                  group: 'edges',
                  data: edgeData
                });

                // Apply edge styling
                if (addedEdge && addedEdge.length > 0) {
                  const e = addedEdge[0];
                  let lineDashPattern: any = 'solid';
                  if (edgeData.lineStyle === 'dashed') {
                    lineDashPattern = [10, 5];
                  } else if (edgeData.lineStyle === 'dotted') {
                    lineDashPattern = [2, 3];
                  }

                  e.style({
                    'line-color': edgeData.lineColor,
                    'target-arrow-color': edgeData.lineColor,
                    'width': edgeData.lineWidth,
                    'line-style': lineDashPattern === 'solid' ? 'solid' : 'dashed',
                    'line-dash-pattern': lineDashPattern === 'solid' ? undefined : lineDashPattern
                  });
                }
              } catch (error) {
                console.warn(`⚠️ Skipped invalid connection: ${conn.source || conn.from} → ${conn.target || conn.to}`, error);
              }
            });
            
            // After all nodes are imported, restore parent-child relationships
            if (this.cy) {
              importData.nodes.forEach((node: any) => {
                if (node.parent) {
                  const childNode = this.cy!.getElementById(node.id);
                  const parentNode = this.cy!.getElementById(node.parent);
                  
                  if (childNode.length > 0 && parentNode.length > 0) {
                    childNode.move({ parent: node.parent });
                    console.log(`✅ Restored parent relationship: ${node.id} → ${node.parent}`);
                  } else {
                    console.warn(`⚠️ Could not restore parent: child=${node.id}, parent=${node.parent}`);
                  }
                }
              });
              
              // Ensure groups expand to fit their children
              const groupNodes = this.cy.nodes().filter((n: any) => n.data('isGroup') || n.id().startsWith('group-'));
              groupNodes.forEach((group: any) => {
                const children = group.children();
                if (children.length > 0) {
                  console.log(`✅ Group ${group.id()} has ${children.length} children`);
                }
              });
            }
            
            // Ensure all nodes are unlocked and draggable AFTER parent relationships are set
            this.cy?.nodes().forEach((n: any) => {
              n.unlock();
              n.grabify();
              n.selectify();
            });
            
            // Re-enable edgehandles and setup event handlers after import
            const eh = (this.cy as any).edgehandles_instance;
            if (eh) {
              eh.disableDrawMode(); // Start with draw mode disabled so nodes are draggable
              eh.enable();
              console.log('✅ Edgehandles re-enabled after import, draw mode disabled');
            }
            
            // Reinitialize event handlers to ensure center/edge detection works
            this.setupEventHandlers();
            console.log('✅ Event handlers reinitialized after import');
            
            this.saveHistory();
            
            // Auto-arrange layout after import with smart spacing
            this.autoArrangeAfterImport();
            
            const nodeCount = importData.nodes.length;
            const edgeCount = importData.connections.length;
            
            alert(`✅ Simple format imported!\n📦 ${nodeCount} nodes, ${edgeCount} connections`);
            console.log(`✅ Imported ${nodeCount} nodes and ${edgeCount} edges (simple format)`);
            
          } else if (importData.elements) {
            // Cytoscape format: { elements: [] } or { version: '1.0', elements: [] }
            console.log('📥 Importing Cytoscape format...');
            
            importData.elements.forEach((ele: any) => {
              if (ele.group === 'nodes' && ele.data.componentProperties) {
                // Restore component properties from single object
                ele.data.description = ele.data.componentProperties.description || '';
                ele.data.provider = ele.data.componentProperties.provider || '';
                ele.data.definition = ele.data.componentProperties.definition || '';
                ele.data.properties = ele.data.componentProperties.properties || {};
                ele.data.propertyValues = ele.data.componentProperties.propertyValues || {};
                delete ele.data.componentProperties;
              }

              const addedEle = this.cy?.add(ele);

              // Apply custom size if present
              if (ele.group === 'nodes' && addedEle && addedEle.length > 0) {
                const n = addedEle[0];
                if (ele.data.width || ele.data.height) {
                  n.style({
                    'width': ele.data.width || '140px',
                    'height': ele.data.height || '140px'
                  });
                }
                
                // Regenerate background
                const bgSvg = this.generateCardBackgroundSVG(ele.data.icon, ele.data.color);
                n.style('background-image', bgSvg);
              } else if (ele.group === 'edges' && addedEle && addedEle.length > 0) {
                // Apply edge styling
                const e = addedEle[0];
                const lineColor = ele.data.lineColor || '#06b6d4';
                const lineStyle = ele.data.lineStyle || 'solid';
                const lineWidth = ele.data.lineWidth || 3;
                
                let lineDashPattern: any = 'solid';
                if (lineStyle === 'dashed') {
                  lineDashPattern = [10, 5];
                } else if (lineStyle === 'dotted') {
                  lineDashPattern = [2, 3];
                }

                e.style({
                  'line-color': lineColor,
                  'target-arrow-color': lineColor,
                  'width': lineWidth,
                  'line-style': lineDashPattern === 'solid' ? 'solid' : 'dashed',
                  'line-dash-pattern': lineDashPattern === 'solid' ? undefined : lineDashPattern
                });
              }
            });
            
            // Ensure all nodes are unlocked and draggable
            this.cy?.nodes().unlock();
            
            this.saveHistory();
            this.fitToScreen();
            
            const nodeCount = this.cy?.nodes().length || 0;
            const edgeCount = this.cy?.edges().length || 0;
            
            alert(`✅ Diagram imported!\n📦 ${nodeCount} nodes, ${edgeCount} connections`);
            console.log(`✅ Imported ${nodeCount} nodes and ${edgeCount} edges (Cytoscape format)`);
            
          } else {
            alert('❌ Invalid JSON format!\n\nSupported formats:\n1. Simple: { nodes: [], connections: [] }\n2. Cytoscape: { elements: [] }');
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('❌ Error importing diagram.\nPlease check the file format.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  // Save canvas to browser localStorage
  saveCanvas(): void {
    if (!this.cy) return;

    // Save minimal data to localStorage including viewport
    const elements = this.cy.elements().jsons();
    const minimalData = {
      version: '1.0',
      viewport: {
        zoom: this.cy.zoom(),
        pan: this.cy.pan()
      },
      elements: elements.map((ele: any) => ({
        group: ele.group,
        data: ele.group === 'nodes' ? {
          id: ele.data.id,
          label: ele.data.label,
          color: ele.data.color,
          shape: ele.data.shape,
          service: ele.data.service,
          icon: ele.data.icon,
          faIcon: ele.data.faIcon,
          width: ele.style?.width || ele.data.width || '140px',
          height: ele.style?.height || ele.data.height || '140px',
          description: ele.data.description || '',
          provider: ele.data.provider || '',
          definition: ele.data.definition || '',
          properties: ele.data.properties || {},
          propertyValues: ele.data.propertyValues || {},
          isShape: ele.data.isShape || false,
          isGroup: ele.data.isGroup || false,  // Save group flag
          groupName: ele.data.groupName || '',  // Save group name
          borderStyle: ele.data.borderStyle || 'solid',
          parent: ele.data.parent || undefined
        } : {
          id: ele.data.id,
          source: ele.data.source,
          target: ele.data.target,
          label: ele.data.label || '',
          lineColor: ele.data.lineColor || '#06b6d4',
          lineStyle: ele.data.lineStyle || 'solid',
          lineWidth: ele.data.lineWidth || 3,
          parent: ele.data.parent || undefined  // Save edge parent for compound edges
        },
        position: ele.position,
        classes: ele.classes
      }))
    };

    localStorage.setItem('cytoscape-canvas', JSON.stringify(minimalData));
    
    const now = new Date();
    this.ngZone.run(() => {
      this.lastSaved = now.toLocaleTimeString();
    });
    
    console.log('✅ Canvas saved to browser (minimal format)');
  }

  // Load canvas from browser localStorage
  loadCanvas(): void {
    if (!this.cy) {
      console.warn('⚠️ Cannot load canvas - Cytoscape not initialized');
      return;
    }

    const saved = localStorage.getItem('cytoscape-canvas');
    console.log('🔍 Checking localStorage for saved canvas...');
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        console.log('📦 Found saved data:', data);
        
        if (data.elements && data.elements.length > 0) {
          data.elements.forEach((ele: any) => {
            this.cy?.add(ele);
          });
          
          // Restore node sizes and regenerate styles
          this.cy.$('node').forEach((node: any) => {
            const color = node.data('color') || '#3b82f6';
            const faIcon = node.data('faIcon') || node.data('icon') || '';
            const service = node.data('service') || '';
            const width = node.data('width') || '140px';
            const height = node.data('height') || '140px';
            const isShape = node.data('isShape');
            const isGroup = node.data('isGroup');
            const groupName = node.data('groupName');
            const borderStyle = node.data('borderStyle') || 'solid';
            const isParent = node.isParent(); // Check if node has children
            
            // Different styling for groups vs shapes vs regular nodes
            if (isGroup && isParent) {
              // Group nodes: special compound node styling
              node.style({
                'background-color': 'transparent',
                'background-opacity': 0,
                'border-color': color,
                'border-style': borderStyle,
                'border-width': 3,
                'label': groupName || service || '',
                'text-valign': 'top',
                'text-halign': 'center',
                'font-size': '16px',
                'font-weight': 'bold',
                'padding': '50px'
              });
              // Ensure groups are grabbable
              node.grabify();
              node.selectify();
            } else if (isShape || isParent) {
              // Shape containers and parent nodes: transparent with no background
              node.style({
                'width': width,
                'height': height,
                'background-color': 'transparent',
                'background-opacity': 0,
                'background-image': 'none',
                'border-color': color,
                'border-style': borderStyle,
                'border-width': 3,
                'label': ''
              });
            } else {
              // Regular nodes: with card background
              node.style({
                'width': width,
                'height': height,
                'background-image': this.generateCardBackgroundSVG(faIcon, color),
                'border-color': color,
                'label': service
              });
            }
          });
          
          // Restore edge styles
          this.cy.$('edge').forEach((edge: any) => {
            const lineColor = edge.data('lineColor') || '#06b6d4';
            const lineStyle = edge.data('lineStyle') || 'solid';
            const lineWidth = edge.data('lineWidth') || 3;
            
            let lineDashPattern: any = 'solid';
            if (lineStyle === 'dashed') {
              lineDashPattern = [10, 5];
            } else if (lineStyle === 'dotted') {
              lineDashPattern = [2, 3];
            }
            
            edge.style({
              'line-color': lineColor,
              'target-arrow-color': lineColor,
              'width': lineWidth,
              'line-style': lineDashPattern === 'solid' ? 'solid' : 'dashed',
              'line-dash-pattern': lineDashPattern === 'solid' ? undefined : lineDashPattern
            });
          });
          
          // Ensure all nodes are unlocked and draggable
          this.cy.nodes().unlock();
          
          // Always use a reasonable default zoom instead of fitToScreen
          // Fit with padding but constrain maximum zoom to prevent oversizing
          const boundingBox = this.cy.elements().boundingBox();
          const container = this.cytoscapeContainer.nativeElement;
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          
          // Calculate zoom to fit with padding, but cap it at 1.0
          const padding = 100;
          const zoomX = containerWidth / (boundingBox.w + padding * 2);
          const zoomY = containerHeight / (boundingBox.h + padding * 2);
          const calculatedZoom = Math.min(zoomX, zoomY, 1.0); // Cap at 1.0 to prevent oversizing
          
          this.cy.viewport({
            zoom: calculatedZoom,
            pan: {
              x: (containerWidth - boundingBox.w * calculatedZoom) / 2 - boundingBox.x1 * calculatedZoom,
              y: (containerHeight - boundingBox.h * calculatedZoom) / 2 - boundingBox.y1 * calculatedZoom
            }
          });
          
          console.log(`✅ Loaded ${data.elements.length} elements with zoom: ${calculatedZoom.toFixed(2)}`);
          this.saveHistory(); // Save initial state to history
        } else {
          console.log('ℹ️ Saved data exists but has no elements');
        }
      } catch (error) {
        console.error('❌ Error loading saved canvas:', error);
      }
    } else {
      console.log('ℹ️ No saved canvas found in localStorage');
    }
  }

  // History Management
  private saveHistory(): void {
    if (!this.cy) return;
    
    this.history.splice(this.historyIndex + 1);
    const currentState = this.cy.json();
    this.history.push(JSON.parse(JSON.stringify(currentState)));
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    
    this.updateHistoryButtons();
    
    // Also save to localStorage on every change
    this.saveCanvas();
  }

  private updateHistoryButtons(): void {
    this.canUndo = this.historyIndex > 0;
    this.canRedo = this.historyIndex < this.history.length - 1;
  }

  undo(): void {
    if (!this.cy) return;
    
    const ur = (this.cy as any).ur;
    if (ur && typeof ur.undo === 'function') {
      ur.undo();
      console.log('↩️ Undo performed');
      this.saveCanvas();
    } else {
      console.log('⚠️ Undo/Redo not available');
    }
  }

  redo(): void {
    if (!this.cy) return;
    
    const ur = (this.cy as any).ur;
    if (ur && typeof ur.redo === 'function') {
      ur.redo();
      console.log('↪️ Redo performed');
      this.saveCanvas();
    } else {
      console.log('⚠️ Undo/Redo not available');
    }
  }

  // Context Menu
  showContextMenu(event: MouseEvent, elementId: string, type: 'node' | 'edge' | 'canvas'): void {
    event.preventDefault();
    
    // Don't show context menu if we're in a double-click operation or if edit modal is open
    if (this.isDoubleClicking || this.editModal.visible) {
      console.log('⚠️ Skipping context menu - double-click in progress or modal is open');
      return;
    }
    
    console.log(`📋 Context menu opened for ${type}:`, elementId);
    
    // Run inside Angular zone to ensure change detection
    this.ngZone.run(() => {
      this.contextMenu = {
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: type === 'node' ? elementId : null,
        edgeId: type === 'edge' ? elementId : null,
        type: type
      };
      console.log('📋 Context menu state:', this.contextMenu);
    });
  }

  deleteNode(): void {
    if (this.contextMenu.nodeId && this.cy) {
      this.cy.$(`#${this.contextMenu.nodeId}`).remove();
      this.contextMenu.visible = false;
      this.saveHistory();
    }
  }

  deleteEdge(): void {
    if (this.contextMenu.edgeId && this.cy) {
      this.cy.$(`#${this.contextMenu.edgeId}`).remove();
      this.contextMenu.visible = false;
      this.saveHistory();
    } else if (this.cy) {
      // Fallback: delete selected edges
      const selectedEdges = this.cy.$(':selected').edges();
      if (selectedEdges.length > 0) {
        selectedEdges.remove();
        this.saveHistory();
      }
    }
  }

  editEdge(): void {
    if (this.contextMenu.edgeId && this.cy) {
      const edge = this.cy.$(`#${this.contextMenu.edgeId}`);
      if (edge.length > 0) {
        this.openEdgeEditModal(edge[0]);
      }
      this.contextMenu.visible = false;
    }
  }

  insertNodeBetween(): void {
    if (this.contextMenu.edgeId && this.cy) {
      const edge = this.cy.$(`#${this.contextMenu.edgeId}`);
      const source = edge.source();
      const target = edge.target();
      
      // Calculate middle position
      const middleX = (source.position().x + target.position().x) / 2;
      const middleY = (source.position().y + target.position().y) / 2;
      
      // Prompt user for node details
      const nodeName = prompt('Enter new node name:', 'New Service');
      if (!nodeName) {
        this.contextMenu.visible = false;
        return;
      }
      
      // Create new node
      const newNodeId = `node-${Date.now()}`;
      this.cy.add({
        group: 'nodes',
        data: {
          id: newNodeId,
          label: nodeName,
          color: '#8B5CF6',
          icon: '⚙️',
          service: 'custom',
          shape: 'roundrectangle'
        },
        position: { x: middleX, y: middleY },
        classes: 'roundrectangle'
      });
      
      // Remove original edge
      edge.remove();
      
      // Create two new edges: source -> new node -> target
      this.cy.add([
        {
          group: 'edges',
          data: {
            id: `edge-${Date.now()}-1`,
            source: source.id(),
            target: newNodeId,
            label: edge.data('label') || ''
          }
        },
        {
          group: 'edges',
          data: {
            id: `edge-${Date.now()}-2`,
            source: newNodeId,
            target: target.id(),
            label: ''
          }
        }
      ]);
      
      this.contextMenu.visible = false;
      this.saveHistory();
      console.log(`✅ Node "${nodeName}" inserted between ${source.data('label')} and ${target.data('label')}`);
    }
  }

  duplicateNode(): void {
    if (this.contextMenu.nodeId && this.cy) {
      const original = this.cy.$(`#${this.contextMenu.nodeId}`);
      const newNode = {
        group: 'nodes' as const,
        data: {
          ...original.data(),
          id: `node-${Date.now()}`
        },
        position: {
          x: original.position().x + 50,
          y: original.position().y + 50
        }
      };
      
      this.cy.add(newNode);
      this.contextMenu.visible = false;
      this.saveHistory();
    }
  }

  groupSelectedNodes(): void {
    if (!this.cy) return;

    const selectedNodes = this.cy.$(':selected').nodes();
    if (selectedNodes.length < 2) {
      alert('⚠️ Please select at least 2 nodes to group');
      return;
    }

    // Store selected nodes and open modal
    this.groupModal.selectedNodes = selectedNodes.map((node: any) => node);
    this.groupModal.groupName = `Group ${Date.now().toString().slice(-4)}`;
    this.groupModal.groupColor = '#818cf8';
    this.groupModal.borderStyle = 'dashed';
    this.groupModal.borderWidth = 3;
    this.groupModal.backgroundColor = 'transparent';
    this.groupModal.showLabel = true;
    this.groupModal.visible = true;
  }

  createGroup(): void {
    if (!this.cy || this.groupModal.selectedNodes.length < 2) return;

    const selectedNodes = this.cy.collection(this.groupModal.selectedNodes);
    
    // Calculate bounding box of selected nodes with padding
    const bb = selectedNodes.boundingBox();
    const padding = 50;

    // Create a parent node (compound node) - no need to set width/height, it will auto-size
    const groupId = `group-${Date.now()}`;
    const groupNode = this.cy.add({
      group: 'nodes',
      data: {
        id: groupId,
        label: this.groupModal.showLabel ? this.groupModal.groupName : '',
        color: this.groupModal.groupColor,
        shape: 'rectangle',
        service: this.groupModal.groupName,
        icon: '',
        faIcon: '',
        isGroup: true,
        isShape: true,
        borderStyle: this.groupModal.borderStyle,
        groupName: this.groupModal.groupName
      },
      classes: 'group-container'
    });

    // Apply group styling - compound nodes auto-size based on children
    // Calculate minimum size based on children to prevent shrinking
    const minGroupWidth = Math.max(300, bb.w + (padding * 2));
    const minGroupHeight = Math.max(250, bb.h + (padding * 2));
    
    groupNode.style({
      'background-color': this.groupModal.backgroundColor,
      'background-opacity': this.groupModal.backgroundColor === 'transparent' ? 0 : 0.15,
      'border-width': this.groupModal.borderWidth,
      'border-style': this.groupModal.borderStyle,
      'border-color': this.groupModal.groupColor,
      'border-opacity': 1,
      'label': this.groupModal.showLabel ? this.groupModal.groupName : '',
      'text-valign': 'top',
      'text-halign': 'center',
      'font-size': '16px',
      'font-weight': 'bold',
      'color': this.groupModal.groupColor,
      'text-background-color': '#0f172a',
      'text-background-opacity': 0.8,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
      'padding': `${padding}px`,
      'compound-sizing-wrt-labels': 'include',
      'min-width': `${minGroupWidth}px`,
      'min-height': `${minGroupHeight}px`,
      'min-width-bias-left': padding,
      'min-width-bias-right': padding,
      'min-height-bias-top': padding,
      'min-height-bias-bottom': padding
    });

    // Ensure the group is grabbable and selectable
    groupNode.grabify();
    groupNode.selectify();

    // Make selected nodes children of the group (compound node)
    // This automatically makes them move with the parent
    selectedNodes.forEach((node: any) => {
      node.move({ parent: groupId });
    });

    // Deselect nodes and select the group
    selectedNodes.unselect();
    groupNode.select();

    this.closeGroupModal();
    this.contextMenu.visible = false;
    this.saveHistory();
    this.saveCanvas();
    
    console.log(`✅ Grouped ${selectedNodes.length} nodes into compound node "${this.groupModal.groupName}"`);
  }

  ungroupSelectedNodes(): void {
    if (!this.cy) return;

    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('⚠️ Please select a group to ungroup');
      return;
    }

    let ungroupCount = 0;
    selected.forEach((node: any) => {
      // Check if it's a parent node (has children)
      if (node.isParent() && node.data('isGroup')) {
        const children = node.children();
        
        // Move children out of the group
        children.forEach((child: any) => {
          child.move({ parent: null });
        });
        
        // Remove the group container
        this.cy?.remove(node);
        ungroupCount++;
      }
    });

    if (ungroupCount > 0) {
      this.saveHistory();
      this.saveCanvas();
      console.log(`✅ Ungrouped ${ungroupCount} group(s)`);
    } else {
      alert('⚠️ Selected node(s) are not groups');
    }
  }

  closeGroupModal(): void {
    this.groupModal.visible = false;
    this.groupModal.selectedNodes = [];
  }

  // Auto-save setup
  setupAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      if (this.cy) {
        // Use the same saveCanvas method for consistency
        this.saveCanvas();
        console.log('📁 Auto-saved at', this.lastSaved);
      }
    }, 30000); // Every 30 seconds
  }

  // Search filter
  get filteredCategories(): ServiceCategory[] {
    if (!this.searchTerm.trim()) {
      return this.categories;
    }

    const term = this.searchTerm.toLowerCase();
    return this.categories.map(category => ({
      ...category,
      items: category.items.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      )
    })).filter(category => category.items.length > 0);
  }

  toggleCategory(category: ServiceCategory): void {
    category.collapsed = !category.collapsed;
  }

  // Zoom controls
  zoomIn(): void {
    this.cy?.zoom(this.cy.zoom() * 1.2);
  }

  zoomOut(): void {
    this.cy?.zoom(this.cy.zoom() * 0.8);
  }

  fitToScreen(): void {
    this.cy?.fit(undefined, 50);
  }

  resetZoom(): void {
    this.cy?.zoom(1);
    this.cy?.center();
  }

  // Advanced Layout Options
  applyCircleLayout(): void {
    if (!this.cy) return;
    
    this.cy.layout({
      name: 'circle',
      animate: true,
      animationDuration: 500,
      padding: 50
    }).run();
    this.saveHistory();
  }

  applyGridLayout(): void {
    if (!this.cy) return;
    
    this.cy.layout({
      name: 'grid',
      animate: true,
      animationDuration: 500,
      padding: 50,
      rows: undefined,
      cols: undefined
    }).run();
    this.saveHistory();
  }

  applyConcentricLayout(): void {
    if (!this.cy) return;
    
    this.cy.layout({
      name: 'concentric',
      animate: true,
      animationDuration: 500,
      padding: 50,
      minNodeSpacing: 100,
      concentric: function(node: any) {
        return node.degree();
      },
      levelWidth: function() {
        return 2;
      }
    }).run();
    this.saveHistory();
  }

  applyCoseLayout(): void {
    if (!this.cy) return;
    
    this.cy.layout({
      name: 'cose',
      animate: true,
      animationDuration: 1000,
      padding: 50,
      nodeRepulsion: 400000,
      idealEdgeLength: 100,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 1000
    }).run();
    this.saveHistory();
  }

  // Selection and Manipulation
  selectAll(): void {
    this.cy?.nodes().select();
  }

  deselectAll(): void {
    this.cy?.elements().unselect();
  }

  deleteSelected(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected');
    if (selected.length > 0) {
      if (confirm(`Delete ${selected.length} selected element(s)?`)) {
        selected.remove();
        this.saveHistory();
      }
    } else {
      alert('No elements selected');
    }
  }

  // Edge Management
  editEdgeLabel(): void {
    if (!this.cy) return;
    
    const selectedEdges = this.cy.$(':selected').edges();
    if (selectedEdges.length === 1) {
      const edge = selectedEdges[0];
      const currentLabel = edge.data('label') || '';
      const newLabel = prompt('Enter edge label:', currentLabel);
      
      if (newLabel !== null) {
        edge.data('label', newLabel);
        this.saveHistory();
      }
    } else {
      alert('Please select exactly one edge');
    }
  }

  removeAllEdges(): void {
    if (!this.cy) return;
    
    if (confirm('Remove all connections?')) {
      this.cy.edges().remove();
      this.saveHistory();
    }
  }

  // Graph Analysis
  showGraphInfo(): void {
    if (!this.cy) return;
    
    const nodes = this.cy.nodes();
    const edges = this.cy.edges();
    const components = this.cy.elements().components();
    
    const info = `
Graph Statistics:
━━━━━━━━━━━━━━━━
📊 Nodes: ${nodes.length}
🔗 Edges: ${edges.length}
🌐 Connected Components: ${components.length}

Node Degrees:
${nodes.map((node: any) => 
  `  ${node.data('label')}: ${node.degree()} connections`
).join('\n')}
    `.trim();
    
    alert(info);
  }

  findShortestPath(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length !== 2) {
      alert('Please select exactly 2 nodes to find path between them');
      return;
    }

    const path = (this.cy as any).elements().aStar({
      root: selected[0],
      goal: selected[1]
    });

    if (path.found) {
      // Highlight the path
      this.cy.elements().removeClass('highlighted');
      path.path.addClass('highlighted');
      
      alert(`Shortest path found with ${path.distance} steps`);
    } else {
      alert('No path found between selected nodes');
    }
  }

  // Export Options
  exportAsPNG(): void {
    if (!this.cy) return;
    
    try {
      const png64 = this.cy.png({
        output: 'base64uri',  // Changed to base64uri for proper data URL
        bg: '#0f172a',
        full: true,
        scale: 2
      });
      
      const link = document.createElement('a');
      link.href = png64;
      link.download = `architecture-${Date.now()}.png`;
      document.body.appendChild(link);  // Add to DOM
      link.click();
      document.body.removeChild(link);  // Clean up
      
      console.log('✅ PNG exported and downloaded');
      alert('✅ PNG exported successfully!');
    } catch (error) {
      console.error('❌ PNG export failed:', error);
      alert('❌ Failed to export PNG. Please try again.');
    }
  }

  exportAsJPG(): void {
    if (!this.cy) return;
    
    const jpg64 = this.cy.jpg({
      output: 'base64',
      bg: '#0f172a',
      full: true,
      scale: 2,
      quality: 0.95
    });
    
    const link = document.createElement('a');
    link.href = jpg64;
    link.download = `architecture-${Date.now()}.jpg`;
    link.click();
    
    console.log('✅ JPG exported');
  }

  // Node Styling
  changeNodeColor(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node');
      return;
    }

    const color = prompt('Enter color (hex code):', '#3B82F6');
    if (color) {
      selected.forEach((node: any) => {
        node.data('color', color);
      });
      this.saveHistory();
    }
  }

  changeBorderStyle(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node');
      return;
    }

    // Show border style modal
    this.borderStyleModal.selectedNodes = selected.map((node: any) => node);
    this.borderStyleModal.visible = true;
    
    // Get current style from first selected node
    const firstNode = selected[0];
    const currentStyle = firstNode.style('border-style') || 'solid';
    const currentWidth = parseInt(firstNode.style('border-width')) || 3;
    this.borderStyleModal.currentStyle = currentStyle as any;
    this.borderStyleModal.currentWidth = currentWidth;
  }

  selectBorderStyle(styleName: string): void {
    if (this.borderStyleModal.selectedNodes.length === 0) return;

    // Validate style name
    const validStyles = ['solid', 'dashed', 'dotted', 'double'];
    if (!validStyles.includes(styleName)) {
      console.error('Invalid border style:', styleName);
      return;
    }

    this.borderStyleModal.selectedNodes.forEach((node: any) => {
      // Save border style to node data for persistence
      node.data('borderStyle', styleName);
      node.style({
        'border-style': styleName,
        'border-width': this.borderStyleModal.currentWidth
      });
    });
    
    this.borderStyleModal.currentStyle = styleName as 'solid' | 'dashed' | 'dotted' | 'double';
    this.saveHistory();
    this.saveCanvas();
    console.log(`✅ Changed border style to ${styleName} for ${this.borderStyleModal.selectedNodes.length} node(s)`);
  }

  updateBorderWidth(width: number): void {
    if (this.borderStyleModal.selectedNodes.length === 0) return;

    this.borderStyleModal.currentWidth = width;
    this.borderStyleModal.selectedNodes.forEach((node: any) => {
      node.style('border-width', width);
    });
    
    this.saveHistory();
    this.saveCanvas();
  }

  closeBorderStyleModal(): void {
    this.borderStyleModal.visible = false;
    this.borderStyleModal.selectedNodes = [];
  }

  changeNodeShape(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node');
      return;
    }

    // Show shape modal
    this.shapeModal.selectedNodes = selected.map((node: any) => node);
    this.shapeModal.visible = true;
  }

  selectShape(shapeName: string): void {
    if (this.shapeModal.selectedNodes.length === 0) return;

    this.shapeModal.selectedNodes.forEach((node: any) => {
      node.data('shape', shapeName);
      // Update node classes to apply the shape
      node.removeClass('rectangle roundrectangle ellipse triangle diamond pentagon hexagon heptagon octagon star vee rhomboid');
      node.addClass(shapeName);
    });
    
    this.saveHistory();
    this.saveCanvas();
    this.closeShapeModal();
    console.log(`✅ Changed shape to ${shapeName} for ${this.shapeModal.selectedNodes.length} node(s)`);
  }

  closeShapeModal(): void {
    this.shapeModal.visible = false;
    this.shapeModal.selectedNodes = [];
  }

  // Resize nodes
  resizeNodeBigger(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node to resize');
      return;
    }

    selected.forEach((node: any) => {
      const currentWidth = node.width();
      const currentHeight = node.height();
      node.style({
        'width': (currentWidth * 1.2) + 'px',
        'height': (currentHeight * 1.2) + 'px'
      });
    });
    
    this.saveHistory();
    console.log(`✅ Made ${selected.length} node(s) 20% bigger`);
  }

  resizeNodeSmaller(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node to resize');
      return;
    }

    selected.forEach((node: any) => {
      const currentWidth = node.width();
      const currentHeight = node.height();
      const newWidth = Math.max(50, currentWidth * 0.8);
      const newHeight = Math.max(30, currentHeight * 0.8);
      node.style({
        'width': newWidth + 'px',
        'height': newHeight + 'px'
      });
    });
    
    this.saveHistory();
    console.log(`✅ Made ${selected.length} node(s) 20% smaller`);
  }

  // Remove selected nodes from their parent containers
  removeFromParent(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node');
      return;
    }

    let count = 0;
    selected.forEach((node: any) => {
      if (node.data('parent')) {
        node.move({ parent: null });
        count++;
      }
    });
    
    if (count > 0) {
      this.saveHistory();
      this.saveCanvas();
      console.log(`✅ Removed ${count} node(s) from parent container`);
    } else {
      alert('Selected nodes are not inside any container');
    }
  }

  // Group selected nodes into a new container
  groupIntoContainer(shape: string = 'rectangle'): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select at least one node to group');
      return;
    }

    // Calculate bounding box of selected nodes
    const boundingBox = selected.boundingBox();
    const padding = 40;
    
    // Create container node
    const containerId = `container-${Date.now()}`;
    const containerNode = this.cy.add({
      group: 'nodes',
      data: {
        id: containerId,
        label: 'Container',
        color: '#818cf8',
        shape: shape,
        service: 'Container',
        icon: '',
        description: 'Container for grouped nodes',
        isShape: true
      },
      position: {
        x: boundingBox.x1 + boundingBox.w / 2,
        y: boundingBox.y1 + boundingBox.h / 2
      },
      classes: shape
    });

    // Style container
    containerNode.style({
      'width': `${boundingBox.w + padding * 2}px`,
      'height': `${boundingBox.h + padding * 2}px`,
      'background-opacity': 0.2,
      'border-width': 3,
      'border-color': '#818cf8',
      'border-style': 'dashed'
    });

    // Move selected nodes into container
    selected.forEach((node: any) => {
      node.move({ parent: containerId });
    });

    this.saveHistory();
    this.saveCanvas();
    console.log(`✅ Grouped ${selected.length} node(s) into container`);
  }

  // Lock/Unlock nodes
  lockSelected(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    selected.lock();
    alert(`Locked ${selected.length} node(s)`);
  }

  unlockAll(): void {
    if (!this.cy) return;
    
    this.cy.nodes().unlock();
    alert('All nodes unlocked');
  }

  // Alignment Tools
  alignHorizontal(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length < 2) {
      alert('Select at least 2 nodes to align');
      return;
    }

    const avgY = selected.reduce((sum: number, node: any) => sum + node.position().y, 0) / selected.length;
    
    selected.forEach((node: any) => {
      node.position('y', avgY);
    });
    
    this.saveHistory();
  }

  alignVertical(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length < 2) {
      alert('Select at least 2 nodes to align');
      return;
    }

    const avgX = selected.reduce((sum: number, node: any) => sum + node.position().x, 0) / selected.length;
    
    selected.forEach((node: any) => {
      node.position('x', avgX);
    });
    
    this.saveHistory();
  }

  distributeHorizontal(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length < 3) {
      alert('Select at least 3 nodes to distribute');
      return;
    }

    const sorted = selected.sort((a: any, b: any) => a.position().x - b.position().x);
    const first = sorted[0].position().x;
    const last = sorted[sorted.length - 1].position().x;
    const spacing = (last - first) / (sorted.length - 1);

    sorted.forEach((node: any, index: number) => {
      node.position('x', first + (spacing * index));
    });
    
    this.saveHistory();
  }

  distributeVertical(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length < 3) {
      alert('Select at least 3 nodes to distribute');
      return;
    }

    const sorted = selected.sort((a: any, b: any) => a.position().y - b.position().y);
    const first = sorted[0].position().y;
    const last = sorted[sorted.length - 1].position().y;
    const spacing = (last - first) / (sorted.length - 1);

    sorted.forEach((node: any, index: number) => {
      node.position('y', first + (spacing * index));
    });
    
    this.saveHistory();
  }

  // Toggle node labels visibility
  toggleLabels(): void {
    this.showLabels = !this.showLabels;
    
    if (this.cy) {
      this.cy.nodes().forEach((node: any) => {
        node.style('label', this.showLabels ? node.data('label') : '');
      });
    }
    
    console.log(`Labels ${this.showLabels ? 'shown' : 'hidden'}`);
  }

  // Toggle grid lines visibility
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    console.log(`Grid lines ${this.showGrid ? 'shown' : 'hidden'}`);
  }

  // Toggle grid snap
  toggleGridSnap(): void {
    this.snapToGrid = !this.snapToGrid;
    console.log(`Grid snap ${this.snapToGrid ? 'enabled' : 'disabled'}`);
    alert(`Grid snap ${this.snapToGrid ? 'ON' : 'OFF'} (${this.gridSize}px grid)`);
  }

  // Toggle theme between dark and light
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    console.log(`Theme switched to ${this.isDarkTheme ? 'dark' : 'light'} mode`);
    
    // Update canvas background if needed
    if (this.cy) {
      this.cy.style().selector('core').style({
        'background-color': this.isDarkTheme ? '#0f172a' : '#ffffff'
      }).update();
    }
  }

  // Copy selected nodes
  copySelected(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected');
    if (selected.length === 0) {
      console.log('⚠️ Nothing selected to copy');
      return;
    }

    // Use clipboard extension
    (this.cy as any).clipboard().copy(selected);
    console.log(`📋 Copied ${selected.length} items to clipboard`);
  }

  // Paste copied nodes
  paste(): void {
    if (!this.cy) return;
    
    // Use clipboard extension
    const clipboard = (this.cy as any).clipboard();
    if (clipboard && typeof clipboard.paste === 'function') {
      const pasted = clipboard.paste();
      if (pasted && pasted.length > 0) {
        // Offset pasted items
        pasted.forEach((ele: any) => {
          if (ele.isNode()) {
            const pos = ele.position();
            ele.position({
              x: pos.x + 50,
              y: pos.y + 50
            });
          }
        });
        console.log(`✅ Pasted ${pasted.length} items`);
        this.saveHistory();
      } else {
        console.log('⚠️ Clipboard is empty');
      }
    }
  }

  // Duplicate selected nodes
  duplicateSelected(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select nodes to duplicate');
      return;
    }

    const offset = 50;
    selected.forEach((node: any) => {
      const newNode = {
        group: 'nodes' as const,
        data: {
          ...node.data(),
          id: `node-${Date.now()}-${Math.random()}`
        },
        position: {
          x: node.position().x + offset,
          y: node.position().y + offset
        },
        classes: node.classes()
      };
      
      this.cy!.add(newNode);
    });

    this.saveHistory();
    console.log(`✅ Duplicated ${selected.length} nodes`);
  }

  // Search and highlight nodes
  searchNodes(): void {
    if (!this.cy) return;
    
    const searchQuery = prompt('Search nodes by label:');
    if (!searchQuery) return;

    // Remove previous highlights
    this.cy.nodes().removeClass('search-highlight');

    // Search and highlight matching nodes
    const matches = this.cy.nodes().filter((node: any) => {
      const label = node.data('label').toLowerCase();
      return label.includes(searchQuery.toLowerCase());
    });

    if (matches.length > 0) {
      matches.addClass('search-highlight');
      this.cy.fit(matches, 50);
      alert(`Found ${matches.length} matching node(s)`);
    } else {
      alert('No matching nodes found');
    }
  }

  // Show node tooltips
  showNodeInfo(nodeId: string): void {
    if (!this.cy) return;
    
    const node = this.cy.$(`#${nodeId}`);
    if (node.length === 0) return;

    const info = `
Node Information:
━━━━━━━━━━━━━━━
📝 Label: ${node.data('label')}
🆔 ID: ${node.data('id')}
🎨 Color: ${node.data('color')}
📏 Size: ${Math.round(node.width())}x${Math.round(node.height())}
📍 Position: (${Math.round(node.position().x)}, ${Math.round(node.position().y)})
🔗 Connections: ${node.degree()}
📊 Edges In: ${node.indegree()}
📊 Edges Out: ${node.outdegree()}
    `.trim();

    alert(info);
  }

  // Center selected nodes
  centerSelected(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected');
    if (selected.length === 0) {
      alert('Please select nodes to center');
      return;
    }

    this.cy.animate({
      fit: { eles: selected, padding: 50 },
      duration: 500
    });
  }

  // Lock selected nodes (prevent movement)
  toggleLockSelected(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected').nodes();
    if (selected.length === 0) {
      alert('Please select nodes to lock/unlock');
      return;
    }

    const firstNode = selected[0];
    const isLocked = firstNode.locked();

    if (isLocked) {
      selected.unlock();
      alert(`Unlocked ${selected.length} node(s)`);
    } else {
      selected.lock();
      alert(`Locked ${selected.length} node(s)`);
    }
  }

  // Bring to front (increase z-index)
  bringToFront(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected');
    if (selected.length === 0) {
      alert('Please select elements to bring to front');
      return;
    }

    selected.forEach((ele: any) => {
      ele.style('z-index', 999);
    });

    console.log('✅ Brought to front');
  }

  // Send to back (decrease z-index)
  sendToBack(): void {
    if (!this.cy) return;
    
    const selected = this.cy.$(':selected');
    if (selected.length === 0) {
      alert('Please select elements to send to back');
      return;
    }

    selected.forEach((ele: any) => {
      ele.style('z-index', 1);
    });

    console.log('✅ Sent to back');
  }

  // Select nodes by type/service
  selectByType(): void {
    if (!this.cy) return;
    
    const type = prompt('Enter service type to select (e.g., EC2, S3, Lambda):');
    if (!type) return;

    const matches = this.cy.nodes().filter((node: any) => {
      const service = node.data('service') || '';
      return service.toLowerCase().includes(type.toLowerCase());
    });

    if (matches.length > 0) {
      this.cy.nodes().unselect();
      matches.select();
      alert(`Selected ${matches.length} node(s) of type "${type}"`);
    } else {
      alert(`No nodes found with type "${type}"`);
    }
  }

  // Edit Modal Methods
  openEditModal(node: any): void {
    console.log('📝 openEditModal called for node:', node.id());
    
    // Get service name directly (label no longer contains icon)
    const currentName = node.data('service') || node.data('label') || '';
    const currentDescription = node.data('description') || '';
    const currentProvider = node.data('provider') || '';
    const currentDefinition = node.data('definition') || '';
    const currentProperties = node.data('properties') || {};
    const currentPropertyValues = node.data('propertyValues') || {};
    
    // Update modal state inside Angular zone
    this.ngZone.run(() => {
      this.editModal.visible = true;
      this.editModal.nodeId = node.id();
      this.editModal.nodeName = currentName;
      this.editModal.nodeDescription = currentDescription;
      this.editModal.nodeProvider = currentProvider;
      this.editModal.nodeDefinition = currentDefinition;
      this.editModal.nodeProperties = JSON.parse(JSON.stringify(currentProperties));
      this.editModal.nodePropertyValues = JSON.parse(JSON.stringify(currentPropertyValues));
      
      console.log('✅ Edit modal state updated:', {
        visible: this.editModal.visible,
        nodeId: this.editModal.nodeId,
        nodeName: this.editModal.nodeName
      });
      
      // Force change detection immediately
      this.cdr.detectChanges();
      console.log('🔄 Change detection triggered');
      
      // Double-check after timeout
      setTimeout(() => {
        console.log('🔄 Checking modal visibility after timeout:', this.editModal.visible);
        if (this.editModal.visible) {
          this.cdr.detectChanges();
          console.log('🔄 Second change detection triggered');
        }
      }, 10);
    });
  }

  closeEditModal(): void {
    this.editModal.visible = false;
    this.editModal.nodeId = null;
    this.editModal.nodeName = '';
    this.editModal.nodeDescription = '';
    this.editModal.nodeProvider = '';
    this.editModal.nodeDefinition = '';
    this.editModal.nodeProperties = {};
    this.editModal.nodePropertyValues = {};
  }

  saveNodeEdit(): void {
    if (!this.cy || !this.editModal.nodeId) return;
    
    const node = this.cy.$(`#${this.editModal.nodeId}`);
    if (node.length === 0) return;

    // Get the icon and color from node data
    const currentLabel = node.data('label') || '';
    const labelParts = currentLabel.split(' ');
    const icon = labelParts[0];
    const color = node.data('color') || '#3b82f6';
    const faIcon = node.data('faIcon') || node.data('icon') || '';
    const isShape = node.data('isShape');
    const isParent = node.isParent();

    // Update node data
    if (this.editModal.nodeName) {
      node.data('label', this.editModal.nodeName);
      node.data('service', this.editModal.nodeName);
    }
    node.data('description', this.editModal.nodeDescription || '');
    node.data('provider', this.editModal.nodeProvider || '');
    node.data('definition', this.editModal.nodeDefinition || '');
    node.data('properties', this.editModal.nodeProperties || {});
    node.data('propertyValues', this.editModal.nodePropertyValues || {});

    // Only regenerate background for regular nodes, not shapes/groups
    if (!isShape && !isParent) {
      // Regular node: regenerate the card background
      node.style({
        'background-image': this.generateCardBackgroundSVG(faIcon, color),
        'border-color': color,
        'label': this.editModal.nodeName
      });
    } else {
      // Shape/group node: keep transparent with no background
      node.style({
        'background-color': 'transparent',
        'background-opacity': 0,
        'background-image': 'none',
        'border-color': color,
        'label': '' // Groups don't show labels
      });
    }

    this.saveHistory();
    this.saveCanvas(); // Save to localStorage immediately
    
    console.log(`✅ Updated node: ${this.editModal.nodeName}`);
    console.log('Properties:', this.editModal.nodeProperties);
    console.log('Property Values:', this.editModal.nodePropertyValues);
    
    this.closeEditModal();
    
    // Force a redraw
    this.cy.forceRender();
  }

  // Helper method to get property keys as array
  getPropertyKeys(): string[] {
    return Object.keys(this.editModal.nodeProperties || {});
  }

  // Helper method to get property configuration
  getPropertyConfig(key: string): any {
    return this.editModal.nodeProperties[key] || null;
  }

  // Edge editing functions
  openEdgeEditModal(edge: any): void {
    console.log('📝 openEdgeEditModal called for edge:', edge.id());
    
    const currentLabel = edge.data('label') || '';
    const currentColor = edge.data('lineColor') || edge.style('line-color') || '#06b6d4';
    const currentStyle = edge.data('lineStyle') || 'solid';
    const currentWidth = edge.data('lineWidth') || edge.style('width') || 3;
    
    this.ngZone.run(() => {
      this.edgeEditModal.visible = true;
      this.edgeEditModal.edgeId = edge.id();
      this.edgeEditModal.edgeLabel = currentLabel;
      this.edgeEditModal.edgeColor = currentColor;
      this.edgeEditModal.edgeStyle = currentStyle;
      this.edgeEditModal.edgeWidth = currentWidth;
      
      this.cdr.detectChanges();
    });
  }

  closeEdgeEditModal(): void {
    this.edgeEditModal.visible = false;
    this.edgeEditModal.edgeId = null;
    this.edgeEditModal.edgeLabel = '';
    this.edgeEditModal.edgeColor = '#06b6d4';
    this.edgeEditModal.edgeStyle = 'solid';
    this.edgeEditModal.edgeWidth = 3;
  }

  saveEdgeEdit(): void {
    if (!this.cy || !this.edgeEditModal.edgeId) return;
    
    const edge = this.cy.$(`#${this.edgeEditModal.edgeId}`);
    if (edge.length === 0) return;

    // Update edge data
    edge.data('label', this.edgeEditModal.edgeLabel || '');
    edge.data('lineColor', this.edgeEditModal.edgeColor);
    edge.data('lineStyle', this.edgeEditModal.edgeStyle);
    edge.data('lineWidth', this.edgeEditModal.edgeWidth);

    // Apply line style
    let lineDashPattern: any = 'solid';
    if (this.edgeEditModal.edgeStyle === 'dashed') {
      lineDashPattern = [10, 5];
    } else if (this.edgeEditModal.edgeStyle === 'dotted') {
      lineDashPattern = [2, 3];
    }

    // Update edge style
    edge.style({
      'line-color': this.edgeEditModal.edgeColor,
      'target-arrow-color': this.edgeEditModal.edgeColor,
      'width': this.edgeEditModal.edgeWidth,
      'line-style': lineDashPattern === 'solid' ? 'solid' : 'dashed',
      'line-dash-pattern': lineDashPattern === 'solid' ? undefined : lineDashPattern
    });

    this.saveHistory();
    this.saveCanvas();
    
    console.log(`✅ Updated edge: ${this.edgeEditModal.edgeLabel || 'Connection'}`);
    
    this.closeEdgeEditModal();
    this.cy.forceRender();
  }
}



// https://fontawesome.com/search?q=llama