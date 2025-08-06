# Business Model Canvas Visualization Application

## Overview
This project is a web application designed for creating and visualizing business model canvases. It integrates AI-powered assistance for business analysis, offering both 2D and interactive 3D visualization modes. The core purpose is to provide a comprehensive tool for business strategizing, combining modern web technologies with advanced visualization and AI capabilities. The application aims to offer a sophisticated, intuitive platform for ideation, analysis, and presentation of business models, targeting a broad market of entrepreneurs, strategists, and analysts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a full-stack monorepo architecture, separating client and server concerns.

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite for efficient build processes.
- **UI Framework**: Radix UI components styled with Tailwind CSS for a modern and responsive user interface.
- **3D Rendering**: React Three Fiber with Three.js (for initial concepts) and Babylon.js for advanced 3D canvas visualizations. The Babylon.js implementation supports GLB model integration, dual camera modes (Perspective 3D View and orthographic 3D Top View with persistent camera states), dynamic height management for visual interaction, interactive selection with content panels, hover effects, and billboard labels.
- **State Management**: Zustand for managing client-side application state.
- **Data Fetching**: TanStack Query for server state management and data synchronization.

### Backend Architecture
- **Server Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL, accessed via Drizzle ORM for type-safe database interactions.
- **AI Integration**: OpenAI API (specifically GPT-4o) is used for business model analysis and chat functionality. Microsoft Copilot services are integrated with fallback mechanisms.
- **Session Management**: In-memory session storage (MemStorage class) with provisions for database persistence.

### Key Components
- **Canvas Visualization System**: Features a traditional 2D grid-based canvas and an advanced 3D system. The 3D system supports professional GLB models, dynamic object height manipulation, and an interactive selection system. View switching between 2D, 3D View, and 3D Top modes is seamless with state persistence.
- **AI Chat Integration**: Utilizes GPT-4o for insights and recommendations, providing a real-time conversational interface that is context-aware of the current canvas state.
- **Data Management**: Employs shared TypeScript types for consistent data structures across the stack. Canvas elements are defined for the nine core business model canvas sections, with sample data loaded from JSON and a structure supporting canvas metadata and version control via timestamps.

### Technical Architecture Details
- **3D Visualization System (Babylon.js Implementation)**: Uses a single comprehensive GLB model (`BMC_blender_09_complete_1753576063858.glb`) with 7 interactive sections. It incorporates a transform node hierarchy for granular control, a height management system that reads actual GLB transform node scaling values, and semi-gloss black PBR materials with blue selection highlights. Camera system includes dual modes with persistent state. Billboard labels are camera-facing PNG textures.
- **Coordinate System Normalization (Added January 2025)**: Implemented BMCSectionController class for consistent 3D manipulation with standardized APIs for height, position, and rotation control. Added standard grid position definitions and section controller instances for each mesh. Transform utilities provide safe wrappers around existing functionality without breaking current behavior. Development debugging tools available for coordinate analysis.
- **State Management Architecture**: Relies on Zustand stores for canvas data, view modes, chat history, 3D camera positions, and object selection states. Includes persistent camera state and coordination of selection timing between UI state and 3D object manipulations.
- **Coordinate System & Orientation Management**: Addresses GLB model orientation issues from Blender exports by applying a 180° Y-axis rotation in orthographic top view, with corresponding camera compensation.
- **3D Interaction System (Updated January 2025)**: Enhanced click behavior with two-stage interaction: first click selects object (blue highlight, others 50% opacity), second click or double-click shows content panel. Background click detection clears selections and restores all objects to original state and heights. Objects use medium dark grey base color (0.07, 0.07, 0.07) with bright blue hover (0.0, 0.3, 0.8) for optimal visibility. Content panels have maximum z-index (9999) ensuring proper layering above all elements.
- **Additional BMC Sections (January 2025)**: Added separate GLB model instances for Revenue Streams and Cost Structure sections positioned below the main BMC model. Revenue Streams (X: -0.221, width: 7.7) aligned with Customer Channels left edge. Cost Structure (X: -10.1, width: 8.0) positioned in lower left area spanning from Key Partners to Key Resources alignment. Both objects use identical material properties, label formatting (90° counterclockwise rotation, 1.6x2.08 scaling), and interaction setup as main BMC sections.
- **Hover State Integration (January 2025)**: Successfully integrated hover states for Revenue Streams and Cost Structure objects. Key implementation pattern: (1) Add mesh to contentPanelsRef with proper Rectangle panel, (2) Store originalColor, isClicked, and hasTexture properties, (3) Create ActionManager with OnPointerOverTrigger and OnPointerOutTrigger actions, (4) Use standardized bright blue color (0.0, 0.3, 0.8) for hover state, (5) Coordinate opacity changes across all objects (50% for non-hovered, 100% for hovered). Critical: Always use proper Rectangle constructor and avoid non-existent baseColor property on StandardMaterial.
- **Unified Geometry System (January 2025)**: Fully integrated Revenue Streams and Cost Structure into the existing BMCSectionController system. All sections now accessible via transformUtils for consistent manipulation: `transformUtils.setSectionHeight("Revenue Streams", 1.2)`, `transformUtils.hasSection("Cost Structure")`, `transformUtils.getAllSectionNames()`. System designed for safe, straightforward changes without breaking functionality. BMCSectionController provides standardized APIs for height, position, and rotation control across all BMC objects.
- **Deployment Strategy**: Frontend built with Vite to `dist/public`, backend bundled with ESBuild to `dist/index.js`. Utilizes environment variables for database connection (`DATABASE_URL`) and AI API keys. Drizzle ORM manages database schema and migrations.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe ORM for database operations.
- **openai**: OpenAI API client for AI chat and analysis.
- **@radix-ui/***: UI component library.
- **@react-three/fiber**: 3D rendering library for React.
- **@babylonjs/core**: Core Babylon.js library for 3D rendering.
- **zustand**: State management library.

### Development Tools
- **Vite**: Fast build tool and development server.
- **TypeScript**: Language for type-safe development.
- **Tailwind CSS**: Utility-first CSS framework.
- **ESBuild**: Bundler for optimizing production builds.

### AI/Cloud Services
- **OpenAI API**: Primary AI service for generative capabilities.
- **Microsoft Copilot**: Integrated for enhanced business analysis and insights, leveraging Azure AI Foundry.
- **Microsoft Graph API**: Used for potential future integration and authentication.

### Database
- **PostgreSQL**: Relational database for persistent storage.

### Other Integrations
- **PowerPoint Import**: Utilizes JSZip and XML parsing for importing content from PowerPoint files. Features enhanced paragraph-based text extraction to preserve complete bullet points and strict content filtering for Revenue Streams to prevent financial projection data contamination.