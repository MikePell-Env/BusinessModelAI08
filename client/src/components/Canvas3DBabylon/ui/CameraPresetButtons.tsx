import React from 'react';

type CameraPreset = 'PERSPECTIVE_LEFT' | 'PERSPECTIVE_RIGHT' | 'TOP' | 'FRONT';

interface CameraPresetButtonsProps {
  currentCameraPreset: CameraPreset;
  isInPresetPosition: boolean;
  isTransitioningCamera: boolean;
  templateName: string;
  switchCameraPreset: (preset: CameraPreset) => void;
}

export const CameraPresetButtons: React.FC<CameraPresetButtonsProps> = ({
  currentCameraPreset,
  isInPresetPosition,
  isTransitioningCamera,
  templateName,
  switchCameraPreset,
}) => {
  const isFinancials = templateName.toLowerCase() === 'financials';

  const btnClass = (active: boolean) =>
    `px-3 py-1 rounded text-xs font-medium transition-all duration-200 w-24 ${
      active
        ? 'bg-blue-600 text-white shadow-md'
        : isTransitioningCamera
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm'
    }`;

  return (
    <div className="absolute right-8 z-10" style={{ top: '25px' }}>
      <div className="flex gap-2">
        <button
          onClick={() => switchCameraPreset('PERSPECTIVE_LEFT')}
          disabled={isTransitioningCamera}
          className={btnClass(currentCameraPreset === 'PERSPECTIVE_LEFT' && isInPresetPosition)}
        >
          {isTransitioningCamera && currentCameraPreset !== 'PERSPECTIVE_LEFT' ? '...' : 'Left View'}
        </button>

        <button
          onClick={() => switchCameraPreset(isFinancials ? 'FRONT' : 'TOP')}
          disabled={isTransitioningCamera}
          className={btnClass((currentCameraPreset === 'TOP' || currentCameraPreset === 'FRONT') && isInPresetPosition)}
        >
          {isTransitioningCamera && currentCameraPreset !== 'TOP' && currentCameraPreset !== 'FRONT'
            ? '...'
            : isFinancials ? 'Front View' : 'Top View'}
        </button>

        <button
          onClick={() => switchCameraPreset('PERSPECTIVE_RIGHT')}
          disabled={isTransitioningCamera}
          className={btnClass(currentCameraPreset === 'PERSPECTIVE_RIGHT' && isInPresetPosition)}
        >
          {isTransitioningCamera && currentCameraPreset !== 'PERSPECTIVE_RIGHT' ? '...' : 'Right View'}
        </button>
      </div>
      {isTransitioningCamera && (
        <div className="text-xs text-gray-600 mt-1 text-center animate-pulse">
          ✨ Smoothly transitioning camera...
        </div>
      )}
    </div>
  );
};
