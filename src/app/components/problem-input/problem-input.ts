import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-problem-input',
  imports: [CommonModule, FormsModule],
  templateUrl: './problem-input.html',
  styleUrl: './problem-input.css',
})
export class ProblemInput {
  @Input() formData: any;
  @Output() nextStep = new EventEmitter<void>();
  @ViewChild('modalDialog') modalDialog?: ElementRef;

  showModal = false;
  newSource = {
    name: '',
    type: '',
    format: '',
    volume: '',
    frequency: '',
    description: ''
  };

  toggleContext(type: string) {
    if (!this.formData.additionalContext) {
      this.formData.additionalContext = [];
    }
    const index = this.formData.additionalContext.indexOf(type);
    if (index > -1) {
      this.formData.additionalContext.splice(index, 1);
    } else {
      this.formData.additionalContext.push(type);
    }
  }

  isContextSelected(type: string): boolean {
    return this.formData.additionalContext?.includes(type) || false;
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

  openModal() {
    console.log('Opening modal...');
    this.showModal = true;
    console.log('showModal is now:', this.showModal);
  }

  closeModal() {
    console.log('closeModal() called!');
    this.showModal = false;
    this.resetForm();
    console.log('Modal closed, showModal:', this.showModal);
  }

  onOverlayClick(event: MouseEvent) {
    const clickedElement = event.target as HTMLElement;
    const overlayElement = event.currentTarget as HTMLElement;
    
    console.log('Click detected');
    console.log('Clicked element:', clickedElement.className);
    console.log('Is clicking directly on overlay?', clickedElement === overlayElement);
    
    // Only close if clicking directly on the overlay background (not on any child elements)
    if (clickedElement === overlayElement) {
      console.log('Click on overlay background - closing');
      this.closeModal();
    } else {
      console.log('Click on modal content - keeping open');
    }
  }

  resetForm() {
    this.newSource = {
      name: '',
      type: '',
      format: '',
      volume: '',
      frequency: '',
      description: ''
    };
  }

  addDataSource() {
    if (this.newSource.name && this.newSource.type) {
      if (!this.formData.dataSources) {
        this.formData.dataSources = [];
      }
      const newDataSource = {
        id: Date.now(),
        ...this.newSource
      };
      this.formData.dataSources.push(newDataSource);
      this.closeModal();
    }
  }

  removeDataSource(id: number) {
    if (this.formData.dataSources) {
      const index = this.formData.dataSources.findIndex((s: any) => s.id === id);
      if (index > -1) {
        this.formData.dataSources.splice(index, 1);
      }
    }
  }
}
