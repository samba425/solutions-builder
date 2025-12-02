// Component definitions matching the Build_ur_own_arch structure
export const COMPONENT_CATEGORIES = {
  infrastructure: {
    name: "Infrastructure",
    icon: "fas fa-server",
    description: "Core computing and server infrastructure components",
    color: "#2196F3",
    order: 1
  },
  ai_models: {
    name: "AI Models",
    icon: "fas fa-brain",
    description: "Artificial Intelligence and Machine Learning models",
    color: "#9C27B0",
    order: 2
  },
  storage: {
    name: "Storage",
    icon: "fas fa-database",
    description: "Data storage and persistence solutions",
    color: "#FF9800",
    order: 3
  },
  networking: {
    name: "Networking",
    icon: "fas fa-network-wired",
    description: "Network infrastructure and connectivity",
    color: "#00BCD4",
    order: 4
  },
  data_processing: {
    name: "Data Processing",
    icon: "fas fa-cogs",
    description: "Data processing and ETL tools",
    color: "#4CAF50",
    order: 5
  },
  tooling: {
    name: "Tooling",
    icon: "fas fa-tools",
    description: "Development and deployment tools",
    color: "#607D8B",
    order: 6
  }
};

export const COMPONENTS = {
  "gpt-4": {
    id: "gpt-4",
    name: "GPT-4",
    icon: "fas fa-brain",
    faIcon: "fas fa-brain",
    category: "ai_models",
    provider: "OpenAI",
    description: "GPT-4 is a large multimodal model that can accept image and text inputs and produce text outputs",
    definition: "GPT-4 is OpenAI's most advanced system, producing safer and more useful responses.",
    learnMoreLink: "https://openai.com/gpt-4",
    color: "#10A37F",
    properties: {
      maxTokens: {
        type: "number" as const,
        label: "Max Tokens",
        default: 4096,
        min: 1,
        max: 8192
      },
      temperature: {
        type: "number" as const,
        label: "Temperature",
        default: 0.7,
        min: 0,
        max: 2
      },
      apiVersion: {
        type: "select" as const,
        label: "API Version",
        default: "2024-02-15-preview",
        options: ["2024-02-15-preview", "2023-12-01-preview", "2023-05-15"]
      }
    }
  },
  "claude": {
    id: "claude",
    name: "Claude",
    icon: "fas fa-comments",
    faIcon: "fas fa-comments",
    category: "ai_models",
    provider: "Anthropic",
    description: "Claude is an AI assistant focused on helpfulness, honesty, and harmlessness",
    definition: "Claude is Anthropic's AI assistant designed for safe and helpful conversations.",
    learnMoreLink: "https://www.anthropic.com/claude",
    color: "#7C3AED",
    properties: {
      maxTokens: {
        type: "number" as const,
        label: "Max Tokens",
        default: 100000,
        min: 1,
        max: 200000
      },
      temperature: {
        type: "number" as const,
        label: "Temperature",
        default: 1.0,
        min: 0,
        max: 1
      },
      modelVersion: {
        type: "select" as const,
        label: "Model Version",
        default: "claude-3-opus",
        options: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]
      }
    }
  },
  "llama": {
    id: "llama",
    name: "LLaMA",
    icon: "fab fa-meta",
    faIcon: "fab fa-meta",
    category: "ai_models",
    provider: "Meta",
    description: "Large Language Model Meta AI for research and commercial use",
    definition: "LLaMA is Meta's foundational large language model designed for various NLP tasks.",
    learnMoreLink: "https://ai.meta.com/llama/",
    color: "#0668E1",
    properties: {
      modelSize: {
        type: "select" as const,
        label: "Model Size",
        default: "7B",
        options: ["7B", "13B", "70B"]
      },
      temperature: {
        type: "number" as const,
        label: "Temperature",
        default: 0.7,
        min: 0,
        max: 2
      }
    }
  },
  "nvidia-gpu": {
    id: "nvidia-gpu",
    name: "NVIDIA GPU",
    category: "infrastructure",
    provider: "NVIDIA",
    icon: "fas fa-microchip",
    faIcon: "fas fa-microchip",
    color: "#76B900",
    description: "High-performance GPU compute instances for AI/ML workloads",
    definition: "NVIDIA GPUs provide parallel processing power for machine learning and HPC workloads.",
    properties: {
      gpu_type: {
        type: "select" as const,
        label: "GPU Type",
        options: ["V100", "A100", "T4", "K80", "H100"],
        default: "T4"
      },
      gpu_count: {
        type: "number" as const,
        label: "GPU Count",
        default: 1
      },
      memory: {
        type: "select" as const,
        label: "GPU Memory",
        options: ["16GB", "32GB", "40GB", "80GB"],
        default: "16GB"
      }
    }
  },
  "aws-ec2": {
    id: "aws-ec2",
    name: "AWS EC2",
    icon: "fab fa-aws",
    faIcon: "fab fa-aws",
    category: "infrastructure",
    provider: "AWS",
    description: "Amazon Elastic Compute Cloud provides scalable computing capacity",
    definition: "EC2 provides resizable compute capacity in the cloud.",
    learnMoreLink: "https://aws.amazon.com/ec2/",
    color: "#FF9900",
    properties: {
      instanceType: {
        type: "select" as const,
        label: "Instance Type",
        options: ["t2.micro", "t2.small", "t2.medium", "t3.large", "c5.xlarge"],
        default: "t2.micro"
      },
      region: {
        type: "select" as const,
        label: "Region",
        options: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
        default: "us-east-1"
      }
    }
  },
  "azure-vms": {
    id: "azure-vms",
    name: "Azure VMs",
    icon: "fab fa-microsoft",
    faIcon: "fab fa-microsoft",
    category: "infrastructure",
    provider: "Azure",
    description: "Azure Virtual Machines - scalable computing in Microsoft Azure",
    definition: "Azure VMs provide on-demand scalable computing resources.",
    learnMoreLink: "https://azure.microsoft.com/en-us/services/virtual-machines/",
    color: "#0078D4",
    properties: {
      vmSize: {
        type: "select" as const,
        label: "VM Size",
        options: ["Standard_B1s", "Standard_D2s_v3", "Standard_E4s_v3"],
        default: "Standard_B1s"
      },
      location: {
        type: "select" as const,
        label: "Location",
        options: ["East US", "West Europe", "Southeast Asia"],
        default: "East US"
      }
    }
  },
  "gcp-compute": {
    id: "gcp-compute",
    name: "GCP Compute Engine",
    icon: "fab fa-google",
    faIcon: "fab fa-google",
    category: "infrastructure",
    provider: "GCP",
    description: "Google Compute Engine offers virtual machines in Google Cloud",
    definition: "Compute Engine provides scalable VMs on Google Cloud infrastructure.",
    learnMoreLink: "https://cloud.google.com/compute",
    color: "#4285F4",
    properties: {
      machineType: {
        type: "select" as const,
        label: "Machine Type",
        options: ["e2-micro", "n1-standard-1", "n2-standard-4"],
        default: "e2-micro"
      },
      zone: {
        type: "select" as const,
        label: "Zone",
        options: ["us-central1-a", "europe-west1-b", "asia-east1-c"],
        default: "us-central1-a"
      }
    }
  },
  "amazon-s3": {
    id: "amazon-s3",
    name: "Amazon S3",
    icon: "fas fa-database",
    faIcon: "fas fa-database",
    category: "storage",
    provider: "AWS",
    description: "Simple Storage Service - scalable object storage",
    definition: "Amazon S3 is an object storage service offering scalability and durability.",
    learnMoreLink: "https://aws.amazon.com/s3/",
    color: "#569A31",
    properties: {
      storageClass: {
        type: "select" as const,
        label: "Storage Class",
        options: ["Standard", "Intelligent-Tiering", "Glacier"],
        default: "Standard"
      },
      versioning: {
        type: "select" as const,
        label: "Versioning",
        options: ["Enabled", "Disabled"],
        default: "Disabled"
      }
    }
  },
  "azure-blob": {
    id: "azure-blob",
    name: "Azure Blob Storage",
    icon: "fab fa-microsoft",
    faIcon: "fab fa-microsoft",
    category: "storage",
    provider: "Azure",
    description: "Massively scalable object storage for unstructured data",
    definition: "Azure Blob Storage is Microsoft's object storage solution for the cloud.",
    learnMoreLink: "https://azure.microsoft.com/en-us/services/storage/blobs/",
    color: "#0078D4",
    properties: {
      accessTier: {
        type: "select" as const,
        label: "Access Tier",
        options: ["Hot", "Cool", "Archive"],
        default: "Hot"
      },
      redundancy: {
        type: "select" as const,
        label: "Redundancy",
        options: ["LRS", "GRS", "ZRS"],
        default: "LRS"
      }
    }
  },
  "gcp-storage": {
    id: "gcp-storage",
    name: "GCP Cloud Storage",
    icon: "fab fa-google",
    faIcon: "fab fa-google",
    category: "storage",
    provider: "GCP",
    description: "Unified object storage for developers and enterprises",
    definition: "Cloud Storage is Google's unified object storage service.",
    learnMoreLink: "https://cloud.google.com/storage",
    color: "#4285F4",
    properties: {
      storageClass: {
        type: "select" as const,
        label: "Storage Class",
        options: ["Standard", "Nearline", "Coldline", "Archive"],
        default: "Standard"
      }
    }
  },
  "apache-kafka": {
    id: "apache-kafka",
    name: "Apache Kafka",
    icon: "fas fa-stream",
    faIcon: "fas fa-stream",
    category: "data_processing",
    provider: "Apache",
    description: "Distributed event streaming platform",
    definition: "Apache Kafka is a distributed event store and stream-processing platform.",
    learnMoreLink: "https://kafka.apache.org/",
    color: "#231F20",
    properties: {
      partitions: {
        type: "number" as const,
        label: "Partitions",
        default: 3
      },
      replicationFactor: {
        type: "number" as const,
        label: "Replication Factor",
        default: 2
      }
    }
  },
  "apache-spark": {
    id: "apache-spark",
    name: "Apache Spark",
    icon: "fas fa-fire",
    faIcon: "fas fa-fire",
    category: "data_processing",
    provider: "Apache",
    description: "Unified analytics engine for large-scale data processing",
    definition: "Apache Spark is a multi-language engine for executing data engineering and ML workloads.",
    learnMoreLink: "https://spark.apache.org/",
    color: "#E25A1C",
    properties: {
      executors: {
        type: "number" as const,
        label: "Number of Executors",
        default: 2
      },
      memory: {
        type: "select" as const,
        label: "Executor Memory",
        options: ["2GB", "4GB", "8GB", "16GB"],
        default: "4GB"
      }
    }
  }
};
