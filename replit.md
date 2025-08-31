# 4D Time Machine for Business Application

## Overview
The 4D Time Machine is a comprehensive platform for business visualization and analysis. It integrates the **Envisioner** foundational platform with the **4D Visual Language (4DVL)** dynamic visualization system. The application showcases various business use cases through self-contained, connected templates that process Microsoft Office document data and display it in specialized 3D visualizations. Its purpose is to provide a powerful tool for strategic analysis, financial forecasting, and "what-if" scenario planning, aiming to transform how businesses interact with their data.

## Recent Changes
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
The financial visualization system displays four 3D objects representing Revenue, Expenses, Profit, and Loss with real-time height manipulation based on business metrics. The system uses the **FinancialsController** to enforce strict business rules and vertex manipulation for proper anchored surfaces.

### FINANCIAL SYSTEM RULES (MANDATORY)

#### Rule 1: Equal Group Heights
**Revenue Group height = Expense Group height at ALL times**
- This overall height can dynamically change based on data values provided by the FinancialsController
- Both groups grow and shrink together maintaining visual balance

#### Rule 2: 100% Group Composition  
Each group operates where both elements must equal 100% total:
- **Revenue Group**: Revenue% + RevenuePL% = 100%
- **Expenses Group**: Expenses% + ExpensesPL% = 100%

#### Rule 3: Profit/Loss Interrelationship Formula
- **When Revenue > Expenses (Profit scenario)**:
  * ExpensesPL (Profit) = positive height
  * RevenuePL (Loss) = 0% height
- **When Revenue < Expenses (Loss scenario)**:
  * RevenuePL (Loss) = positive height  
  * ExpensesPL (Profit) = 0% height

### Core Architecture Components

#### 1. FinancialsController (Central System Controller)
- **Location**: `client/src/components/Canvas3DBabylon/controllers/FinancialsController.ts`
- **Purpose**: Enforces all financial system rules automatically
- **Global Access**: Available as `(window as any).financialsController`
- **Key Methods**:
  - `updateFinancialSystem(inputData, animated)`: Main update method
  - `validateSystemIntegrity()`: Ensures rule compliance
  - `getCurrentState()`: Returns current financial state

#### 2. Financial Objects Layout
- **Revenue (Green)**: Variable height, positioned left-front, bottom-anchored
- **RevenuePL (Gold)**: Shows loss amount, positioned left-back, top-anchored  
- **Expenses (Red)**: Variable height, positioned right-front, bottom-anchored
- **ExpensesPL (Black)**: Shows profit amount, positioned right-back, top-anchored

#### 3. Vertex Manipulation System
**Critical Rule**: Meshes stay in FIXED positions, only vertices move to change height.

**Bottom-Anchored Objects** (Revenue, Expenses):
- Bottom vertices remain fixed at Y=0 
- Top vertices move up/down to change height
- Mesh position never changes

**Top-Anchored Objects** (RevenuePL, ExpensesPL):
- Top vertices remain fixed at original Y position
- Bottom vertices move up/down to change height  
- Mesh position never changes

#### 4. Height Calculation Formula (via FinancialsController)
```typescript
// Rule 1: Equal Group Heights - based on maximum value
const maxValue = Math.max(revenue, expenses);
const groupHeight = maxValue / HEIGHT_SCALE;

// Rule 2: 100% Group Composition
const revenueHeight = groupHeight * (revenue / maxValue);
const revenuePLHeight = groupHeight * (loss / maxValue);
const expensesHeight = groupHeight * (expenses / maxValue);
const expensesPLHeight = groupHeight * (profit / maxValue);

// Rule 3: Profit/Loss Interrelationship
const profit = isProfit ? (revenue - expenses) : 0;
const loss = !isProfit ? Math.abs(revenue - expenses) : 0;
```

#### 5. Slider Configuration (Updated Ranges)
**Revenue Slider**:
```html
<input type="range" min="0" max="1500" defaultValue="1000" />
```

**Expenses Slider**:
```html
<input type="range" min="0" max="1200" defaultValue="800" />
```

#### 6. UI Integration
All slider interactions route through FinancialsController:
```typescript
// Revenue slider change
controller.updateFinancialSystem({
  revenue: revenue,
  expenses: currentExpenses
}, false); // Immediate update

// Expenses slider change  
controller.updateFinancialSystem({
  revenue: currentRevenue,
  expenses: expenses
}, false); // Immediate update
```

#### 7. Key Files & Responsibilities
- **FinancialsController.ts**: Central business rules enforcement
- **FinancialsHeightManager.ts**: Core vertex manipulation logic
- **FinancialsDataAdapter.ts**: Business data transformation (uses Controller)
- **Canvas3DBabylon.tsx**: Slider UI integration with Controller

#### 8. System Validation
The FinancialsController automatically validates:
- Equal group heights (Rule 1)
- 100% composition per group (Rule 2)  
- Profit/Loss mutual exclusivity (Rule 3)

#### 9. Success Criteria Achieved
✅ Equal group heights enforced at all times
✅ 100% group composition maintained automatically
✅ Profit/Loss interrelationship correctly implemented
✅ Centralized controller enforces all business rules
✅ Slider ranges support full spectrum (0M to 1.5x initial values)
✅ Real-time height updates with vertex manipulation
✅ System integrity validation built-in

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