# Business Model Canvas Visualization Application

## Overview
This project is a web application for creating and visualizing business model canvases, enhanced with AI-powered assistance for business analysis. It offers both 2D and interactive 3D visualization modes to provide a comprehensive tool for business strategizing. Key capabilities include a unified transformation system for all BMC objects with consistent hover and selection behaviors across main BMC sections, Revenue Streams, and Cost Structure components. The application aims to combine modern web technologies with advanced visualization and AI capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)
- **January 23, 2025**: Updated Envisioner logo to new design while maintaining smaller size (h-5) for better header proportions
- **January 23, 2025**: Unified ActionManager-based click handling system restored and verified working across all 3D view modes
- **January 23, 2025**: Fixed 3D Top view single-click selection and double-click panel opening functionality

## System Architecture
The application employs a full-stack monorepo architecture, separating client and server concerns.

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **UI Framework**: Radix UI components styled with Tailwind CSS.
- **3D Rendering**: React Three Fiber with Three.js (initial concepts) and Babylon.js for advanced 3D canvas visualizations. The Babylon.js implementation supports GLB model integration, dual camera modes (Perspective 3D View and orthographic 3D Top View with persistent camera states), dynamic height management, interactive selection with content panels, hover effects, and billboard labels.
- **State Management**: Zustand for client-side application state.
- **Data Fetching**: TanStack Query for server state management and data synchronization.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL, accessed via Drizzle ORM.
- **AI Integration**: OpenAI API (GPT-4o) for business model analysis and chat functionality.
- **Session Management**: In-memory session storage.

### Key Components & Technical Details
- **Canvas Visualization System**: Features traditional 2D grid and an advanced 3D system. The 3D system uses a single GLB model with 7 interactive sections, supports dynamic object height manipulation, and an interactive selection system. View switching between 2D, 3D View, and 3D Top modes is seamless with state persistence. Additional GLB instances are used for Revenue Streams and Cost Structure sections.
- **AI Chat Integration**: Utilizes GPT-4o for insights and recommendations, providing a real-time, context-aware conversational interface. Intelligent voice-activated 3D view switching is implemented through custom event systems.
- **Data Management**: Employs shared TypeScript types for consistent data structures. Canvas elements are defined for the nine core BMC sections, with sample data loaded from JSON and support for canvas metadata and version control.
- **Unified Transformation System**: Manages coordinate systems for various object types, ensuring consistent height, position, and scaling control across all BMC components.
- **3D Interaction System**: Implements consistent single-click selection (highlighting selected object, fading others) and double-click to display content panels. Hover effects are consistent across all BMC objects. State restoration logic ensures selection persistence across view transitions. **Updated January 15, 2025**: Unified ActionManager-based click handling system provides immediate single-click response and reliable double-click panel opening across all view modes (3D View, 3D Top). Background click handling via minimal onPointerObservable for panel closure.
- **Unified BMC Management Architecture**: Integrates all BMC components (state management, label visibility, material handling) under a single architecture for consistent visual state changes and label preservation.
- **Data-Driven Animation Architecture**: Planned system to replace hardcoded animations with a scalable data-binding engine, supporting real-time data integration from Microsoft Office documents and business metrics. This involves a unified animation manager, color transition system, and data binding foundation.
- **Material Management System Design**: Identified critical material system flaws - scattered material creation, no reuse, inconsistent material types, hardcoded texture paths. Designed unified BabylonMaterialManager with material presets (wood, metal, plastic, glass), texture atlas system, and data-driven material binding for business visualizations.
- **Deployment Strategy**: Frontend built with Vite to `dist/public`, backend bundled with ESBuild to `dist/index.js`. Utilizes environment variables for database connection and AI API keys. Drizzle ORM manages database schema and migrations.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM.
- **openai**: OpenAI API client.
- **@radix-ui/***: UI component library.
- **@react-three/fiber**: 3D rendering library for React.
- **@babylonjs/core**: Core Babylon.js library for 3D rendering.
- **zustand**: State management library.

### Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Language for type-safe development.
- **Tailwind CSS**: Utility-first CSS framework.
- **ESBuild**: Bundler for production builds.

### AI/Cloud Services
- **OpenAI API**: Primary AI service for generative capabilities.
- **Microsoft Copilot**: Integrated for enhanced business analysis and insights.
- **Microsoft Graph API**: For potential future integration and authentication.

### Database
- **PostgreSQL**: Relational database for persistent storage.

### Other Integrations
- **PowerPoint Import**: Utilizes JSZip and XML parsing for importing content from PowerPoint files, with enhanced text extraction and content filtering.

## Material Management System Architecture

### Current Material System Problems (January 10, 2025)
**Identified Issues:**
- Scattered material creation throughout 3,076 lines of Canvas3DBabylon.tsx
- No material reuse - each object creates individual material instances (memory inefficient)
- Inconsistent material types - mix of StandardMaterial and PBRMetallicRoughnessMaterial
- Hardcoded texture paths scattered throughout code ("/textures/Label_CustomerSegments.png")
- No material preset system for business visualization looks (wood, metal, plastic, glass)
- Difficult to apply consistent visual themes across BMC objects
- Previous wood texture implementation required complex texture mapping

### Available Texture Resources
**Basic Textures:** wood.jpg, grass.png, sand.jpg, asphalt.png, sky.png
**Label Textures:** Complete set of BMC section labels with transparency
**Grid Overlays:** Ground patterns and divider textures

### BabylonMaterialManager Architecture
**Core Features:**
- Material preset system with business visualization themes
- Texture atlas management for GPU performance optimization
- Data-driven material binding for real-time business metrics visualization
- Material caching and memory management
- Smooth material transitions integrated with animation system

**Implementation Phases:**
1. **Material Manager Foundation** (30 minutes): Caching system, preset library, texture atlas
2. **Animation Integration** (15 minutes): Real-time material property changes based on business data
3. **Advanced Effects** (Future): Procedural materials, shader-based data flow visualization

**Business Material Themes:**
- High Performance: Polished metal materials
- Medium Performance: Clean plastic materials
- Low Performance: Rough wood textures requiring improvement
- Growth Areas: Transparent glass materials
- Cost Centers: Soft fabric textures
- Revenue Generators: Shiny metallic finishes