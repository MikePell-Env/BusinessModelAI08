/**
 * FinancialsController - Central controller for Financial Template System
 * 
 * FINANCIAL SYSTEM RULES:
 * 
 * 1. EQUAL GROUP HEIGHTS: Revenue Group height = Expense Group height at ALL times
 *    This overall height can dynamically change based on data values provided by the FinancialsController
 * 
 * 2. 100% GROUP COMPOSITION: Each group operates where both elements must equal 100% total:
 *    - Revenue Group: Revenue% + RevenuePL% = 100%
 *    - Expenses Group: Expenses% + ExpensesPL% = 100%
 * 
 * 3. PROFIT/LOSS INTERRELATIONSHIP FORMULA:
 *    - When Revenue > Expenses (Profit scenario):
 *      * ExpensesPL (Profit) = positive height
 *      * RevenuePL (Loss) = 0% height
 *    - When Revenue < Expenses (Loss scenario):
 *      * RevenuePL (Loss) = positive height  
 *      * ExpensesPL (Profit) = 0% height
 */

import { FinancialsHeightManager } from '../animations/FinancialsHeightManager';

export interface FinancialInputData {
  revenue: number;    // Revenue amount (slider value)
  expenses: number;   // Expenses amount (slider value)
}

export interface FinancialSystemState {
  // Group heights (always equal)
  groupHeight: number;
  
  // Revenue Group (100% total)
  revenueHeight: number;     // Revenue object height
  revenuePLHeight: number;   // RevenuePL (Loss) object height
  revenuePercent: number;    // Revenue percentage (0-100)
  revenuePLPercent: number;  // Loss percentage (0-100)
  
  // Expenses Group (100% total)
  expensesHeight: number;    // Expenses object height
  expensesPLHeight: number;  // ExpensesPL (Profit) object height
  expensesPercent: number;   // Expenses percentage (0-100)
  expensesPLPercent: number; // Profit percentage (0-100)
  
  // Financial metrics
  profit: number;            // Profit amount (when Revenue > Expenses)
  loss: number;              // Loss amount (when Expenses > Revenue)
  isProfit: boolean;         // True = profit scenario, False = loss scenario
}

export class FinancialsController {
  private heightManager: FinancialsHeightManager;
  private currentState: FinancialSystemState | null = null;
  private readonly HEIGHT_SCALE = 500.0;

  constructor(heightManager: FinancialsHeightManager) {
    this.heightManager = heightManager;
  }

  /**
   * Update the financial system with new input data
   * Enforces all financial system rules automatically
   */
  public updateFinancialSystem(inputData: FinancialInputData, animated: boolean = true): FinancialSystemState {
    const state = this.calculateFinancialState(inputData);
    this.currentState = state;
    
    console.log('💰 FinancialsController: New financial state calculated:', {
      scenario: state.isProfit ? 'PROFIT' : 'LOSS',
      groupHeight: state.groupHeight.toFixed(3),
      revenueGroup: `${state.revenuePercent}% + ${state.revenuePLPercent}% = 100%`,
      expensesGroup: `${state.expensesPercent}% + ${state.expensesPLPercent}% = 100%`
    });

    // Apply heights to 3D objects
    this.applyHeightsToObjects(state, animated);
    
    return state;
  }

  /**
   * Calculate financial system state following all rules
   */
  private calculateFinancialState(inputData: FinancialInputData): FinancialSystemState {
    const { revenue, expenses } = inputData;
    
    // Rule 1: Equal Group Heights - based on maximum value
    const maxValue = Math.max(revenue, expenses);
    const groupHeight = maxValue / this.HEIGHT_SCALE;
    
    // Rule 3: Profit/Loss Interrelationship
    const netDifference = revenue - expenses;
    const isProfit = netDifference >= 0;
    const profit = isProfit ? netDifference : 0;
    const loss = !isProfit ? Math.abs(netDifference) : 0;
    
    // Rule 2: 100% Group Composition
    // Revenue Group percentages
    const revenuePercent = (revenue / maxValue) * 100;
    const revenuePLPercent = (loss / maxValue) * 100;  // Loss fills remaining percentage
    
    // Expenses Group percentages  
    const expensesPercent = (expenses / maxValue) * 100;
    const expensesPLPercent = (profit / maxValue) * 100;  // Profit fills remaining percentage
    
    // Calculate actual heights
    const revenueHeight = groupHeight * (revenue / maxValue);
    const revenuePLHeight = groupHeight * (loss / maxValue);
    const expensesHeight = groupHeight * (expenses / maxValue);
    const expensesPLHeight = groupHeight * (profit / maxValue);
    
    // Verify 100% rule compliance
    const revenueTotal = revenuePercent + revenuePLPercent;
    const expensesTotal = expensesPercent + expensesPLPercent;
    
    if (Math.abs(revenueTotal - 100) > 0.01 || Math.abs(expensesTotal - 100) > 0.01) {
      console.warn('⚠️ FinancialsController: 100% rule violation detected!', {
        revenueTotal, expensesTotal
      });
    }
    
    return {
      groupHeight,
      revenueHeight,
      revenuePLHeight,
      revenuePercent: Math.round(revenuePercent),
      revenuePLPercent: Math.round(revenuePLPercent),
      expensesHeight,
      expensesPLHeight, 
      expensesPercent: Math.round(expensesPercent),
      expensesPLPercent: Math.round(expensesPLPercent),
      profit,
      loss,
      isProfit
    };
  }

  /**
   * Apply calculated heights to 3D objects through HeightManager
   */
  private applyHeightsToObjects(state: FinancialSystemState, animated: boolean): void {
    const duration = animated ? 1000 : 0;
    
    // Convert state heights back to slider values for HeightManager compatibility
    const revenueSliderValue = state.revenueHeight * this.HEIGHT_SCALE;
    const expensesSliderValue = state.expensesHeight * this.HEIGHT_SCALE;
    
    console.log('🎯 FinancialsController applying heights:', {
      revenueHeight: state.revenueHeight.toFixed(3),
      revenuePLHeight: state.revenuePLHeight.toFixed(3),
      expensesHeight: state.expensesHeight.toFixed(3),
      expensesPLHeight: state.expensesPLHeight.toFixed(3),
      scenario: state.isProfit ? 'PROFIT' : 'LOSS'
    });
    
    if (animated) {
      // Use animated updates
      this.heightManager.updateHeightsFromData({
        revenue: revenueSliderValue,
        expenses: expensesSliderValue,
        profit: state.profit,
        loss: state.loss
      }, duration);
    } else {
      // Use immediate updates - call the controller-compatible method
      this.heightManager.setHeightsFromController({
        revenueHeight: state.revenueHeight,
        revenuePLHeight: state.revenuePLHeight,
        expensesHeight: state.expensesHeight,
        expensesPLHeight: state.expensesPLHeight
      });
    }
  }

  /**
   * Get current financial system state
   */
  public getCurrentState(): FinancialSystemState | null {
    return this.currentState;
  }

  /**
   * Validate financial system integrity
   */
  public validateSystemIntegrity(): boolean {
    if (!this.currentState) return false;
    
    const state = this.currentState;
    
    // Check Rule 1: Equal group heights
    const revenueGroupTotal = state.revenueHeight + state.revenuePLHeight;
    const expensesGroupTotal = state.expensesHeight + state.expensesPLHeight;
    
    if (Math.abs(revenueGroupTotal - expensesGroupTotal) > 0.001) {
      console.error('❌ Rule 1 violation: Group heights not equal');
      return false;
    }
    
    // Check Rule 2: 100% composition
    if (Math.abs((state.revenuePercent + state.revenuePLPercent) - 100) > 0.01) {
      console.error('❌ Rule 2 violation: Revenue group not 100%');
      return false;
    }
    
    if (Math.abs((state.expensesPercent + state.expensesPLPercent) - 100) > 0.01) {
      console.error('❌ Rule 2 violation: Expenses group not 100%');
      return false;
    }
    
    // Check Rule 3: Profit/Loss mutual exclusivity
    if (state.profit > 0 && state.loss > 0) {
      console.error('❌ Rule 3 violation: Both profit and loss are positive');
      return false;
    }
    
    console.log('✅ FinancialsController: System integrity validated');
    return true;
  }
}