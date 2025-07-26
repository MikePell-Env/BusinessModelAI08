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
- **Sample Data**: Initial business model canvas stored in `client/src/data/sampleCanvas.json`
- **Data Structure**: JSON format with canvas metadata (id, name, description, lastModified) and nine canvas elements
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

### July 26, 2025 - Custom GLB Model Integration with Babylon.js
- **✅ Custom 3D Model Loading**: Integrated user-provided GLB models for all business model canvas elements
- **✅ Advanced Model Management**: Built async loading system with SceneLoader.ImportMeshAsync for seamless model integration
- **✅ Hybrid Geometry System**: Combined custom GLB models with fallback primitive geometry for missing elements
- **✅ Interactive Model System**: Preserved all click interactions, floating panels, and text labels for custom models
- **✅ Material Preservation**: Maintained shadow casting, PBR materials, and special effects on imported models
- **✅ Performance Optimization**: Efficient model loading with error handling and console logging for debugging
- **✅ File Organization**: Organized GLB files in `/client/public/models/` directory for proper asset management

### July 26, 2025 - Circular Business Model Layout Redesign  
- **✅ Revolutionary Layout**: Transformed from grid-based to circular arrangement matching user's top-view design
- **✅ Central Value Proposition**: Created prominent cylinder geometry at canvas center for primary focus
- **✅ Perimeter Elements**: Positioned 7 elements as rectangular boxes around central circle
- **✅ Enhanced Camera System**: Optimized viewing distance (16 units) and limits for circular layout navigation
- **✅ Maintained All Features**: Preserved wood textures, animations, materials, and Microsoft integration

### July 25, 2025 - Microsoft Copilot Service Verification & Debug System
- **✅ Complete Service Verification System**: Built comprehensive Microsoft Copilot service identification with visual indicators and logging
- **✅ Fixed Infinite Loop Bug**: Resolved critical chat response loop that prevented AI responses from being generated
- **✅ Debug Configuration System**: Added configurable debug flags for easy testing and production deployment
- **✅ Service Routing Architecture**: Implemented Azure OpenAI → Microsoft Graph → OpenAI fallback chain with clear logging
- **✅ Clean Production UI**: Service indicators hidden by default for clean user experience, easily toggled for debugging
- **✅ Service Response Headers**: Added service identification metadata in API responses for development transparency
- **✅ TypeScript Error Resolution**: Fixed all LSP diagnostics and null safety issues in Microsoft Copilot service

### July 25, 2025 - Enhanced 3D Metallic Materials and Clean Layout
- **✅ Proper PBR Metallic Materials**: Implemented authentic Babylon.js PBRMetallicRoughnessMaterial with metallic=0.9 and roughness=0.1 for realistic shine
- **✅ Professional Reflections**: Added default environment texture for proper metallic reflections and light interaction
- **✅ Clean White Background**: Configured pure white scene background with white skybox and ground for professional appearance
- **✅ Enhanced Hover Effects**: Interactive metallic properties that increase shine on hover for better user engagement
- **✅ Microsoft Copilot Layout Perfection**: Fixed input anchoring, logo positioning, and message area expansion for optimal user experience
- **✅ Resolved Material Compatibility**: Updated all legacy Standard material references to work seamlessly with PBR materials

### July 25, 2025 - Microsoft Copilot Successfully Activated with Enterprise Security
- **✅ Azure OpenAI Integration Complete**: Successfully connected Microsoft Copilot using Azure AI Foundry deployed model credentials
- **✅ Credential Source Discovery**: API key must come from Azure AI Foundry (where model is deployed), not Azure Portal Cognitive Services
- **✅ Enterprise-Grade AI Chat**: Microsoft Copilot now active with enhanced business model canvas analysis capabilities
- **✅ Comprehensive Setup Interface**: Built complete credential management system with validation, testing, and troubleshooting
- **✅ API Version Compatibility**: Resolved Azure API version conflicts (2025-01-01-preview) for seamless connectivity
- **✅ Production-Ready Architecture**: Full Microsoft technology stack integration with fallback systems and error handling
- **🔒 Military-Grade Security**: Implemented AES-256-GCM encryption with PBKDF2 key derivation for credential storage
- **✅ Secure Persistence**: Encrypted credential storage with machine-specific keys and automatic environment variable loading
- **✅ Zero Re-entry**: One-time credential setup with permanent encrypted local storage and visual security indicators

### July 25, 2025 - Microsoft Copilot Dual-Path Integration Strategy
- **Enhanced System Prompts**: Upgraded Azure OpenAI integration with comprehensive Business Model Canvas expertise
- **Custom Agent Roadmap**: Created detailed development plan for persistent Microsoft Copilot agent with cross-session memory
- **Business Intelligence Framework**: Defined 5-step analysis framework (Value Creation, Delivery, Capture, Strategic Fit, Market Validation)
- **Enterprise Integration Path**: Planned Microsoft 365, SharePoint, Teams, and Power Platform integration strategy
- **Dual Implementation**: Immediate Azure OpenAI enhancement + long-term custom agent with persistent learning capabilities

### July 13, 2025 - Microsoft Copilot Enhancement & Azure Deployment Setup
- **Azure OpenAI Integration**: Enhanced Microsoft Copilot service with Azure OpenAI fallback for more reliable AI responses
- **Business Context Analysis**: Added intelligent business context generation for Microsoft ecosystem integration recommendations
- **Azure Deployment Pipeline**: Created comprehensive Azure deployment configuration with GitHub Actions workflow
- **Production-Ready Setup**: Added Azure App Service, PostgreSQL, OpenAI Service, and Key Vault configuration scripts
- **Microsoft Graph Enhancement**: Improved authentication flow and API integration for enterprise features

### July 13, 2025 - Real PowerPoint Processing Implementation & GitHub Publication
- **Actual File Parsing**: Replaced sample data loading with real PowerPoint file processing using JSZip and XML parsing
- **Company Name Extraction**: Extracts canvas title from "Company:" field in PowerPoint slides
- **Dynamic Visual States**: Canvas boxes change from gray (placeholder) to white (imported) backgrounds and text
- **Silent Processing**: Removed success alerts, only shows errors when import fails
- **Enhanced User Experience**: Import button moved to bottom center, direct file picker access
- **GitHub Integration**: Successfully published complete project to GitHub repository with all features intact

### July 13, 2025 - PowerPoint Import Integration
- **Microsoft Graph PowerPoint Integration**: Built comprehensive PowerPoint-to-canvas import system
- **Structured Template Format**: Created specific slide format requirements for reliable parsing
- **Multi-slide and Single-slide Support**: Flexible import options for different PowerPoint layouts
- **Real-time Import Interface**: Added PowerPoint importer component with file ID input
- **Comprehensive Documentation**: Created detailed import guide with examples and troubleshooting
- **Template Instructions API**: Built endpoint to provide formatting guidelines to users
- **Error Handling**: Robust error handling for authentication, file access, and parsing issues

### July 13, 2025 - GitHub Repository Documentation
- **Comprehensive README.md**: Created detailed documentation for GitHub repository
- **Project Overview**: Complete feature list, technology stack, and architecture description
- **Installation Guide**: Step-by-step setup instructions with prerequisites and configuration
- **Usage Documentation**: User guide for 2D/3D visualization, AI chat, and interactive features
- **Deployment Instructions**: Both Replit and manual deployment options with configuration details
- **API Documentation**: Endpoint descriptions for canvas, chat, and status APIs
- **Contributing Guidelines**: Standard open-source contribution workflow and standards

### July 13, 2025 - Microsoft Copilot UI Integration
- **Authentic Copilot Branding**: Replaced chat icon with official Microsoft Copilot logo (64x64 PNG)
- **Professional Button Design**: Added 48x48 pixel chat button with gray border and white background
- **Proper Image Handling**: Used original PNG file to preserve transparency and quality
- **Enhanced User Experience**: Added hover effects and proper button styling for better interactivity
- **Brand Consistency**: Chat interface now reflects Microsoft technology stack alignment

### July 12, 2025 - Chat System Debugging
- **Fixed Critical Bug**: Resolved infinite recursion loop between Microsoft Copilot and OpenAI services
- **Improved Error Handling**: Built intelligent fallback system that provides meaningful responses when APIs are unavailable
- **Enhanced Chat Responses**: Created context-aware fallback responses that analyze specific business model elements
- **OpenAI Integration**: Successfully integrated OpenAI API with proper quota management and error handling
- **System Reliability**: Application now provides consistent responses regardless of external API availability

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

- **Microsoft Graph API Authentication** (July 12, 2025):
  - ✅ Implemented Microsoft Graph API authentication service with Azure Identity
  - ✅ Created secure token management and caching system
  - ✅ Fixed client credentials authentication flow for application permissions
  - ✅ Successfully tested Microsoft Graph connection with valid access tokens
  - ✅ Built fallback system: Microsoft Copilot → OpenAI → local analysis
  - ✅ Added Microsoft Stack Status component for real-time monitoring
  - ✅ Integrated authentication testing endpoint with proper error handling

- **3D Technology Stack Cleanup**:
  - Removed all competing 3D libraries (Three.js ecosystem, PIXI.js, OGL, Matter.js)
  - Eliminated 86 unnecessary packages and obsolete Canvas3D/Canvas3DSimple components
  - Streamlined to exclusive Babylon.js implementation for Microsoft stack alignment
  - Improved performance and reduced bundle size significantly
  - Simplified architecture with single 3D technology focus

- **Major Package Cleanup** (July 13, 2025):
  - ✅ Removed 150+ unused dependencies reducing bundle size and improving performance
  - ✅ Eliminated unused UI components (30+ Radix UI components and custom components)
  - ✅ Cleaned up game-related packages: react-confetti, gsap, framer-motion, howler
  - ✅ Removed routing packages: wouter, react-router-dom (not needed for single-page app)
  - ✅ Eliminated form packages: react-hook-form, zod-validation-error (not used in current implementation)
  - ✅ Streamlined to essential packages only: 49 packages down from 200+
  - ✅ Maintained all core functionality: 2D/3D canvas views, AI chat, Microsoft integration
  - ✅ Verified application stability and performance after cleanup

The application is designed to scale from development to production with minimal configuration changes, supporting both local development and cloud deployment scenarios.