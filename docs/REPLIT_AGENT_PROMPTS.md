
# Replit Agent Implementation Prompts
## Structured Prompts Based on Claude Code Analysis

### Prompt 1: Unified State Management System

```
Based on my architectural analysis, I need to implement a unified state management system for my Business Model Canvas application. Currently, I have mixed state management between Zustand (useCanvas.tsx) and a custom BMC state manager (bmcStateManager.ts) which is causing duplication and complexity.

Please implement a unified state management system that:

1. Consolidates all canvas state (2D, 3D, selections, view modes) into a single store
2. Adds state persistence using localStorage for user sessions
3. Implements undo/redo functionality with action history
4. Creates middleware for debugging and analytics tracking
5. Maintains type safety throughout the state system

The new system should replace the current mixed approach while preserving all existing functionality. Focus on:
- Clean separation of concerns
- Immutable state updates
- Performance optimization for frequent 3D updates
- Easy debugging and development experience

Current files to refactor: client/src/lib/stores/useCanvas.tsx and client/src/lib/bmcStateManager.ts
```

### Prompt 2: 3D Performance Optimization

```
My Business Model Canvas 3D visualization needs performance optimization. Based on analysis, the current Babylon.js implementation in Canvas3DBabylon.tsx has performance bottlenecks when handling multiple BMC objects.

Please optimize the 3D rendering system by implementing:

1. Object pooling for repeated BMC elements to reduce memory allocation
2. Frustum culling to avoid rendering off-screen objects
3. Level-of-detail (LOD) system for complex 3D models
4. Progressive texture loading with lower-res placeholders
5. Optimized material management and reuse

Target performance goals:
- Maintain 60fps with 20+ BMC objects
- Keep memory usage under 500MB
- Smooth transitions between 2D/3D views
- Fast initial load times

Create a new BabylonPerformanceManager.ts that handles these optimizations and integrate it with the existing Canvas3DBabylon.tsx component.
```

### Prompt 3: Enhanced AI Orchestration

```
I want to enhance my AI integration system to be more intelligent and capable. Currently, I have basic chat with Microsoft Copilot and OpenAI fallback, but I need a sophisticated AI orchestration layer.

Please create an enhanced AI system that includes:

1. Intelligent routing of queries to the best AI service based on query type and context
2. AI-powered business model canvas generation from natural language descriptions
3. Business model validation that analyzes completeness and offers suggestions
4. Contextual recommendations based on current canvas state and industry best practices
5. Response caching and optimization for better performance

Key features needed:
- "Generate a SaaS business model for project management" should create a complete canvas
- Validate canvas and suggest missing elements or improvements
- Smart service selection (use Copilot for business analysis, OpenAI for creative tasks)
- Response times under 3 seconds

Create new files: AIServiceRouter.ts, ContextAnalyzer.ts, and enhance the existing AI chat interface.
```

### Prompt 4: Real-time Collaboration Foundation

```
I need to add real-time collaboration capabilities to my Business Model Canvas application. Multiple users should be able to work on the same canvas simultaneously with live updates.

Please implement a real-time collaboration system that includes:

1. WebSocket-based communication for instant updates
2. Conflict resolution for simultaneous edits to the same BMC section
3. User presence indicators showing who's online and where they're working
4. Live cursor tracking in both 2D and 3D views
5. Proper data synchronization without overwrites

Technical requirements:
- WebSocket server integration with existing Express.js backend
- Client-side collaboration provider with React context
- Conflict resolution using operational transforms or similar
- Visual indicators of other users' activities in 3D space
- Graceful handling of connection drops and reconnection

This should work with the existing canvas state management and not break current functionality.
```

### Prompt 5: Enhanced Import/Export System

```
My current PowerPoint import functionality needs to be expanded into a comprehensive import/export system that supports multiple file formats and provides better user experience.

Please enhance the import/export system to include:

1. Support for Excel spreadsheets, CSV files, and PDF import
2. Smart data mapping that automatically assigns imported data to appropriate BMC sections
3. Export capabilities to PDF, PNG, SVG, and Excel formats
4. Template library with industry-specific business model templates
5. Improved UI for file handling with drag-and-drop support

Specific features:
- Excel import should detect business data and map to BMC sections intelligently
- PDF export should generate professional reports with charts and analysis
- Template library with at least 10 industry-specific templates (SaaS, E-commerce, etc.)
- Progress indicators for file processing
- Error handling with clear user feedback

Rename PowerPointImporter.tsx to FileImporter.tsx and create a comprehensive import service on the backend.
```

### Prompt 6: Mobile-Responsive 3D Experience

```
The 3D Business Model Canvas needs to work seamlessly on mobile devices. Currently, the 3D experience is optimized only for desktop with mouse controls.

Please implement mobile-responsive 3D functionality that includes:

1. Touch-optimized controls for 3D navigation (pinch, pan, rotate)
2. Responsive UI that adapts to mobile screen sizes
3. Progressive enhancement for different mobile GPU capabilities
4. Simplified 3D experience for lower-end devices
5. Gesture-based interactions for BMC section selection

Mobile-specific optimizations:
- Touch-friendly button sizes and spacing
- Simplified 3D models for mobile performance
- Swipe gestures for view switching
- Haptic feedback for interactions where supported
- Offline capability with service worker integration

The solution should detect device capabilities and provide the best possible experience for each device type.
```

### Prompt 7: Analytics and Insights Dashboard

```
I want to add business intelligence capabilities to my Business Model Canvas application. Users should get insights about their business models and usage patterns.

Please create an analytics and insights system that includes:

1. User interaction tracking and heatmaps for canvas usage
2. Business model health scoring based on completeness and best practices
3. Industry benchmarking to compare against similar business models
4. AI-powered predictions about business model success likelihood
5. Usage analytics dashboard for individual users and organizations

Analytics features needed:
- Track which BMC sections users spend most time on
- Generate health scores for each section and overall model
- Compare against industry standards and suggest improvements
- Predict potential issues or opportunities
- Export analytics reports

Create AnalyticsDashboard.tsx component and AnalyticsService.ts backend service. Ensure privacy compliance and allow users to opt-out of tracking.
```

### Implementation Strategy for Agent

When using these prompts with Replit Agent:

1. **Start with Prompt 1** (Unified State Management) as it's foundational
2. **Use Prompt 2** (3D Performance) next as it improves user experience
3. **Implement Prompt 3** (Enhanced AI) for core feature enhancement
4. **Add Prompts 4-7** based on priority and user feedback

Each prompt is designed to be:
- Self-contained with clear objectives
- Specific about technical requirements
- Include acceptance criteria
- Reference existing code structure
- Provide context for decision-making

Remember to test each implementation thoroughly before moving to the next prompt.
