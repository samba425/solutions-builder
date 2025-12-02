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
  
  // Icon cache for Iconify API with localStorage persistence
  private iconCache: Map<string, string> = new Map();
  private readonly ICON_CACHE_KEY = 'iconify-cache';
  private readonly ICON_CACHE_VERSION = 'v1'; // Increment to invalidate old cache
  
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
    // Load icon cache from localStorage first
    this.loadIconCacheFromStorage();
    
    this.loadComponentsFromAPI();
  }

  /**
   * Load icon cache from localStorage
   */
  private loadIconCacheFromStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      const cached = localStorage.getItem(this.ICON_CACHE_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached);
        
        // Check version to invalidate old cache
        if (cacheData.version === this.ICON_CACHE_VERSION) {
          // Restore Map from stored object
          this.iconCache = new Map(Object.entries(cacheData.icons));
          console.log(`✅ Loaded ${this.iconCache.size} icons from localStorage cache`);
        } else {
          console.log('⚠️ Icon cache version mismatch, clearing old cache');
          localStorage.removeItem(this.ICON_CACHE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load icon cache from localStorage:', error);
    }
  }

  /**
   * Save icon cache to localStorage
   */
  private saveIconCacheToStorage(): void {
    if (!this.isBrowser) return;
    
    try {
      // Convert Map to plain object for storage
      const cacheData = {
        version: this.ICON_CACHE_VERSION,
        icons: Object.fromEntries(this.iconCache),
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.ICON_CACHE_KEY, JSON.stringify(cacheData));
      console.log(`💾 Saved ${this.iconCache.size} icons to localStorage cache`);
    } catch (error) {
      console.warn('Failed to save icon cache to localStorage:', error);
    }
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
        
        // Prefetch all icons after loading components
        this.prefetchAllIcons();
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
        // Prefetch icons for all components
        this.prefetchAllIcons();
      },
      error: (error) => {
        console.error('❌ Failed to refresh components:', error);
      }
    });
  }

  /**
   * Prefetch all icons from components to cache them
   */
  async prefetchAllIcons(): Promise<void> {
    const allIcons = new Set<string>();
    
    // Collect all unique icons from all categories
    this.categories.forEach((category: ServiceCategory) => {
      category.items.forEach((item: ServiceItem) => {
        if (item.icon) {
          allIcons.add(item.icon);
        }
      });
    });
    
    console.log(`🎨 Prefetching ${allIcons.size} icons from Iconify...`);
    
    // Fetch all icons in parallel
    const fetchPromises = Array.from(allIcons).map(icon => 
      this.fetchIconFromIconify(icon).catch(err => {
        console.warn(`Failed to fetch icon ${icon}:`, err);
        return null;
      })
    );
    
    await Promise.all(fetchPromises);
    console.log(`✅ Icon prefetch complete. ${this.iconCache.size} icons cached.`);
    
    // Save all fetched icons to localStorage in one batch
    this.saveIconCacheToStorage();
  }

  /**
   * Prefetch icons from canvas data (for saved/imported diagrams)
   */
  async prefetchIconsFromData(elements: any[]): Promise<void> {
    const allIcons = new Set<string>();
    
    // Collect all unique icons from elements
    elements.forEach((ele: any) => {
      if (ele.data) {
        const icon = ele.data.faIcon || ele.data.icon;
        if (icon && typeof icon === 'string' && icon.startsWith('fa')) {
          allIcons.add(icon);
        }
      }
    });
    
    if (allIcons.size === 0) {
      console.log('ℹ️ No icons to prefetch from canvas data');
      return;
    }
    
    console.log(`🎨 Prefetching ${allIcons.size} icons from canvas data...`);
    
    // Fetch all icons in parallel
    const fetchPromises = Array.from(allIcons).map(icon => 
      this.fetchIconFromIconify(icon).catch(err => {
        console.warn(`Failed to fetch icon ${icon}:`, err);
        return null;
      })
    );
    
    await Promise.all(fetchPromises);
    console.log(`✅ Canvas icon prefetch complete. ${this.iconCache.size} total icons cached.`);
    
    // Save to localStorage after batch fetch
    this.saveIconCacheToStorage();
  }

  /**
   * Clear icon cache (useful for debugging or forcing refresh)
   */
  clearIconCache(): void {
    this.iconCache.clear();
    if (this.isBrowser) {
      localStorage.removeItem(this.ICON_CACHE_KEY);
      console.log('🗑️ Icon cache cleared');
    }
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
    
    // Try to load saved data (async)
    this.loadCanvas().catch(err => console.error('Failed to load canvas:', err));
    
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

  // Fetch SVG from Iconify API and extract path data
  async fetchIconFromIconify(faIcon: string): Promise<{ path: string, viewBox: string } | null> {
    // Only run in browser (not SSR)
    if (!this.isBrowser) {
      return null;
    }

    // Check cache first
    if (this.iconCache.has(faIcon)) {
      return JSON.parse(this.iconCache.get(faIcon)!);
    }

    try {
      // Convert Font Awesome class to Iconify format with icon name mapping
      // Some FA5 icons have different names in FA6
      let iconifyIcon = '';
      let iconName = '';
      
      if (faIcon.startsWith('fab fa-')) {
        iconName = faIcon.replace('fab fa-', '');
        iconifyIcon = `fa6-brands:${iconName}`;
      } else if (faIcon.startsWith('fas fa-')) {
        iconName = faIcon.replace('fas fa-', '');
        
        // Map FA5 icon names to FA6 names
        const iconNameMap: { [key: string]: string } = {
          'project-diagram': 'diagram-project',
          'cogs': 'gears',
          'tachometer-alt': 'gauge',
          'comment-alt': 'message',
          'sync': 'arrows-rotate'
        };
        
        iconName = iconNameMap[iconName] || iconName;
        iconifyIcon = `fa6-solid:${iconName}`;
      } else if (faIcon.startsWith('far fa-')) {
        iconName = faIcon.replace('far fa-', '');
        iconifyIcon = `fa6-regular:${iconName}`;
      } else {
        return null;
      }

      // Fetch from Iconify API
      const url = `https://api.iconify.design/${iconifyIcon}.svg`;
      const response = await fetch(url);
      
      if (response.ok) {
        const svgText = await response.text();
        
        // Parse SVG to extract viewBox and path (browser only)
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        const pathElement = svgDoc.querySelector('path');
        
        if (svgElement && pathElement) {
          const viewBox = svgElement.getAttribute('viewBox') || '0 0 512 512';
          const path = pathElement.getAttribute('d') || '';
          
          const iconData = { path, viewBox };
          // Cache the result as JSON string
          this.iconCache.set(faIcon, JSON.stringify(iconData));
          
          // Save to localStorage for persistence (don't await, do it async)
          this.saveIconCacheToStorage();
          
          return iconData;
        } else {
          console.warn(`Failed to parse SVG from Iconify: ${iconifyIcon}`);
          return null;
        }
      } else {
        console.warn(`Failed to fetch icon from Iconify: ${iconifyIcon} (original: ${faIcon})`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching icon from Iconify:`, error);
      return null;
    }
  }

  // Helper method to get Font Awesome SVG path data
  getFontAwesomeSVGPath(faIcon: string): { path: string, viewBox: string } {
    // First, try to get from cache (already fetched from Iconify)
    if (this.iconCache.has(faIcon)) {
      try {
        return JSON.parse(this.iconCache.get(faIcon)!);
      } catch (e) {
        console.warn('Failed to parse cached icon:', e);
      }
    }

    // If not in cache and we're in browser, try to fetch it synchronously
    // This is a fallback - normally icons should be prefetched
    console.warn(`⚠️ Icon ${faIcon} not in cache, using basic fallback. Consider prefetching.`);
    
    // Return a very basic fallback icon (server/box shape)
    return {
      viewBox: '0 0 512 512',
      path: 'M64 32C28.7 32 0 60.7 0 96v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zM64 288c-35.3 0-64 28.7-64 64v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V352c0-35.3-28.7-64-64-64H64zm280 72a24 24 0 1 1 0 48 24 24 0 1 1 0-48zm48 24a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z' // server icon as fallback
    };
  }

  // Helper method to generate combined SVG with proper icon rendering
  generateCardBackgroundSVG(faIcon: string, color: string): string {
    // Try to get from cache first (if already fetched)
    let iconData: { path: string, viewBox: string } | null = null;
    
    if (this.iconCache.has(faIcon)) {
      try {
        iconData = JSON.parse(this.iconCache.get(faIcon)!);
      } catch (e) {
        console.warn('Failed to parse cached icon data:', e);
      }
    }
    
    // Fallback to hardcoded icons if not in cache
    if (!iconData) {
      iconData = this.getFontAwesomeSVGPath(faIcon);
    }
    
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
      
      reader.onload = async (event: any) => {
        try {
          const importData = JSON.parse(event.target.result);
          
          // Clear current diagram
          this.cy?.elements().remove();
          
          // Prefetch icons before importing (for simple format)
          if (importData.nodes) {
            const tempElements = importData.nodes.map((node: any) => ({
              data: {
                faIcon: node.icon,
                icon: node.icon
              }
            }));
            await this.prefetchIconsFromData(tempElements);
          }
          // Prefetch icons for Cytoscape format
          else if (importData.elements) {
            await this.prefetchIconsFromData(importData.elements);
          }
          
          // Check format and import accordingly
          if (importData.nodes && importData.connections) {
            // Simple format: { nodes: [], connections: [] }
            console.log('📥 Importing simple format...');
            
            // Import nodes
            importData.nodes.forEach((node: any) => {
              // Check if this is a group/container node - use saved flag or fallback to heuristics
              const isGroup = node.isGroup || node.id.startsWith('group-') || node.name === '' || node.icon === '📦';
              
              const nodeName = node.name || node.label || node.id;
              
              const nodeData: any = {
                id: node.id,
                label: isGroup ? '' : nodeName,
                service: isGroup ? '' : nodeName, // This is used for label display
                color: node.color || '#3B82F6',
                shape: node.shape || 'roundrectangle',
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
            
            // Force style update to ensure labels and backgrounds are properly rendered
            // Use setTimeout to ensure Cytoscape has completed its render cycle
            setTimeout(() => {
              if (this.cy) {
                this.cy.nodes().forEach((node: any) => {
                  if (!node.data('isShape') && !node.data('isGroup')) {
                    // Force refresh the label and background
                    const service = node.data('service') || node.data('label') || '';
                    node.data('service', service);
                    
                    // Force regenerate background SVG
                    const icon = node.data('faIcon') || node.data('icon');
                    const color = node.data('color');
                    if (icon && color) {
                      const bgSvg = this.generateCardBackgroundSVG(icon, color);
                      node.style({
                        'background-image': bgSvg,
                        'label': service,  // Set label directly in style
                        'color': '#1f2937',
                        'font-size': '13px',
                        'font-weight': '600',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'text-margin-y': 40
                      });
                    }
                    
                    console.log(`✅ Updated node ${node.id()} with label: ${service}`);
                  }
                });
                
                // Force a complete render cycle
                this.cy.forceRender();
                
                console.log('✅ Forced style refresh for all nodes with render');
              }
            }, 150);
            
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
            
            // After layout animation completes, refresh labels again
            setTimeout(() => {
              if (this.cy) {
                this.cy.nodes().forEach((node: any) => {
                  if (!node.data('isShape') && !node.data('isGroup')) {
                    const service = node.data('service') || node.data('label') || '';
                    if (service) {
                      node.style('label', service);
                    }
                  }
                });
                this.cy.forceRender();
                console.log('✅ Labels refreshed after layout animation');
              }
            }, 1200); // After layout animation (1100ms) + 100ms buffer
            
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
  async loadCanvas(): Promise<void> {
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
          // Prefetch icons from saved data before adding elements
          await this.prefetchIconsFromData(data.elements);
          
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
        output: 'base64uri',
        bg: '#0f172a',
        full: false,  // Don't export full canvas
        scale: 2,
        maxWidth: 5000,
        maxHeight: 5000
      });
      
      // Download
      const link = document.createElement('a');
      link.href = png64;
      link.download = `architecture-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ PNG exported (viewport only)');
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