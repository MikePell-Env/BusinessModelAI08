
import { checkpointSystem } from './CheckpointSystem';
import { cleanBMCSystem } from '../cleanBMCSystem';

// Global debug interface
class GlobalDebugInterface {
  constructor() {
    console.log("🔧 Global Debug Interface initialized");
    console.log("Available commands:");
    console.log("  debug.checkpoints() - Show checkpoint summary");
    console.log("  debug.errors() - Show error checkpoints");
    console.log("  debug.export() - Export all checkpoints");
    console.log("  debug.clear() - Clear all checkpoints");
    console.log("  debug.bmcState() - Show current BMC state");
    console.log("  debug.bmcItems() - Show all BMC items");
  }

  checkpoints(): void {
    cleanBMCSystem.showCheckpoints();
  }

  errors(): void {
    cleanBMCSystem.showErrors();
  }

  export(): string {
    const data = checkpointSystem.exportCheckpoints();
    console.log("📤 Checkpoints exported:", data);
    return data;
  }

  clear(): void {
    checkpointSystem.clear();
  }

  bmcState(): void {
    console.log("🎯 Current BMC State:");
    console.log("  Selected object:", cleanBMCSystem.getSelectedObject());
    console.log("  Is top view:", cleanBMCSystem.getIsTopView());
    console.log("  Total items:", cleanBMCSystem.getAllItems().size);
  }

  bmcItems(): void {
    console.log("📦 BMC Items:");
    cleanBMCSystem.getAllItems().forEach((item, name) => {
      console.log(`  ${name}:`, {
        visible: item.mesh.isVisible,
        enabled: item.mesh.isEnabled(),
        alpha: item.material?.alpha || 'N/A',
        height: item.mesh.scaling.y
      });
    });
  }

  recent(count: number = 10): void {
    const checkpoints = checkpointSystem.getRecentCheckpoints(count);
    console.log(`📋 Last ${count} checkpoints:`);
    checkpoints.forEach(cp => {
      const time = new Date(cp.timestamp).toLocaleTimeString();
      console.log(`  ${time} - ${cp.location} - ${cp.action}`);
      if (cp.error) {
        console.log(`    ❌ ERROR: ${cp.error.message}`);
      }
    });
  }

  watch(): void {
    console.log("👁️ Starting checkpoint watcher (will log new checkpoints)");
    const lastCount = checkpointSystem.getCheckpoints().length;
    
    setInterval(() => {
      const current = checkpointSystem.getCheckpoints();
      if (current.length > lastCount) {
        const newCheckpoints = current.slice(lastCount);
        newCheckpoints.forEach(cp => {
          const time = new Date(cp.timestamp).toLocaleTimeString();
          console.log(`🔍 NEW: ${time} - ${cp.location} - ${cp.action}`);
          if (cp.error) {
            console.log(`    ❌ ERROR: ${cp.error.message}`);
          }
        });
      }
    }, 1000);
  }
}

// Create global instance
const debug = new GlobalDebugInterface();

// Make it available globally
(window as any).debug = debug;

export { debug };
