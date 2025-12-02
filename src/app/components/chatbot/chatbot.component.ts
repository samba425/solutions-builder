import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../models/interfaces';

@Component({
  selector: 'app-chatbot',
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen: boolean = false;
  isTyping: boolean = false;
  userInput: string = '';

  messages: ChatMessage[] = [
    {
      id: 1,
      text: 'Error logs confirm MX device issues. Packet capture needed to verify, as endpoints may not have permissions.',
      isBot: true,
      timestamp: new Date(new Date().setHours(10, 53, 0))
    }
  ];

  private botResponses: string[] = [
    'I\'m analyzing your architecture requirements. Based on your input, I recommend considering a microservices approach with containerization.',
    'Let me check the configuration. Your data sources appear to be properly configured for the selected industry vertical.',
    'I can help optimize your cloud architecture. Would you like me to suggest some best practices for high availability?',
    'Your current setup looks good. Consider adding redundancy and load balancing for improved fault tolerance.',
    'Based on your requirements, I suggest implementing a multi-region deployment strategy for better latency.',
    'I\'ve reviewed your data sources. You might want to consider adding a caching layer for improved performance.',
    'For your industry, compliance requirements typically include data encryption at rest and in transit. Shall I elaborate?',
    'Your architecture would benefit from implementing auto-scaling policies based on the expected traffic patterns you described.'
  ];

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now(),
      text: this.userInput.trim(),
      isBot: false,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const userText = this.userInput;
    this.userInput = '';
    this.isTyping = true;

    // Simulate bot response with delay
    setTimeout(() => {
      this.isTyping = false;
      const botMessage: ChatMessage = {
        id: Date.now(),
        text: this.getBotResponse(userText),
        isBot: true,
        timestamp: new Date()
      };
      this.messages.push(botMessage);
    }, 1500 + Math.random() * 1000);
  }

  private getBotResponse(userMessage: string): string {
    // Simple keyword-based responses
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes('help') || lowerMsg.includes('how')) {
      return 'I\'m here to help you design your cloud architecture. You can ask me about best practices, data sources, scaling strategies, or compliance requirements.';
    }

    if (lowerMsg.includes('database') || lowerMsg.includes('data')) {
      return 'For database architecture, I recommend considering your read/write patterns, data volume, and consistency requirements. Would you like specific recommendations for SQL or NoSQL solutions?';
    }

    if (lowerMsg.includes('security') || lowerMsg.includes('compliance')) {
      return 'Security is crucial for cloud architecture. Key considerations include: encryption, identity management, network security, and audit logging. What specific security concerns do you have?';
    }

    if (lowerMsg.includes('cost') || lowerMsg.includes('budget')) {
      return 'Cost optimization strategies include right-sizing instances, using reserved capacity, implementing auto-scaling, and leveraging spot instances for non-critical workloads.';
    }

    // Default: random response
    return this.botResponses[Math.floor(Math.random() * this.botResponses.length)];
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}