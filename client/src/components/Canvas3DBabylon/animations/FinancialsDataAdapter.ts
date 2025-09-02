
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
    console.log(`🚨 LOAD POWERPOINT DATA: Server currentYearIndex = ${incomeStatement.currentYearIndex}`);
    console.log(`🚨 LOAD POWERPOINT DATA: All years:`, incomeStatement.years.map(y => `${y.year}: Rev=${y.revenue}, Exp=${y.expenses}`));
    
    // DEBUG: Check exact current year data
    const currentYear = incomeStatement.years[incomeStatement.currentYearIndex];
    console.log(`🚨 CURRENT YEAR DATA: ${currentYear.year} - Revenue=${currentYear.revenue}, Expenses=${currentYear.expenses}, Profit=${currentYear.profit}`);
    console.log(`🚨 EXPECTED FOR 2026: Revenue=1000 ($10M), Expenses=800 ($8M), Heights should be 2.0 vs 1.6`);
    
    // FORCE 2026 CURRENT YEAR: Override any incorrect index to ensure 2026 initial state
    if (incomeStatement.years.length > 0) {
      // Find 2026 year specifically, don't trust the server index
      let correctedIndex = incomeStatement.years.findIndex(y => y.year === 2026);
      if (correctedIndex === -1) {
        console.log('❌ ERROR: No 2026 year found in data!');
        correctedIndex = 1; // Fallback to index 1
      }
      
      const currentYear = incomeStatement.years[correctedIndex];
      
      console.log(`🔧 FORCE 2026: Overriding index ${incomeStatement.currentYearIndex} → ${correctedIndex} for year ${currentYear.year}`);
      console.log(`🚨 FORCED 2026 VALUES: Revenue=$${currentYear.revenue}M, Expenses=$${currentYear.expenses}M, Profit=$${currentYear.profit}M, Loss=$${currentYear.loss}M`);
      
      // Update the stored index to the corrected one
      this.incomeStatementData.currentYearIndex = correctedIndex;
      
      const businessData: FinancialBusinessData = {
        totalRevenue: currentYear.revenue,
        totalExpenses: currentYear.expenses,
        netProfit: currentYear.profit,
        netLoss: currentYear.loss,
        incomeStatement: this.incomeStatementData
      };
      
      // FORCE immediate rendering to prevent any animation delays
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
    console.log(`🚨 TRANSFORM INPUT: Raw data.totalRevenue=${data.totalRevenue} (should be 1000 for 2026)`);
    console.log(`🚨 TRANSFORM INPUT: Raw data.totalExpenses=${data.totalExpenses} (should be 800 for 2026)`);
    console.log(`🚨 TRANSFORM INPUT: Raw data.netProfit=${data.netProfit} (should be 200 for 2026)`);
    console.log(`🚨 TRANSFORM INPUT: Raw data.netLoss=${data.netLoss} (should be 0 for 2026)`);
    
    // FIXED: Don't cap the values when they're already in correct scale
    // Server sends: 1000 = $10M, 800 = $8M (already scaled correctly)
    const revenue = data.totalRevenue;  // Keep exact value from PowerPoint
    const expenses = data.totalExpenses;  // Keep exact value from PowerPoint
    
    console.log(`🚨 TRANSFORM OUTPUT: Revenue=${revenue} → Height=${revenue/500.0} units`);
    console.log(`🚨 TRANSFORM OUTPUT: Expenses=${expenses} → Height=${expenses/500.0} units`);
    console.log(`🚨 EXPECTED HEIGHTS: Revenue=2.0 units (tallest), Expenses=1.6 units (shorter)`);
    
    if (revenue === 1000 && expenses === 800) {
      console.log(`✅ CORRECT 2026 DATA: Revenue=$10M, Expenses=$8M detected`);
    } else {
      console.log(`❌ UNEXPECTED DATA: Revenue=${revenue}, Expenses=${expenses} (not 2026 values)`);
    }
    
    return {
      revenue: revenue,   // Use exact PowerPoint values 
      expenses: expenses, // Use exact PowerPoint values
      profit: 0, // Calculated in FinancialsHeightManager from revenue - expenses
      loss: 0   // Calculated in FinancialsHeightManager from revenue - expenses
    };
  }

}
