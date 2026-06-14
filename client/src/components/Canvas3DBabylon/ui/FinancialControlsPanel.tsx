import React from 'react';

interface FinancialControlsPanelProps {
  revenueSliderValue: number;
  setRevenueSliderValue: (v: number) => void;
  expensesSliderValue: number;
  setExpensesSliderValue: (v: number) => void;
}

export const FinancialControlsPanel: React.FC<FinancialControlsPanelProps> = ({
  revenueSliderValue,
  setRevenueSliderValue,
  expensesSliderValue,
  setExpensesSliderValue,
}) => {
  const updateAdapter = (revenue: number, expenses: number) => {
    const financialsDataAdapter = (window as any).financialsDataAdapter;
    if (financialsDataAdapter) {
      financialsDataAdapter.updateFromBusinessData({
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: Math.max(0, revenue - expenses),
        netLoss: Math.max(0, expenses - revenue),
      }, false);
    }
  };

  const handleRevenueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setRevenueSliderValue(value);
    updateAdapter(value, expensesSliderValue);
  };

  const handleExpensesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setExpensesSliderValue(value);
    updateAdapter(revenueSliderValue, value);
  };

  const profit = Math.max(0, revenueSliderValue - expensesSliderValue);

  return (
    <div className="absolute top-24 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 min-w-[280px] z-50">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Financial Controls</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Revenue: $1M - $30M
        </label>
        <input
          id="revenue-slider"
          type="range"
          min="100"
          max="3000"
          value={revenueSliderValue}
          className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider"
          onChange={handleRevenueChange}
        />
        <div className="revenue-display text-sm text-gray-600 mt-1">
          ${(revenueSliderValue / 100).toFixed(0)}M
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Expenses: $1M - $10M
        </label>
        <input
          id="expenses-slider"
          type="range"
          min="100"
          max="1000"
          value={expensesSliderValue}
          className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
          onChange={handleExpensesChange}
        />
        <div className="expenses-display text-sm text-gray-600 mt-1">
          ${(expensesSliderValue / 100).toFixed(0)}M
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Profit (Calculated)
        </label>
        <div className="profit-display text-lg font-semibold text-green-600">
          ${(profit / 100).toFixed(0)}M
        </div>
      </div>
    </div>
  );
};
