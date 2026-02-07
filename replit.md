# 4D Time Machine for Business Application

## Overview
The 4D Time Machine is a comprehensive platform for business visualization and analysis. It integrates the **Envisioner** foundational platform with the **4D Visual Language (4DVL)** dynamic visualization system. The application showcases various business use cases through self-contained, connected templates that process Microsoft Office document data and display it in specialized 3D visualizations. Its purpose is to provide a powerful tool for strategic analysis, financial forecasting, and "what-if" scenario planning, aiming to transform how businesses interact with their data.

## Recent Changes
**February 7, 2026 - Voice Command Control System**
- **NEW FEATURE**: Voice command control for navigating 3D scenes and interacting with data elements
- **VoiceCommandEngine**: Regex-based natural language parser supporting camera navigation, template switching, section selection, zoom, and deselection
- **useVoiceCommands hook**: Manages Web Speech API lifecycle with auto-restart, interim transcript display, and proper cleanup
- **VoiceCommandOverlay**: Floating UI with mic button, animated listening indicator, recognized command feedback, and help panel
- **Integration**: Wired into Canvas3DBabylon using existing APIs (switchCameraPreset, cleanBMCRef, useEnvisionerType)
- **Key files**: `client/src/lib/voice/VoiceCommandEngine.ts`, `client/src/lib/voice/useVoiceCommands.ts`, `client/src/components/VoiceCommandOverlay.tsx`

**February 7, 2026 - Memory Leak Prevention**
- **Template switch disposal**: Now disposes materials and textures (not just meshes) during template switching, using getBindedMeshes() exclusivity check to avoid disposing shared resources
- **RAF cancellation**: Added _disposed flags to ViewTransitionManager and FinancialsHeightManager to stop requestAnimationFrame loops on dispose
- **Interval tracking**: AnimationEffects and MaterialPresets now track setInterval handles and clear them on dispose
- **Financials lifecycle**: FinancialsHeightManager.dispose() added with comprehensive Map cleanup; disposed before re-creation on template switch
- **Window globals cleanup**: All window.* debug globals (financialsHeightManager, switchToYear, etc.) deleted on unmount

**September 2, 2025 - PowerPoint Time Navigation Fixed**
- **CRITICAL FIX**: Initial height calculation was allowing PowerPoint revenue values > 2.0 units
- **HEIGHT ENFORCEMENT**: Added caps at 1000 ($10M max) in FinancialsDataAdapter to enforce 2.0 unit limit
- **TIME NAVIGATION**: Fixed default year selection to show 2026 (Current) instead of 2027 (Future)
- **YEAR MAPPING**: From PowerPoint Financials slide: 2025=Past, 2026=Current ($10M/$8M/$2M), 2027=Future ($26.6M)

**August 30, 2025 - Financial Visualization System Completed**
- **PERFECTED**: Complete financial visualization system with vertex manipulation
- **Revenue Group**: Fixed at $10M, completely locked (no animations, no vertex manipulation)
- **Expenses Group**: Variable $1M-$10M range using vertex manipulation with proper anchoring
- **Anchoring System**: Bottom-anchored (Expenses) and top-anchored (ExpensesPL) vertex manipulation
- **Slider Controls**: Revenue locked/disabled, Expenses interactive $1M-$10M range
- **Profit Calculation**: Real-time 99% to 0% profit margin visualization
- **Critical Fix**: React slider interaction using uncontrolled components with defaultValue only

**Previous - Template Switching and Camera Orientation Fixes**
- Fixed critical template-specific label issue where BMC labels appeared in Financials template
- Resolved camera orientation bugs during template switching (inverted/upside-down views)
- Fixed content mirroring issue when switching from Financials back to Business Model
- Implemented proper EnvisionerPersistence system with template-specific rotation handling
- Key insight: Rotation persistence conflicts - rotation should be template-specific, not globally persisted
- Architecture decision: Position/scale preserved across templates, rotation applied per template

## User Preferences
Preferred communication style: Simple, everyday language.
No automatic screenshots: Do not take screenshots after app restarts - they are not used and clutter the workspace.

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
- **EnvisionerPersistence System**: Manages spatial properties across template switches. Critical design: position and scale are preserved globally, but rotation is template-specific to prevent orientation conflicts.
- **Template-Specific Rotation**: Business Model uses 180° Y rotation + X tilt for BMC orientation; Financials uses 0° rotation for normal content display.
- **Camera System**: Perspective-only camera with template-aware presets. Business Model supports TOP/PERSPECTIVE_LEFT/PERSPECTIVE_RIGHT; Financials supports FRONT/PERSPECTIVE_LEFT/PERSPECTIVE_RIGHT.
- **AI Chat Integration**: Utilizes GPT-4o for insights, recommendations, and conversational interaction, including intelligent voice-activated 3D view switching.
- **Data Management**: Employs shared TypeScript types for consistent data structures, supporting canvas elements, metadata, and version control.
- **Unified Transformation System**: Ensures consistent height, position, and scaling across all components.
- **Material Management System**: Designed to overcome issues like scattered material creation and lack of reuse. It proposes a unified BabylonMaterialManager with material presets, texture atlas management, and data-driven material binding for real-time business metrics visualization.
- **Deployment Strategy**: Frontend built to `dist/public` with Vite, backend bundled to `dist/index.js` with ESBuild. Uses environment variables for configuration.

## Financial Visualization System - Complete Technical Specification

### System Overview
The financial visualization system displays four 3D objects representing Revenue, Expenses, Profit, and Loss with real-time height manipulation based on business metrics. The system uses vertex manipulation instead of mesh scaling to maintain proper anchored surfaces.

### Core Architecture Components

#### 1. Financial Objects Layout
- **Revenue (Green)**: Fixed at $10M, positioned left-front, bottom-anchored
- **RevenuePL (Gold)**: Shows loss amount, positioned left-back, top-anchored  
- **Expenses (Red)**: Variable $1M-$10M, positioned right-front, bottom-anchored
- **ExpensesPL (Black)**: Shows profit amount, positioned right-back, top-anchored

#### 2. Vertex Manipulation System
**Critical Rule**: Meshes stay in FIXED positions, only vertices move to change height.

**Bottom-Anchored Objects** (Revenue, Expenses):
- Bottom vertices remain fixed at Y=0 
- Top vertices move up/down to change height
- Mesh position never changes

**Top-Anchored Objects** (RevenuePL, ExpensesPL):
- Top vertices remain fixed at original Y position
- Bottom vertices move up/down to change height  
- Mesh position never changes

#### 3. Financial Logic Parameters
- **Revenue**: LOCKED at $10M (slider disabled, value=1000)
- **Expenses**: Variable $1M-$10M (slider 100-1000, default=800 for $8M)
- **Profit**: Calculated as Revenue - Expenses ($0M-$9M range, 0%-99% margin)
- **Loss**: Always $0M (since Expenses ≤ Revenue)

#### 4. Height Calculation Formula
```typescript
// Fixed scaling factor
const HEIGHT_SCALE = 500.0;

// Heights (all use same scale)
const revenueHeight = 1000 / HEIGHT_SCALE;     // Fixed: 2.0 units
const expensesHeight = expenses / HEIGHT_SCALE; // Variable: 0.2-2.0 units  
const expensesPLHeight = profit / HEIGHT_SCALE; // Variable: 0.0-1.8 units
const revenuePLHeight = 0 / HEIGHT_SCALE;      // Fixed: 0.0 units
```

#### 5. Slider Configuration (React)
**Revenue Slider** (Locked):
```html
<input type="range" min="1000" max="1000" defaultValue="1000" disabled />
```

**Expenses Slider** (Interactive):
```html
<input type="range" min="100" max="1000" defaultValue="800" />
```

**Critical Implementation Detail**: Use `defaultValue` only (no `value` prop) for interactive sliders to avoid controlled/uncontrolled component conflicts.

#### 6. Animation System
**Revenue Group**: NO animations (completely locked)
- Revenue: No height changes
- RevenuePL: No height changes

**Expenses Group**: Vertex manipulation animations only
- Expenses: Bottom-anchored vertex animation
- ExpensesPL: Top-anchored vertex animation

#### 7. Key Files & Responsibilities
- **FinancialsHeightManager.ts**: Core vertex manipulation logic
- **FinancialsDataAdapter.ts**: Business data transformation  
- **Canvas3DBabylon.tsx**: Slider UI and event handlers (lines 3390-3480)
- **EnvisionerFoundation.ts**: Frame system and mesh management

#### 8. Bounds Checking & Safety
```typescript
// Ensure values stay within valid ranges
const expenses = Math.max(Math.min(data.expenses, 1000), 100); // $1M-$10M
const revenue = 1000; // Always $10M
const profit = Math.max(0, revenue - expenses); // $0M-$9M
```

#### 9. Display Value Calculations
```typescript
// Convert slider values to display values
const displayRevenue = `$${(revenue * 10 / 1000).toFixed(0)}M`; // Always "$10M"
const displayExpenses = `$${(expenses * 10 / 1000).toFixed(0)}M`; // "$1M" to "$10M"
```

### Success Criteria Achieved
✅ Revenue locked at $10M with no movement
✅ Expenses range $1M-$10M with smooth interaction  
✅ Profit margins 0%-99% visualization
✅ Proper anchored surface behavior
✅ Interactive slider without React conflicts
✅ Real-time height updates with vertex manipulation

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