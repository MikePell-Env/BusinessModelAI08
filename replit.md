# Business Model Canvas Visualization Application

## Overview

This is a modern web application for creating and visualizing business model canvases with AI-powered assistance. The application features both 2D and 3D visualization modes, an integrated AI chat system for business analysis, and a sophisticated tech stack built with React, Express, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack monorepo architecture with clear separation between client and server code:

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Framework**: Radix UI components with Tailwind CSS for styling
- **3D Rendering**: React Three Fiber (@react-three/fiber) with Three.js for 3D canvas visualization
- **State Management**: Zustand for client-side state management
- **Data Fetching**: TanStack Query for server state management

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **AI Integration**: OpenAI API for business model analysis and chat functionality
- **Session Storage**: Currently using in-memory storage (MemStorage class) with option to extend to database-backed sessions

## Key Components

### Canvas Visualization System
- **Canvas2D**: Traditional grid-based business model canvas layout with color-coded sections
- **Canvas3D**: Interactive 3D visualization using Three.js with hoverable blocks
- **View Switching**: Smooth transitions between 2D and 3D modes with loading states

### AI Chat Integration
- **OpenAI Service**: GPT-4o integration for business model analysis and recommendations
- **Chat Interface**: Real-time conversation with context awareness of current canvas state
- **Canvas Analysis**: AI-powered insights and suggestions for business model optimization

### Data Management
- **Schema Definition**: Shared TypeScript types for consistent data structures
- **Canvas Elements**: Nine core business model canvas sections (Key Partners, Activities, Resources, etc.)
- **Version Control**: Timestamps for canvas modifications

## Data Flow

1. **Canvas Loading**: Sample canvas data loaded from JSON on application startup
2. **State Synchronization**: Zustand stores manage canvas state, view mode, and chat history
3. **AI Interactions**: Chat messages sent to Express backend, processed through OpenAI API
4. **Real-time Updates**: Canvas modifications reflected immediately in both 2D and 3D views
5. **Persistent Storage**: Database schema prepared for user data and canvas persistence

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **openai**: AI chat and analysis capabilities
- **@radix-ui/***: Comprehensive UI component library
- **@react-three/fiber**: 3D rendering engine
- **zustand**: Lightweight state management

### Development Tools
- **Vite**: Fast development server and build system
- **TypeScript**: Type safety across the entire stack
- **Tailwind CSS**: Utility-first styling framework
- **ESBuild**: Production build optimization

## Deployment Strategy

### Build Process
- **Frontend**: Vite builds React application to `dist/public`
- **Backend**: ESBuild bundles Express server to `dist/index.js`
- **Database**: Drizzle migrations in `./migrations` directory

### Environment Configuration
- **Database Connection**: PostgreSQL via `DATABASE_URL` environment variable
- **AI Integration**: OpenAI API key configuration
- **Development Mode**: Vite development server with HMR
- **Production Mode**: Static file serving with Express

### Database Architecture
- **Schema Management**: Drizzle ORM with PostgreSQL dialect
- **User System**: Basic user authentication schema prepared
- **Migration Strategy**: Schema changes tracked in dedicated migrations folder

## Recent Changes

### July 12, 2025
- **3D Canvas Redesign**: Completely redesigned 3D visualization based on user's sketch
  - Multi-level platform sections with people figures, buildings, trucks, computers
  - Central circular flow with rotating torus and heart symbol
  - Enhanced lighting, shadows, and interactive hover effects
  - Connecting walkways between platform sections

- **UI Improvements**: 
  - Updated button layout with separate 2D/3D view buttons
  - Moved Reset button to right side, removed mode indicator
  - Fixed 2D canvas grid layout with proper cost structure/revenue streams alignment

- **Technical Fixes**:
  - Resolved TypeScript import errors for shared types
  - OpenAI API integration working (quota limitations noted)
  - Application fully functional with smooth 2D/3D transitions

- **Microsoft Technology Migration Foundation**:
  - Created simplified 3D canvas system for easier Babylon.js migration
  - Installed Babylon.js packages (@babylonjs/core, @babylonjs/gui, @babylonjs/loaders)
  - Built Canvas3DBabylon component with native Babylon.js implementation
  - Added three 3D rendering modes: Simple, Complex, and Babylon.js
  - Positioned boxes closer together matching 2D layout
  - Removed spinning elements from Value Propositions section
  - Fixed Babylon.js import and camera control issues

- **Microsoft Copilot API Integration**:
  - Implemented Microsoft Copilot service with Graph API integration
  - Created fallback system: Microsoft Copilot → OpenAI → local analysis
  - Added Microsoft Stack Status component for monitoring migration progress
  - Configured test endpoint for Microsoft Graph API connection validation
  - Prepared infrastructure for Microsoft 365 Copilot license authentication
  - Added Microsoft technology stack dashboard with real-time status checks

- **3D Technology Stack Cleanup**:
  - Removed all competing 3D libraries (Three.js ecosystem, PIXI.js, OGL, Matter.js)
  - Eliminated 86 unnecessary packages and obsolete Canvas3D/Canvas3DSimple components
  - Streamlined to exclusive Babylon.js implementation for Microsoft stack alignment
  - Improved performance and reduced bundle size significantly
  - Simplified architecture with single 3D technology focus

The application is designed to scale from development to production with minimal configuration changes, supporting both local development and cloud deployment scenarios.