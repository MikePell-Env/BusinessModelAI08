
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
    console.log(`📊 Income Statement data loaded: ${incomeStatement.years.length} years`);
    console.log(`📊 DEBUG: currentYearIndex = ${incomeStatement.currentYearIndex}`);
    console.log(`📊 DEBUG: Available years:`, incomeStatement.years.map(y => `${y.year}: $${y.revenue}M revenue`));
    
    // Set visualization to current year data
    if (incomeStatement.years.length > 0) {
      // Ensure we're using the correct index for 2026
      let selectedIndex = incomeStatement.currentYearIndex;
      if (selectedIndex < 0 || selectedIndex >= incomeStatement.years.length) {
        console.log(`📊 WARNING: Invalid currentYearIndex ${selectedIndex}, searching for 2026...`);
        selectedIndex = incomeStatement.years.findIndex(y => y.year === 2026);
        if (selectedIndex === -1) {
          console.log(`📊 WARNING: 2026 not found, using index 0`);
          selectedIndex = 0;
        }
      }
      
      const currentYear = incomeStatement.years[selectedIndex];
      console.log(`📊 DEBUG: Selected year ${currentYear.year} with revenue $${currentYear.revenue}M, expenses $${currentYear.expenses}M`);
      
      // Verify we're getting 2026 data (should be Revenue=10, Expenses=8)
      if (currentYear.year !== 2026) {
        console.log(`🚨 ERROR: Expected 2026 but got year ${currentYear.year}!`);
      }
      if (currentYear.revenue === 26) {
        console.log(`🚨 ERROR: Getting 2027 data ($26M revenue) instead of 2026 data ($10M revenue)!`);
      }
      
      const businessData: FinancialBusinessData = {
        totalRevenue: currentYear.revenue,
        totalExpenses: currentYear.expenses,
        netProfit: currentYear.profit,
        netLoss: currentYear.loss,
        incomeStatement: incomeStatement
      };
      
      console.log(`📊 DEBUG: Calling updateFromBusinessData with totalRevenue=${businessData.totalRevenue}, totalExpenses=${businessData.totalExpenses}`);
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
