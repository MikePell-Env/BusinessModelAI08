
/**
 * Financials Data Adapter
 * Connects business data to 3D visualization height updates
 */

export interface FinancialBusinessData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netLoss: number;
  quarters?: QuarterlyData[];
}

export interface QuarterlyData {
  quarter: string;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export class FinancialsDataAdapter {
  private heightManager: FinancialsHeightManager;
  private updateInterval: number = 2000; // 2 seconds
  private isRealTimeMode: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(heightManager: FinancialsHeightManager) {
    this.heightManager = heightManager;
  }

  /**
   * Start real-time data updates
   */
  public startRealTimeUpdates(dataSource: () => FinancialBusinessData): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.isRealTimeMode = true;
    this.intervalId = setInterval(async () => {
      const businessData = dataSource();
      const financialData = this.transformBusinessData(businessData);
      
      await this.heightManager.updateHeightsFromData(financialData, 800);
    }, this.updateInterval);

    console.log('🔄 Started real-time financial data updates');
  }

  /**
   * Stop real-time updates
   */
  public stopRealTimeUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRealTimeMode = false;
    console.log('⏹️ Stopped real-time financial data updates');
  }

  /**
   * Manual data update
   */
  public async updateFromBusinessData(
    businessData: FinancialBusinessData,
    animated: boolean = true
  ): Promise<void> {
    const financialData = this.transformBusinessData(businessData);
    
    if (animated) {
      await this.heightManager.updateHeightsFromData(financialData);
    } else {
      this.heightManager.setImmediateHeights(financialData);
    }
  }

  /**
   * Transform business data into visualization format
   */
  private transformBusinessData(data: FinancialBusinessData): FinancialData {
    return {
      revenue: Math.max(0.1, data.totalRevenue),
      expenses: Math.max(0.1, data.totalExpenses),
      profit: Math.max(0, data.netProfit),
      loss: Math.max(0, data.netLoss)
    };
  }

  /**
   * Simulate dynamic financial data (for testing)
   */
  public startSimulation(): void {
    let cycle = 0;
    const simulationData = (): FinancialBusinessData => {
      cycle += 0.1;
      return {
        totalRevenue: 100 + Math.sin(cycle) * 50,
        totalExpenses: 80 + Math.cos(cycle * 0.8) * 30,
        netProfit: Math.max(0, 20 + Math.sin(cycle * 0.5) * 25),
        netLoss: Math.max(0, -20 - Math.sin(cycle * 0.5) * 25)
      };
    };

    this.startRealTimeUpdates(simulationData);
    console.log('🎮 Started financial data simulation');
  }

  public isInRealTimeMode(): boolean {
    return this.isRealTimeMode;
  }
}
