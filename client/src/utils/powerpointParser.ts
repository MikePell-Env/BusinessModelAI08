import JSZip from 'jszip';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';

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

export class PowerPointParser {
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

  async parseFile(file: File): Promise<BusinessModelCanvas> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Extract text content from PowerPoint slides
      const slideTexts = await this.extractSlideTexts(zip);
      
      // Parse the extracted text into canvas format
      return this.parseTextToCanvas(slideTexts, file.name);
      
    } catch (error) {
      console.error('PowerPoint parsing failed:', error);
      throw new Error(`Failed to parse PowerPoint file: ${error.message}`);
    }
  }

  private async extractSlideTexts(zip: JSZip): Promise<string[]> {
    const slideTexts: string[] = [];
    
    try {
      // Get all slide files (slide1.xml, slide2.xml, etc.)
      const slideFiles = Object.keys(zip.files)
        .filter(filename => filename.match(/ppt\/slides\/slide\d+\.xml$/))
        .sort();

      for (const filename of slideFiles) {
        const slideFile = zip.files[filename];
        if (slideFile) {
          const xmlContent = await slideFile.async('text');
          const slideText = this.extractTextFromSlideXML(xmlContent);
          if (slideText.trim()) {
            slideTexts.push(slideText);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting slide texts:', error);
    }

    return slideTexts;
  }

  private extractTextFromSlideXML(xmlContent: string): string {
    try {
      // Extract text from PowerPoint XML using regex
      // PowerPoint text is stored in <a:t> tags within the XML
      const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      
      if (!textMatches) return '';
      
      const texts = textMatches
        .map(match => {
          // Extract text content from the tag
          const textContent = match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1');
          // Decode XML entities
          return textContent
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
        })
        .filter(text => text.trim().length > 0);

      return texts.join('\n');
    } catch (error) {
      console.error('Error parsing slide XML:', error);
      return '';
    }
  }

  private parseTextToCanvas(slideTexts: string[], filename: string): BusinessModelCanvas {
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

    // Combine all slide text
    const allText = slideTexts.join('\n');
    
    // Extract company name from "Company:" field
    const companyName = this.extractCompanyName(allText);
    
    // Parse the combined text for business model canvas sections
    this.parseSingleSlideContent(allText, canvasData);
    
    // Use company name as canvas title, fallback to filename
    const canvasName = companyName || filename.replace(/\.(pptx?|ppt)$/i, '') || 'Imported Business Model Canvas';
    
    return this.createCanvasFromMapping(
      canvasData,
      canvasName,
      `Business model canvas imported from ${filename}`
    );
  }

  private parseSingleSlideContent(content: string, canvasData: PowerPointCanvasMapping): void {
    const sections = this.extractSectionsFromText(content);
    
    for (const section of sections) {
      const sectionKey = this.findSectionKey(section.title.toLowerCase());
      if (sectionKey && canvasData[sectionKey as keyof PowerPointCanvasMapping]) {
        canvasData[sectionKey as keyof PowerPointCanvasMapping].push(...section.items);
      }
    }
  }

  private extractSectionsFromText(content: string): Array<{title: string, items: string[]}> {
    const sections: Array<{title: string, items: string[]}> = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection: {title: string, items: string[]} | null = null;
    
    for (const line of lines) {
      if (this.isSectionHeader(line)) {
        // Save previous section
        if (currentSection && currentSection.items.length > 0) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: line,
          items: []
        };
      } else if (this.isBulletPoint(line) && currentSection) {
        const cleanedItem = this.cleanBulletPoint(line);
        if (cleanedItem) {
          currentSection.items.push(cleanedItem);
        }
      } else if (currentSection && line.length > 0 && !this.isSectionHeader(line)) {
        // Add non-bullet content as regular items
        currentSection.items.push(line);
      }
    }
    
    // Don't forget the last section
    if (currentSection && currentSection.items.length > 0) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  private isSectionHeader(line: string): boolean {
    const normalizedLine = line.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return this.sectionTitleMap.has(normalizedLine);
  }

  private isBulletPoint(line: string): boolean {
    return /^[\s]*[•·▪▫‣⁃∗\-\*\+]\s/.test(line);
  }

  private cleanBulletPoint(line: string): string {
    return line.replace(/^[\s]*[•·▪▫‣⁃∗\-\*\+]\s*/, '').trim();
  }

  private extractCompanyName(content: string): string | null {
    try {
      // Look for "Company:" followed by the company name
      const companyMatch = content.match(/Company:\s*([^\n\r]+)/i);
      if (companyMatch && companyMatch[1]) {
        return companyMatch[1].trim();
      }
      
      // Also try variations like "Company Name:", "Business:", etc.
      const alternativeMatches = [
        /Company\s+Name:\s*([^\n\r]+)/i,
        /Business:\s*([^\n\r]+)/i,
        /Organization:\s*([^\n\r]+)/i,
        /Empresa:\s*([^\n\r]+)/i // Spanish
      ];
      
      for (const pattern of alternativeMatches) {
        const match = content.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting company name:', error);
      return null;
    }
  }

  private findSectionKey(normalizedTitle: string): string | undefined {
    const cleanTitle = normalizedTitle.replace(/[^\w\s]/g, '').trim();
    return this.sectionTitleMap.get(cleanTitle);
  }

  private createCanvasFromMapping(
    mapping: PowerPointCanvasMapping,
    name: string,
    description: string
  ): BusinessModelCanvas {
    const createCanvasElement = (id: string, title: string, content: string[], color: string): CanvasElement => ({
      id,
      title,
      content: content.length > 0 ? content : [`Add ${title.toLowerCase()} details here`],
      color
    });

    return {
      id: `canvas-${Date.now()}`,
      name,
      description,
      keyPartners: createCanvasElement('key-partners', 'Key Partners', mapping.keyPartners, '#E3F2FD'),
      keyActivities: createCanvasElement('key-activities', 'Key Activities', mapping.keyActivities, '#F3E5F5'),
      keyResources: createCanvasElement('key-resources', 'Key Resources', mapping.keyResources, '#E8F5E8'),
      valuePropositions: createCanvasElement('value-propositions', 'Value Propositions', mapping.valuePropositions, '#FFF3E0'),
      customerRelationships: createCanvasElement('customer-relationships', 'Customer Relationships', mapping.customerRelationships, '#FCE4EC'),
      channels: createCanvasElement('channels', 'Channels', mapping.channels, '#E0F2F1'),
      customerSegments: createCanvasElement('customer-segments', 'Customer Segments', mapping.customerSegments, '#F1F8E9'),
      costStructure: createCanvasElement('cost-structure', 'Cost Structure', mapping.costStructure, '#FFEBEE'),
      revenueStreams: createCanvasElement('revenue-streams', 'Revenue Streams', mapping.revenueStreams, '#E8EAF6'),
      lastModified: new Date().toISOString()
    };
  }
}

export const powerpointParser = new PowerPointParser();