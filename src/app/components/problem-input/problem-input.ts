import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

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
  uploadedFiles: Map<string, UploadedFile[]> = new Map();
  uploadedFilesList: UploadedFile[] = []; // Track files as an array for change detection

  constructor(private cdr: ChangeDetectorRef) {}
  
  // Dynamic dropdown data
  industries = [
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'retail', label: 'Retail & E-commerce' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'education', label: 'Education' },
    { value: 'technology', label: 'Technology' },
    { value: 'logistics', label: 'Logistics & Transportation' },
    { value: 'media', label: 'Media & Entertainment' },
    { value: 'government', label: 'Government' },
    { value: 'other', label: 'Other' }
  ];

  dataSourceTypes = [
    { value: 'Database', label: 'Database' },
    { value: 'API', label: 'API' },
    { value: 'File Storage', label: 'File Storage' },
    { value: 'Stream', label: 'Stream' },
    { value: 'Data Warehouse', label: 'Data Warehouse' },
    { value: 'Data Lake', label: 'Data Lake' },
    { value: 'Third-party Service', label: 'Third-party Service' }
  ];

  updateFrequencies = [
    { value: 'Real-time', label: 'Real-time' },
    { value: 'Hourly', label: 'Hourly' },
    { value: 'Daily', label: 'Daily' },
    { value: 'Weekly', label: 'Weekly' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Batch', label: 'Batch' },
    { value: 'On-demand', label: 'On-demand' }
  ];

  contextTypes = [
    { value: 'document', label: 'Document', icon: 'bi-file-text', accept: '.doc,.docx,.txt,.rtf' },
    { value: 'pdf', label: 'PDF', icon: 'bi-file-pdf', accept: '.pdf' },
    { value: 'audio', label: 'Audio', icon: 'bi-mic', accept: 'audio/*,.mp3,.wav,.m4a' },
    { value: 'video', label: 'Video', icon: 'bi-camera-video', accept: 'video/*,.mp4,.mov,.avi' }
  ];
  
  newSource = {
    name: '',
    type: '',
    format: '',
    volume: '',
    frequency: '',
    description: ''
  };

  toggleContext(type: string) {
    // Trigger file input click
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    // Find the context type configuration
    const contextConfig = this.contextTypes.find(ct => ct.value === type);
    if (contextConfig) {
      input.accept = contextConfig.accept;
    }
    
    input.onchange = (event: any) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        this.handleFileUpload(type, files);
      }
    };
    
    input.click();
  }

  handleFileUpload(type: string, files: FileList) {
    if (!this.formData.additionalContext) {
      this.formData.additionalContext = [];
    }
    
    // Add type to selected contexts if not already present
    if (!this.formData.additionalContext.includes(type)) {
      this.formData.additionalContext.push(type);
    }
    
    // Store uploaded files
    if (!this.uploadedFiles.has(type)) {
      this.uploadedFiles.set(type, []);
    }
    
    const fileArray = this.uploadedFiles.get(type)!;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      fileArray.push({
        name: file.name,
        size: file.size,
        type: type,
        file: file
      });
    }

    // Update the files list for change detection
    this.updateUploadedFilesList();
    
    console.log('Files uploaded:', {
      type,
      count: files.length,
      totalFiles: this.uploadedFilesList.length,
      uploadedFilesList: this.uploadedFilesList
    });

    // Force change detection
    this.cdr.detectChanges();
  }

  updateUploadedFilesList() {
    // Create a new array reference to trigger change detection
    this.uploadedFilesList = [];
    this.uploadedFiles.forEach(files => {
      this.uploadedFilesList.push(...files);
    });
    console.log('Updated uploadedFilesList:', this.uploadedFilesList);
  }

  removeFile(type: string, fileName: string) {
    const files = this.uploadedFiles.get(type);
    if (files) {
      const index = files.findIndex(f => f.name === fileName);
      if (index > -1) {
        files.splice(index, 1);
      }
      
      // If no more files of this type, remove the context type
      if (files.length === 0) {
        this.uploadedFiles.delete(type);
        const contextIndex = this.formData.additionalContext.indexOf(type);
        if (contextIndex > -1) {
          this.formData.additionalContext.splice(contextIndex, 1);
        }
      }

      // Update the files list for change detection
      this.updateUploadedFilesList();

      // Force change detection
      this.cdr.detectChanges();
    }
  }

  getFilesForType(type: string): UploadedFile[] {
    return this.uploadedFiles.get(type) || [];
  }

  getAllUploadedFiles(): UploadedFile[] {
    const allFiles: UploadedFile[] = [];
    this.uploadedFiles.forEach(files => {
      allFiles.push(...files);
    });
    return allFiles;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  isContextSelected(type: string): boolean {
    return this.formData.additionalContext?.includes(type) || false;
  }

  getFileIcon(type: string): string {
    const contextConfig = this.contextTypes.find(ct => ct.value === type);
    return contextConfig ? contextConfig.icon : 'bi-file-earmark';
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

  onContinue() {
    // Prepare final form data with uploaded files
    const finalFormData = {
      ...this.formData,
      uploadedFiles: this.getAllUploadedFiles().map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        formattedSize: this.formatFileSize(file.size)
      }))
    };

    console.log('=== FINAL FORM DATA ===');
    console.log('Industry:', finalFormData.industry);
    console.log('Business Scenario:', finalFormData.businessScenario);
    console.log('Additional Context Types:', finalFormData.additionalContext);
    console.log('Uploaded Files:', finalFormData.uploadedFiles);
    console.log('Data Sources:', finalFormData.dataSources);
    console.log('Complete Form Data:', finalFormData);
    console.log('=========finalFormData============',finalFormData);

    this.nextStep.emit();
  }
}
