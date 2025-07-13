import { microsoftAuth } from './microsoftAuth';
import { BusinessModelCanvas, CanvasElement } from '../../client/src/types/canvas';

interface PowerPointSlideContent {
  slideNumber: number;
  title: string;
  content: string[];
}

interface PowerPointCanvasMapping {
  keyPartners: string[];
  keyActivities: string[];
  keyResources: string[];
  valuePropositions: string[];
  customerRelationships: string[];
  channels: string[];
  customerSegments: string[];
  costStructure: string[];
  revenueStreams: string[];
}

/**
 * Expected PowerPoint slide format for Business Model Canvas:
 * 
 * Slide Structure:
 * - Slide 1: Cover slide with canvas name and description
 * - Slide 2: "Key Partners" with bullet points
 * - Slide 3: "Key Activities" with bullet points
 * - Slide 4: "Key Resources" with bullet points
 * - Slide 5: "Value Propositions" with bullet points
 * - Slide 6: "Customer Relationships" with bullet points
 * - Slide 7: "Channels" with bullet points
 * - Slide 8: "Customer Segments" with bullet points
 * - Slide 9: "Cost Structure" with bullet points
 * - Slide 10: "Revenue Streams" with bullet points
 * 
 * OR Alternative single slide format:
 * - Single slide with 9 text boxes, each labeled with section name
 */

export class PowerPointImporter {
  private sectionTitleMap = new Map([
    ['key partners', 'keyPartners'],
    ['key activities', 'keyActivities'],
    ['key resources', 'keyResources'],
    ['value propositions', 'valuePropositions'],
    ['value proposition', 'valuePropositions'],
    ['customer relationships', 'customerRelationships'],
    ['channels', 'channels'],
    ['customer segments', 'customerSegments'],
    ['cost structure', 'costStructure'],
    ['revenue streams', 'revenueStreams'],
    ['revenue stream', 'revenueStreams']
  ]);

  /**
   * Import PowerPoint file from Microsoft Graph (OneDrive/SharePoint)
   */
  async importFromGraphAPI(fileId: string, siteId?: string): Promise<BusinessModelCanvas> {
    try {
      const graphClient = await microsoftAuth.getGraphClient();
      
      // Get PowerPoint file content
      const fileUrl = siteId 
        ? `/sites/${siteId}/drive/items/${fileId}`
        : `/me/drive/items/${fileId}`;
      
      // Extract presentation content
      const slides = await this.extractSlidesFromGraph(graphClient, fileUrl);
      
      // Parse slides into canvas format
      return this.parseSlides(slides);
      
    } catch (error) {
      console.error('PowerPoint import failed:', error);
      throw new Error(`Failed to import PowerPoint: ${error.message}`);
    }
  }

  /**
   * Import from uploaded PowerPoint file (client-side processing)
   */
  async importFromUploadedFile(fileContent: ArrayBuffer): Promise<BusinessModelCanvas> {
    try {
      // For client-side processing, we'd use a library like xlsx or officegen
      // For now, return a template that shows the expected format
      throw new Error('File upload processing not implemented yet. Use Microsoft Graph API import instead.');
    } catch (error) {
      console.error('PowerPoint file processing failed:', error);
      throw new Error(`Failed to process PowerPoint file: ${error.message}`);
    }
  }

  /**
   * Extract slide content from Microsoft Graph API
   */
  private async extractSlidesFromGraph(graphClient: any, fileUrl: string): Promise<PowerPointSlideContent[]> {
    try {
      // Get presentation structure (this would need actual Graph API calls)
      // For now, simulate the structure based on expected format
      
      // In a real implementation, this would use:
      // - /workbook/worksheets for basic structure
      // - PowerPoint-specific Graph API endpoints when available
      // - Or download the file and parse with a PowerPoint library
      
      throw new Error('Microsoft Graph PowerPoint parsing not fully implemented. Please use the structured format guide below.');
      
    } catch (error) {
      throw new Error(`Failed to extract slides: ${error.message}`);
    }
  }

  /**
   * Parse extracted slides into Business Model Canvas format
   */
  private parseSlides(slides: PowerPointSlideContent[]): BusinessModelCanvas {
    const canvasData: PowerPointCanvasMapping = {
      keyPartners: [],
      keyActivities: [],
      keyResources: [],
      valuePropositions: [],
      customerRelationships: [],
      channels: [],
      customerSegments: [],
      costStructure: [],
      revenueStreams: []
    };

    let canvasName = 'Imported Business Model Canvas';
    let canvasDescription = 'Business model canvas imported from PowerPoint';

    // Process each slide
    slides.forEach((slide, index) => {
      if (index === 0) {
        // First slide: extract name and description
        canvasName = slide.title || canvasName;
        canvasDescription = slide.content.join(' ') || canvasDescription;
        return;
      }

      // Map slide title to canvas section
      const normalizedTitle = slide.title.toLowerCase().trim();
      const sectionKey = this.sectionTitleMap.get(normalizedTitle);
      
      if (sectionKey && canvasData[sectionKey as keyof PowerPointCanvasMapping]) {
        canvasData[sectionKey as keyof PowerPointCanvasMapping] = slide.content.filter(item => item.trim().length > 0);
      }
    });

    // Create Business Model Canvas object
    return this.createCanvasFromMapping(canvasData, canvasName, canvasDescription);
  }

  /**
   * Create Business Model Canvas object from parsed data
   */
  private createCanvasFromMapping(
    mapping: PowerPointCanvasMapping, 
    name: string, 
    description: string
  ): BusinessModelCanvas {
    const createCanvasElement = (id: string, title: string, content: string[], color: string): CanvasElement => ({
      id,
      title,
      content: content.length > 0 ? content : ['(No content provided)'],
      color
    });

    return {
      id: `imported-${Date.now()}`,
      name,
      description,
      keyPartners: createCanvasElement('key-partners', 'Key Partners', mapping.keyPartners, '#FFE5E5'),
      keyActivities: createCanvasElement('key-activities', 'Key Activities', mapping.keyActivities, '#E5F3FF'),
      keyResources: createCanvasElement('key-resources', 'Key Resources', mapping.keyResources, '#E5FFE5'),
      valuePropositions: createCanvasElement('value-propositions', 'Value Propositions', mapping.valuePropositions, '#FFF5E5'),
      customerRelationships: createCanvasElement('customer-relationships', 'Customer Relationships', mapping.customerRelationships, '#F5E5FF'),
      channels: createCanvasElement('channels', 'Channels', mapping.channels, '#E5FFFF'),
      customerSegments: createCanvasElement('customer-segments', 'Customer Segments', mapping.customerSegments, '#FFE5F5'),
      costStructure: createCanvasElement('cost-structure', 'Cost Structure', mapping.costStructure, '#F0F0F0'),
      revenueStreams: createCanvasElement('revenue-streams', 'Revenue Streams', mapping.revenueStreams, '#E5F5E5'),
      lastModified: new Date().toISOString()
    };
  }

  /**
   * Generate PowerPoint template instructions for users
   */
  static getTemplateInstructions(): string {
    return `
# PowerPoint Business Model Canvas Template Format

## Option 1: Multi-Slide Format (Recommended)

Create 10 slides with the following structure:

**Slide 1: Cover Slide**
- Title: Your Business Model Canvas Name
- Subtitle/Content: Brief description of your business

**Slide 2: Key Partners**
- Title: "Key Partners"
- Bullet points with each partner/supplier

**Slide 3: Key Activities**
- Title: "Key Activities"
- Bullet points with each key activity

**Slide 4: Key Resources**
- Title: "Key Resources"
- Bullet points with each key resource

**Slide 5: Value Propositions**
- Title: "Value Propositions"
- Bullet points with each value proposition

**Slide 6: Customer Relationships**
- Title: "Customer Relationships"
- Bullet points with each relationship type

**Slide 7: Channels**
- Title: "Channels"
- Bullet points with each channel

**Slide 8: Customer Segments**
- Title: "Customer Segments"
- Bullet points with each customer segment

**Slide 9: Cost Structure**
- Title: "Cost Structure"
- Bullet points with each cost category

**Slide 10: Revenue Streams**
- Title: "Revenue Streams"
- Bullet points with each revenue source

## Option 2: Single Slide Format

Create one slide with 9 labeled text boxes:
- Each text box should have a clear title (e.g., "Key Partners:")
- Follow with bullet points for content

## Formatting Tips

- Use consistent bullet points (•, -, or numbers)
- Keep titles exactly as shown above for automatic recognition
- Avoid special characters in titles
- Each bullet point becomes one item in the canvas
- Empty sections will show "(No content provided)"

## Import Process

1. Save your PowerPoint file to OneDrive/SharePoint
2. Use the import feature in the business model canvas app
3. The app will automatically parse and convert your content
    `;
  }
}

export const powerpointImporter = new PowerPointImporter();