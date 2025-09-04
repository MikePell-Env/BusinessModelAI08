
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
   * SIMPLIFIED: Find 2026 data and set immediately with correct values
   */
  public loadIncomeStatementData(incomeStatement: IncomeStatementData): void {
    console.log(`🔥 POWERPOINT DATA LOADING START:`, {
      totalYears: incomeStatement.years.length,
      serverIndex: incomeStatement.currentYearIndex,
      allYears: incomeStatement.years.map(y => `${y.year}: $${y.revenue}M/$${y.expenses}M`)
    });
    
    // CRITICAL FIX: Deep clone the data to prevent reference corruption
    this.incomeStatementData = {
      years: incomeStatement.years.map(y => ({ ...y })),
      currentYearIndex: incomeStatement.currentYearIndex,
      source: (incomeStatement as any).source || "PowerPoint Import"
    };
    
    // FIND 2026 DATA (should be Revenue=1000, Expenses=800, Profit=200, Loss=0)
    const year2026Index = this.incomeStatementData.years.findIndex(y => y.year === 2026);
    
    if (year2026Index === -1) {
      console.error('🔥 ERROR: No 2026 year found in PowerPoint data!');
      return;
    }
    
    console.log(`🔥 FOUND 2026 at index ${year2026Index}, but server said currentYearIndex=${incomeStatement.currentYearIndex}`);
    
    // CRITICAL: Always force 2026 as current, regardless of server value
    this.incomeStatementData.currentYearIndex = year2026Index;
    const year2026 = this.incomeStatementData.years[year2026Index];
    
    if (!year2026) {
      console.error('🔥 ERROR: Failed to get 2026 data after setting index!');
      return;
    }
    
    console.log(`🔥 SETTING 2026 AS CURRENT:`, {
      year: year2026.year,
      revenue: year2026.revenue,  // Should be 1000 ($10M)
      expenses: year2026.expenses, // Should be 800 ($8M)  
      profit: year2026.profit,    // Should be 200 ($2M)
      loss: year2026.loss         // Should be 0
    });
    
    // VALIDATION: Double-check that we're not accidentally getting 2027 data
    console.log(`🔍 DETAILED INSPECTION OF EXTRACTED YEAR:`);
    console.log(`🔍   year2026Index = ${year2026Index}`);
    console.log(`🔍   year2026.year = ${year2026.year}`);
    console.log(`🔍   year2026.revenue = ${year2026.revenue}`);
    console.log(`🔍   year2026.expenses = ${year2026.expenses}`);
    
    if (year2026.revenue === 2660) {
      console.error(`🚨 CRITICAL ERROR: year2026 contains 2027 data! Revenue=2660 instead of 1000`);
      console.error(`🚨 This means we found the wrong year or the data is corrupted`);
      console.error(`🚨 Let's examine ALL years to see what happened:`);
      this.incomeStatementData.years.forEach((y, i) => {
        console.error(`🚨   Index ${i}: Year ${y.year}, Revenue ${y.revenue}`);
      });
    } else if (year2026.revenue === 1000) {
      console.log(`✅ VALIDATION PASSED: year2026 contains correct 2026 data (revenue=1000)`);
    } else {
      console.warn(`❓ UNEXPECTED: year2026.revenue=${year2026.revenue}, not 1000 or 2660`);
    }
    
    // SET INITIAL STATE IMMEDIATELY (no animation)
    const businessData: FinancialBusinessData = {
      totalRevenue: year2026.revenue,
      totalExpenses: year2026.expenses,
      netProfit: year2026.profit,
      netLoss: year2026.loss,
      incomeStatement: this.incomeStatementData!
    };
    
    this.updateFromBusinessData(businessData, false); // No animation for initial load
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
   * Get the current income statement data for debugging
   */
  public getIncomeStatementData(): IncomeStatementData | null {
    return this.incomeStatementData;
  }

  /**
   * Transform business data into visualization format
   * SIMPLIFIED: Direct pass-through of PowerPoint data to height manager
   */
  private transformBusinessData(data: FinancialBusinessData): FinancialData {
    console.log(`🔥 SIMPLIFIED TRANSFORM - Input:`, {
      revenue: data.totalRevenue,
      expenses: data.totalExpenses, 
      profit: data.netProfit,
      loss: data.netLoss
    });
    
    // RULE: PowerPoint sends exact values that height manager needs
    // Revenue=1000 ($10M), Expenses=800 ($8M), Profit=200 ($2M), Loss=0
    const result = {
      revenue: data.totalRevenue,   // Direct pass-through
      expenses: data.totalExpenses, // Direct pass-through  
      profit: data.netProfit,       // Direct pass-through
      loss: data.netLoss           // Direct pass-through
    };
    
    console.log(`🔥 SIMPLIFIED TRANSFORM - Output:`, result);
    console.log(`🔥 Expected for 2026: Revenue=1000, Expenses=800, Profit=200, Loss=0`);
    
    return result;
  }

}
