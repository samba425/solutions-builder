import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProblemInput } from '../problem-input/problem-input';
import { Review } from '../review/review';
import { Architecture } from '../architecture/architecture';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ProblemInput, Review, Architecture],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  currentStep = 1;
  formData: any = {
    industry: '',
    businessScenario: '',
    additionalContext: [],
    dataSources: []
  };

  goToStep(step: number) {
    this.currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
