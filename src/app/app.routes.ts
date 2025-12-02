import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { CytoscapeCanvasComponent } from './components/cytoscape-canvas/cytoscape-canvas.component';
import { ArchitectureBuilderComponent } from './components/architecture-builder/architecture-builder.component';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'canvas', component: CytoscapeCanvasComponent },
  { path: 'builder', component: ArchitectureBuilderComponent },
  { path: '**', redirectTo: '' }
];
