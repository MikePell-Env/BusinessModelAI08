
# Financials Integration Guide

## Overview
This guide provides step-by-step instructions for integrating the Financials visualization system into new or existing applications, including setup, configuration, and customization options.

## Quick Start

### 1. Basic Integration
```typescript
import { FinancialsHeightManager } from './animations/FinancialsHeightManager';
import { FinancialsDataAdapter } from './animations/FinancialsDataAdapter';
import { FinancialsTemplate } from '../lib/templates/FinancialsTemplate';

// Initialize in your 3D scene component
const setupFinancialsSystem = async (scene: Scene) => {
  // 1. Create managers
  const heightManager = new FinancialsHeightManager(scene);
  const dataAdapter = new FinancialsDataAdapter(heightManager);
  
  // 2. Load GLB model
  const modelLoader = new BMCModelLoader(scene);
  const financialsModel = await modelLoader.loadFinancialsModel();
  
  // 3. Register meshes
  heightManager.registerFinancialMeshes(financialsModel.meshes);
  
  // 4. Set initial data
  const initialData = {
    totalRevenue: 100,
    totalExpenses: 80,
    netProfit: 20,
    netLoss: 0
  };
  
  await dataAdapter.updateFromBusinessData(initialData);
  
  return { heightManager, dataAdapter };
};
```

### 2. Template Activation
```typescript
// Switch to Financials template
import { useEnvisionerType } from '../lib/stores/useEnvisionerType';

// In your component
const activateFinancials = () => {
  useEnvisionerType.getState().switchToFinancials();
  // Template will automatically load Financials configuration
};
```

## Advanced Integration

### Custom Data Sources

#### Excel/Spreadsheet Integration
```typescript
// Connect to Excel data via Microsoft Graph API
const connectToExcel = async () => {
  const excelData = await fetch('/api/excel/financial-data').then(r => r.json());
  
  const businessData = {
    totalRevenue: excelData.revenue,
    totalExpenses: excelData.expenses,
    netProfit: Math.max(0, excelData.revenue - excelData.expenses),
    netLoss: Math.max(0, excelData.expenses - excelData.revenue)
  };
  
  await dataAdapter.updateFromBusinessData(businessData);
};
```

#### Real-Time API Integration
```typescript
// Connect to live business metrics API
const connectToAPI = () => {
  const dataSource = async () => {
    const response = await fetch('/api/live-metrics');
    const metrics = await response.json();
    
    return {
      totalRevenue: metrics.current_revenue,
      totalExpenses: metrics.current_expenses,
      netProfit: metrics.profit,
      netLoss: metrics.loss
    };
  };
  
  dataAdapter.startRealTimeUpdates(dataSource);
};
```

### UI Controls Integration

#### Slider Controls
```typescript
import { useState, useEffect } from 'react';

const FinancialsControlPanel = ({ dataAdapter }) => {
  const [revenue, setRevenue] = useState(100);
  const [expenses, setExpenses] = useState(80);
  
  useEffect(() => {
    // Automatic profit/loss calculation ensures balanced visualization
    const profit = revenue - expenses;
    const loss = expenses - revenue;
    
    const businessData = {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: Math.max(0, profit),   // Profit only if positive
      netLoss: Math.max(0, loss)        // Loss only if positive
    };
    
    // The system automatically balances the visualization:
    // - If profit > 0: Revenue=100%, Expenses=(expenses/revenue)%, Profit fills remaining
    // - If loss > 0: Expenses=100%, Revenue=(revenue/expenses)%, Loss fills remaining
    dataAdapter.updateFromBusinessData(businessData, true);
  }, [revenue, expenses]);
  
  return (
    <div className="controls-panel">
      <div>
        <label>Revenue: {revenue}</label>
        <input 
          type="range" 
          min="0" 
          max="500" 
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Expenses: {expenses}</label>
        <input 
          type="range" 
          min="0" 
          max="500" 
          value={expenses}
          onChange={(e) => setExpenses(Number(e.target.value))}
        />
      </div>
    </div>
  );
};
```

#### Button Controls
```typescript
const FinancialsButtons = ({ demo, dataAdapter }) => {
  return (
    <div className="button-controls">
      <button onClick={() => demo.runScenario(0)}>
        Baseline Scenario
      </button>
      <button onClick={() => demo.runScenario(1)}>
        Growth Scenario
      </button>
      <button onClick={() => demo.runScenario(2)}>
        Loss Scenario
      </button>
      <button onClick={() => demo.startSimulation()}>
        Start Simulation
      </button>
      <button onClick={() => dataAdapter.stopRealTimeUpdates()}>
        Stop Real-Time
      </button>
    </div>
  );
};
```

## Customization Options

### Custom Color Schemes
```typescript
// Modify FinancialsTemplate.ts for custom colors
export const CustomFinancialsTemplate: EnvisionerTemplate = createEnvisionerTemplate(
  'CustomFinancials',
  [
    { color: new Color3(0.2, 0.6, 0.3), name: "Revenue", displayName: "Revenue" },     // Custom green
    { color: new Color3(0.8, 0.6, 0.2), name: "RevenuePL", displayName: "Loss" },     // Custom gold  
    { color: new Color3(0.6, 0.2, 0.2), name: "Expenses", displayName: "Expenses" },  // Custom red
    { color: new Color3(0.2, 0.2, 0.2), name: "ExpensesPL", displayName: "Profit" },  // Custom black
  ]
);
```

### Custom Animation Timing
```typescript
// Override default animation settings
const customHeightManager = new FinancialsHeightManager(scene);

// Custom animation duration
await customHeightManager.updateHeightsFromData(data, 2000); // 2 second animation

// Custom real-time update interval
class CustomFinancialsDataAdapter extends FinancialsDataAdapter {
  constructor(heightManager: FinancialsHeightManager) {
    super(heightManager);
    this.updateInterval = 5000; // 5 second updates
  }
}
```

### Custom Object Positioning
```typescript
// Modify BMCModelLoader.ts positioning logic
const customPositioning = {
  // Custom X positioning (horizontal spacing)
  revenueGroupX: -2.0,  // Move revenue group left
  expensesGroupX: 2.0,  // Move expenses group right
  
  // Custom Y positioning (height offset)
  baseY: 0.2,          // Raise all objects
  
  // Custom scaling
  widthScale: 0.5,     // 50% width reduction
  heightScale: 1.2     // 20% height increase
};
```

## Error Handling

### Graceful Degradation
```typescript
const safeFinancialsUpdate = async (businessData) => {
  try {
    await dataAdapter.updateFromBusinessData(businessData);
  } catch (error) {
    console.error('Financials update failed:', error);
    
    // Fallback to immediate update
    try {
      const financialData = dataAdapter.transformBusinessData(businessData);
      heightManager.setImmediateHeights(financialData);
    } catch (fallbackError) {
      console.error('Fallback update failed:', fallbackError);
      // Reset to base state
      heightManager.resetToBaseHeight();
    }
  }
};
```

### Network Error Handling
```typescript
const robustDataSource = async () => {
  try {
    const response = await fetch('/api/financial-data', {
      timeout: 5000,
      retry: 3
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn('API unavailable, using cached data:', error);
    return getCachedFinancialData();
  }
};
```

## Performance Optimization

### Throttled Updates
```typescript
import { throttle } from 'lodash';

// Throttle rapid updates
const throttledUpdate = throttle(async (businessData) => {
  await dataAdapter.updateFromBusinessData(businessData);
}, 500); // Max 2 updates per second
```

### Memory Management
```typescript
// Cleanup on component unmount
useEffect(() => {
  return () => {
    // Stop real-time updates
    dataAdapter.stopRealTimeUpdates();
    
    // Clear animation timelines
    scene.stopAllAnimations();
    
    // Dispose materials if needed
    financialsModel.meshes.forEach(mesh => {
      mesh.material?.dispose();
    });
  };
}, []);
```

### Conditional Loading
```typescript
// Load Financials only when needed
const loadFinancialsOnDemand = async () => {
  if (currentTemplate !== 'Financials') {
    return null;
  }
  
  // Lazy load components
  const { FinancialsHeightManager } = await import('./animations/FinancialsHeightManager');
  const { FinancialsDataAdapter } = await import('./animations/FinancialsDataAdapter');
  
  return setupFinancialsSystem(scene);
};
```

## Testing Integration

### Unit Testing
```typescript
// Test data transformation
describe('FinancialsDataAdapter', () => {
  it('should transform business data correctly', () => {
    const adapter = new FinancialsDataAdapter(mockHeightManager);
    
    const businessData = {
      totalRevenue: 150,
      totalExpenses: 100,
      netProfit: 50,
      netLoss: 0
    };
    
    const result = adapter.transformBusinessData(businessData);
    
    expect(result.revenue).toBe(150);
    expect(result.expenses).toBe(100);
    expect(result.profit).toBe(50);
    expect(result.loss).toBe(0);
  });
});
```

### Integration Testing
```typescript
// Test full system integration
describe('Financials System', () => {
  it('should update heights based on business data', async () => {
    const { heightManager, dataAdapter } = await setupFinancialsSystem(mockScene);
    
    const businessData = {
      totalRevenue: 200,
      totalExpenses: 150,
      netProfit: 50,
      netLoss: 0
    };
    
    await dataAdapter.updateFromBusinessData(businessData);
    
    const heights = heightManager.getCurrentHeights();
    expect(heights.Revenue).toBeGreaterThan(1);
    expect(heights.Expenses).toBeGreaterThan(1);
  });
});
```

## Deployment Considerations

### Bundle Size Optimization
```typescript
// Code splitting for Financials
const FinancialsLazy = lazy(() => import('./components/FinancialsSystem'));

// Use with Suspense
<Suspense fallback={<div>Loading Financials...</div>}>
  <FinancialsLazy />
</Suspense>
```

### Environment Configuration
```typescript
// Environment-specific settings
const config = {
  development: {
    animationDuration: 500,    // Faster for development
    updateInterval: 1000,      // More frequent updates
    enableDebugLogs: true
  },
  production: {
    animationDuration: 1000,   // Standard timing
    updateInterval: 2000,      // Balanced updates
    enableDebugLogs: false
  }
};

const settings = config[process.env.NODE_ENV] || config.production;
```

## Migration Guide

### From Legacy System
```typescript
// Migrate from old financial visualization
const migrateLegacyData = (legacyData) => {
  return {
    totalRevenue: legacyData.revenue_total || 0,
    totalExpenses: legacyData.costs_total || 0,
    netProfit: legacyData.profit || 0,
    netLoss: legacyData.loss || 0
  };
};

// Update existing integration
const updateExistingIntegration = async () => {
  // 1. Replace old managers
  // const oldManager = useOldFinancials();
  const { heightManager, dataAdapter } = await setupFinancialsSystem(scene);
  
  // 2. Migrate data format
  const legacyData = getCurrentLegacyData();
  const businessData = migrateLegacyData(legacyData);
  
  // 3. Update with new system
  await dataAdapter.updateFromBusinessData(businessData);
};
```

## Troubleshooting

### Common Issues

#### Objects Not Animating
```typescript
// Check mesh registration
const heights = heightManager.getCurrentHeights();
console.log('Registered objects:', Object.keys(heights));

// Verify mesh names match expected values
const expectedNames = ['Revenue', 'RevenuePL', 'Expenses', 'ExpensesPL'];
expectedNames.forEach(name => {
  if (!heights[name]) {
    console.error(`Missing object: ${name}`);
  }
});
```

#### Performance Issues
```typescript
// Monitor animation performance
const startTime = performance.now();
await dataAdapter.updateFromBusinessData(businessData);
const duration = performance.now() - startTime;
console.log(`Update took ${duration}ms`);

// Optimize for slow devices
if (duration > 100) {
  // Use immediate updates instead of animations
  dataAdapter.updateFromBusinessData(businessData, false);
}
```

#### Memory Leaks
```typescript
// Check for proper cleanup
const checkMemoryUsage = () => {
  const used = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(used.rss / 1024 / 1024) + ' MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
  });
};

// Monitor over time
setInterval(checkMemoryUsage, 10000);
```

---

**Last Updated**: January 2025  
**Version**: 3.0  
**Status**: Production Ready
