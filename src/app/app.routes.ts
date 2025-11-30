import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { CanvasComponent } from './components/canvas/canvas.component';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'canvas', component: CanvasComponent },
  { path: '**', redirectTo: '' }
];
