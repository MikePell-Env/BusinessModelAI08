import React from 'react';

interface TimeSliderHUDProps {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

const YEARS = [
  { index: 0, label: 'PAST', year: 2025 },
  { index: 1, label: 'PRESENT', year: 2026 },
  { index: 2, label: 'FUTURE', year: 2027 },
];

function switchYear(newYear: number, setSelectedYear: (y: number) => void) {
  const financialsDataAdapter = (window as any).financialsDataAdapter;
  if (financialsDataAdapter) {
    financialsDataAdapter.switchToYear(newYear, false);
    setSelectedYear(newYear);
    if (newYear === 1) {
      const expensesSlider = document.getElementById('expenses-slider') as HTMLInputElement;
      if (expensesSlider) expensesSlider.value = '800';
    }
  }
}

export const TimeSliderHUD: React.FC<TimeSliderHUDProps> = ({ selectedYear, setSelectedYear }) => {
  const thumbPosition = selectedYear === 0 ? '0%' : selectedYear === 1 ? '50%' : '100%';
  const thumbTranslate = selectedYear === 0 ? '0' : selectedYear === 1 ? '-50%' : '-100%';

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newYear = percentage < 0.33 ? 0 : percentage < 0.67 ? 1 : 2;
    console.log(`🕐 Time slider clicked: switching to year ${newYear}`);
    switchYear(newYear, setSelectedYear);
  };

  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const slider = e.currentTarget.parentElement;
    if (!slider) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const rect = slider.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const newYear = percentage < 0.33 ? 0 : percentage < 0.67 ? 1 : 2;
      if (newYear !== selectedYear) {
        console.log(`🕐 Time slider dragged: switching to year ${newYear}`);
        switchYear(newYear, setSelectedYear);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 px-8 py-4">
      <div className="relative" style={{ width: '600px' }}>
        <div className="h-1 bg-gray-400 rounded-full mb-4 relative" onClick={handleTrackClick}>
          <div
            className="absolute top-1/2 transform -translate-y-1/2 transition-all duration-300"
            style={{
              left: thumbPosition,
              transform: `translateX(${thumbTranslate}) translateY(-50%)`,
              cursor: 'default',
            }}
            onMouseDown={handleThumbMouseDown}
          >
            <div className="w-3 h-6 bg-blue-600 rounded-sm hover:bg-blue-700 transition-colors shadow-lg border border-blue-400" />
          </div>
        </div>

        <div className="flex justify-between text-xs font-medium text-gray-800 mt-2">
          {YEARS.map(({ index, label, year }) => (
            <span
              key={index}
              className="select-none px-2 py-2 rounded shadow-sm border border-gray-300 text-center w-16 cursor-pointer"
              onClick={() => {
                console.log(`🕐 ${label} (${year}) clicked`);
                switchYear(index, setSelectedYear);
              }}
              style={{
                backgroundColor: selectedYear === index ? '#3B82F6' : 'rgba(255, 255, 255, 0.9)',
                color: selectedYear === index ? 'white' : '#1F2937',
                fontWeight: selectedYear === index ? 'bold' : 'normal',
                boxShadow: selectedYear === index ? '0 4px 6px -1px rgba(0,0,0,0.1)' : undefined,
              }}
            >
              <div>{label}</div>
              <div className="text-base font-bold">{year}</div>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
