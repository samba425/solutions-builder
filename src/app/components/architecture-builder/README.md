# Architecture Builder Component

A comprehensive multi-tab architecture planning tool for designing AI/ML and cloud solutions with Cisco infrastructure integration.

## Features

### 4 Tabs:

1. **Architecture Tab**
   - Recommended architectural patterns (Microservices, Event-Driven, etc.)
   - Core components checklist
   - Data flow visualization (7-step process)
   - LLM model recommendations with specs

2. **Technology Stack Tab**
   - AI frameworks and libraries (LangChain, LlamaIndex, etc.)
   - Infrastructure tools (Apache Kafka, Pinecone, etc.)
   - Implementation notes with best practices

3. **Hardware Specs Tab**
   - Cisco UCS server configuration
   - CPU, Memory, Storage specifications
   - GPU requirements (NVIDIA H100/A100)
   - Infrastructure recommendations (Networking, Cooling, Power)

4. **Cisco Integration Tab**
   - Cisco ecosystem tools (Crosswork, NSO, CNC, Splunk)
   - Integration architecture patterns
   - Configuration details and best practices

## Usage

### Access the Component

Navigate to `/architecture-builder` or click "Architecture Builder" in the navigation menu.

### Export Configuration

Click the "Export Configuration" button at the bottom to download all specifications as a JSON file.

### JSON Export Format

```json
{
  "architecture": {
    "pattern": "...",
    "components": [...],
    "dataFlow": [...],
    "llmModels": [...]
  },
  "technology": {
    "stack": [...],
    "implementationNotes": [...]
  },
  "hardware": {
    "server": "...",
    "cpu": "...",
    "gpu": "...",
    ...
  },
  "cisco": {
    "tools": [...],
    "integrationPoints": [...]
  }
}
```

## Customization

All data is configurable in the TypeScript component:
- `coreComponents[]` - Modify architecture components
- `llmModels[]` - Add/update LLM model recommendations
- `technologyStacks[]` - Update technology stack items
- `ciscoTools[]` - Add Cisco integration tools

## Screenshots Reference

The component replicates the 4-tab interface shown in your screenshots with:
- Clean, modern UI with gradient backgrounds
- Card-based layouts for content sections
- Color-coded categorization
- Responsive grid layouts
- Professional typography and spacing

## Integration

Already integrated into:
- Routes: `/architecture-builder`
- Navigation: Header component with icon
- Standalone component (no additional dependencies)
