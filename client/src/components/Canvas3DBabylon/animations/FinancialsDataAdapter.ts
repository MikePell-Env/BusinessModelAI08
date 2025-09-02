
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
    console.log(`🚨 LOAD POWERPOINT DATA: ${incomeStatement.years.length} years available`);
    console.log(`🚨 LOAD POWERPOINT DATA: currentYearIndex = ${incomeStatement.currentYearIndex}`);
    console.log(`🚨 LOAD POWERPOINT DATA: All years:`, incomeStatement.years.map(y => `${y.year}: Rev=$${y.revenue}M, Exp=$${y.expenses}M`));
    
    // CRITICAL: Verify which year is being selected
    if (incomeStatement.years.length > 0) {
      const selectedIndex = incomeStatement.currentYearIndex;
      const currentYear = incomeStatement.years[selectedIndex];
      
      console.log(`🚨 SELECTED YEAR FOR RENDER: ${currentYear.year} at index ${selectedIndex}`);
      console.log(`🚨 SELECTED YEAR VALUES: Revenue=$${currentYear.revenue}M, Expenses=$${currentYear.expenses}M, Profit=$${currentYear.profit}M, Loss=$${currentYear.loss}M`);
      
      // VALIDATION: Check if this matches expected 2026 values
      if (currentYear.year === 2026 && currentYear.revenue === 10) {
        console.log(`✅ CORRECT YEAR: Using 2026 with $10M revenue as expected`);
      } else if (currentYear.year === 2027 && currentYear.revenue > 20) {
        console.log(`❌ WRONG YEAR: Using 2027 Future year ($${currentYear.revenue}M) instead of 2026 Current ($10M)!`);
        console.log(`❌ FIX NEEDED: currentYearIndex should be 1 (2026) not ${selectedIndex} (${currentYear.year})`);
      } else {
        console.log(`⚠️ UNEXPECTED YEAR: Year ${currentYear.year} with $${currentYear.revenue}M revenue`);
      }
      
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
    console.log(`🚨 TRANSFORM INPUT: Raw data.totalRevenue=${data.totalRevenue} (if 26.6, this is 2027 Future year!)`);
    console.log(`🚨 TRANSFORM INPUT: Raw data.totalExpenses=${data.totalExpenses}`);
    console.log(`🚨 TRANSFORM INPUT: Raw data.netProfit=${data.netProfit}`);
    console.log(`🚨 TRANSFORM INPUT: Raw data.netLoss=${data.netLoss}`);
    
    const cappedRevenue = Math.max(0.5, Math.min(data.totalRevenue, 1000));
    const cappedExpenses = Math.max(0.5, Math.min(data.totalExpenses, 1000));
    
    console.log(`🚨 TRANSFORM OUTPUT: Capped revenue=${cappedRevenue} → Height=${cappedRevenue/500.0} units`);
    console.log(`🚨 TRANSFORM OUTPUT: Capped expenses=${cappedExpenses} → Height=${cappedExpenses/500.0} units`);
    
    // HEIGHT VERIFICATION: If revenue shows 2.0+ units but should be $10M, this proves wrong year
    if (cappedRevenue >= 1000 && data.totalRevenue > 15) {
      console.log(`❌ WRONG YEAR DETECTED: Revenue ${data.totalRevenue} suggests 2027 Future year instead of 2026 Current!`);
    }
    
    return {
      revenue: cappedRevenue, // Cap at 1000 ($10M max height)
      expenses: cappedExpenses, // Cap at 1000 ($10M max height)
      profit: 0, // Calculated in FinancialsHeightManager from revenue - expenses
      loss: 0   // Calculated in FinancialsHeightManager from revenue - expenses
    };
  }

}
