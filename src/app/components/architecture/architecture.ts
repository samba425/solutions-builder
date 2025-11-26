import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-architecture',
  imports: [CommonModule],
  templateUrl: './architecture.html',
  styleUrl: './architecture.css',
})
export class Architecture {
  @Input() formData: any;
  @Output() prevStep = new EventEmitter<void>();
  @Output() goToStep = new EventEmitter<number>();

  isGenerating = false;
  architectureGenerated = false;

  editStep(step: number) {
    this.goToStep.emit(step);
  }

  getFileIcon(type: string): string {
    switch (type) {
      case 'document':
        return 'bi-file-text';
      case 'pdf':
        return 'bi-file-pdf';
      case 'audio':
        return 'bi-mic';
      case 'video':
        return 'bi-camera-video';
      default:
        return 'bi-file-earmark';
    }
  }

  generateArchitecture() {
    this.isGenerating = true;
    // Simulate architecture generation
    setTimeout(() => {
      this.isGenerating = false;
      this.architectureGenerated = true;
    }, 2000);
  }
}
