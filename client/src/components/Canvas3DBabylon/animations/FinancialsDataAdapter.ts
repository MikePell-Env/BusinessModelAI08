
/**
 * Financials Data Adapter
 * Connects business data to 3D visualization height updates
 */

import { FinancialsHeightManager, FinancialData } from './FinancialsHeightManager';

export interface FinancialBusinessData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netLoss: number;
  quarters?: QuarterlyData[];
  incomeStatement?: IncomeStatementData;
}

export interface QuarterlyData {
  quarter: string;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export interface IncomeStatementData {
  years: YearlyFinancialData[];
  currentYearIndex: number;
}

export interface YearlyFinancialData {
  year: number;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export class FinancialsDataAdapter {
  private heightManager: FinancialsHeightManager;
  private incomeStatementData: IncomeStatementData | null = null;

  constructor(heightManager: FinancialsHeightManager) {
    this.heightManager = heightManager;
  }



  /**
   * Manual data update
   */
  public async updateFromBusinessData(
    businessData: FinancialBusinessData,
    animated: boolean = true
  ): Promise<void> {
    // Store Income Statement data if provided
    if (businessData.incomeStatement) {
      this.incomeStatementData = businessData.incomeStatement;
      console.log(`📊 Income Statement loaded: ${businessData.incomeStatement.years.length} years of data`);
    }

    const financialData = this.transformBusinessData(businessData);
    
    if (animated) {
      await this.heightManager.updateHeightsFromData(financialData);
    } else {
      this.heightManager.setImmediateHeights(financialData);
    }
  }

  /**
   * Load Income Statement data from PowerPoint parsing
   */
  public loadIncomeStatementData(incomeStatement: IncomeStatementData): void {
    this.incomeStatementData = incomeStatement;
    console.log(`📊 ADAPTER: Loading ${incomeStatement.years.length} years of financial data`);
    console.log(`📊 ADAPTER: Using currentYearIndex = ${incomeStatement.currentYearIndex}`);
    console.log(`📊 ADAPTER: Years:`, incomeStatement.years.map(y => `${y.year}: $${y.revenue}M revenue`));
    
    // REFACTORED: Trust the incoming currentYearIndex - no overrides
    // Server is authoritative for year selection
    if (incomeStatement.years.length > 0) {
      const selectedIndex = incomeStatement.currentYearIndex;
      const currentYear = incomeStatement.years[selectedIndex];
      
      console.log(`📊 ADAPTER: Displaying year ${currentYear.year} (index ${selectedIndex})`);
      console.log(`📊 ADAPTER: Revenue=${currentYear.revenue}, Expenses=${currentYear.expenses}`);
      
      const businessData: FinancialBusinessData = {
        totalRevenue: currentYear.revenue,
        totalExpenses: currentYear.expenses,
        netProfit: currentYear.profit,
        netLoss: currentYear.loss,
        incomeStatement: incomeStatement
      };
      
      this.updateFromBusinessData(businessData, false);
    }
  }

  /**
   * Switch to a specific year in the Income Statement
   */
  public async switchToYear(yearIndex: number, animated: boolean = true): Promise<void> {
    if (!this.incomeStatementData || yearIndex < 0 || yearIndex >= this.incomeStatementData.years.length) {
      console.warn(`Invalid year index: ${yearIndex}`);
      return;
    }

    this.incomeStatementData.currentYearIndex = yearIndex;
    const yearData = this.incomeStatementData.years[yearIndex];
    
    const businessData: FinancialBusinessData = {
      totalRevenue: yearData.revenue,
      totalExpenses: yearData.expenses,
      netProfit: yearData.profit,
      netLoss: yearData.loss,
      incomeStatement: this.incomeStatementData
    };

    console.log(`📊 Switching to year ${yearData.year}: Revenue $${yearData.revenue}M, Expenses $${yearData.expenses}M`);
    await this.updateFromBusinessData(businessData, animated);
  }

  /**
   * Get available years for time slider
   */
  public getAvailableYears(): number[] {
    if (!this.incomeStatementData) return [];
    return this.incomeStatementData.years.map(year => year.year);
  }

  /**
   * Get current year index
   */
  public getCurrentYearIndex(): number {
    return this.incomeStatementData?.currentYearIndex || 0;
  }

  /**
   * Check if Income Statement data is available
   */
  public hasIncomeStatementData(): boolean {
    return this.incomeStatementData !== null && this.incomeStatementData.years.length > 0;
  }

  /**
   * Transform business data into visualization format
   * BUSINESS LOGIC CENTRALIZED: Only pass revenue/expenses, let FinancialsHeightManager calculate profit/loss
   */
  private transformBusinessData(data: FinancialBusinessData): FinancialData {
    const cappedRevenue = Math.max(0.5, Math.min(data.totalRevenue, 1000));
    const cappedExpenses = Math.max(0.5, Math.min(data.totalExpenses, 1000));
    
    console.log(`📊 DEBUG transformBusinessData: Input revenue=${data.totalRevenue} → Capped=${cappedRevenue}`);
    console.log(`📊 DEBUG transformBusinessData: Input expenses=${data.totalExpenses} → Capped=${cappedExpenses}`);
    
    return {
      revenue: cappedRevenue, // Cap at 1000 ($10M max height)
      expenses: cappedExpenses, // Cap at 1000 ($10M max height)
      profit: 0, // Calculated in FinancialsHeightManager from revenue - expenses
      loss: 0   // Calculated in FinancialsHeightManager from revenue - expenses
    };
  }

}
