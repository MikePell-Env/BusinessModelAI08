export interface CanvasElement {
  id: string;
  title: string;
  content: string[];
  color?: string;
}

export interface BusinessModelCanvas {
  id: string;
  name: string;
  description: string;
  keyPartners: CanvasElement;
  keyActivities: CanvasElement;
  keyResources: CanvasElement;
  valuePropositions: CanvasElement;
  customerRelationships: CanvasElement;
  channels: CanvasElement;
  customerSegments: CanvasElement;
  costStructure: CanvasElement;
  revenueStreams: CanvasElement;
  lastModified: string;
  // Overview data from PowerPoint
  overviewData?: OverviewData;
}

export interface OverviewData {
  companyName: string;
  summary: string[];
  founders: string[];
  details: string[];
  website: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface CanvasUpdateRequest {
  element: keyof Omit<BusinessModelCanvas, 'id' | 'name' | 'description' | 'lastModified'>;
  action: 'update' | 'add' | 'remove';
  content: string;
  index?: number;
}
