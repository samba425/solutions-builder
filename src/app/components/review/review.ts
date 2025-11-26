import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-review',
  imports: [CommonModule, FormsModule],
  templateUrl: './review.html',
  styleUrl: './review.css',
})
export class Review {
  @Input() formData: any;
  @Output() nextStep = new EventEmitter<void>();
  @Output() prevStep = new EventEmitter<void>();

  showModal = false;
  editMode = false;
  editingSourceId: number | null = null;
  newSource = { 
    id: 0, 
    name: '', 
    type: '',
    format: '',
    volume: '',
    frequency: '',
    description: ''
  };

  openModal() {
    this.editMode = false;
    this.editingSourceId = null;
    this.resetForm();
    this.showModal = true;
  }

  editDataSource(source: any) {
    this.editMode = true;
    this.editingSourceId = source.id;
    this.newSource = { ...source };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editMode = false;
    this.editingSourceId = null;
    this.resetForm();
  }

  resetForm() {
    this.newSource = { 
      id: 0, 
      name: '', 
      type: '',
      format: '',
      volume: '',
      frequency: '',
      description: ''
    };
  }

  addDataSource() {
    if (!this.formData.dataSources) {
      this.formData.dataSources = [];
    }
    
    if (this.editMode && this.editingSourceId) {
      // Update existing source
      const index = this.formData.dataSources.findIndex((s: any) => s.id === this.editingSourceId);
      if (index !== -1) {
        this.formData.dataSources[index] = { ...this.newSource };
      }
    } else {
      // Add new source
      this.newSource.id = Date.now();
      this.formData.dataSources.push({ ...this.newSource });
    }
    
    this.closeModal();
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
}
