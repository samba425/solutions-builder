import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CoreComponent {
  name: string;
  checked: boolean;
}

interface DataFlowStep {
  number: number;
  name: string;
}

interface LLMModel {
  name: string;
  provider: string;
  use: string;
  description: string;
  contextSize: string;
  temperature: string;
}

interface TechnologyStack {
  category: string;
  name: string;
  description: string;
}

interface ImplementationNote {
  title: string;
  description: string;
}

interface HardwareSpec {
  icon: string;
  label: string;
  value: string;
}

interface CiscoTool {
  name: string;
  description: string;
  configDetails: string;
}

interface IntegrationPoint {
  title: string;
  description: string;
  color: string;
}

interface ArchitectureConfig {
  architecture: {
    pattern: string;
    components: CoreComponent[];
    dataFlow: DataFlowStep[];
    llmModels: LLMModel[];
  };
  technology: {
    stack: TechnologyStack[];
    implementationNotes: ImplementationNote[];
  };
  hardware: {
    specs: HardwareSpec[];
    gpu: {
      config: string;
      rationale: string[];
    };
    infrastructure: Array<{ title: string; description: string }>;
  };
  cisco: {
    tools: CiscoTool[];
    integrationPoints: IntegrationPoint[];
  };
}

@Component({
  selector: 'app-architecture-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './architecture-builder.component.html',
  styleUrls: ['./architecture-builder.component.css']
})
export class ArchitectureBuilderComponent implements OnInit {
  activeTab: 'architecture' | 'technology' | 'hardware' | 'cisco' = 'architecture';
  
  // This will hold the complete configuration from API
  config: ArchitectureConfig | null = null;

  ngOnInit() {
    // Simulate API call - replace with actual HTTP call
    this.loadConfigurationFromAPI();
  }

  // Simulate API response - replace with actual API service call
  loadConfigurationFromAPI() {
    // In production, replace this with:
    // this.http.get<ArchitectureConfig>('/api/architecture-config').subscribe(config => {
    //   this.config = config;
    // });
    
    this.config = this.getMockAPIResponse();
  }

  // Mock API response - this structure should come from your backend
  private getMockAPIResponse(): ArchitectureConfig {
    return {
      architecture: {
        pattern: 'Microservices with Event-Driven Architecture',
        components: [
          { name: 'API Gateway Layer', checked: true },
          { name: 'LLM Orchestration Service', checked: true },
          { name: 'Vector Database for RAG', checked: true },
          { name: 'Real-time Stream Processing', checked: true },
          { name: 'Data Integration Layer', checked: true },
          { name: 'Message Queue (Kafka/RabbitMQ)', checked: true },
          { name: 'Cache Layer (Redis)', checked: true },
          { name: 'Monitoring & Observability Stack', checked: true }
        ],
        dataFlow: [
          { number: 1, name: 'Data Ingestion' },
          { number: 2, name: 'Preprocessing' },
          { number: 3, name: 'Vector Embedding' },
          { number: 4, name: 'RAG Retrieval' },
          { number: 5, name: 'LLM Processing' },
          { number: 6, name: 'Response Generation' },
          { number: 7, name: 'Integration Layer' }
        ],
        llmModels: [
          {
            name: 'GPT-4 Turbo',
            provider: 'OpenAI',
            use: 'Primary',
            description: 'Primary reasoning and complex task handling',
            contextSize: '128K context',
            temperature: 'temperature: 0.7'
          },
          {
            name: 'Claude 3 Opus',
            provider: 'Anthropic',
            use: 'Long-form',
            description: 'Long-form content analysis and technical documentation',
            contextSize: '200K context',
            temperature: 'temperature: 0.5'
          },
          {
            name: 'Llama 3 70B',
            provider: 'Meta (Self-hosted)',
            use: 'Cost-effective',
            description: 'Cost-effective inference for high-volume queries',
            contextSize: '8K context',
            temperature: 'temperature: 0.6'
          },
          {
            name: 'Mixtral 8x7B',
            provider: 'Mistral (Self-hosted)',
            use: 'Low-latency',
            description: 'Low-latency responses and classification tasks',
            contextSize: '32K context',
            temperature: 'temperature: 0.4'
          }
        ]
      },
      technology: {
        stack: [
          {
            category: 'RAG Framework',
            name: 'LangChain',
            description: 'Comprehensive framework with extensive integrations, ideal for complex multi-step reasoning and diverse data sources'
          },
          {
            category: 'Document Indexing',
            name: 'LlamaIndex',
            description: 'Optimized for document indexing and retrieval with advanced chunking strategies for structured and unstructured data'
          },
          {
            category: 'MCP Server',
            name: 'Model Context Protocol Server',
            description: 'Enables standardized communication between LLM applications and external tools/data sources'
          },
          {
            category: 'Orchestration',
            name: 'LangGraph',
            description: 'State machine-based orchestration for complex agent workflows and decision trees'
          },
          {
            category: 'Vector Store',
            name: 'Pinecone / Weaviate',
            description: 'Scalable vector similarity search with metadata filtering for 1 data sources'
          },
          {
            category: 'Data Integration',
            name: 'Apache Kafka + Flink',
            description: 'Real-time stream processing for handling multiple data formats: Parquet'
          }
        ],
        implementationNotes: [
          {
            title: 'RAG Implementation',
            description: 'Use LangChain with LlamaIndex for optimal document retrieval and chunking strategies'
          },
          {
            title: 'MCP Server Integration',
            description: 'Deploy MCP servers to standardize tool/data source communication with LLM applications'
          },
          {
            title: 'Vector Database',
            description: 'Configure embedding dimensions to match your chosen LLM (typically 1536 for OpenAI, 768 for open-source models)'
          }
        ]
      },
      hardware: {
        specs: [
          {
            icon: 'bi-hdd-rack',
            label: 'Recommended Server',
            value: 'Cisco UCS X210c M7 (Multiple nodes in cluster)'
          },
          {
            icon: 'bi-cpu',
            label: 'CPU Configuration',
            value: '2x Intel Xeon Platinum 8480+ (56 cores each)'
          },
          {
            icon: 'bi-memory',
            label: 'Memory',
            value: '2TB DDR5 RAM'
          },
          {
            icon: 'bi-device-ssd',
            label: 'Storage',
            value: '100TB NVMe SSD (distributed across nodes) + High-speed NAS'
          }
        ],
        gpu: {
          config: '8x NVIDIA H100 80GB (for model hosting) + 4x A100 40GB (for inference)',
          rationale: [
            'H100 GPUs provide optimal performance for LLM inference and fine-tuning',
            'A100 GPUs offer cost-effective solution for production inference workloads',
            'NVLink connectivity enables efficient multi-GPU scaling'
          ]
        },
        infrastructure: [
          {
            title: 'Networking',
            description: '100Gbps Ethernet or InfiniBand for GPU-to-GPU communication'
          },
          {
            title: 'Cooling',
            description: 'Liquid cooling recommended for high-density GPU deployments'
          },
          {
            title: 'Power',
            description: 'Redundant power supplies with 80+ Platinum efficiency rating'
          }
        ]
      },
      cisco: {
        tools: [
          {
            name: 'Cisco Crosswork',
            description: 'Network automation and orchestration',
            configDetails: 'REST API integration for closed-loop automation, telemetry data ingestion via gRPC'
          },
          {
            name: 'Cisco NSO (Network Services Orchestrator)',
            description: 'Service provisioning and configuration management',
            configDetails: 'YANG models for device configuration, Python API for custom workflows'
          },
          {
            name: 'Cisco CNC (Crosswork Network Controller)',
            description: 'SDN controller integration',
            configDetails: 'OpenFlow and NETCONF protocols for traffic engineering'
          },
          {
            name: 'Splunk',
            description: 'Log aggregation and analysis',
            configDetails: 'Splunk HEC (HTTP Event Collector) for real-time log streaming, ML Toolkit for anomaly detection'
          }
        ],
        integrationPoints: [
          {
            title: 'API Gateway Integration',
            description: 'Use secure API gateways with OAuth 2.0 authentication for all Cisco tool integrations',
            color: '#0066CC'
          },
          {
            title: 'Data Synchronization',
            description: 'Implement event-driven architecture using webhooks and message queues for real-time data sync',
            color: '#10B981'
          },
          {
            title: 'Monitoring & Alerting',
            description: 'Configure Splunk dashboards to monitor integration health and AI model performance metrics',
            color: '#8B5CF6'
          }
        ]
      }
    };
  }

  setActiveTab(tab: 'architecture' | 'technology' | 'hardware' | 'cisco') {
    this.activeTab = tab;
  }

  exportConfiguration() {
    if (!this.config) return;

    const dataStr = JSON.stringify(this.config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `architecture-config-${Date.now()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
}
