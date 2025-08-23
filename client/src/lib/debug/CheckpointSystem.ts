
export interface Checkpoint {
  id: string;
  timestamp: number;
  location: string;
  action: string;
  state: {
    selectedObject: string | null;
    hoveredObject: string | null;
    isTopView: boolean;
    itemCount: number;
    visibleItems: string[];
    enabledItems: string[];
  };
  error?: Error;
  additionalData?: any;
}

export class CheckpointSystem {
  private checkpoints: Checkpoint[] = [];
  private maxCheckpoints = 100;
  private enabled = true;

  constructor() {
    console.log("🎯 CheckpointSystem initialized");
  }

  createCheckpoint(location: string, action: string, state: any, additionalData?: any, error?: Error): void {
    if (!this.enabled) return;

    const checkpoint: Checkpoint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location,
      action,
      state: {
        selectedObject: state.selectedObject || null,
        hoveredObject: state.hoveredObject || null,
        isTopView: state.isTopView || false,
        itemCount: state.itemCount || 0,
        visibleItems: state.visibleItems || [],
        enabledItems: state.enabledItems || []
      },
      additionalData,
      error
    };

    this.checkpoints.push(checkpoint);

    // Keep only the most recent checkpoints
    if (this.checkpoints.length > this.maxCheckpoints) {
      this.checkpoints = this.checkpoints.slice(-this.maxCheckpoints);
    }

    // Log critical checkpoints
    if (error || action.includes('ERROR') || action.includes('CRASH')) {
      console.error(`🚨 CRITICAL CHECKPOINT: ${location} - ${action}`, checkpoint);
    } else {
      console.log(`📍 Checkpoint: ${location} - ${action}`);
    }
  }

  getCheckpoints(): Checkpoint[] {
    return [...this.checkpoints];
  }

  getRecentCheckpoints(count: number = 10): Checkpoint[] {
    return this.checkpoints.slice(-count);
  }

  getCheckpointsAfter(timestamp: number): Checkpoint[] {
    return this.checkpoints.filter(cp => cp.timestamp > timestamp);
  }

  getErrorCheckpoints(): Checkpoint[] {
    return this.checkpoints.filter(cp => cp.error);
  }

  exportCheckpoints(): string {
    return JSON.stringify(this.checkpoints, null, 2);
  }

  clear(): void {
    this.checkpoints = [];
    console.log("🧹 Checkpoints cleared");
  }

  enable(): void {
    this.enabled = true;
    console.log("✅ Checkpoint system enabled");
  }

  disable(): void {
    this.enabled = false;
    console.log("❌ Checkpoint system disabled");
  }

  showSummary(): void {
    console.log("📊 CHECKPOINT SUMMARY:");
    console.log(`  Total checkpoints: ${this.checkpoints.length}`);
    console.log(`  Error checkpoints: ${this.getErrorCheckpoints().length}`);
    
    const recent = this.getRecentCheckpoints(5);
    console.log(`  Last 5 checkpoints:`);
    recent.forEach(cp => {
      console.log(`    ${new Date(cp.timestamp).toISOString()} - ${cp.location} - ${cp.action}`);
    });
  }
}

// Global instance
export const checkpointSystem = new CheckpointSystem();
