
# Financials Architecture Documentation

## Overview
The Financials system is a sophisticated 3D visualization framework that transforms financial business data into interactive, animated 3D representations. It provides real-time height animations, data binding, and comprehensive financial metrics visualization within the Business Model Canvas ecosystem.

## System Architecture

### Core Components Architecture
```
Financials System
├── FinancialsTemplate.ts           # Template configuration and color schemes
├── FinancialsHeightManager.ts      # Height manipulation and animation engine
├── FinancialsDataAdapter.ts        # Business data transformation layer
├── FinancialsDemo.ts              # Demo scenarios and testing utilities
├── BMCModelLoader.ts              # GLB model loading and positioning
└── Canvas3DBabylon.tsx            # Integration with main 3D canvas
```

### Data Flow Architecture
```
Business Data → Data Adapter → Height Manager → 3D Visualization
     ↓              ↓              ↓              ↓
Financial       Transform      Calculate      Animate
Metrics         to Visual      Heights        Objects
               Format         & Positions
```

## Component Documentation

### 1. FinancialsTemplate.ts
**Purpose**: Defines the template configuration for the Financials envisioner

**Key Features**:
- 4 financial objects with grouped stacking behavior
- Color scheme definitions for Revenue, Loss, Expenses, and Profit
- Template configuration for canvas integration

**Color Scheme**:
```typescript
Revenue:    Color3(0.0, 0.40, 0.24)  // Revenue Streams Green
RevenuePL:  Color3(0.7, 0.45, 0.08)  // Gold for Loss
Expenses:   Color3(0.4, 0.08, 0.08)  // Deep red
ExpensesPL: Color3(0.1, 0.1, 0.1)    // Black for Profit
```

**Configuration**:
- Revenue Streams: Disabled (handled by separate GLB)
- Cost Structure: Disabled (handled by separate GLB)
- Ground Plane: Enabled
- Border Geometry: Enabled

### 2. FinancialsHeightManager.ts
**Purpose**: Core height manipulation and animation engine for financial objects

**Key Responsibilities**:
- Register financial meshes for height manipulation
- Calculate proportional heights based on financial data
- Animate height changes with proper stacking order
- Maintain anchor point consistency (top/bottom anchored objects)

**Height Calculation System**:
```typescript
// Base group height: 2.0 (original GLB models stacked)
// 80/20 split for each group:
Revenue:    80% of total group height (bottom-anchored)
RevenuePL:  20% of total group height (top-anchored)
Expenses:   80% of total group height (bottom-anchored)  
ExpensesPL: 20% of total group height (top-anchored)
```

**Animation System**:
- **Duration**: 1000ms default with 500ms staggered phases
- **Easing**: CubicEase with EASEINOUT mode
- **Sequence**: Bottom-anchored objects first, then top-anchored objects
- **Anchor Types**: 
  - `bottom`: Fixed bottom surface, grows upward
  - `top`: Fixed top surface, adjusts position based on height

**Key Methods**:
- `registerFinancialMeshes()`: Register meshes for manipulation
- `updateHeightsFromData()`: Animated height updates
- `setImmediateHeights()`: Instant height updates for initialization
- `calculateProportionalHeights()`: Data-to-height conversion logic

### 3. FinancialsDataAdapter.ts
**Purpose**: Business data transformation and real-time update management

**Data Transformation**:
```typescript
// Input: FinancialBusinessData
interface FinancialBusinessData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netLoss: number;
  quarters?: QuarterlyData[];
}

// Output: FinancialData (visualization format)
interface FinancialData {
  revenue: number;   // Controls Revenue group height
  expenses: number;  // Controls Expenses group height
  profit: number;    // Controls ExpensesPL (profit) object
  loss: number;      // Controls RevenuePL (loss) object
}
```

**Real-Time Features**:
- **Update Interval**: 2000ms (2 seconds)
- **Real-Time Mode**: Continuous data polling and visualization updates
- **Manual Updates**: One-time data transformations with optional animation
- **Simulation Mode**: Built-in dynamic data generation for testing

**Key Methods**:
- `startRealTimeUpdates()`: Begin continuous data updates
- `stopRealTimeUpdates()`: End real-time mode
- `updateFromBusinessData()`: Manual data update
- `startSimulation()`: Demo data generation

### 4. BMCModelLoader.ts (Financials Integration)
**Purpose**: GLB model loading with precise positioning and scaling for financial objects

**Model Configuration**:
```typescript
// File: Financials_blender_02_1756252040436.glb
// Base Position: (0, 0.1, 0)
// Base Scaling: (1, 1, 1)
```

**Finalized Object Positioning (January 27, 2025)**:
```typescript
// WIDTH SCALING: All objects use 0.64 scaling (40% total reduction)
// POSITIONING: All groups centered at X=0.00 (center line alignment)

Revenue:    Height=1.0, Bottom-anchored at Y=0.0    (green)
RevenuePL:  Height=1.0, Top-anchored at Y=-0.02     (gold)  
Expenses:   Height=1.0, Bottom-anchored at Y=0.0    (deep red)
ExpensesPL: Height=1.0, Top-anchored at Y=-0.02     (black)
```

**Object Registration**:
Each financial mesh is automatically registered with the unified transformation system:
```typescript
// Register with BMC system
unifiedTransformRef.current.registerObject(meshName, {
  mesh: mesh,
  sectionName: meshName,
  objectType: 'financials',
  rootMesh: rootMesh
});
```

### 5. FinancialsDemo.ts
**Purpose**: Comprehensive demonstration and testing system

**Demo Scenarios**:
1. **Baseline Scenario**: Equal revenue and expenses
2. **Growth Scenario**: High revenue, moderate expenses  
3. **Loss Scenario**: Low revenue, high expenses
4. **Volatile Scenario**: Rapid fluctuations

**Testing Features**:
- Scenario-based testing with predefined financial states
- Real-time simulation with sine/cosine wave patterns
- State inspection and debugging utilities
- Performance monitoring for animation systems

## Coordinate System & Positioning

### Object Layout Strategy
The Financials system uses a **centered alignment strategy** with optimized spacing:

**Horizontal Positioning**:
- All financial objects centered at X=0.00
- 40% width reduction (0.64 X-scaling) for optimal spacing
- Natural centering provides visual balance

**Vertical Stacking**:
- **Revenue Group**: Revenue (bottom) + RevenuePL (top)
- **Expenses Group**: Expenses (bottom) + ExpensesPL (top)  
- **Anchor System**: Bottom objects fixed at Y=0.0, top objects stack above

**Visual Layout**:
```
Revenue Group (Left)     Expenses Group (Right)
┌─────────────────┐     ┌─────────────────┐
│   RevenuePL     │     │   ExpensesPL    │  (Top 20%)
│   (Gold/Loss)   │     │   (Black/Profit)│
├─────────────────┤     ├─────────────────┤
│                 │     │                 │
│    Revenue      │     │    Expenses     │  (Bottom 80%)
│   (Green)       │     │   (Deep Red)    │
└─────────────────┘     └─────────────────┘
```

## Integration with Canvas3DBabylon

### Template Loading
```typescript
// Financials template activation
useEnvisionerType.getState().switchToFinancials();

// Template integration with main canvas
if (currentTemplate === 'Financials') {
  await loadFinancialsModel();
  setupFinancialsSystem();
}
```

### Height Manager Integration
```typescript
// Initialize height management system
const heightManager = new FinancialsHeightManager(scene);
const dataAdapter = new FinancialsDataAdapter(heightManager);

// Register meshes after GLB loading
heightManager.registerFinancialMeshes(result.meshes);

// Connect to data updates
await dataAdapter.updateFromBusinessData(businessData);
```

### Real-Time Data Binding
```typescript
// Example integration with business metrics
const businessData: FinancialBusinessData = {
  totalRevenue: revenueSliderValue,
  totalExpenses: expensesSliderValue,
  netProfit: Math.max(0, revenueSliderValue - expensesSliderValue),
  netLoss: Math.max(0, expensesSliderValue - revenueSliderValue)
};

await dataAdapter.updateFromBusinessData(businessData, true);
```

## Animation System Details

### Height Animation Pipeline
```typescript
1. Data Input → FinancialBusinessData
2. Transform → FinancialData (via DataAdapter)
3. Calculate → ProportionalHeights (via HeightManager)
4. Animate → Individual Objects (staggered sequence)
```

### Animation Sequence
```typescript
Phase 1 (500ms): Bottom-anchored objects
├── Revenue: Scale to target height
└── Expenses: Scale to target height

Phase 2 (500ms): Top-anchored objects  
├── RevenuePL: Scale and reposition
└── ExpensesPL: Scale and reposition
```

### Anchor Point Management
**Bottom-Anchored Objects** (Revenue, Expenses):
- Fixed bottom surface at original Y position
- Height scaling grows upward
- Position calculation: `Y = originalY`

**Top-Anchored Objects** (RevenuePL, ExpensesPL):
- Positioned on top of base objects
- Height changes adjust position to maintain top alignment
- Position calculation: `Y = originalY + baseObjectHeight`

## Performance Considerations

### Optimization Strategies
1. **Staggered Animation**: Prevents simultaneous mesh manipulation
2. **Material Caching**: Single material creation with color updates
3. **Mesh Registration**: One-time setup for all financial objects
4. **Selective Updates**: Only animate objects with height changes

### Memory Management
- Automatic cleanup of animation timelines
- Mesh disposal on template switch
- Material reference management
- Animation frame optimization

## Debugging & Monitoring

### Built-in Debug Features
```typescript
// Height state inspection
const heights = heightManager.getCurrentHeights();

// System state monitoring  
const state = financialDemo.getCurrentState();

// Animation status tracking
console.log('Animation completed for:', objectName);
```

### Debug Logging Categories
- `financials`: Core system operations
- `model`: GLB loading and positioning
- `animation`: Height animation progress
- `data`: Business data transformation

### Performance Metrics
- Animation duration tracking
- Height calculation timing
- Mesh registration efficiency
- Real-time update frequency

## Future Enhancements

### Planned Features
1. **Data Source Integration**: Excel, PowerBI, live APIs
2. **Advanced Animation**: Pulse effects, color transitions
3. **Interactive Controls**: Slider-based real-time manipulation
4. **Export Capabilities**: Screenshot, video recording
5. **Multi-Period Analysis**: Timeline-based financial progression

### Extensibility Points
- **Custom Data Adapters**: Support for different business data formats
- **Animation Presets**: Configurable animation styles and timing
- **Color Themes**: Dynamic color scheme switching
- **Layout Options**: Alternative object arrangements and layouts

## Technical Specifications

### Dependencies
- **Babylon.js**: 3D rendering engine
- **TypeScript**: Type safety and interfaces
- **Animation System**: CubicEase easing functions
- **Scene Management**: Unified BMC architecture

### File Size Impact
- **GLB Model**: ~1.2MB (optimized Blender export)
- **Code Footprint**: ~1,500 lines across 4 core files
- **Texture Assets**: Label textures for visual identification
- **Performance**: 60fps animation with smooth transitions

### Browser Compatibility
- **WebGL 2.0**: Preferred for advanced features
- **WebGL 1.0**: Fallback support
- **Mobile**: Optimized touch interactions
- **Desktop**: Full feature support with keyboard controls

---

**Last Updated**: January 2025  
**Version**: 3.0 (Finalized positioning and stacking system)
**Status**: Production Ready
