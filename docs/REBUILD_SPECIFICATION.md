# 4D Time Machine for Business — Complete Rebuild Specification

**Date:** March 29, 2026  
**Current Status:** Fully functional with voice control, financial visualization, and template switching  
**Target:** Complete rebuild using identical tech stack with architectural improvements

---

## Executive Summary

The 4D Time Machine is a sophisticated web application that transforms business data (PowerPoint, Excel, Word) into interactive 3D visualizations. Users can explore Business Model Canvas, Financial data, SWOT analysis, and "What-If" scenarios with real-time data manipulation, voice command control, and AI-powered insights. The app excels at 3D interaction and data binding but suffers from a monolithic main component (4,485 lines) and scattered resource management patterns.

**Key Preservation Goals:**
- All visual behaviors and user experiences remain identical
- Same technology stack (React, Babylon.js, TypeScript, Tailwind, Express, PostgreSQL)
- Voice command system with Web Speech API integration
- Real-time financial visualization with vertex manipulation
- Template-based multi-view architecture

**Key Optimization Opportunities:**
- Split monolithic Canvas3DBabylon.tsx into modular template renderers
- Centralize material/texture creation through a unified manager
- Consolidate dual template state management systems
- Implement safe timer management to prevent stale callback crashes

---

## Technology Stack (Preserved)

### Frontend
- **React 18+** with TypeScript
- **Vite** build tool (bundles to `dist/public`)
- **Babylon.js 6+** for 3D rendering (core engine)
- **Babylon.js GUI** for UI overlays
- **Radix UI** component library
- **Tailwind CSS** for styling
- **Zustand** for client state management
- **TanStack React Query** for server state and data sync
- **Web Speech API** for voice recognition (browser native)

### Backend
- **Express.js** with TypeScript (port 5000)
- **PostgreSQL** database (via Neon serverless)
- **Drizzle ORM** for type-safe queries
- **OpenAI API** (GPT-4o) for AI chat and analysis
- **Microsoft Graph API** for document authentication
- **JSZip** for PowerPoint file parsing
- **ESBuild** for production bundling

### DevOps & Infrastructure
- **Replit** hosting (Node.js + Vite dev server)
- **GitHub** for version control
- **Environment variables** for secrets (API keys, database URLs)

---

## System Architecture

### High-Level Data Flow

```
User Input (Files, Voice, UI)
    ↓
Canvas/Data Parser (PowerPoint → BusinessModelCanvas)
    ↓
Envisioner Core (Single instance, shared ground/lights/camera)
    ↓
Template System (Registry selects template)
    ↓
Template Renderer (Business Model / Financials / SWOT / What-If)
    ↓
4DVL Scene (Declarative: meshes, labels, behaviors)
    ↓
4DVLRenderer (Converts to Babylon.js objects)
    ↓
Babylon Engine (3D rendering via WebGL)
    ↓
User Interaction (Click, Hover, Voice Commands)
    ↓
SelectionManager / FinancialsHeightManager (State updates)
    ↓
Visual Feedback (Colors, Materials, Heights, Animations)
```

### Core Modules

#### 1. **Envisioner Foundation** (Shared across all templates)
- **Location:** `client/src/core/Envisioner.ts`, `client/src/components/Canvas3DBabylon/core/EnvisionerFoundation.ts`
- **Responsibilities:**
  - Single ground plane (always present)
  - Lighting setup (hemispheric + directional)
  - Master transform node (ensures position/scale consistency across template switches)
  - Ground labels (Revenue / Expenses)
  - Camera system (perspective-only with preset animations)
  - Babylon scene lifecycle management

**What Works Well:**
- Master transform provides seamless spatial persistence
- Lighting is stable and professional
- Ground plane serves as visual anchor
- Camera presets (PERSPECTIVE_LEFT, PERSPECTIVE_RIGHT, TOP, FRONT) are smooth

**Optimization Needed:**
- Window resize listener not cleaned up in dispose()
- Ground label updates use inline setTimeout calls (should use hook)

#### 2. **Template System & Registry**
- **Location:** `client/src/core/templates/TemplateRegistry.ts`, `client/src/core/Envisioner.ts`
- **Responsibilities:**
  - Register all available templates (Business Model, Financials, SWOT, What-If)
  - Template discovery (analyze data, recommend best fit)
  - Template switching with cleanup and reloading
  - Persist spatial state across switches

**What Works Well:**
- Registry pattern isolates template definitions
- Factory functions create fresh instances per switch
- Data context is preserved across template switches

**Optimization Needed:**
- Dual state management: `TemplateRegistry` (source of truth) vs. `useEnvisionerType` Zustand store (legacy mirror). Should consolidate to single source.
- No formal unload cleanup checklist — each template must manually track what to dispose.

#### 3. **Business Model Canvas Template**
- **Location:** `client/src/components/Canvas3DBabylon.tsx` (lines 2500–3600 approx), `client/src/lib/templates/BusinessModelTemplate.ts`
- **Responsibilities:**
  - Load main BMC GLB model
  - Create 9 sections (Key Partners, Customer Segments, Value Proposition, etc.)
  - Apply materials and labels to each section
  - Handle animations: pulsating edges, blue tracers (only in BMC, disabled for Financials)
  - Revenue Streams and Cost Structure as separate GLB models
  - Interaction: hover/click/double-click selection with visual feedback

**What Works Well:**
- Material system efficiently reuses 4 material states (original, hovered, selected, dimmed) per section
- CleanBMCSystem manages hover/selection state centrally
- Label creation is consistent (billboards above each section)
- Animations are performant (using Babylon.js built-in animation system)

**Optimization Needed:**
- GLB loading callbacks contain inline setTimeout calls (should use hook)
- Model loader is scattered across Canvas3DBabylon; should extract to dedicated renderer module
- Animation setup (pulsating edge, blue tracer) is hardcoded; should be configurable per section
- 170+ lines of coordinate system documentation is valuable but should move to separate guide

#### 4. **Financials Template**
- **Location:** `client/src/components/Canvas3DBabylon.tsx` (lines 1900–2200), `client/src/components/Canvas3DBabylon/animations/FinancialsHeightManager.ts`, `client/src/components/Canvas3DBabylon/animations/FinancialsDataAdapter.ts`
- **Responsibilities:**
  - Render 4 financial objects: Revenue, Expenses, Profit (ExpensesPL), Loss (RevenuePL)
  - Real-time height manipulation via vertex animation (not mesh scaling)
  - Slider controls: Revenue locked at $10M, Expenses $1M–$10M range
  - Ground labels show current financial values
  - Time navigation: Past (2025) / Current (2026) / Future (2027) year selection
  - Load PowerPoint income statement data with proper year mapping

**What Works Well:**
- Vertex manipulation approach preserves mesh positions while changing height
- Bottom-anchored and top-anchored vertex systems work correctly
- Height calculation formula is clean: `height = value / 500`
- Slider interaction uses uncontrolled React components (defaultValue only)
- Real-time profit/loss calculations are accurate
- PowerPoint data import with automatic year detection works

**Optimization Needed:**
- Ground label updates have duplicate code paths (lines 1010–2040)
- FinancialsHeightManager is destroyed and recreated on every template switch (minor perf hit)
- Slider component is embedded in Canvas3DBabylon (should extract to dedicated UI component)
- Year slider uses indices (0/1/2) instead of readable year names

#### 5. **Material & Texture Management**
- **Location:** `client/src/lib/babylon/BabylonMaterialManager.ts`, `client/src/components/Canvas3DBabylon/materials/MaterialPresets.ts`
- **Responsibilities:**
  - Create and cache materials to avoid duplication
  - Manage PBR and standard materials with proper colors
  - Dynamic texture creation for labels
  - Material disposal on unmount or template switch

**What Works Well:**
- `BabylonMaterialManager` implements a centralized cache with `materialCache` and `textureCache` maps
- Material presets (original, hovered, selected, dimmed) are pre-created for each BMC section
- Texture atlas concept exists (ready to implement)
- Material disposal is called during cleanup

**Optimization Needed:**
- Inline `new Texture()` and `new DynamicTexture()` calls still exist in Canvas3DBabylon.tsx (bypass cache)
- `MaterialPresets` and `BabylonMaterialManager` both exist; should consolidate or clarify ownership
- Cache keys sometimes use `Date.now()` which doesn't guarantee uniqueness

#### 6. **Interaction System**
- **Location:** `client/src/lib/cleanBMCSystem.ts`, `client/src/components/Canvas3DBabylon.tsx` (lines 2900–3100)
- **Responsibilities:**
  - Unified single-click selection (highlights object, fades others)
  - Double-click to show content panel
  - Hover effects (subtle color shift)
  - State restoration across template switches
  - Material switching (original → hovered → selected → dimmed)

**What Works Well:**
- CleanBMCSystem centralizes all hover/select state
- Material switching is performant (just reassigning mesh.material reference)
- Selection state is persisted in Zustand store across template switches
- ActionManager callbacks are properly wired

**Optimization Needed:**
- ActionManager setup is embedded in Canvas3DBabylon; extract to SelectionManager module
- Hover state is managed separately from click state; could be unified
- No clear separation between BMC-specific and generic interaction logic

#### 7. **Voice Command System**
- **Location:** `client/src/lib/voice/VoiceCommandEngine.ts`, `client/src/lib/voice/useVoiceCommands.ts`, `client/src/components/VoiceCommandOverlay.tsx`
- **Responsibilities:**
  - Web Speech API integration with auto-restart
  - Regex-based NLP for commands (e.g., "go to perspective right", "select key partners")
  - Template switching via voice
  - Camera preset switching
  - Section selection
  - Interim transcript display
  - Animated listening indicator

**What Works Well:**
- Regex patterns are clear and maintainable
- Auto-restart handles brief silence periods
- Voice callbacks integrate with existing `cleanBMCRef` APIs (no new dependencies)
- Overlay UI is non-intrusive (floating bottom-left)

**Optimization Needed:**
- NLP could benefit from fuzzy matching (currently exact word order)
- No feedback for unrecognized commands (silent failure)
- Command aliases are hardcoded in engine; should be config-driven

#### 8. **Data Adaptation Layer**
- **Location:** `client/src/components/Canvas3DBabylon/animations/FinancialsDataAdapter.ts`
- **Responsibilities:**
  - Transform PowerPoint income statement data to financial visualization parameters
  - Validate and clamp values (e.g., expenses max 1000 for $10M)
  - Calculate profit/loss from revenue and expenses
  - Map year indices to year labels
  - Trigger height updates via callbacks

**What Works Well:**
- Clear separation of data transformation logic
- Value clamping prevents visual glitches
- Callback pattern allows flexibility in height update mechanism

**Optimization Needed:**
- No undo/redo for slider changes
- Limited error handling for malformed PowerPoint data

#### 9. **Animation System**
- **Location:** `client/src/components/Canvas3DBabylon/animations/FinancialsHeightManager.ts`, `client/src/components/Canvas3DBabylon/animations/AnimationEffects.ts`, `client/src/components/Canvas3DBabylon/animations/ValueChainAnimator.ts`
- **Responsibilities:**
  - Vertex manipulation for financial object heights
  - Camera transition animations
  - Material color fade animations
  - Custom animations (pulsating edges, blue tracers)
  - RAF loop management

**What Works Well:**
- Vertex manipulation logic is mathematically sound
- Camera animations use Babylon.js Animation system (smooth easing)
- Cleanup includes RAF cancellation with `_disposed` flags

**Optimization Needed:**
- `setInterval` handles are tracked but cleanup is manual; should use timer hook
- Animation effects are hardcoded for specific sections; could be data-driven

#### 10. **UI Components**
- **Location:** `client/src/components/` (Header, Sidebar, Canvas3DBabylon, AboutPage, etc.)
- **Responsibilities:**
  - Navigation between pages
  - File upload handling
  - Template selection UI
  - Slider controls for financials
  - Content panels for selected objects
  - Voice command overlay

**What Works Well:**
- Radix UI components are accessible
- Tailwind styling is consistent
- Responsive layout adapts to viewport

**Optimization Needed:**
- Slider component is embedded in Canvas3DBabylon (4,485 line file)
- No loading states for file uploads
- Limited keyboard accessibility (voice is good, but keyboard navigation could be richer)

---

## Current State: What Works Well

### Strengths
1. **3D Interaction Model:** Single-click selection, double-click details, hover feedback — all responsive and intuitive
2. **Visual Fidelity:** Babylon.js rendering is smooth, materials look professional, lighting is balanced
3. **Voice Control:** Speech recognition is surprisingly accurate; regex patterns are simple but effective
4. **Data Binding:** Real-time slider updates reflect immediately in 3D (vertex manipulation approach is correct)
5. **Template Flexibility:** Switching between Business Model and Financials is seamless; camera presets adapt per template
6. **Financial Accuracy:** Profit/loss calculations are mathematically correct; year mapping from PowerPoint is solid
7. **Memory Management:** Recent cleanup work (material disposal, RAF cancellation, window globals) prevents leaks
8. **GitHub Integration:** OAuth-based push to GitHub works reliably

### Known Limitations
1. **Monolithic Component:** Canvas3DBabylon.tsx at 4,485 lines is hard to maintain and risky to change
2. **Dual State Systems:** `TemplateRegistry` + `useEnvisionerType` can drift out of sync
3. **Timer Leaks Risk:** Raw `setTimeout` calls can fire against disposed objects if component unmounts mid-flight
4. **Material Creation Paths:** Multiple ways to create materials (BabylonMaterialManager, MaterialPresets, inline) cause inconsistency
5. **Limited Error Recovery:** PowerPoint parsing fails silently; no fallback messaging
6. **Static Animations:** Pulsating edges and blue tracers are hardcoded; not configurable
7. **No Undo/Redo:** Slider changes and selections are not reversible
8. **AI Chat Incomplete:** Backend has OpenAI integration but UI doesn't surface recommendations

---

## File Structure (Current)

```
project/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas3DBabylon.tsx (4,485 lines — MONOLITHIC)
│   │   │   ├── Canvas3DBabylon/
│   │   │   │   ├── core/
│   │   │   │   │   ├── EnvisionerFoundation.ts
│   │   │   │   │   ├── EnvisionerPersistence.ts
│   │   │   │   │   └── UnifiedBMCTransformSystem (inline class)
│   │   │   │   ├── materials/
│   │   │   │   │   └── MaterialPresets.ts
│   │   │   │   ├── animations/
│   │   │   │   │   ├── FinancialsHeightManager.ts
│   │   │   │   │   ├── FinancialsDataAdapter.ts
│   │   │   │   │   ├── AnimationEffects.ts
│   │   │   │   │   └── ValueChainAnimator.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── BMCModelLoader.ts
│   │   │   │   ├── interactions/ (folder exists, minimal content)
│   │   │   │   ├── scene/
│   │   │   │   │   ├── SceneSetup.ts
│   │   │   │   │   └── SceneSetupAdapter.ts
│   │   │   │   ├── adapters/
│   │   │   │   │   └── SceneSetupAdapter.ts
│   │   │   │   ├── utils/
│   │   │   │   │   └── BMCUtilities.ts
│   │   │   │   ├── constants/
│   │   │   │   │   └── BMCConstants.ts
│   │   │   │   └── ui/ (folder exists, for future slider extraction)
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── ExplorePage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── VoiceCommandOverlay.tsx
│   │   │   └── (other UI components)
│   │   ├── lib/
│   │   │   ├── stores/
│   │   │   │   ├── useCanvas.ts (main state: selections, camera, financials)
│   │   │   │   ├── useEnvisionerType.ts (legacy: template selection)
│   │   │   │   └── (other stores)
│   │   │   ├── hooks/
│   │   │   │   ├── useTimerManager.ts (NEW: safe timeout tracking)
│   │   │   │   └── (other hooks)
│   │   │   ├── babylon/
│   │   │   │   ├── BabylonMaterialManager.ts
│   │   │   │   └── BabylonAnimationManager.ts
│   │   │   ├── templates/
│   │   │   │   ├── BusinessModelTemplate.ts
│   │   │   │   ├── FinancialsTemplate.ts (if separate)
│   │   │   │   └── EnvisionerTemplate.ts (base interface)
│   │   │   ├── core/
│   │   │   │   ├── Envisioner.ts
│   │   │   │   └── UnifiedInteractionManager.ts
│   │   │   ├── voice/
│   │   │   │   ├── VoiceCommandEngine.ts
│   │   │   │   └── useVoiceCommands.ts
│   │   │   ├── cleanBMCSystem.ts
│   │   │   ├── debug/
│   │   │   │   ├── DebugLogger.ts
│   │   │   │   └── (debug utilities)
│   │   │   ├── 4DVL/ (newer architecture, partial implementation)
│   │   │   │   ├── UseCase4DVLTemplate.ts
│   │   │   │   ├── 4DVLScene.ts
│   │   │   │   ├── 4DVLRenderer.ts
│   │   │   │   └── (other 4DVL classes)
│   │   │   └── (other libs)
│   │   ├── types/
│   │   │   ├── canvas.ts (BusinessModelCanvas interface)
│   │   │   ├── bmcState.ts
│   │   │   └── (other types)
│   │   ├── pages/ (if using routing)
│   │   └── App.tsx
│   ├── public/
│   │   ├── images/
│   │   │   ├── envisioner-header.jpg
│   │   │   └── (other images)
│   │   ├── textures/
│   │   │   ├── asphalt.png (available for use)
│   │   │   └── (limited texture library)
│   │   └── (other static assets)
│   └── package.json
├── server/
│   ├── index.ts (Express server entry)
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── powerpoint.ts
│   │   ├── canvas.ts
│   │   ├── ai.ts
│   │   └── (other routes)
│   ├── db/
│   │   ├── schema.ts (Drizzle schema)
│   │   └── (migrations if any)
│   └── package.json
├── .env.local (secrets: API keys, database URL)
├── replit.md (architecture guide)
├── package.json (monorepo root)
└── vite.config.ts
```

---

## Optimization Priorities (For Rebuild)

### Priority 1: Component Modularization (High Risk, High Reward)
**Goal:** Split Canvas3DBabylon.tsx into independent template renderers

1. **Extract FinancialsSliderUI.tsx** (150 lines)
   - Owns slider rendering and onChange handlers
   - Imports FinancialsHeightManager for height updates
   - Located: `client/src/components/Canvas3DBabylon/ui/FinancialsSliderUI.tsx`

2. **Extract BusinessModelRenderer.tsx** (800 lines)
   - GLB model loading for main BMC, Revenue Streams, Cost Structure
   - Section setup (materials, labels, animations)
   - Located: `client/src/components/Canvas3DBabylon/templates/BusinessModel/Renderer.tsx`

3. **Extract FinancialsRenderer.tsx** (400 lines)
   - GLB model loading for financial objects
   - Height manager integration
   - Ground label updates
   - Located: `client/src/components/Canvas3DBabylon/templates/Financials/Renderer.tsx`

4. **Extract SelectionManager.ts** (200 lines)
   - ActionManager setup and wiring
   - Hover/click/double-click handlers
   - Material switching logic
   - Located: `client/src/components/Canvas3DBabylon/interactions/SelectionManager.ts`

5. **Extract CameraController.ts** (300 lines)
   - Camera preset animation logic
   - Auto-switch sequence
   - Camera state restoration
   - Located: `client/src/components/Canvas3DBabylon/core/CameraController.ts`

6. **Reduce Canvas3DBabylon.tsx to ~300 lines**
   - Only owns: `<canvas>` element, engine lifecycle, useEffect orchestration
   - Routes to template renderers via conditional logic
   - Manages top-level state (selectedTemplate, isLoading)

**Benefit:** Each module becomes independently testable, reviewable, and replaceable without touching others.

### Priority 2: Consolidate Material Creation (Medium Risk, Medium Reward)
**Goal:** All material/texture creation flows through BabylonMaterialManager

1. **Audit all inline texture creation** in Canvas3DBabylon.tsx
   - Remove `new DynamicTexture()` calls
   - Remove `new Texture()` calls (non-cache paths)
   - Route through BabylonMaterialManager getters

2. **Extend BabylonMaterialManager**
   - Add methods: `getDynamicLabelTexture(key, fontSize, text)`
   - Add methods: `getStandardMaterial(key, color, diffuseTexture?)`
   - Pre-allocate common textures during scene setup

3. **Deprecate MaterialPresets.ts** or clarify ownership
   - If kept: owns only preset definitions (original/hovered/selected/dimmed)
   - If removed: consolidate into BabylonMaterialManager

**Benefit:** Stable GPU memory, no orphaned resources, cache hits reduce object creation.

### Priority 3: Unify Template State Management (Low Risk, High Reward)
**Goal:** Single source of truth for active template

1. **Make TemplateRegistry the owner**
   - TemplateRegistry.switchTemplate() is the only way to change templates
   - All template changes go through it

2. **Make useEnvisionerType a derived value**
   - useEnvisionerType.getActiveTemplate() reads what TemplateRegistry says
   - No independent writes to useEnvisionerType
   - Used only by UI components (Header, Sidebar)

3. **Add observer pattern**
   - TemplateRegistry emits "switched" event
   - useEnvisionerType listens and updates its store

**Benefit:** No more dual-system confusion; debugging template bugs becomes simpler.

### Priority 4: Safe Timer Management (Low Risk, Low Reward)
**Goal:** Prevent stale setTimeout callbacks from firing

1. **Hook already created:** useTimerManager.ts exists and is imported

2. **Replace all setTimeout calls in Canvas3DBabylon.tsx**
   - 17 total setTimeout calls identified
   - Change `setTimeout(fn, delay)` to `safeSetTimeout(fn, delay)`
   - No logic changes, only registration mechanism changes

3. **Extend to other files (future):**
   - AnimationEffects.ts (setInterval calls)
   - ViewTransitionManager.ts (RAF loops)
   - But start with Canvas3DBabylon only

**Benefit:** Eliminates stale callback crashes during template switches (rare but high-impact bugs).

### Priority 5: Enhanced Error Handling (Low Risk, Low Reward)
**Goal:** Better user feedback for failures

1. **PowerPoint parsing errors**
   - Catch JSZip errors, show toast notification
   - Fall back to demo data with message

2. **Babylon.js resource exhaustion**
   - Catch GLB load failures, show modal
   - Suggest file reload

3. **Voice recognition failures**
   - Clear messaging for unsupported browsers
   - Fallback to keyboard navigation

**Benefit:** Users understand why things fail; app is more resilient.

---

## Database Schema (Minimal)

```typescript
// Drizzle ORM schema (PostgreSQL)
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 256 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const canvasesTable = pgTable('canvases', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => usersTable.id),
  name: varchar('name', { length: 256 }),
  data: jsonb('data'), // BusinessModelCanvas JSON
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessionsTable = pgTable('sessions', {
  id: varchar('id', { length: 256 }).primaryKey(),
  userId: integer('user_id').references(() => usersTable.id),
  expiresAt: timestamp('expires_at'),
});
```

---

## API Endpoints (Express Backend)

```
POST   /api/auth/login              — Authenticate user
GET    /api/auth/me                 — Get current user
POST   /api/canvases                — Create new canvas
GET    /api/canvases/:id            — Get canvas by ID
PUT    /api/canvases/:id            — Update canvas
DELETE /api/canvases/:id            — Delete canvas

POST   /api/powerpoint/upload       — Parse PowerPoint file, return BusinessModelCanvas
POST   /api/excel/upload            — Parse Excel file (financials)
POST   /api/ai/analyze              — Get AI insights on canvas data
POST   /api/ai/chat                 — Chat with AI about canvas
```

---

## Key Technical Constraints & Decisions

### 1. Babylon.js Scene Lifecycle
- **Single scene per component** — sharing a scene across template switches was previously attempted but caused resource conflicts
- **Master transform node** — all templates add children to it, ensuring position/scale persistence
- **No scene reuse** — disposing and recreating the scene is simpler than trying to clean up selectively

### 2. Camera System
- **Perspective-only** — orthographic camera was tested but removed; perspective looks better for 3D
- **Template-specific presets** — Business Model has TOP/PERSPECTIVE_LEFT/PERSPECTIVE_RIGHT; Financials has FRONT/PERSPECTIVE_LEFT/PERSPECTIVE_RIGHT
- **Smooth animations** — camera transitions use Babylon.js Animation + CubicEase for feel

### 3. Material System
- **Pre-allocated state materials** — For each BMC section, create 4 materials (original/hovered/selected/dimmed) upfront, then switch references rather than creating on-the-fly
- **No material recreation per frame** — This was a performance bottleneck; the current approach (reference swapping) is fast

### 4. Vertex Manipulation (Financials Only)
- **Bottom-anchored objects** (Revenue, Expenses) — top vertices move, bottom vertices stay at Y=0
- **Top-anchored objects** (RevenuePL, ExpensesPL) — bottom vertices move, top vertices fixed
- **Mesh position never changes** — Only vertex Y-coordinates are animated; mesh stays in place
- **Height calculation** — `height = value / 500.0` (e.g., 1000 = 2.0 units for $10M)

### 5. Voice Command Regex Patterns
- Keep patterns simple (exact word matching is reliable)
- Add aliases (e.g., "go to right" = "switch camera preset perspective right")
- No fuzzy matching (low user tolerance for false positives)

### 6. PowerPoint Data Import
- **Default year is 2026 (index 1)** — Past=2025, Current=2026, Future=2027
- **Value clamping** — Expenses capped at 1000 ($10M) to prevent glitches
- **Direct elevation** — If PowerPoint data exists, use it immediately (no animation delay)

### 7. TypeScript Strictness
- **Strict mode enabled** — All any types should be eliminated
- **Template safety** — Generic template types ensure consistency across templates
- **Async error handling** — Promises should be awaited; no floating promises

---

## Testing Strategy (Recommended)

### Frontend
- **Component mount/unmount** — Verify timer cleanup doesn't throw
- **Template switching** — Business Model → Financials → SWOT, verify no state leaks
- **Slider interaction** — Uncontrolled component behavior (React warning test)
- **Voice commands** — Mock Web Speech API, test regex matching
- **Material disposal** — Verify material disposal on unmount (visual inspection only; no GPU memory profiler in jest)

### Backend
- **PowerPoint parsing** — Test with sample .pptx files; verify JSON output
- **AI chat** — Mock OpenAI API; test prompt formatting
- **Database queries** — Drizzle ORM type safety (compile-time verification)

### Integration
- **File upload → Canvas rendering** — End-to-end flow
- **Voice command → UI update** — Voice input → state change → 3D feedback
- **Template switch** → **Camera save** → **Selection restore** — Multi-step persistence

---

## Migration Path (If Rebuilding)

1. **Set up new monorepo** with same package.json structure
2. **Copy type definitions** from `client/src/types/`
3. **Implement Envisioner core** (ground, lighting, camera system)
4. **Implement Business Model renderer** (GLB loading, materials, labels, interactions)
5. **Implement Financials renderer** (height manager, sliders, ground labels)
6. **Wire up template registry** (switching logic, persistence)
7. **Add voice command system** (Web Speech API, regex engine, overlay)
8. **Connect backend** (Express routes, PostgreSQL, OpenAI)
9. **Extract and optimize modules** (split Canvas3DBabylon, consolidate materials)
10. **Test end-to-end** (file upload, template switching, voice, AI chat)

---

## Performance Metrics (Current)

- **Initial load time:** ~3–5 seconds (Vite dev server)
- **Template switch time:** ~1–2 seconds (includes model loading, disposal, re-render)
- **Slider responsiveness:** <16ms (60 FPS on modern hardware)
- **Voice recognition latency:** ~500ms (Web Speech API)
- **Bundle size:** ~500KB gzipped (client); ~200KB (server)

---

## Known Issues & Workarounds

| Issue | Status | Workaround |
|-------|--------|-----------|
| Port 5000 conflict on restart | Known | Kill existing process before restart |
| PowerPoint parsing fails silently | Known | Check browser console for errors |
| Voice commands expect exact word order | Known | Provide command hints in overlay |
| Material recreation on template switch | Accepted | Cache materials per template instead |
| Window resize listener not cleaned up | Fixable | Add cleanup in EnvisionerFoundation.dispose() |
| Nested setTimeout in height save retry | Fixable | Use timer hook to track all timers |
| No undo/redo for slider changes | Feature gap | Implement command pattern if needed |
| AI recommendations not surfaced in UI | Feature gap | Add sidebar panel for insights |

---

## Conclusion

The 4D Time Machine is a solid, feature-complete application. Its 3D interaction model is intuitive, and its data binding works reliably. The main opportunity is **modularization**: splitting the monolithic Canvas3DBabylon.tsx into independent, testable modules would dramatically reduce maintenance burden and risk.

The optimizations outlined above (component split, material consolidation, state unification, timer safety) are **additive and low-risk** if done incrementally. None require changing the visual or interactive behavior.

For a complete rebuild, start with the core Envisioner + Babylon.js setup, then layer in Business Model and Financials renderers, then add voice and AI features. The result would be a codebase that's easier to extend, debug, and maintain — while preserving every user-visible feature.

---

**Document prepared:** March 29, 2026  
**Next review:** After first modularization milestone
