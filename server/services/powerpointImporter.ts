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
 * SINGLE SLIDE BUSINESS MODEL CANVAS LAYOUT:
 * 
 * +------------------+------------------+------------------+------------------+------------------+
 * |   Key Partners   |  Key Activities  |  Value Props.    | Customer Relat.  | Customer Segm.   |
 * |                  |                  |                  |                  |                  |
 * | • Partner 1      | • Activity 1     | • Value 1        | • Relationship 1 | • Segment 1      |
 * | • Partner 2      | • Activity 2     | • Value 2        | • Relationship 2 | • Segment 2      |
 * | • Partner 3      | • Activity 3     | • Value 3        | • Relationship 3 | • Segment 3      |
 * |                  |                  |                  |                  |                  |
 * +------------------+------------------+                  +------------------+------------------+
 * |  Key Resources   |                                     |     Channels     |
 * |                  |                                     |                  |
 * | • Resource 1     |                                     | • Channel 1      |
 * | • Resource 2     |                                     | • Channel 2      |
 * | • Resource 3     |                                     | • Channel 3      |
 * |                  |                                     |                  |
 * +------------------+-------------------------------------+------------------+
 * |              Cost Structure                            |          Revenue Streams            |
 * |                                                        |                                     |
 * | • Cost 1        • Cost 3         • Cost 5             | • Revenue 1    • Revenue 3         |
 * | • Cost 2        • Cost 4         • Cost 6             | • Revenue 2    • Revenue 4         |
 * |                                                        |                                     |
 * +--------------------------------------------------------+-------------------------------------+
 * 
 * Each section should be a separate text box with:
 * - Section title as header
 * - Bullet points for content items
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
   * Parse single slide Business Model Canvas format
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

    // For single slide format, we expect one slide with multiple text boxes
    if (slides.length === 1) {
      // Parse canvas name from slide title
      canvasName = slides[0].title || canvasName;
      
      // Parse all content and map to sections based on keywords
      const allContent = slides[0].content.join('\n');
      this.parseSingleSlideContent(allContent, canvasData);
    } else {
      // Fallback: multi-slide format (legacy support)
      slides.forEach((slide, index) => {
        if (index === 0) {
          canvasName = slide.title || canvasName;
          canvasDescription = slide.content.join(' ') || canvasDescription;
          return;
        }

        const normalizedTitle = slide.title.toLowerCase().trim();
        const sectionKey = this.sectionTitleMap.get(normalizedTitle);
        
        if (sectionKey && canvasData[sectionKey as keyof PowerPointCanvasMapping]) {
          canvasData[sectionKey as keyof PowerPointCanvasMapping] = slide.content.filter(item => item.trim().length > 0);
        }
      });
    }

    return this.createCanvasFromMapping(canvasData, canvasName, canvasDescription);
  }

  /**
   * Parse single slide with Business Model Canvas layout
   */
  private parseSingleSlideContent(content: string, canvasData: PowerPointCanvasMapping): void {
    // Split content into sections based on headers and bullet points
    const sections = this.extractSectionsFromText(content);
    
    sections.forEach(section => {
      const normalizedTitle = section.title.toLowerCase().trim();
      const sectionKey = this.findSectionKey(normalizedTitle);
      
      if (sectionKey && canvasData[sectionKey as keyof PowerPointCanvasMapping]) {
        canvasData[sectionKey as keyof PowerPointCanvasMapping] = section.items;
      }
    });
  }

  /**
   * Extract sections from text content
   */
  private extractSectionsFromText(content: string): Array<{title: string, items: string[]}> {
    const sections: Array<{title: string, items: string[]}> = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection: {title: string, items: string[]} | null = null;
    
    for (const line of lines) {
      // Check if line is a section header (contains keywords and ends with colon or is standalone)
      if (this.isSectionHeader(line)) {
        // Save previous section
        if (currentSection && currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: line.replace(':', '').trim(),
          items: []
        };
      } else if (currentSection && this.isBulletPoint(line)) {
        // Add bullet point to current section
        const cleanedItem = this.cleanBulletPoint(line);
        if (cleanedItem.length > 0) {
          currentSection.items.push(cleanedItem);
        }
      }
    }
    
    // Add final section
    if (currentSection && currentSection.items.length > 0) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Check if line is a section header
   */
  private isSectionHeader(line: string): boolean {
    const normalizedLine = line.toLowerCase().replace(/[:\-\s]/g, '');
    const keywords = [
      'keypartners', 'partners',
      'keyactivities', 'activities', 
      'keyresources', 'resources',
      'valuepropositions', 'valueproposition', 'value',
      'customerrelationships', 'relationships',
      'channels',
      'customersegments', 'segments', 'customers',
      'coststructure', 'costs',
      'revenuestreams', 'revenue'
    ];
    
    return keywords.some(keyword => normalizedLine.includes(keyword));
  }

  /**
   * Check if line is a bullet point
   */
  private isBulletPoint(line: string): boolean {
    const bulletPatterns = /^[\s]*[•\-\*\+\d+\.]\s+/;
    return bulletPatterns.test(line);
  }

  /**
   * Clean bullet point text
   */
  private cleanBulletPoint(line: string): string {
    return line.replace(/^[\s]*[•\-\*\+\d+\.]\s*/, '').trim();
  }

  /**
   * Find section key from normalized title
   */
  private findSectionKey(normalizedTitle: string): string | undefined {
    // Direct mapping first
    const directMatch = this.sectionTitleMap.get(normalizedTitle);
    if (directMatch) return directMatch;
    
    // Fuzzy matching for keywords
    const titleWords = normalizedTitle.toLowerCase().replace(/[:\-\s]/g, '');
    
    if (titleWords.includes('partner')) return 'keyPartners';
    if (titleWords.includes('activit')) return 'keyActivities';
    if (titleWords.includes('resource')) return 'keyResources';
    if (titleWords.includes('value') || titleWords.includes('proposition')) return 'valuePropositions';
    if (titleWords.includes('relationship')) return 'customerRelationships';
    if (titleWords.includes('channel')) return 'channels';
    if (titleWords.includes('segment') || titleWords.includes('customer')) return 'customerSegments';
    if (titleWords.includes('cost')) return 'costStructure';
    if (titleWords.includes('revenue')) return 'revenueStreams';
    
    return undefined;
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
# Business Model Canvas PowerPoint Template

## SINGLE SLIDE FORMAT (Recommended)

Create ONE PowerPoint slide that looks exactly like a Business Model Canvas:

### Layout Structure:
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Key Partners   │ Key Activities  │ Value Props.    │ Customer Relat. │ Customer Segm.  │
│                 │                 │                 │                 │                 │
│ • Partner 1     │ • Activity 1    │ • Value 1       │ • Relationship 1│ • Segment 1     │
│ • Partner 2     │ • Activity 2    │ • Value 2       │ • Relationship 2│ • Segment 2     │
│ • Partner 3     │ • Activity 3    │ • Value 3       │ • Relationship 3│ • Segment 3     │
├─────────────────┼─────────────────┤                 ├─────────────────┼─────────────────┤
│ Key Resources   │                 │                 │    Channels     │
│                 │                 │                 │                 │
│ • Resource 1    │                 │                 │ • Channel 1     │
│ • Resource 2    │                 │                 │ • Channel 2     │
│ • Resource 3    │                 │                 │ • Channel 3     │
├─────────────────┴─────────────────┴─────────────────┼─────────────────┤
│              Cost Structure                         │   Revenue Streams              │
│                                                     │                                │
│ • Cost 1        • Cost 3         • Cost 5          │ • Revenue 1    • Revenue 3     │
│ • Cost 2        • Cost 4         • Cost 6          │ • Revenue 2    • Revenue 4     │
└─────────────────────────────────────────────────────┴────────────────────────────────┘

### How to Create:

1. **Insert Text Boxes**: Create 9 separate text boxes for each section
2. **Position Like Canvas**: Arrange them exactly like the layout above
3. **Add Section Headers**: Start each text box with the section name
4. **Use Bullet Points**: List items with • or - bullets
5. **Keep It Simple**: One line per business model element

### Section Headers (use exactly):
- Key Partners
- Key Activities  
- Key Resources
- Value Propositions (or "Value Props")
- Customer Relationships (or "Customer Relat.")
- Channels
- Customer Segments (or "Customer Segm.")
- Cost Structure
- Revenue Streams

### Example Text Box Content:

**Key Partners:**
• Cloud infrastructure providers
• Technology integration partners
• Strategic investors and VCs
• Academic research institutions

**Value Propositions:**
• AI-powered business optimization
• Automated decision-making tools
• Real-time analytics and insights
• Cost reduction through automation

### Formatting Tips:
- Use consistent bullet points (• or -)
- One business element per line
- Keep descriptions concise
- Empty sections are okay
- Slide title becomes canvas name

### Import Process:
1. Save PowerPoint to OneDrive/SharePoint
2. Get File ID from the URL
3. Click "Import from PowerPoint" in app
4. Enter File ID and import

The app will automatically detect the Business Model Canvas layout and convert each text box into the corresponding canvas section.
    `;
  }
}

export const powerpointImporter = new PowerPointImporter();