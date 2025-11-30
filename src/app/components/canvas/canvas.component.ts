import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, PLATFORM_ID, Inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Drawflow from 'drawflow';

interface ServiceCategory {
  name: string;
  collapsed: boolean;
  items: ServiceItem[];
}

interface ServiceItem {
  name: string;
  icon: string;
  color: string;
  category: string;
  shape?: 'rectangle' | 'circle' | 'diamond' | 'cloud' | 'start' | 'end';
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css', './trendy-cards.css']
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('drawflowCanvas', { static: false }) drawflowCanvas!: ElementRef;
  
  editor: any;
  isBrowser: boolean;
  searchTerm = '';
  
  // Undo/Redo
  private history: any[] = [];
  private historyIndex = -1;
  private maxHistory = 50;
  canUndo = false;
  canRedo = false;
  
  // Context Menu
  contextMenu = { visible: false, x: 0, y: 0, nodeId: null as number | null };
  
  // Grid & Visual Features
  showGrid = true;
  gridSize = 20;
  snapToGrid = false;
  
  // Auto-save
  private autoSaveInterval: any;
  lastSaved: string = '';
  
  // Multi-select
  selectedNodes: Set<number> = new Set();
  
  // Minimap
  showMinimap = true;
  
  categories = signal<ServiceCategory[]>([
    {
      name: 'Custom Shapes',
      collapsed: false,
      items: [
        { name: 'Box', icon: '⬜', color: '#64748B', category: 'Container', shape: 'rectangle' },
        { name: 'Start', icon: '▶️', color: '#10B981', category: 'Flow', shape: 'start' },
        { name: 'End', icon: '⏹️', color: '#EF4444', category: 'Flow', shape: 'end' },
        { name: 'Rectangle', icon: '▭', color: '#3B82F6', category: 'Shapes', shape: 'rectangle' },
        { name: 'Circle', icon: '⬤', color: '#10B981', category: 'Shapes', shape: 'circle' },
        { name: 'Diamond', icon: '◆', color: '#F59E0B', category: 'Shapes', shape: 'diamond' },
      ]
    },
    {
      name: 'Infrastructure',
      collapsed: false,
      items: [
        { name: 'AWS EC2', icon: '🖥️', color: '#FF9900', category: 'Infrastructure' },
        { name: 'Azure VM', icon: '🖥️', color: '#0078D4', category: 'Infrastructure' },
        { name: 'GCP Compute Engine', icon: '🖥️', color: '#4285F4', category: 'Infrastructure' },
        { name: 'Kubernetes', icon: '☸️', color: '#326CE5', category: 'Infrastructure' },
        { name: 'Docker', icon: '🐳', color: '#2496ED', category: 'Infrastructure' }
      ]
    },
    {
      name: 'AI/ML',
      collapsed: false,
      items: [
        { name: 'AWS SageMaker', icon: '🤖', color: '#FF9900', category: 'AI/ML' },
        { name: 'Azure ML', icon: '🤖', color: '#0078D4', category: 'AI/ML' },
        { name: 'GCP Vertex AI', icon: '🤖', color: '#4285F4', category: 'AI/ML' },
        { name: 'TensorFlow', icon: '🧠', color: '#FF6F00', category: 'AI/ML' },
        { name: 'PyTorch', icon: '🔥', color: '#EE4C2C', category: 'AI/ML' }
      ]
    },
    {
      name: 'Storage',
      collapsed: false,
      items: [
        { name: 'AWS S3', icon: '📦', color: '#FF9900', category: 'Storage' },
        { name: 'Azure Blob', icon: '📦', color: '#0078D4', category: 'Storage' },
        { name: 'GCP Cloud Storage', icon: '📦', color: '#4285F4', category: 'Storage' },
        { name: 'MongoDB', icon: '🍃', color: '#47A248', category: 'Storage' },
        { name: 'PostgreSQL', icon: '🐘', color: '#336791', category: 'Storage' }
      ]
    },
    {
      name: 'Networking',
      collapsed: false,
      items: [
        { name: 'API Gateway', icon: '🚪', color: '#FF9900', category: 'Networking' },
        { name: 'Load Balancer', icon: '⚖️', color: '#0078D4', category: 'Networking' },
        { name: 'CDN', icon: '🌐', color: '#4285F4', category: 'Networking' },
        { name: 'VPN', icon: '🔒', color: '#00A4EF', category: 'Networking' }
      ]
    },
    {
      name: 'Serverless',
      collapsed: false,
      items: [
        { name: 'AWS Lambda', icon: '⚡', color: '#FF9900', category: 'Serverless' },
        { name: 'Azure Functions', icon: '⚡', color: '#0078D4', category: 'Serverless' },
        { name: 'GCP Cloud Functions', icon: '⚡', color: '#4285F4', category: 'Serverless' }
      ]
    }
  ]);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      console.log('✅ Canvas initialized');
      this.setupKeyboardShortcuts();
      this.startAutoSave();
      this.updateLastSavedTime();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initDrawflow();
      this.setupDragAndDrop();
      this.setupContextMenu();
      this.updateGridDisplay();
    }
  }
  
  ngOnDestroy(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  initDrawflow(): void {
    const container = this.drawflowCanvas.nativeElement;
    
    this.editor = new Drawflow(container);
    this.editor.reroute = true;
    this.editor.curvature = 0.5;
    this.editor.reroute_curvature_start_end = 0.5;
    this.editor.reroute_curvature = 0.5;
    this.editor.force_first_input = false;
    this.editor.line_path = 1;
    this.editor.editor_mode = 'edit'; // Ensure edit mode for connections
    this.editor.start();
    
    console.log('✅ Drawflow initialized in edit mode');
    
    // Initialize history
    this.history = [this.editor.export()];
    this.historyIndex = 0;
    this.updateHistoryButtons();
    
    // Track changes for undo/redo
    this.editor.on('nodeCreated', () => this.saveHistory());
    this.editor.on('nodeRemoved', () => this.saveHistory());
    this.editor.on('nodeMoved', () => this.saveHistory());
    this.editor.on('connectionCreated', () => this.saveHistory());
    this.editor.on('connectionRemoved', () => this.saveHistory());
    
    // Enable label editing after node creation
    this.editor.on('nodeCreated', (id: number) => {
      setTimeout(() => this.enableLabelEditing(id), 100);
    });
    
    console.log('✅ Drawflow initialized');
  }

  setupDragAndDrop(): void {
    const container = this.drawflowCanvas.nativeElement;
    
    container.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
    });
    
    container.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      
      const serviceName = e.dataTransfer?.getData('serviceName');
      const serviceIcon = e.dataTransfer?.getData('serviceIcon');
      const serviceColor = e.dataTransfer?.getData('serviceColor');
      
      if (serviceName) {
        // Get the precanvas element and its bounding rect
        const precanvasRect = this.editor.precanvas.getBoundingClientRect();
        
        // Calculate position relative to precanvas in screen coordinates
        const relativeX = e.clientX - precanvasRect.left;
        const relativeY = e.clientY - precanvasRect.top;
        
        // Convert to canvas coordinates accounting for zoom and pan
        let x = (relativeX / this.editor.zoom) - (this.editor.canvas_x / this.editor.zoom);
        let y = (relativeY / this.editor.zoom) - (this.editor.canvas_y / this.editor.zoom);
        
        // Center the node under cursor (card is 200px wide, ~150px tall)
        x -= 100; // Half of card width (200px / 2)
        y -= 75;  // Half of card height (~150px / 2)
        
        // Snap to grid if enabled
        if (this.snapToGrid) {
          x = Math.round(x / this.gridSize) * this.gridSize;
          y = Math.round(y / this.gridSize) * this.gridSize;
        }
        
        console.log('📍 Drop position:', { 
          dropX: Math.round(x), 
          dropY: Math.round(y), 
          zoom: this.editor.zoom,
          canvas_x: this.editor.canvas_x,
          canvas_y: this.editor.canvas_y,
          clientX: e.clientX,
          clientY: e.clientY,
          relativeX: Math.round(relativeX),
          relativeY: Math.round(relativeY)
        });
        
        this.addNode(x, y, serviceName, serviceIcon!, serviceColor!);
      }
    });
    
    // Setup canvas click for multi-select
    container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('.drawflow-node');
      
      if (nodeElement) {
        const nodeId = parseInt(nodeElement.getAttribute('id')?.replace('node-', '') || '0');
        this.handleNodeClick(nodeId, e.ctrlKey || e.metaKey);
      } else if (!e.ctrlKey && !e.metaKey) {
        // Clear selection if clicking on empty canvas
        this.clearSelection();
      }
    });
  }

  addNode(x: number, y: number, serviceName: string, icon: string, color: string): void {
    const category = this.getCategoryForService(serviceName);
    
    // Check if this is a custom shape
    const isCustomShape = ['Start', 'End', 'Rectangle', 'Circle', 'Diamond', 'Box'].includes(serviceName);
    
    let html = '';
    let nodeClass = 'modern-service-node';
    
    if (isCustomShape) {
      // Create simple shape HTML
      const shapeMap: { [key: string]: string } = {
        'Rectangle': 'shape-rectangle',
        'Circle': 'shape-circle',
        'Diamond': 'shape-diamond',
        'Start': 'shape-start',
        'End': 'shape-end',
        'Box': 'shape-box'
      };
      
      const shapeClass = shapeMap[serviceName] || 'shape-rectangle';
      nodeClass = `custom-shape-node ${shapeClass}`;
      
      html = `
        <div class="custom-shape ${shapeClass} resizable-shape" style="border-color: ${color}">
          <div class="shape-header" style="background: ${color}">
            <span class="shape-icon">${icon}</span>
            <span 
              class="shape-title editable-label" 
              contenteditable="true" 
              spellcheck="false"
              data-placeholder="${serviceName}"
            >${serviceName}</span>
          </div>
          <div class="shape-body">
            <div 
              class="shape-task-area editable-label" 
              contenteditable="true" 
              spellcheck="false"
              data-placeholder="Add task details here..."
            ></div>
          </div>
          <div class="resize-handle" title="Drag to resize"></div>
        </div>
      `;
    } else {
      // Create standard card HTML
      html = `
        <div class="cloud-node resizable-node" style="border-left-color: ${color}">
          <div class="node-header" style="background: ${this.hexToRgba(color, 0.1)}">
            <span class="node-icon">${icon}</span>
            <span 
              class="node-title editable-label" 
              contenteditable="true" 
              spellcheck="false"
              data-placeholder="${serviceName}"
            >${serviceName}</span>
          </div>
          <div class="node-body">
            <div class="node-category" style="color: ${color}">${category}</div>
            <div class="node-description">
              <div 
                class="node-description-text editable-label" 
                contenteditable="true" 
                spellcheck="false"
                data-placeholder="Add description or details..."
              ></div>
            </div>
            <div class="node-stats">
              <div class="node-stat">
                <i class="bi bi-arrow-left-right"></i>
                <span>1→1</span>
              </div>
              <div class="node-stat">
                <i class="bi bi-link-45deg"></i>
                <span>Multi-Connect</span>
              </div>
            </div>
          </div>
          <div class="resize-handle" title="Drag to resize"></div>
        </div>
      `;
    }
    
    console.log('🎯 Adding node at:', { x: Math.round(x), y: Math.round(y) });
    console.log('🎨 Card HTML preview:', html.substring(0, 200));
    
    // Drawflow's addNode signature: addNode(name, inputs, outputs, pos_x, pos_y, class, data, html)
    const nodeId = this.editor.addNode(
      serviceName,
      2, // inputs - 2 connection points (left and top)
      2, // outputs - 2 connection points (right and bottom)
      x,
      y,
      nodeClass,
      { service: serviceName, icon, color, category: this.getCategoryForService(serviceName), isShape: isCustomShape },
      html
    );

    console.log('✅ Node added with ID:', nodeId);
    
    // Verify and fix position immediately - use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      const nodeElement = document.getElementById(`node-${nodeId}`);
      if (nodeElement) {
        const currentTop = parseFloat(nodeElement.style.top || '0');
        const currentLeft = parseFloat(nodeElement.style.left || '0');
        console.log('🔍 Current position after addNode:', { 
          top: currentTop, 
          left: currentLeft, 
          expectedX: x, 
          expectedY: y 
        });
        
        // Force correct position in DOM with high specificity
        nodeElement.style.setProperty('left', `${x}px`, 'important');
        nodeElement.style.setProperty('top', `${y}px`, 'important');
        
        // Update Drawflow's internal node data
        if (this.editor.drawflow.drawflow.Home.data[nodeId]) {
          this.editor.drawflow.drawflow.Home.data[nodeId].pos_x = x;
          this.editor.drawflow.drawflow.Home.data[nodeId].pos_y = y;
          console.log('✅ Updated Drawflow data:', { pos_x: x, pos_y: y });
        }
        
        console.log('✅ Position corrected in DOM:', { left: x, top: y });
        
        // Verify after a short delay
        setTimeout(() => {
          const verifyTop = parseFloat(nodeElement.style.top || '0');
          const verifyLeft = parseFloat(nodeElement.style.left || '0');
          console.log('🔎 Position verified after 100ms:', { top: verifyTop, left: verifyLeft });
        }, 100);
      }
    });
    
    // Add resize functionality with timeout
    setTimeout(() => {
      this.addResizeHandler(nodeId);
    }, 50);
  }

  getServiceDesign(serviceName: string, icon: string, color: string): any {
    const designs: any = {
      // Docker Design
      'Docker': {
        cardClass: 'docker-card',
        ribbon: '<div class="docker-whale">🐳</div>',
        headerBg: 'linear-gradient(135deg, #0db7ed 0%, #0099cc 100%)',
        logo: '<div class="docker-logo">🐋</div>',
        type: 'Container Platform',
        badge: '<div class="docker-badge">CERTIFIED</div>',
        bodyContent: `
          <div class="docker-stats">
            <div class="stat"><span class="stat-label">Containers</span><span class="stat-value">0</span></div>
            <div class="stat"><span class="stat-label">Images</span><span class="stat-value">0</span></div>
          </div>
        `,
        footerBg: 'rgba(13, 183, 237, 0.1)',
        footerContent: '<div class="docker-status"><span class="status-icon">●</span> Ready to Deploy</div>'
      },
      
      // AWS Design
      'AWS Lambda': {
        cardClass: 'aws-card',
        ribbon: '<div class="aws-stripe"></div>',
        headerBg: 'linear-gradient(135deg, #FF9900 0%, #FF7700 100%)',
        logo: '<div class="aws-logo">λ</div>',
        type: 'Serverless Function',
        badge: '<div class="aws-badge">AWS</div>',
        bodyContent: `
          <div class="aws-config">
            <div class="config-item"><span>Runtime:</span> <span>Node.js 18</span></div>
            <div class="config-item"><span>Memory:</span> <span>128 MB</span></div>
          </div>
        `,
        footerBg: 'rgba(255, 153, 0, 0.1)',
        footerContent: '<div class="aws-region">🌍 us-east-1</div><div class="aws-cost">💰 Pay-per-use</div>'
      },

      // Kubernetes Design
      'Kubernetes': {
        cardClass: 'k8s-card',
        ribbon: '<div class="k8s-helm">⎈</div>',
        headerBg: 'linear-gradient(135deg, #326ce5 0%, #2557c5 100%)',
        logo: '<div class="k8s-logo">☸️</div>',
        type: 'Container Orchestration',
        badge: '<div class="k8s-badge">v1.28</div>',
        bodyContent: `
          <div class="k8s-resources">
            <div class="resource">Pods: <span>0/10</span></div>
            <div class="resource">Services: <span>0</span></div>
          </div>
        `,
        footerBg: 'rgba(50, 108, 229, 0.1)',
        footerContent: '<div class="k8s-cluster"><span class="cluster-icon">⚡</span> Cluster Ready</div>'
      },

      // PostgreSQL Design
      'PostgreSQL': {
        cardClass: 'postgres-card',
        ribbon: '<div class="postgres-elephant">🐘</div>',
        headerBg: 'linear-gradient(135deg, #336791 0%, #274566 100%)',
        logo: '<div class="postgres-logo">🗄️</div>',
        type: 'Relational Database',
        badge: '<div class="postgres-badge">SQL</div>',
        bodyContent: `
          <div class="db-info">
            <div class="db-stat">Tables: <span>0</span></div>
            <div class="db-stat">Connections: <span>0/100</span></div>
          </div>
        `,
        footerBg: 'rgba(51, 103, 145, 0.1)',
        footerContent: '<div class="db-status"><span class="db-icon">🔒</span> Encrypted</div>'
      },

      // MongoDB Design
      'MongoDB': {
        cardClass: 'mongo-card',
        ribbon: '<div class="mongo-leaf">🍃</div>',
        headerBg: 'linear-gradient(135deg, #00ed64 0%, #00c851 100%)',
        logo: '<div class="mongo-logo">🌿</div>',
        type: 'NoSQL Database',
        badge: '<div class="mongo-badge">JSON</div>',
        bodyContent: `
          <div class="mongo-stats">
            <div class="mongo-stat">Collections: <span>0</span></div>
            <div class="mongo-stat">Documents: <span>0</span></div>
          </div>
        `,
        footerBg: 'rgba(0, 237, 100, 0.1)',
        footerContent: '<div class="mongo-status">⚡ Sharded Cluster</div>'
      },

      // TensorFlow Design
      'TensorFlow': {
        cardClass: 'tensorflow-card',
        ribbon: '<div class="tf-gradient"></div>',
        headerBg: 'linear-gradient(135deg, #ff6f00 0%, #ff5722 100%)',
        logo: '<div class="tf-logo">🧠</div>',
        type: 'ML Framework',
        badge: '<div class="tf-badge">GPU</div>',
        bodyContent: `
          <div class="ml-metrics">
            <div class="metric">Accuracy: <span>--</span></div>
            <div class="metric">Epochs: <span>0</span></div>
          </div>
        `,
        footerBg: 'rgba(255, 111, 0, 0.1)',
        footerContent: '<div class="tf-status">🚀 Training Ready</div>'
      },

      // API Gateway Design
      'API Gateway': {
        cardClass: 'api-card',
        ribbon: '<div class="api-wave">〰️</div>',
        headerBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        logo: '<div class="api-logo">🔌</div>',
        type: 'API Management',
        badge: '<div class="api-badge">REST</div>',
        bodyContent: `
          <div class="api-endpoints">
            <div class="endpoint">GET /api/v1</div>
            <div class="endpoint">POST /api/v1</div>
          </div>
        `,
        footerBg: 'rgba(99, 102, 241, 0.1)',
        footerContent: '<div class="api-status">✓ CORS Enabled</div><div class="api-rate">1000 req/s</div>'
      },

      // Redis Design
      'Redis': {
        cardClass: 'redis-card',
        ribbon: '<div class="redis-flash">⚡</div>',
        headerBg: 'linear-gradient(135deg, #dc382d 0%, #b02a21 100%)',
        logo: '<div class="redis-logo">📮</div>',
        type: 'In-Memory Cache',
        badge: '<div class="redis-badge">FAST</div>',
        bodyContent: `
          <div class="redis-info">
            <div class="cache-stat">Keys: <span>0</span></div>
            <div class="cache-stat">Memory: <span>0 MB</span></div>
          </div>
        `,
        footerBg: 'rgba(220, 56, 45, 0.1)',
        footerContent: '<div class="redis-perf">⚡ Sub-ms latency</div>'
      }
    };

    // Default design for services not in the map
    const defaultDesign = {
      cardClass: 'default-card',
      ribbon: `<div class="default-ribbon" style="background: ${color}"></div>`,
      headerBg: `linear-gradient(135deg, ${color}dd 0%, ${color}aa 100%)`,
      logo: `<div class="default-logo">${icon}</div>`,
      type: 'Service',
      badge: '<div class="default-badge">●</div>',
      bodyContent: `
        <div class="default-stats">
          <div class="stat-item">Status: <span>Ready</span></div>
        </div>
      `,
      footerBg: `${color}15`,
      footerContent: `<div class="default-status" style="color: ${color}">⚡ Active</div>`
    };

    return designs[serviceName] || defaultDesign;
  }

  getCategoryForService(serviceName: string): string {
    for (const category of this.categories()) {
      const found = category.items.find(item => item.name === serviceName);
      if (found) return found.category;
    }
    return 'General';
  }

  getCardStyleForCategory(category: string): { class: string; tag: string } {
    const styles: any = {
      'Infrastructure': { class: 'card-infrastructure', tag: '🏗️ Infrastructure' },
      'AI/ML': { class: 'card-ai', tag: '🤖 AI/ML' },
      'Storage': { class: 'card-storage', tag: '📦 Storage' },
      'Networking': { class: 'card-networking', tag: '🌐 Network' },
      'Serverless': { class: 'card-serverless', tag: '⚡ Serverless' },
      'Flow': { class: 'card-flow', tag: '▶️ Flow' },
      'Shapes': { class: 'card-shape', tag: '◆ Shape' }
    };
    return styles[category] || { class: 'card-default', tag: '📝 Task' };
  }

  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  onDragStart(event: DragEvent, service: ServiceItem): void {
    event.dataTransfer!.setData('serviceName', service.name);
    event.dataTransfer!.setData('serviceIcon', service.icon);
    event.dataTransfer!.setData('serviceColor', service.color);
    event.dataTransfer!.setData('serviceCategory', service.category);
    event.dataTransfer!.effectAllowed = 'copy';
    console.log('🎯 Drag started:', service.name);
  }

  toggleCategory(category: ServiceCategory): void {
    category.collapsed = !category.collapsed;
  }

  filteredCategories(): ServiceCategory[] {
    if (!this.searchTerm.trim()) {
      return this.categories();
    }
    
    const searchLower = this.searchTerm.toLowerCase();
    return this.categories()
      .map(category => ({
        ...category,
        items: category.items.filter(item => 
          item.name.toLowerCase().includes(searchLower)
        )
      }))
      .filter(category => category.items.length > 0);
  }

  // Minimal canvas actions
  clearCanvas(): void {
    if (confirm('Clear the canvas?')) {
      this.editor.clear();
    }
  }

  zoomIn(): void {
    this.editor.zoom_in();
  }

  zoomOut(): void {
    this.editor.zoom_out();
  }

  zoomReset(): void {
    this.editor.zoom_reset();
  }

  exportDiagram(): void {
    // Ask user which format they want
    const useSimpleFormat = confirm('Export as simple JSON format?\n\n✅ Click OK for Simple Format (easy to read/edit)\n❌ Click Cancel for Full Drawflow Format (includes all details)');
    
    if (useSimpleFormat) {
      this.exportSimpleJSON();
    } else {
      this.exportFullDrawflow();
    }
  }

  exportSimpleJSON(): void {
    const allNodes = this.editor.drawflow.drawflow.Home.data;
    const nodeIds = Object.keys(allNodes);
    
    // First, identify all Box nodes
    const boxNodes = nodeIds.filter(id => {
      const node = allNodes[id];
      return node.name === 'Box' || node.data?.service === 'Box';
    }).map(id => ({
      id,
      node: allNodes[id]
    }));
    
    // Build simplified nodes array with Box containment info
    const nodes = nodeIds.map(nodeId => {
      const node = allNodes[nodeId];
      
      // Get the actual edited name from the DOM
      const nodeElement = document.getElementById(`node-${nodeId}`);
      let actualName = node.data.service || node.name || 'Unnamed';
      
      if (nodeElement) {
        const titleElement = nodeElement.querySelector('.node-title');
        if (titleElement && titleElement.textContent) {
          actualName = titleElement.textContent.trim();
        }
      }
      
      // Check if this node is inside any Box
      let parentBoxId = null;
      if (actualName !== 'Box') {
        // Get actual node dimensions from DOM or data
        let nodeWidth = node.data?.width || 200;
        let nodeHeight = node.data?.height || 150;
        
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
          const nodeCard = nodeElement.querySelector('.cloud-node, .custom-shape') as HTMLElement;
          if (nodeCard) {
            nodeWidth = nodeCard.offsetWidth || nodeWidth;
            nodeHeight = nodeCard.offsetHeight || nodeHeight;
          }
        }
        
        const nodeCenterX = node.pos_x + (nodeWidth / 2);
        const nodeCenterY = node.pos_y + (nodeHeight / 2);
        
        console.log(`Checking ${actualName}: pos(${node.pos_x}, ${node.pos_y}), size(${nodeWidth}x${nodeHeight}), center(${nodeCenterX}, ${nodeCenterY})`);
        
        for (const box of boxNodes) {
          const boxX = box.node.pos_x;
          const boxY = box.node.pos_y;
          const boxWidth = box.node.data?.width || 500;
          const boxHeight = box.node.data?.height || 400;
          
          console.log(`  Box ${box.id}: pos(${boxX}, ${boxY}), size(${boxWidth}x${boxHeight}), range X(${boxX}-${boxX + boxWidth}), Y(${boxY}-${boxY + boxHeight})`);
          
          if (nodeCenterX >= boxX && nodeCenterX <= (boxX + boxWidth) &&
              nodeCenterY >= boxY && nodeCenterY <= (boxY + boxHeight)) {
            parentBoxId = `node-${box.id}`;
            console.log(`  ✅ ${actualName} is inside Box ${box.id}`);
            break;
          } else {
            console.log(`  ❌ ${actualName} is NOT inside Box ${box.id}`);
          }
        }
      }
      
      const nodeData: any = {
        id: `node-${nodeId}`,
        name: actualName,
        icon: node.data.icon || '📦',
        color: node.data.color || '#3B82F6',
        x: Math.round(node.pos_x),
        y: Math.round(node.pos_y)
      };
      
      // Add parentBox if this node is inside a Box
      if (parentBoxId) {
        nodeData.parentBox = parentBoxId;
      }
      
      // Add size for Box nodes
      if (actualName === 'Box') {
        nodeData.width = node.data?.width || 500;
        nodeData.height = node.data?.height || 400;
      }
      
      return nodeData;
    });
    
    // Build simplified connections array
    const connections: any[] = [];
    nodeIds.forEach(nodeId => {
      const node = allNodes[nodeId];
      if (node.outputs) {
        Object.keys(node.outputs).forEach(outputKey => {
          const output = node.outputs[outputKey];
          if (output.connections && output.connections.length > 0) {
            output.connections.forEach((conn: any) => {
              connections.push({
                from: `node-${nodeId}`,
                to: `node-${conn.node}`
              });
            });
          }
        });
      }
    });
    
    const simpleData = {
      nodes,
      connections
    };
    
    const dataStr = JSON.stringify(simpleData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `architecture-simple-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ Simple JSON exported:', simpleData);
  }

  exportFullDrawflow(): void {
    const exportData = this.editor.export();
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `architecture-full-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ Full Drawflow JSON exported');
  }

  // ============================================
  // UNDO/REDO FUNCTIONALITY
  // ============================================
  
  private saveHistory(): void {
    // Remove any history after current index
    this.history.splice(this.historyIndex + 1);
    
    // Add current state
    const currentState = this.editor.export();
    this.history.push(JSON.parse(JSON.stringify(currentState)));
    
    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
    
    this.updateHistoryButtons();
  }

  private updateHistoryButtons(): void {
    this.canUndo = this.historyIndex > 0;
    this.canRedo = this.historyIndex < this.history.length - 1;
  }

  undo(): void {
    if (!this.canUndo) return;
    
    this.historyIndex--;
    const state = this.history[this.historyIndex];
    this.editor.clear();
    this.editor.import(state);
    this.updateHistoryButtons();
  }

  redo(): void {
    if (!this.canRedo) return;
    
    this.historyIndex++;
    const state = this.history[this.historyIndex];
    this.editor.clear();
    this.editor.import(state);
    this.updateHistoryButtons();
  }

  // ============================================
  // CONTEXT MENU
  // ============================================
  
  setupContextMenu(): void {
    const container = this.drawflowCanvas.nativeElement;
    
    container.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('.drawflow-node');
      
      if (nodeElement) {
        const nodeId = parseInt(nodeElement.getAttribute('id')?.replace('node-', '') || '0');
        this.showContextMenu(e.clientX, e.clientY, nodeId);
      } else {
        this.hideContextMenu();
      }
    });

    // Hide context menu on canvas click
    container.addEventListener('click', () => {
      this.hideContextMenu();
    });
  }

  showContextMenu(x: number, y: number, nodeId: number): void {
    this.contextMenu = { visible: true, x, y, nodeId };
  }

  hideContextMenu(): void {
    this.contextMenu = { visible: false, x: 0, y: 0, nodeId: null };
  }

  deleteNode(): void {
    if (this.contextMenu.nodeId !== null) {
      this.editor.removeNodeId(`node-${this.contextMenu.nodeId}`);
      this.hideContextMenu();
    }
  }

  duplicateNode(): void {
    if (this.contextMenu.nodeId !== null) {
      const nodeData = this.editor.getNodeFromId(this.contextMenu.nodeId);
      if (nodeData) {
        const data = nodeData.data;
        const x = nodeData.pos_x + 50;
        const y = nodeData.pos_y + 50;
        this.addNode(x, y, data.service, data.icon || '📦', data.color || '#FF9900');
      }
      this.hideContextMenu();
    }
  }

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  
  setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Undo (Cmd/Ctrl + Z)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Redo (Cmd/Ctrl + Shift + Z)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        this.redo();
      }
      
      // Export (Cmd/Ctrl + E)
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        this.exportDiagram();
      }
      
      // Delete selected (Delete/Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedNodes.size > 0) {
          e.preventDefault();
          this.deleteSelectedNodes();
        } else {
          const selectedNode = document.querySelector('.drawflow-node.selected');
          if (selectedNode) {
            e.preventDefault();
            const nodeId = selectedNode.getAttribute('id')?.replace('node-', '');
            if (nodeId) {
              this.editor.removeNodeId(`node-${nodeId}`);
            }
          }
        }
      }
      
      // Select All (Cmd/Ctrl + A)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        this.selectAllNodes();
      }
      
      // Deselect All (Escape)
      if (e.key === 'Escape') {
        this.clearSelection();
      }
    });
  }

  // ============================================
  // SAVE/LOAD FUNCTIONALITY
  // ============================================
  
  saveToLocalStorage(): void {
    const exportData = this.editor.export();
    localStorage.setItem('architecture-canvas', JSON.stringify(exportData));
    alert('Canvas saved to browser storage!');
  }

  loadFromLocalStorage(): void {
    const saved = localStorage.getItem('architecture-canvas');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.editor.import(data);
        this.saveHistory();
        alert('Canvas loaded successfully!');
      } catch (error) {
        alert('Error loading saved canvas.');
        console.error('Load error:', error);
      }
    } else {
      alert('No saved canvas found.');
    }
  }

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
          
          // Check if it's a Drawflow format or simplified format
          if (importData.drawflow) {
            // Standard Drawflow format
            this.editor.import(importData);
            
            // Refresh after import to fix any rendering issues
            setTimeout(() => {
              this.refreshCanvas();
              this.saveHistory();
            }, 200);
            
            alert('Diagram imported successfully!');
          } else if (importData.nodes && Array.isArray(importData.nodes)) {
            // Simplified JSON format
            this.importFromSimplifiedJSON(importData);
            alert('Diagram imported from simplified JSON successfully!');
          } else {
            alert('Unrecognized JSON format. Please use either Drawflow format or simplified format.');
          }
        } catch (error) {
          alert('Error importing diagram. Please check the file format.');
          console.error('Import error:', error);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  // Import from simplified JSON format
  importFromSimplifiedJSON(data: any): void {
    // Clear existing canvas
    this.editor.clear();
    
    const nodeIdMap: { [key: string]: number } = {};
    const nodesWithParents: any[] = [];
    
    // First pass: Create Box nodes first (so they're in background)
    if (data.nodes && Array.isArray(data.nodes)) {
      data.nodes
        .filter((node: any) => node.name === 'Box')
        .forEach((node: any) => {
          const x = node.x || 0;
          const y = node.y || 0;
          const name = node.name || 'Unnamed';
          const icon = node.icon || '📦';
          const color = node.color || '#3B82F6';
          
          this.addNode(x, y, name, icon, color);
          
          // Get the last added node ID
          const allNodes = this.editor.drawflow.drawflow.Home.data;
          const nodeIds = Object.keys(allNodes);
          const lastNodeId = nodeIds[nodeIds.length - 1];
          
          // Map original ID to new ID
          if (node.id) {
            nodeIdMap[node.id] = parseInt(lastNodeId);
          }
          
          // Apply custom size if provided
          if (node.width || node.height) {
            const nodeElement = document.getElementById(`node-${lastNodeId}`);
            if (nodeElement) {
              if (node.width) {
                nodeElement.style.width = `${node.width}px`;
                allNodes[lastNodeId].data.width = node.width;
              }
              if (node.height) {
                nodeElement.style.height = `${node.height}px`;
                allNodes[lastNodeId].data.height = node.height;
              }
            }
          }
        });
    }
    
    // Second pass: Create regular nodes
    if (data.nodes && Array.isArray(data.nodes)) {
      data.nodes
        .filter((node: any) => node.name !== 'Box')
        .forEach((node: any) => {
          const x = node.x || 0;
          const y = node.y || 0;
          const name = node.name || 'Unnamed';
          const icon = node.icon || '📦';
          const color = node.color || '#3B82F6';
          
          console.log(`📍 Importing node: ${name} at (${x}, ${y}), parentBox: ${node.parentBox || 'none'}`);
          
          this.addNode(x, y, name, icon, color);
          
          // Get the last added node ID
          const allNodes = this.editor.drawflow.drawflow.Home.data;
          const nodeIds = Object.keys(allNodes);
          const lastNodeId = nodeIds[nodeIds.length - 1];
          
          // Map original ID to new ID
          if (node.id) {
            nodeIdMap[node.id] = parseInt(lastNodeId);
          }
          
          // Mark node as having a parent box to prevent Auto Layout from moving it
          if (node.parentBox) {
            allNodes[lastNodeId].data.insideBox = true;
            allNodes[lastNodeId].data.parentBoxId = node.parentBox;
            console.log(`  ✅ Marked node ${lastNodeId} (${name}) as insideBox with parentBoxId: ${node.parentBox}`);
            
            nodesWithParents.push({
              newNodeId: lastNodeId,
              originalParentId: node.parentBox,
              node: node
            });
          }
          
          // Verify position after creation
          const createdNode = allNodes[lastNodeId];
          console.log(`  📌 Created at pos_x: ${createdNode.pos_x}, pos_y: ${createdNode.pos_y}`);
        });
    }
    
    // Third pass: Create connections (with delay to ensure nodes are rendered)
    setTimeout(() => {
      if (data.connections && Array.isArray(data.connections)) {
        data.connections.forEach((conn: any) => {
          const fromNodeId = nodeIdMap[conn.from];
          const toNodeId = nodeIdMap[conn.to];
          
          if (fromNodeId && toNodeId) {
            // Add connection
            this.editor.addConnection(
              fromNodeId,
              toNodeId,
              conn.fromOutput || 'output_1',
              conn.toInput || 'input_1'
            );
          }
        });
      }
      
      // Log Box containment information for verification
      if (nodesWithParents.length > 0) {
        console.log('📦 Nodes with Box parents imported:');
        nodesWithParents.forEach(item => {
          const parentId = nodeIdMap[item.originalParentId];
          const node = this.editor.drawflow.drawflow.Home.data[item.newNodeId];
          console.log(`  - Node ${item.newNodeId} (${item.node.name}) inside Box ${parentId}`);
          console.log(`    Position: x=${node.pos_x}, y=${node.pos_y}, insideBox=${node.data?.insideBox}`);
        });
      }
      
      // Refresh canvas to fix any overlap issues
      this.refreshCanvas();
      this.saveHistory();
    }, 100);
  }

  // Refresh canvas to fix rendering issues
  refreshCanvas(): void {
    const allNodes = this.editor.drawflow.drawflow.Home.data;
    const nodeIds = Object.keys(allNodes);
    
    nodeIds.forEach(nodeId => {
      const node = allNodes[nodeId];
      const nodeElement = document.getElementById(`node-${nodeId}`);
      
      if (nodeElement && node) {
        // Force position update
        nodeElement.style.left = `${node.pos_x}px`;
        nodeElement.style.top = `${node.pos_y}px`;
        
        // Re-enable label editing
        setTimeout(() => {
          this.enableLabelEditing(parseInt(nodeId));
          this.addResizeHandler(nodeId);
        }, 50);
      }
    });
    
    // Update all connections
    setTimeout(() => {
      nodeIds.forEach(nodeId => {
        this.editor.updateConnectionNodes(`node-${nodeId}`);
      });
    }, 100);
    
    console.log('✅ Canvas refreshed');
  }

  // Auto layout nodes in a clean hierarchical structure
  autoLayoutNodes(): void {
    const allNodes = this.editor.drawflow.drawflow.Home.data;
    const nodeIds = Object.keys(allNodes);
    
    if (nodeIds.length === 0) {
      alert('No nodes to organize');
      return;
    }
    
    // Separate Box shapes from other nodes - Box shapes should not be moved by auto-layout
    const boxNodes: string[] = [];
    const layoutNodes: string[] = [];
    const nodesInsideBox: string[] = []; // Nodes that are visually inside a Box
    
    nodeIds.forEach(id => {
      const node = allNodes[id];
      const serviceName = node.data?.service || node.name || '';
      
      // Check if this is a Box shape (container/boundary)
      if (serviceName === 'Box') {
        boxNodes.push(id);
      } else {
        // Check if node is marked as inside a box (from import)
        if (node.data?.insideBox === true) {
          nodesInsideBox.push(id);
          console.log(`📦 Auto-layout detected node ${id} (${serviceName}) marked as insideBox`);
        }
        layoutNodes.push(id);
      }
    });
    
    // Detect which nodes are inside Box boundaries
    if (boxNodes.length > 0) {
      boxNodes.forEach(boxId => {
        const boxNode = allNodes[boxId];
        const boxElement = document.getElementById(`node-${boxId}`);
        
        if (boxElement) {
          const boxShape = boxElement.querySelector('.shape-box') as HTMLElement;
          if (boxShape) {
            const boxX = boxNode.pos_x;
            const boxY = boxNode.pos_y;
            const boxWidth = boxShape.offsetWidth || 500;
            const boxHeight = boxShape.offsetHeight || 400;
            
            // Check each layout node to see if it's inside this box
            layoutNodes.forEach(nodeId => {
              const node = allNodes[nodeId];
              const nodeElement = document.getElementById(`node-${nodeId}`);
              
              if (nodeElement) {
                const nodeCard = nodeElement.querySelector('.cloud-node, .custom-shape') as HTMLElement;
                if (nodeCard) {
                  const nodeWidth = nodeCard.offsetWidth || 200;
                  const nodeHeight = nodeCard.offsetHeight || 150;
                  
                  // Check if node center is inside box boundaries
                  const nodeCenterX = node.pos_x + (nodeWidth / 2);
                  const nodeCenterY = node.pos_y + (nodeHeight / 2);
                  
                  if (nodeCenterX >= boxX && 
                      nodeCenterX <= (boxX + boxWidth) &&
                      nodeCenterY >= boxY && 
                      nodeCenterY <= (boxY + boxHeight)) {
                    nodesInsideBox.push(nodeId);
                  }
                }
              }
            });
          }
        }
      });
      
      // Remove nodes inside boxes from the layout list
      nodesInsideBox.forEach(nodeId => {
        const index = layoutNodes.indexOf(nodeId);
        if (index > -1) {
          layoutNodes.splice(index, 1);
        }
      });
      
      console.log(`📦 Found ${nodesInsideBox.length} nodes inside Box containers - they will not be moved`);
    }
    
    if (layoutNodes.length === 0) {
      alert('No nodes to organize (only Box containers found)');
      return;
    }
    
    // Build connection graph to determine hierarchy (only for non-Box nodes)
    const nodeConnections: { [key: string]: { incoming: string[], outgoing: string[] } } = {};
    
    layoutNodes.forEach(id => {
      nodeConnections[id] = { incoming: [], outgoing: [] };
    });
    
    // Analyze connections (only between layout nodes, ignore Box nodes)
    layoutNodes.forEach(id => {
      const node = allNodes[id];
      if (node.outputs && node.outputs.output_1 && node.outputs.output_1.connections) {
        node.outputs.output_1.connections.forEach((conn: any) => {
          const targetId = conn.node.toString();
          // Only consider connections to other layout nodes (not Box nodes)
          if (layoutNodes.includes(targetId)) {
            nodeConnections[id].outgoing.push(targetId);
            nodeConnections[targetId].incoming.push(id);
          }
        });
      }
    });
    
    // Organize nodes by level (how far from root)
    const levels: { [level: number]: string[] } = {};
    const visited = new Set<string>();
    const nodeLevel: { [key: string]: number } = {};
    
    // Find root nodes (no incoming connections)
    const rootNodes = layoutNodes.filter(id => nodeConnections[id].incoming.length === 0);
    
    if (rootNodes.length === 0) {
      // If no clear root, start with first node
      rootNodes.push(layoutNodes[0]);
    }
    
    // BFS to assign levels
    const queue: { id: string, level: number }[] = rootNodes.map(id => ({ id, level: 0 }));
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (visited.has(id)) continue;
      visited.add(id);
      
      if (!levels[level]) levels[level] = [];
      levels[level].push(id);
      nodeLevel[id] = level;
      
      // Add children to queue
      nodeConnections[id].outgoing.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 });
        }
      });
    }
    
    // Add any unvisited nodes to the end
    layoutNodes.forEach(id => {
      if (!visited.has(id)) {
        const maxLevel = Math.max(...Object.keys(levels).map(Number), 0);
        if (!levels[maxLevel + 1]) levels[maxLevel + 1] = [];
        levels[maxLevel + 1].push(id);
      }
    });
    
    // Layout parameters
    const horizontalSpacing = 350; // Space between columns
    const verticalSpacing = 220;   // Space between rows
    let startX = 100;
    let startY = 150;
    
    // Check if any Box shapes exist and adjust starting position to avoid overlap
    if (boxNodes.length > 0) {
      // Find the rightmost and bottommost Box position
      let maxBoxRight = 0;
      let maxBoxBottom = 0;
      
      boxNodes.forEach(boxId => {
        const boxNode = allNodes[boxId];
        const boxElement = document.getElementById(`node-${boxId}`);
        if (boxElement) {
          const boxShape = boxElement.querySelector('.shape-box') as HTMLElement;
          if (boxShape) {
            const boxWidth = boxShape.offsetWidth || 500;
            const boxHeight = boxShape.offsetHeight || 400;
            const boxRight = boxNode.pos_x + boxWidth;
            const boxBottom = boxNode.pos_y + boxHeight;
            
            maxBoxRight = Math.max(maxBoxRight, boxRight);
            maxBoxBottom = Math.max(maxBoxBottom, boxBottom);
          }
        }
      });
      
      // If boxes exist in the typical starting area, move the layout start point
      if (maxBoxRight > startX && maxBoxBottom > startY) {
        startX = maxBoxRight + 100; // Start 100px to the right of the rightmost box
        console.log(`📦 Box detected, adjusting layout start to X: ${startX}`);
      }
    }
    
    // Position nodes (only layout nodes, NOT Box nodes)
    Object.keys(levels).forEach(levelStr => {
      const level = parseInt(levelStr);
      const nodesInLevel = levels[level];
      
      nodesInLevel.forEach((nodeId, index) => {
        const x = startX + (level * horizontalSpacing);
        const y = startY + (index * verticalSpacing);
        
        // Update node position in Drawflow
        allNodes[nodeId].pos_x = x;
        allNodes[nodeId].pos_y = y;
        
        // Update DOM
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
          nodeElement.style.left = `${x}px`;
          nodeElement.style.top = `${y}px`;
        }
      });
    });
    
    console.log(`✅ Auto layout: ${layoutNodes.length} nodes organized, ${boxNodes.length} Box containers kept in place, ${nodesInsideBox.length} nodes inside boxes preserved`);
    
    // Update ALL connections after positioning with a delay
    setTimeout(() => {
      // Use Drawflow's method to update all connection positions
      const container = this.drawflowCanvas.nativeElement;
      const precanvas = container.querySelector('.drawflow');
      
      if (precanvas) {
        // Get all connection elements
        const connectionElements = precanvas.querySelectorAll('.connection');
        
        // Update each connection by triggering Drawflow's internal update
        connectionElements.forEach((connElement: any) => {
          const connId = connElement.classList[1]; // Gets the connection ID class
          if (connId) {
            // Force update by accessing the node
            const nodeId = connId.split('_')[1]; // Extract node ID from class
            if (nodeId) {
              this.editor.updateConnectionNodes(`node-${nodeId}`);
            }
          }
        });
      }
      
      // Also manually update each node's connections
      nodeIds.forEach(nodeId => {
        this.editor.updateConnectionNodes(`node-${nodeId}`);
      });
      
      console.log('✅ All connections updated');
    }, 150);
    
    // Save to history
    this.saveHistory();
    
    console.log('✅ Auto layout complete:', {
      totalNodes: nodeIds.length,
      levels: Object.keys(levels).length,
      rootNodes: rootNodes.length
    });
    
    alert('Nodes organized successfully!');
  }

  // ============================================
  // EDITABLE LABELS
  // ============================================
  
  enableLabelEditing(nodeId: number): void {
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (!nodeElement) return;

    const editableLabels = nodeElement.querySelectorAll('.editable-label');
    editableLabels.forEach((label: Element) => {
      const labelElement = label as HTMLElement;
      
      labelElement.addEventListener('mousedown', (e: MouseEvent) => {
        e.stopPropagation();
      });
      
      labelElement.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation();
        labelElement.focus();
      });
      
      labelElement.addEventListener('dblclick', (e: MouseEvent) => {
        e.stopPropagation();
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(labelElement);
        selection?.removeAllRanges();
        selection?.addRange(range);
      });
      
      labelElement.addEventListener('blur', () => {
        this.saveHistory();
      });
      
      labelElement.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          labelElement.blur();
        }
        e.stopPropagation();
      });
    });
  }

  // ============================================
  // GRID & VISUAL FEATURES
  // ============================================
  
  toggleGrid(): void {
    this.showGrid = !this.showGrid;
    this.updateGridDisplay();
  }

  updateGridDisplay(): void {
    const container = this.drawflowCanvas?.nativeElement;
    if (!container) return;
    
    if (this.showGrid) {
      container.style.backgroundImage = `
        linear-gradient(90deg, rgba(100, 116, 139, 0.1) 1px, transparent 1px),
        linear-gradient(rgba(100, 116, 139, 0.1) 1px, transparent 1px)
      `;
      container.style.backgroundSize = `${this.gridSize}px ${this.gridSize}px`;
    } else {
      container.style.backgroundImage = 'none';
    }
  }

  // ============================================
  // AUTO-SAVE
  // ============================================
  
  startAutoSave(): void {
    this.autoSaveInterval = setInterval(() => {
      this.autoSave();
    }, 30000); // Auto-save every 30 seconds
  }

  autoSave(): void {
    try {
      const exportData = this.editor.export();
      localStorage.setItem('architecture-canvas-autosave', JSON.stringify(exportData));
      this.updateLastSavedTime();
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  updateLastSavedTime(): void {
    const now = new Date();
    this.lastSaved = now.toLocaleTimeString();
  }

  // ============================================
  // EXPORT AS PNG
  // ============================================
  
  async exportAsPNG(): Promise<void> {
    if (!this.isBrowser) return;
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(this.drawflowCanvas.nativeElement, {
        backgroundColor: '#1e293b',
        scale: 2
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `architecture-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
          alert('PNG exported! Check your downloads folder.');
        }
      });
    } catch (error) {
      console.error('PNG export error:', error);
      alert('Error exporting PNG. Make sure html2canvas is installed.');
    }
  }

  // ============================================
  // MULTI-SELECT & NODE SELECTION
  // ============================================
  
  handleNodeClick(nodeId: number, isMultiSelect: boolean): void {
    if (isMultiSelect) {
      // Toggle selection
      if (this.selectedNodes.has(nodeId)) {
        this.selectedNodes.delete(nodeId);
      } else {
        this.selectedNodes.add(nodeId);
      }
    } else {
      // Single select
      this.selectedNodes.clear();
      this.selectedNodes.add(nodeId);
    }
    this.updateNodeSelectionUI();
  }

  clearSelection(): void {
    this.selectedNodes.clear();
    this.updateNodeSelectionUI();
  }

  selectAllNodes(): void {
    const allNodes = this.editor.drawflow.drawflow.Home.data;
    Object.keys(allNodes).forEach(nodeId => {
      this.selectedNodes.add(parseInt(nodeId));
    });
    this.updateNodeSelectionUI();
  }

  updateNodeSelectionUI(): void {
    // Remove all selection styling
    document.querySelectorAll('.drawflow-node').forEach(node => {
      node.classList.remove('multi-selected');
    });
    
    // Add selection styling to selected nodes
    this.selectedNodes.forEach(nodeId => {
      const nodeElement = document.getElementById(`node-${nodeId}`);
      if (nodeElement) {
        nodeElement.classList.add('multi-selected');
      }
    });
  }

  deleteSelectedNodes(): void {
    if (this.selectedNodes.size === 0) return;
    
    if (confirm(`Delete ${this.selectedNodes.size} selected node(s)?`)) {
      this.selectedNodes.forEach(nodeId => {
        this.editor.removeNodeId(`node-${nodeId}`);
      });
      this.selectedNodes.clear();
    }
  }

  // ============================================
  // NODE ALIGNMENT TOOLS
  // ============================================
  
  alignNodesHorizontal(): void {
    if (this.selectedNodes.size < 2) {
      alert('Please select at least 2 nodes to align');
      return;
    }

    const nodes: any[] = [];
    this.selectedNodes.forEach(nodeId => {
      const node = this.editor.getNodeFromId(nodeId);
      if (node) nodes.push({ id: nodeId, ...node });
    });

    // Calculate average Y position
    const avgY = nodes.reduce((sum, node) => sum + node.pos_y, 0) / nodes.length;

    // Align all nodes to average Y
    nodes.forEach(node => {
      this.editor.drawflow.drawflow.Home.data[node.id].pos_y = avgY;
      const nodeElement = document.getElementById(`node-${node.id}`);
      if (nodeElement) {
        nodeElement.style.top = avgY + 'px';
      }
    });

    this.saveHistory();
  }

  alignNodesVertical(): void {
    if (this.selectedNodes.size < 2) {
      alert('Please select at least 2 nodes to align');
      return;
    }

    const nodes: any[] = [];
    this.selectedNodes.forEach(nodeId => {
      const node = this.editor.getNodeFromId(nodeId);
      if (node) nodes.push({ id: nodeId, ...node });
    });

    // Calculate average X position
    const avgX = nodes.reduce((sum, node) => sum + node.pos_x, 0) / nodes.length;

    // Align all nodes to average X
    nodes.forEach(node => {
      this.editor.drawflow.drawflow.Home.data[node.id].pos_x = avgX;
      const nodeElement = document.getElementById(`node-${node.id}`);
      if (nodeElement) {
        nodeElement.style.left = avgX + 'px';
      }
    });

    this.saveHistory();
  }

  distributeNodesHorizontal(): void {
    if (this.selectedNodes.size < 3) {
      alert('Please select at least 3 nodes to distribute');
      return;
    }

    const nodes: any[] = [];
    this.selectedNodes.forEach(nodeId => {
      const node = this.editor.getNodeFromId(nodeId);
      if (node) nodes.push({ id: nodeId, ...node });
    });

    // Sort by X position
    nodes.sort((a, b) => a.pos_x - b.pos_x);

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const spacing = (last.pos_x - first.pos_x) / (nodes.length - 1);

    // Distribute evenly
    nodes.forEach((node, index) => {
      const newX = first.pos_x + (spacing * index);
      this.editor.drawflow.drawflow.Home.data[node.id].pos_x = newX;
      const nodeElement = document.getElementById(`node-${node.id}`);
      if (nodeElement) {
        nodeElement.style.left = newX + 'px';
      }
    });

    this.saveHistory();
  }

  // ============================================
  // SNAP TO GRID
  // ============================================
  
  toggleSnapToGrid(): void {
    this.snapToGrid = !this.snapToGrid;
  }

  snapSelectedNodesToGrid(): void {
    if (this.selectedNodes.size === 0) {
      alert('Please select nodes to snap to grid');
      return;
    }

    this.selectedNodes.forEach(nodeId => {
      const node = this.editor.getNodeFromId(nodeId);
      if (node) {
        const snappedX = Math.round(node.pos_x / this.gridSize) * this.gridSize;
        const snappedY = Math.round(node.pos_y / this.gridSize) * this.gridSize;
        
        this.editor.drawflow.drawflow.Home.data[nodeId].pos_x = snappedX;
        this.editor.drawflow.drawflow.Home.data[nodeId].pos_y = snappedY;
        
        const nodeElement = document.getElementById(`node-${nodeId}`);
        if (nodeElement) {
          nodeElement.style.left = snappedX + 'px';
          nodeElement.style.top = snappedY + 'px';
        }
      }
    });

    this.saveHistory();
  }

  // ============================================
  // RESIZE FUNCTIONALITY
  // ============================================
  
  addResizeHandler(nodeId: string): void {
    const nodeElement = document.getElementById(`node-${nodeId}`);
    if (!nodeElement) return;

    // Check for both standard card and custom shape
    const card = nodeElement.querySelector('.cloud-node') as HTMLElement || 
                 nodeElement.querySelector('.custom-shape') as HTMLElement;
    const resizeHandle = nodeElement.querySelector('.resize-handle') as HTMLElement;
    
    if (!card || !resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = card.offsetWidth;
      startHeight = card.offsetHeight;
      
      card.style.transition = 'none';
      document.body.style.cursor = 'nwse-resize';
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing) return;
        
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        // Set minimum sizes based on card type
        const minWidth = card.classList.contains('custom-shape') ? 150 : 200;
        const minHeight = card.classList.contains('custom-shape') ? 120 : 150;
        
        const newWidth = Math.max(minWidth, startWidth + deltaX);
        const newHeight = Math.max(minHeight, startHeight + deltaY);
        
        card.style.width = newWidth + 'px';
        card.style.height = newHeight + 'px';
        card.style.minWidth = newWidth + 'px';
        card.style.minHeight = newHeight + 'px';
      };
      
      const onMouseUp = () => {
        if (isResizing) {
          isResizing = false;
          card.style.transition = '';
          document.body.style.cursor = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // ============================================
  // MINIMAP
  // ============================================
  
  toggleMinimap(): void {
    this.showMinimap = !this.showMinimap;
  }
}
