import React from 'react';

interface ServiceInfo {
  provider: string;
  route: string;
  timestamp: string;
}

interface AIServiceIndicatorProps {
  serviceInfo?: ServiceInfo;
  isLoading?: boolean;
}

export function AIServiceIndicator({ serviceInfo, isLoading }: AIServiceIndicatorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Processing with Microsoft Copilot...</span>
      </div>
    );
  }

  if (!serviceInfo) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span>Microsoft Copilot Ready</span>
      </div>
    );
  }

  const getStatusColor = (provider: string) => {
    if (provider.includes('Azure OpenAI')) return 'bg-green-500';
    if (provider.includes('Graph API')) return 'bg-blue-500';
    if (provider.includes('OpenAI Fallback')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getProviderIcon = (provider: string) => {
    if (provider.includes('Azure OpenAI')) return '🔗';
    if (provider.includes('Graph API')) return '📊';
    if (provider.includes('OpenAI Fallback')) return '⚡';
    return '🤖';
  };

  return (
    <div className="flex items-center gap-2 text-xs bg-white border border-gray-200 px-2 py-1 rounded shadow-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor(serviceInfo.provider)}`}></div>
      <span className="font-medium text-gray-700">
        {getProviderIcon(serviceInfo.provider)} {serviceInfo.provider}
      </span>
      <span className="text-gray-500">•</span>
      <span className="text-gray-600 max-w-32 truncate" title={serviceInfo.route}>
        {serviceInfo.route.split(' → ')[0]}
      </span>
    </div>
  );
}