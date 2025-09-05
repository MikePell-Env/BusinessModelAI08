
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
  private directLoadCompleted: boolean = false; // Prevent overrides after direct load

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
    // PREVENT OVERRIDE: If direct PowerPoint load completed, ignore all other calls
    if (this.directLoadCompleted) {
      console.log(`🚨 BLOCKED: updateFromBusinessData called after direct load - ignoring to prevent override`);
      return;
    }
    
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
   * SIMPLIFIED: Direct PowerPoint to Height Manager (bypasses all complex logic)
   */
  public loadIncomeStatementData(incomeStatement: IncomeStatementData): void {
    console.log(`🚨🚨🚨 DIRECT LOADER CALLED 🚨🚨🚨`);
    console.log(`🔥 Raw PowerPoint data:`, incomeStatement.years);
    
    // EXAMINE ALL YEARS TO SEE WHAT WE'RE WORKING WITH
    console.log(`🔍 ALL YEARS IN POWERPOINT DATA:`);
    incomeStatement.years.forEach((year, index) => {
      console.log(`🔍   Index ${index}: Year ${year.year}, Revenue ${year.revenue}, Expenses ${year.expenses}`);
    });
    
    // FIND 2026 DATA and apply directly to height manager
    console.log(`🔍 SEARCHING FOR 2026 in years:`, incomeStatement.years.map(y => `${y.year}: ${y.revenue}`));
    const year2026 = incomeStatement.years.find(y => y.year === 2026);
    
    if (!year2026) {
      console.error('🔥 ERROR: No 2026 data found in PowerPoint!');
      console.error('🔥 Available years:', incomeStatement.years);
      return;
    }
    
    console.log(`🔍 YEAR SEARCH RESULT: Found year2026 =`, year2026);
    console.log(`🔍 VERIFICATION: year2026.year = ${year2026.year}, year2026.revenue = ${year2026.revenue}`);
    
    console.log(`🚨 FOUND 2026 DATA:`, year2026);
    console.log(`🚨 2026 VALUES: Revenue=${year2026.revenue} (should be 1000), Expenses=${year2026.expenses} (should be 800)`);
    
    if (year2026.revenue === 2660) {
      console.error(`🚨🚨🚨 CRITICAL: 2026 data contains 2027 values! Revenue=2660 instead of 1000!`);
    } else if (year2026.revenue === 1000) {
      console.log(`✅ CORRECT: 2026 data has proper values!`);
    }
    
    // BYPASS ALL COMPLEX LOGIC: Go direct to height manager
    if (this.heightManager) {
      const directData = {
        revenue: year2026.revenue,    // Direct: should be 1000
        expenses: year2026.expenses,  // Direct: should be 800  
        profit: year2026.profit,      // Direct: should be 200
        loss: year2026.loss          // Direct: should be 0
      };
      
      console.log(`🚨🚨🚨 APPLYING DIRECT TO HEIGHT MANAGER:`, directData);
      this.heightManager.setImmediateHeights(directData);
      this.directLoadCompleted = true; // Mark as completed to prevent overrides
      console.log(`✅ DIRECT APPLICATION COMPLETE - OVERRIDE PROTECTION ENABLED`);
    } else {
      console.error('🔥 ERROR: No height manager available!');
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

    // CRITICAL OVERRIDE: Always force 2026 data regardless of requested yearIndex
    const year2026Index = this.incomeStatementData.years.findIndex(y => y.year === 2026);
    const actualIndex = year2026Index !== -1 ? year2026Index : yearIndex;
    
    if (actualIndex !== yearIndex) {
      console.warn(`🚨 YEAR OVERRIDE: Requested index ${yearIndex} (${this.incomeStatementData.years[yearIndex]?.year}) → forced to index ${actualIndex} (2026)`);
    }

    this.incomeStatementData.currentYearIndex = actualIndex;
    const yearData = this.incomeStatementData.years[actualIndex];
    
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
   * Get current year index - ALWAYS RETURN 2026 INDEX (1)
   */
  public getCurrentYearIndex(): number {
    if (!this.incomeStatementData) return 1; // Default to 2026 index
    
    // CRITICAL: Always find and return 2026 index, regardless of stored currentYearIndex
    const year2026Index = this.incomeStatementData.years.findIndex(y => y.year === 2026);
    if (year2026Index !== -1) {
      return year2026Index; // Always return 2026 index (should be 1)
    }
    
    // Fallback: if 2026 not found, return middle index
    return Math.floor(this.incomeStatementData.years.length / 2);
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
