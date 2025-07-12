# Business Model Canvas Data Structure

## Overview

The business model canvas data is stored in JSON format in `client/src/data/sampleCanvas.json` and loaded at application startup.

## Data Schema

### Canvas Structure
```json
{
  "id": "string",
  "name": "string", 
  "description": "string",
  "keyPartners": CanvasElement,
  "keyActivities": CanvasElement,
  "keyResources": CanvasElement,
  "valuePropositions": CanvasElement,
  "customerRelationships": CanvasElement,
  "channels": CanvasElement,
  "customerSegments": CanvasElement,
  "costStructure": CanvasElement,
  "revenueStreams": CanvasElement,
  "lastModified": "ISO 8601 timestamp"
}
```

### Canvas Element Structure
```json
{
  "id": "string",
  "title": "string",
  "content": ["string array"],
  "color": "hex color code (optional)"
}
```

## Current Data (Tech Startup Example)

The current sample canvas represents a technology startup focused on AI-powered business solutions with:

- **Key Partners**: Cloud providers, tech partners, investors, research institutions
- **Key Activities**: AI development, software development, customer support, R&D, marketing
- **Key Resources**: AI expertise, proprietary algorithms, development team, brand, customer data
- **Value Propositions**: Business optimization, automated tools, real-time analytics, cost reduction
- **Customer Relationships**: Account management, self-service, community support, training
- **Channels**: Direct sales, online platform, partners, conferences, digital marketing
- **Customer Segments**: Enterprise, mid-market, startups, government, healthcare/financial
- **Cost Structure**: Infrastructure, R&D, sales/marketing, salaries, legal/compliance
- **Revenue Streams**: SaaS subscriptions, enterprise licensing, professional services, training, API fees

## Data Flow

1. **Startup**: `BusinessModelCanvas.tsx` imports and loads `sampleCanvas.json`
2. **State Management**: Data stored in Zustand store (`useCanvas`)
3. **Rendering**: Both 2D and 3D views read from the same canvas state
4. **Updates**: AI chat can modify canvas elements through the store

## Color Scheme

Each canvas element has a distinct color for visual differentiation:
- Key Partners: Light red (#FFE5E5)
- Key Activities: Light blue (#E5F3FF)
- Key Resources: Light green (#E5FFE5)
- Value Propositions: Light orange (#FFF5E5)
- Customer Relationships: Light purple (#F5E5FF)
- Channels: Light cyan (#E5FFFF)
- Customer Segments: Light pink (#FFE5F5)
- Cost Structure: Light grey (#F0F0F0)
- Revenue Streams: Light mint (#E5F5E5)