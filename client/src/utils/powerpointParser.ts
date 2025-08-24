import JSZip from 'jszip';
import { BusinessModelCanvas, CanvasElement } from '@/types/canvas';
// Removed overviewAnalyzer import for immediate extraction

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
      return await this.parseTextToCanvas(slideTexts, file.name);
      
    } catch (error) {
      console.error('PowerPoint parsing failed:', error);
      throw new Error(`Failed to parse PowerPoint file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // Extract text from PowerPoint XML by looking at paragraph structures
      // PowerPoint organizes text in <a:p> (paragraph) tags containing <a:t> (text) tags
      const paragraphMatches = xmlContent.match(/<a:p[^>]*>[\s\S]*?<\/a:p>/g);
      
      if (!paragraphMatches) {
        // Fallback to original method if no paragraph structure found
        const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
        if (!textMatches) return '';
        
        const texts = textMatches
          .map(match => {
            const textContent = match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1');
            return this.decodeXMLEntities(textContent);
          })
          .filter(text => text.trim().length > 0);
        
        return texts.join('\n');
      }
      
      const paragraphTexts = paragraphMatches
        .map(paragraph => {
          // Extract all text content from within this paragraph
          const textMatches = paragraph.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
          if (!textMatches) return '';
          
          const textsInParagraph = textMatches
            .map(match => {
              const textContent = match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1');
              return this.decodeXMLEntities(textContent);
            })
            .filter(text => text.trim().length > 0);
          
          // Join text within the same paragraph with spaces (not newlines)
          return textsInParagraph.join(' ').trim();
        })
        .filter(text => text.length > 0);

      return paragraphTexts.join('\n');
    } catch (error) {
      console.error('Error parsing slide XML:', error);
      return '';
    }
  }

  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  private async parseTextToCanvas(slideTexts: string[], filename: string): Promise<BusinessModelCanvas> {
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
    
    // Create the canvas object
    const canvas = this.createCanvasFromMapping(
      canvasData,
      canvasName,
      'Business model canvas'
    );

    // Immediate synchronous extraction of overview data
    console.log('⚡ Instantly extracting overview information...');
    canvas.overviewData = {
      companyName: companyName || this.extractCompanyFromTitle(allText) || 'Your Company',
      summary: this.extractSummary(allText),
      founders: this.extractFounders(allText),
      market: this.extractMarket(allText),
      website: this.extractWebsite(allText)
    };
    console.log('✅ Instant overview extraction complete:', canvas.overviewData);
    
    return canvas;
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
    
    console.log('PowerPoint Parser - Processing lines:', lines);
    
    for (const line of lines) {
      if (this.isSectionHeader(line)) {
        // Save previous section
        if (currentSection && currentSection.items.length > 0) {
          console.log(`PowerPoint Parser - Completed section: ${currentSection.title}`, currentSection.items);
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: line,
          items: []
        };
        console.log(`PowerPoint Parser - Started new section: ${line}`);
      } else if (this.isBulletPoint(line) && currentSection) {
        const cleanedItem = this.cleanBulletPoint(line);
        if (cleanedItem && !this.isCompanyInformation(cleanedItem) && !this.isStandaloneKeyword(cleanedItem) && !this.isRelevantToAnotherSection(cleanedItem, currentSection.title)) {
          currentSection.items.push(cleanedItem);
          console.log(`PowerPoint Parser - Added bullet item to ${currentSection.title}: ${cleanedItem}`);
        }
      } else if (currentSection && line.length > 0 && !this.isSectionHeader(line) && !this.isCompanyInformation(line) && !this.isStandaloneKeyword(line)) {
        // Add non-bullet content as regular items, but filter out very long paragraphs and exclude company information
        if (this.isValidContentItem(line) && !this.isRelevantToAnotherSection(line, currentSection.title)) {
          currentSection.items.push(line);
          console.log(`PowerPoint Parser - Added regular item to ${currentSection.title}: ${line}`);
        } else {
          console.log(`PowerPoint Parser - Skipped item for ${currentSection.title}: ${line.substring(0, 50)}...`);
        }
      }
    }
    
    // Don't forget the last section
    if (currentSection && currentSection.items.length > 0) {
      console.log(`PowerPoint Parser - Completed final section: ${currentSection.title}`, currentSection.items);
      sections.push(currentSection);
    }
    
    console.log('PowerPoint Parser - Final sections:', sections);
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

  private isCompanyInformation(line: string): boolean {
    // Check if line contains company identification patterns that should be excluded from content
    const companyPatterns = [
      /^Company:\s*/i,
      /^Company\s+Name:\s*/i,
      /^Business:\s*/i,
      /^Organization:\s*/i,
      /^Empresa:\s*/i, // Spanish
      /Envisioner,?\s*Inc\.?/i,
      /Business\s+Model/i,
      /^Inc\.?\s*$/i,
      /^\s*Envisioner\s*$/i
    ];
    
    return companyPatterns.some(pattern => pattern.test(line));
  }

  private isStandaloneKeyword(line: string): boolean {
    // Check if line is just a standalone keyword that shouldn't be content
    const standaloneKeywords = [
      /^Key$/i,
      /^Partners$/i,
      /^Activities$/i,
      /^Resources$/i,
      /^Startup,?\s*Inc\.?$/i,
      /^Inc\.?$/i,
      /^Company$/i,
      /^Business$/i,
      /^Model$/i,
      /^Envisioner$/i,
      /^Revenue$/i,
      /^Streams$/i,
      /^Cost$/i,
      /^Structure$/i,
      /^Financials?$/i,
      /^\d{4}$/i, // Years like 2025
      /^H[12]$/i // H1, H2
    ];
    
    return standaloneKeywords.some(pattern => pattern.test(line.trim()));
  }

  private isValidContentItem(line: string): boolean {
    // Filter out content that's too long for canvas display or seems like descriptive paragraphs
    const trimmedLine = line.trim();
    
    // Skip very long lines (likely paragraphs)
    if (trimmedLine.length > 120) {
      return false;
    }
    
    // Skip lines that look like full sentences/paragraphs (contain multiple sentences)
    const sentenceCount = (trimmedLine.match(/[.!?]+/g) || []).length;
    if (sentenceCount > 1) {
      return false;
    }
    
    // Skip lines that contain too many common paragraph words
    const paragraphIndicators = [
      'however', 'therefore', 'furthermore', 'moreover', 'additionally',
      'consequently', 'nevertheless', 'nonetheless', 'meanwhile', 'ultimately',
      'specifically', 'particularly', 'essentially', 'generally', 'typically'
    ];
    const words = trimmedLine.toLowerCase().split(/\s+/);
    const paragraphWordCount = words.filter(word => 
      paragraphIndicators.some(indicator => word.includes(indicator))
    ).length;
    
    if (paragraphWordCount > 1) {
      return false;
    }
    
    // Skip lines that start with typical paragraph starters
    const paragraphStarters = [
      /^The key differentiating factor/i,
      /^Combined with the ability/i,
      /^This approach/i,
      /^Our strategy/i,
      /^The company/i,
      /^Based on/i,
      /^According to/i,
      /^In order to/i,
      /^With the goal/i
    ];
    
    if (paragraphStarters.some(pattern => pattern.test(trimmedLine))) {
      return false;
    }
    
    return true;
  }

  private isRelevantToAnotherSection(line: string, currentSectionTitle: string): boolean {
    // Check if the content seems more relevant to another section or is financial/projection data
    const trimmedLine = line.toLowerCase();
    const currentSectionKey = this.findSectionKey(currentSectionTitle.toLowerCase());
    
    // For Revenue Streams specifically, be very restrictive - only allow actual revenue stream types
    if (currentSectionKey === 'revenueStreams') {
      // Only allow specific revenue stream patterns
      const validRevenueStreamPatterns = [
        /subscription\s+fees?/i,
        /licensing\s+(deals?|fees?)/i,
        /transaction\s+fees?/i,
        /api\s+usage/i,
        /professional\s+services?/i,
        /consulting/i,
        /training\s+(and\s+certification\s+)?programs?/i,
        /certification\s+programs?/i,
        /enterprise\s+licensing/i,
        /monthly\s+subscription/i,
        /saas\s+subscription/i,
        /software\s+licensing/i,
        /commission/i,
        /advertising\s+revenue/i,
        /freemium/i,
        /one[\-\s]time\s+purchase/i
      ];
      
      // If it doesn't match typical revenue stream patterns, exclude it
      if (!validRevenueStreamPatterns.some(pattern => pattern.test(trimmedLine))) {
        // Exclude specific problematic content we've seen
        const excludePatterns = [
          /^rev$/i,
          /^exp$/i,
          /^\$\$?\s*profitable$/i,
          /^year\s+\d+$/i,
          /projections?\s+based\s+on/i,
          /funding\s+h[12]/i,
          /financials?$/i,
          /pro\s+forma/i,
          /see\s+the.*for\s+detail/i,
          /^\$[\d.,]+[kmb]?$/i, // Dollar amounts like $6.3M, $5.7M
          /^\d{4}$/, // Years like 2025
          /h[12]\s+of\s+\d{4}/i, // H1 of 2025, H2 of 2025
          /revenue\s+projection/i,
          /financial\s+forecast/i,
          /profit/i,
          /margin/i,
          /forecast/i,
          /projection/i,
          /budget/i,
          /financial/i
        ];
        
        if (excludePatterns.some(pattern => pattern.test(trimmedLine))) {
          console.log(`PowerPoint Parser - Filtered non-revenue-stream content: ${line}`);
          return true;
        }
      }
    }
    
    // Don't allow content that mentions other sections
    const sectionMentions = [
      { keywords: ['partner', 'alliance', 'supplier'], section: 'keyPartners' },
      { keywords: ['activity', 'process', 'operation'], section: 'keyActivities' },
      { keywords: ['resource', 'asset', 'infrastructure'], section: 'keyResources' },
      { keywords: ['value proposition', 'benefit', 'solution'], section: 'valuePropositions' },
      { keywords: ['relationship', 'support', 'service'], section: 'customerRelationships' },
      { keywords: ['channel', 'distribution', 'sales'], section: 'channels' },
      { keywords: ['segment', 'customer', 'target'], section: 'customerSegments' },
      { keywords: ['cost', 'expense', 'overhead'], section: 'costStructure' },
      { keywords: ['revenue', 'income', 'pricing', 'subscription', 'fee'], section: 'revenueStreams' }
    ];
    
    for (const sectionInfo of sectionMentions) {
      if (sectionInfo.section !== currentSectionKey) {
        // Check if this line contains keywords strongly associated with another section
        const keywordMatches = sectionInfo.keywords.filter(keyword => 
          trimmedLine.includes(keyword)
        ).length;
        
        // If this line has 2+ keywords from another section, it probably belongs there
        if (keywordMatches >= 2) {
          console.log(`PowerPoint Parser - Content "${line}" seems more relevant to ${sectionInfo.section} than ${currentSectionKey}`);
          return true;
        }
      }
    }
    
    return false;
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

  // Quick extraction methods for overview data
  private extractCompanyFromTitle(content: string): string | null {
    try {
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Check first few lines for company names (usually in title slide)
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i];
        
        // Simple cleanup of excessive spaces
        const cleanedLine = line.replace(/\s+/g, ' ').trim();
        
        // Look for existing patterns with Corp, Inc, etc.
        if (cleanedLine.match(/\b\w+.*\s+(Corp|Inc|LLC|Ltd|Company|Technologies|Tech|Solutions|Group|Enterprises)\b/i)) {
          return cleanedLine;
        }
        
        // Look for all caps that look like company names (fix spacing issues)
        if (line.match(/^[A-Z\s]{3,30}$/) && !line.includes('SUMMARY') && !line.includes('DETAILS') && !line.includes('FOUNDERS')) {
          return cleanedLine;
        }
        
        // Look for title-case company names
        if (cleanedLine.match(/^[A-Z][a-zA-Z\s&]{2,40}$/) && cleanedLine.length > 3 && cleanedLine.length < 50 && !cleanedLine.includes('SUMMARY') && !cleanedLine.includes('DETAILS')) {
          return cleanedLine;
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractSummary(content: string): string[] {
    try {
      // Look for descriptive paragraphs anywhere in content
      const lines = content.split('\n')
        .map(line => line.trim().replace(/\s+/g, ' '))
        .filter(line => line.length > 30);
      
      const businessDescriptions = lines.filter(line => 
        (/\b(company|business|delivers|breakthrough|simulation|enables|provides|Inc\.|capabilities)\b/i.test(line) ||
         /\b(AI|technology|global|future|decision|fast)\b/i.test(line)) &&
        !line.match(/^(SUMMARY|DETAILS|FOUNDERS|KEY|MISSION)/i) &&
        line.length > 20
      );
      
      if (businessDescriptions.length > 0) {
        return businessDescriptions.slice(0, 3).map(line => line.replace(/\s+/g, ' ').trim());
      }

      return [
        'Business overview will be extracted from your PowerPoint presentation using Microsoft Copilot.',
        'Upload a presentation to see detailed company summary and market analysis.',
        'This section will provide AI-powered insights into your business model and opportunities.'
      ];
    } catch (error) {
      return ['Business summary extraction in progress...'];
    }
  }

  private extractFounders(content: string): string[] {
    try {
      // Look for any text after FOUNDERS keyword
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 2);
      
      // Find lines containing founder-related info
      const founderLines = [];
      let foundFoundersSection = false;
      
      for (const line of lines) {
        if (line.match(/FOUNDERS|LEADERSHIP/i)) {
          foundFoundersSection = true;
          continue;
        }
        
        if (foundFoundersSection && founderLines.length < 3) {
          if (line.match(/^(SUMMARY|DETAILS|MISSION|KEY)/i)) {
            break; // Hit next section
          }
          if (line.length > 5 && line.length < 100) {
            founderLines.push(line.replace(/\s+/g, ' ').trim());
          }
        }
      }
      
      if (founderLines.length > 0) {
        return founderLines;
      }

      return [
        'Founder and leadership information will be analyzed and displayed here.',
        'Microsoft Copilot will extract details about the team background and experience.',
        'Upload your presentation to see AI-analyzed team member profiles and expertise.'
      ];
    } catch (error) {
      return ['Founder information extraction in progress...'];
    }
  }

  private extractMarket(content: string): string[] {
    try {
      const marketPatterns = [
        /(?:target market|market size|market opportunity|addressable market|tam|sam|som):\s*([^\n]+(?:\n[^\n]+)*)/gi,
        /(?:customers|customer segments|target customers|target audience):\s*([^\n]+(?:\n[^\n]+)*)/gi,
        /(?:market analysis|market research|industry analysis|competitive landscape):\s*([^\n]+(?:\n[^\n]+)*)/gi,
        /(?:market trends|industry trends|market growth|market potential):\s*([^\n]+(?:\n[^\n]+)*)/gi
      ];

      const foundMarketInfo = [];
      
      for (const pattern of marketPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null && foundMarketInfo.length < 3) {
          if (match[1]) {
            const marketInfo = match[1].trim();
            if (marketInfo.length > 10) {
              foundMarketInfo.push(marketInfo);
            }
          }
        }
      }

      if (foundMarketInfo.length > 0) {
        return foundMarketInfo;
      }

      // Look for market-related content in bullet points or general text
      const lines = content.split('\n').map(line => line.trim().replace(/\s+/g, ' '));
      const marketContent = lines.filter(line => 
        line.length > 20 && line.length < 200 &&
        (/\b(market|industry|customers|segments|target|addressable|billion|million|growth|demand)\b/i.test(line) ||
         /\b(enterprises|businesses|organizations|companies|consumers|users)\b/i.test(line) ||
         /\$[\d,.]+(B|M|K|billion|million|thousand)/i.test(line)) &&
        !line.match(/^(SUMMARY|DETAILS|FOUNDERS|KEY|MISSION|WEBSITE)/i)
      );
      
      if (marketContent.length > 0) {
        return marketContent.slice(0, 3);
      }

      return [
        'Market analysis and target customer information will be extracted from your slides.',
        'This includes market size, customer segments, and competitive landscape insights.',
        'Upload your PowerPoint presentation to see detailed market opportunity analysis.'
      ];
    } catch (error) {
      return ['Market information extraction in progress...'];
    }
  }

  private extractWebsite(content: string): string[] {
    try {
      const websites = [];
      
      // Look for URLs in the content
      const urlPattern = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"]*)?)/gi;
      const matches = content.match(urlPattern);
      
      if (matches) {
        for (const match of matches) {
          let cleanUrl = match.trim().replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
          
          // Add https:// if it starts with www.
          if (cleanUrl.startsWith('www.')) {
            cleanUrl = 'https://' + cleanUrl;
          }
          
          // Filter out common non-website patterns
          if (!cleanUrl.match(/\.(jpg|jpeg|png|gif|pdf|doc|docx|ppt|pptx)$/i) && 
              cleanUrl.length > 5 && 
              websites.length < 3) {
            websites.push(cleanUrl);
          }
        }
      }
      
      // Look for domain-like patterns without protocols
      const domainPattern = /\b([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|co|io|ai|tech))\b/gi;
      const domainMatches = content.match(domainPattern);
      
      if (domainMatches && websites.length < 3) {
        for (const domain of domainMatches) {
          const cleanDomain = 'https://' + domain.trim();
          if (!websites.includes(cleanDomain) && websites.length < 3) {
            websites.push(cleanDomain);
          }
        }
      }
      
      if (websites.length > 0) {
        return websites;
      }
      
      return ['Website information will be extracted from your PowerPoint presentation.'];
    } catch (error) {
      return ['Website extraction in progress...'];
    }
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