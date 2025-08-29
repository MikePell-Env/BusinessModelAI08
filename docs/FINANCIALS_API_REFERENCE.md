
# Financials API Reference

## Overview
Complete API reference for the Financials visualization system, including interfaces, methods, and usage examples.

## Interfaces

### FinancialBusinessData
Business-level financial data input interface.

```typescript
interface FinancialBusinessData {
  totalRevenue: number;      // Total revenue amount
  totalExpenses: number;     // Total expenses amount  
  netProfit: number;         // Net profit (positive)
  netLoss: number;           // Net loss (positive)
  quarters?: QuarterlyData[]; // Optional quarterly breakdown
}
```

### FinancialData
Visualization-ready financial data interface.

```typescript
interface FinancialData {
  revenue: number;   // Controls Revenue group height
  expenses: number;  // Controls Expenses group height
  profit: number;    // Controls ExpensesPL height
  loss: number;      // Controls RevenuePL height
}
```

### QuarterlyData
Quarterly financial breakdown interface.

```typescript
interface QuarterlyData {
  quarter: string;   // Quarter identifier (e.g., "Q1 2024")
  revenue: number;   // Quarter revenue
  expenses: number;  // Quarter expenses
  profit: number;    // Quarter profit
  loss: number;      // Quarter loss
}
```

### GroupHeights
Internal height calculation interface.

```typescript
interface GroupHeights {
  revenueTotal: number;   // Total height for Revenue group
  expensesTotal: number;  // Total height for Expenses group
  maxHeight: number;      // Maximum height for scaling reference
}
```

## FinancialsHeightManager

### Constructor
```typescript
constructor(scene: Scene)
```
Creates a new FinancialsHeightManager instance.

**Parameters:**
- `scene`: Babylon.js Scene instance

### Methods

#### registerFinancialMeshes()
```typescript
public registerFinancialMeshes(meshes: AbstractMesh[]): void
```
Registers financial meshes for height manipulation.

**Parameters:**
- `meshes`: Array of Babylon.js AbstractMesh objects

**Usage:**
```typescript
heightManager.registerFinancialMeshes(result.meshes);
```

#### updateHeightsFromData()
```typescript
public async updateHeightsFromData(
  data: FinancialData,
  duration: number = 1000
): Promise<void>
```
Updates object heights with smooth animations.

**Parameters:**
- `data`: FinancialData object with visualization values
- `duration`: Animation duration in milliseconds (default: 1000)

**Returns:** Promise that resolves when animation completes

**Usage:**
```typescript
await heightManager.updateHeightsFromData({
  revenue: 150,
  expenses: 120,
  profit: 30,
  loss: 0
}, 800);
```

#### setImmediateHeights()
```typescript
public setImmediateHeights(data: FinancialData): void
```
Sets heights immediately without animation.

**Parameters:**
- `data`: FinancialData object with visualization values

**Usage:**
```typescript
heightManager.setImmediateHeights({
  revenue: 100,
  expenses: 80,
  profit: 20,
  loss: 0
});
```

#### getCurrentHeights()
```typescript
public getCurrentHeights(): Record<string, number>
```
Returns current height values for all financial objects.

**Returns:** Object mapping object names to current heights

**Usage:**
```typescript
const heights = heightManager.getCurrentHeights();
console.log('Revenue height:', heights.Revenue);
```

#### resetToBaseHeight()
```typescript
public resetToBaseHeight(): void
```
Resets all objects to base height (1.0).

**Usage:**
```typescript
heightManager.resetToBaseHeight();
```

## FinancialsDataAdapter

### Constructor
```typescript
constructor(heightManager: FinancialsHeightManager)
```
Creates a new FinancialsDataAdapter instance.

**Parameters:**
- `heightManager`: FinancialsHeightManager instance

### Methods

#### startRealTimeUpdates()
```typescript
public startRealTimeUpdates(dataSource: () => FinancialBusinessData): void
```
Starts real-time data updates using a data source function.

**Parameters:**
- `dataSource`: Function that returns FinancialBusinessData

**Usage:**
```typescript
const dataSource = () => ({
  totalRevenue: getCurrentRevenue(),
  totalExpenses: getCurrentExpenses(),
  netProfit: Math.max(0, getCurrentRevenue() - getCurrentExpenses()),
  netLoss: Math.max(0, getCurrentExpenses() - getCurrentRevenue())
});

dataAdapter.startRealTimeUpdates(dataSource);
```

#### stopRealTimeUpdates()
```typescript
public stopRealTimeUpdates(): void
```
Stops real-time data updates.

**Usage:**
```typescript
dataAdapter.stopRealTimeUpdates();
```

#### updateFromBusinessData()
```typescript
public async updateFromBusinessData(
  businessData: FinancialBusinessData,
  animated: boolean = true
): Promise<void>
```
Manual data update from business data.

**Parameters:**
- `businessData`: FinancialBusinessData object
- `animated`: Whether to animate the changes (default: true)

**Returns:** Promise that resolves when update completes

**Usage:**
```typescript
const businessData = {
  totalRevenue: 200,
  totalExpenses: 150,
  netProfit: 50,
  netLoss: 0
};

await dataAdapter.updateFromBusinessData(businessData, true);
```

#### startSimulation()
```typescript
public startSimulation(): void
```
Starts dynamic financial data simulation for testing.

**Usage:**
```typescript
dataAdapter.startSimulation();
```

#### isInRealTimeMode()
```typescript
public isInRealTimeMode(): boolean
```
Returns whether real-time mode is currently active.

**Returns:** Boolean indicating real-time status

**Usage:**
```typescript
if (dataAdapter.isInRealTimeMode()) {
  console.log('Real-time updates active');
}
```

## FinancialsDemo

### Constructor
```typescript
constructor(
  heightManager: FinancialsHeightManager, 
  dataAdapter: FinancialsDataAdapter
)
```
Creates a new FinancialsDemo instance.

**Parameters:**
- `heightManager`: FinancialsHeightManager instance
- `dataAdapter`: FinancialsDataAdapter instance

### Methods

#### runFullDemonstration()
```typescript
public async runFullDemonstration(): Promise<void>
```
Runs complete demo sequence with all scenarios.

**Returns:** Promise that resolves when demo completes

**Usage:**
```typescript
const demo = new FinancialsDemo(heightManager, dataAdapter);
await demo.runFullDemonstration();
```

#### runScenario()
```typescript
public async runScenario(scenarioIndex: number): Promise<void>
```
Runs specific demo scenario by index.

**Parameters:**
- `scenarioIndex`: Index of scenario to run (0-3)

**Usage:**
```typescript
await demo.runScenario(2); // Run loss scenario
```

#### getCurrentState()
```typescript
public getCurrentState(): Record<string, any>
```
Returns current demo state for debugging.

**Returns:** Object with heights, real-time status, and scenario count

**Usage:**
```typescript
const state = demo.getCurrentState();
console.log('Demo state:', state);
```

## BMCModelLoader Integration

### loadFinancialsModel()
```typescript
public async loadFinancialsModel(): Promise<LoadedModel>
```
Loads the Financials GLB model with proper positioning and scaling.

**Returns:** Promise resolving to LoadedModel object

**Usage:**
```typescript
const modelLoader = new BMCModelLoader(scene);
const financialsModel = await modelLoader.loadFinancialsModel();
```

## Error Handling

### Common Error Scenarios

#### Mesh Not Found
```typescript
// Error when mesh is not registered
debugLog.warn('financials', `Mesh ${objectName} not found for animation`);
```

#### WebGL Context Loss
```typescript
// Automatic recovery from context loss
canvasElement.addEventListener('webglcontextlost', (e) => {
  console.warn('WebGL context lost, reinitializing...');
});
```

#### Animation Conflicts
```typescript
// Prevention of overlapping animations
if (mesh.animations.length > 0) {
  scene.stopAnimation(mesh);
}
```

## Usage Examples

### Basic Setup
```typescript
// Initialize the system
const scene = new Scene(engine);
const heightManager = new FinancialsHeightManager(scene);
const dataAdapter = new FinancialsDataAdapter(heightManager);

// Load and register model
const modelLoader = new BMCModelLoader(scene);
const financialsModel = await modelLoader.loadFinancialsModel();
heightManager.registerFinancialMeshes(financialsModel.meshes);

// Update with data
const businessData = {
  totalRevenue: 100,
  totalExpenses: 80,
  netProfit: 20,
  netLoss: 0
};

await dataAdapter.updateFromBusinessData(businessData);
```

### Real-Time Integration
```typescript
// Connect to live data source
const dataSource = () => ({
  totalRevenue: getRealtimeRevenue(),
  totalExpenses: getRealtimeExpenses(),
  netProfit: Math.max(0, getRealtimeRevenue() - getRealtimeExpenses()),
  netLoss: Math.max(0, getRealtimeExpenses() - getRealtimeRevenue())
});

// Start real-time updates
dataAdapter.startRealTimeUpdates(dataSource);

// Stop when component unmounts
useEffect(() => {
  return () => {
    dataAdapter.stopRealTimeUpdates();
  };
}, []);
```

### Demo Integration
```typescript
// Run demo scenarios
const demo = new FinancialsDemo(heightManager, dataAdapter);

// Run specific scenario
await demo.runScenario(1); // Growth scenario

// Run full demonstration
await demo.runFullDemonstration();

// Check current state
const state = demo.getCurrentState();
console.log('Current heights:', state.heights);
```

## Constants

### Object Names
```typescript
const FINANCIAL_OBJECTS = {
  REVENUE: 'Revenue',
  REVENUE_PL: 'RevenuePL', 
  EXPENSES: 'Expenses',
  EXPENSES_PL: 'ExpensesPL'
} as const;
```

### Anchor Types
```typescript
const ANCHOR_TYPES = {
  TOP: 'top',
  BOTTOM: 'bottom'
} as const;
```

### Default Values
```typescript
const DEFAULTS = {
  BASE_HEIGHT: 1.0,
  MAX_VISUALIZATION_HEIGHT: 5.0,
  ANIMATION_DURATION: 1000,
  UPDATE_INTERVAL: 2000,
  GROUP_HEIGHT: 2.0
} as const;
```

---

**Last Updated**: January 2025  
**Version**: 3.0  
**Status**: Production Ready
