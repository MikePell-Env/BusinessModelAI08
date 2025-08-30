# 4D Time Machine for Business Application

## Overview
The 4D Time Machine is a comprehensive platform for business visualization and analysis. It integrates the **Envisioner** foundational platform with the **4D Visual Language (4DVL)** dynamic visualization system. The application showcases various business use cases through self-contained, connected templates that process Microsoft Office document data and display it in specialized 3D visualizations. Its purpose is to provide a powerful tool for strategic analysis, financial forecasting, and "what-if" scenario planning, aiming to transform how businesses interact with their data.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a full-stack monorepo architecture, emphasizing modularity and extensibility.

### Core Platform Architecture
- **Envisioner Core**: Acts as the foundational platform, managing the ground plane, interactions, template lifecycle, and a unified camera system. It supports a single instance per data source, allowing templates to provide different visualization perspectives of the same data.
- **4D Visual Language (4DVL)**: Defines the dynamic visual elements, including GLB object geometry, labels, behaviors, and data binding logic.
- **Template System**: Provides extensible use case implementations (Business Model, Financials, SWOT, What If) with a registry for management.
- **Data Integration**: Handles adapters for Microsoft Office documents (PowerPoint, Excel, Word) and manages real-time data flow with transformation capabilities.

### Frontend Architecture
- **Framework**: React with TypeScript, built with Vite.
- **UI Framework**: Radix UI components styled with Tailwind CSS.
- **3D Rendering**: Babylon.js is used for advanced 3D canvas visualizations. Key features include GLB model integration, dynamic object height manipulation, interactive selection with content panels, comprehensive hover effects, and billboard labels. The system uses a perspective-only camera with optimized presets (PERSPECTIVE_RIGHT, PERSPECTIVE_LEFT, TOP) and an automatic camera switch for enhanced user experience.
- **State Management**: Zustand for client-side application state.
- **Data Fetching**: TanStack Query for server state management and data synchronization.
- **Interaction System**: Implements consistent single-click selection (highlighting, fading others) and double-click to display content panels. Hover effects are consistent, and state restoration ensures selection persistence across views. A unified ActionManager-based click handling system ensures reliable interaction.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL, accessed via Drizzle ORM.
- **AI Integration**: OpenAI API (GPT-4o) for business model analysis and chat functionality.
- **Session Management**: In-memory session storage.

### Key Technical Details
- **Canvas Visualization System**: Supports both traditional 2D grid and an advanced 3D system. The 3D system uses a single GLB model with interactive sections and additional GLB instances for specific components (e.g., Revenue Streams, Cost Structure).
- **Coordinate System**: Handles specific GLB model positioning and scaling, including workarounds for X-axis inversion in certain models.
- **AI Chat Integration**: Utilizes GPT-4o for insights, recommendations, and conversational interaction, including intelligent voice-activated 3D view switching.
- **Data Management**: Employs shared TypeScript types for consistent data structures, supporting canvas elements, metadata, and version control.
- **Unified Transformation System**: Ensures consistent height, position, and scaling across all components.
- **Material Management System**: Designed to overcome issues like scattered material creation and lack of reuse. It proposes a unified BabylonMaterialManager with material presets, texture atlas management, and data-driven material binding for real-time business metrics visualization.
- **Deployment Strategy**: Frontend built to `dist/public` with Vite, backend bundled to `dist/index.js` with ESBuild. Uses environment variables for configuration.

## External Dependencies

### Core Libraries & Frameworks
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM.
- **openai**: OpenAI API client.
- **@radix-ui/***: UI component library.
- **@babylonjs/core**: Core Babylon.js library for 3D rendering.
- **zustand**: State management library.
- **@tanstack/react-query**: Data fetching and caching.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Language for type-safe development.
- **Tailwind CSS**: Utility-first CSS framework.
- **ESBuild**: Bundler for production builds.

### AI/Cloud Services
- **OpenAI API**: Primary AI service for generative capabilities (GPT-4o).
- **Microsoft Copilot**: For enhanced business analysis and insights.

### Database
- **PostgreSQL**: Relational database for persistent storage.

### Other Integrations
- **JSZip**: Used for parsing PowerPoint files and extracting content.