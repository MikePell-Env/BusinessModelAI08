# 4D Time Machine for Business Application

## Overview
The 4D Time Machine is a platform for business visualization and analysis, integrating the Envisioner foundational platform with the 4D Visual Language (4DVL) dynamic visualization system. It provides self-contained, connected templates that process Microsoft Office document data and display it in specialized 3D visualizations. The application aims to be a powerful tool for strategic analysis, financial forecasting, and "what-if" scenario planning, transforming how businesses interact with their data.

## User Preferences
Preferred communication style: Simple, everyday language.
No automatic screenshots: Do not take screenshots after app restarts - they are not used and clutter the workspace.

## System Architecture
The application uses a full-stack monorepo architecture, emphasizing modularity and extensibility.

### Core Platform
- **Envisioner Core**: Manages the ground plane, interactions, template lifecycle, and a unified camera system, supporting single instances per data source.
- **4D Visual Language (4DVL)**: Defines dynamic visual elements including GLB object geometry, labels, behaviors, and data binding.
- **Template System**: Provides extensible use case implementations (Business Model, Financials, SWOT, What If) with a registry. Templates preserve position and scale across switches, but rotation is template-specific to prevent conflicts.
- **Data Integration**: Handles adapters for Microsoft Office documents (PowerPoint, Excel, Word) and manages real-time data flow.

### Frontend
- **Framework**: React with TypeScript, built with Vite.
- **UI Framework**: Radix UI components styled with Tailwind CSS.
- **3D Rendering**: Babylon.js for 3D canvas visualizations, including GLB model integration, dynamic object height manipulation, interactive selection, hover effects, and billboard labels. Uses a perspective-only camera with optimized presets and automatic switching.
- **State Management**: Zustand for client-side state.
- **Data Fetching**: TanStack Query for server state management.
- **Interaction System**: Consistent single-click selection (highlighting, fading others) and double-click for content panels. Hover effects are consistent, and state restoration ensures selection persistence. A unified ActionManager handles clicks.
- **Financial Visualization System**: Displays four 3D objects (Revenue, Expenses, Profit, Loss) with real-time height manipulation using vertex manipulation (not mesh scaling) for proper anchoring. Revenue is fixed; Expenses are variable.
  - **Vertex Manipulation**: Meshes remain in fixed positions; only vertices move to change height (bottom-anchored for Revenue/Expenses, top-anchored for Profit/Loss).
  - **Slider Configuration**: React sliders use `defaultValue` only to avoid controlled/uncontrolled component conflicts.
  - **Template Transitions**: Features smooth transitions between templates with position stability, ensuring X/Z coordinates remain fixed during template switches, with only Y position adjusted per template.

### Backend
- **Server Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL, accessed via Drizzle ORM.
- **AI Integration**: OpenAI API (GPT-4o) for business model analysis and chat.
- **Session Management**: In-memory session storage.

### Key Technical Details
- **Canvas Visualization**: Supports both 2D grid and 3D system using a single GLB model with interactive sections.
- **Coordinate System**: Handles GLB model positioning and scaling, including X-axis inversion workarounds.
- **EnvisionerPersistence System**: Manages spatial properties, ensuring global position/scale preservation but template-specific rotation.
- **AI Chat Integration**: Utilizes GPT-4o for insights, recommendations, and conversational interaction, including voice-activated 3D view switching.
- **Data Management**: Employs shared TypeScript types for consistent data structures.
- **Material Management System**: Proposed system for unified material presets, texture atlas management, and data-driven material binding.
- **Deployment**: Frontend to `dist/public` with Vite, backend to `dist/index.js` with ESBuild.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM.
- **openai**: OpenAI API client.
- **@radix-ui/***: UI component library.
- **@babylonjs/core**: Core Babylon.js library for 3D rendering.
- **zustand**: State management library.
- **@tanstack/react-query**: Data fetching and caching.
- **Vite**: Build tool and development server.
- **TypeScript**: Language for type-safe development.
- **Tailwind CSS**: Utility-first CSS framework.
- **ESBuild**: Bundler.
- **OpenAI API**: Primary AI service.
- **Microsoft Copilot**: For business analysis and insights.
- **PostgreSQL**: Relational database.
- **JSZip**: For parsing PowerPoint files.