export type VoiceCommandType = 
  | 'camera_left'
  | 'camera_right'
  | 'camera_top'
  | 'camera_front'
  | 'camera_zoom_in'
  | 'camera_zoom_out'
  | 'camera_reset'
  | 'template_business_model'
  | 'template_financials'
  | 'select_section'
  | 'deselect'
  | 'unknown';

export interface VoiceCommand {
  type: VoiceCommandType;
  payload?: string;
  confidence: number;
  transcript: string;
}

interface CommandPattern {
  type: VoiceCommandType;
  patterns: RegExp[];
  payload?: (match: RegExpMatchArray) => string | undefined;
}

const SECTION_ALIASES: Record<string, string> = {
  'key partners': 'Key Partners',
  'partners': 'Key Partners',
  'key activities': 'Key Activities',
  'activities': 'Key Activities',
  'key resources': 'Key Resources',
  'resources': 'Key Resources',
  'value propositions': 'Value Propositions',
  'value proposition': 'Value Propositions',
  'value prop': 'Value Propositions',
  'customer relationships': 'Customer Relationships',
  'relationships': 'Customer Relationships',
  'customer channels': 'Customer Channels',
  'channels': 'Customer Channels',
  'customer segments': 'Customer Segments',
  'segments': 'Customer Segments',
  'cost structure': 'Cost Structure',
  'costs': 'Cost Structure',
  'revenue streams': 'Revenue Streams',
  'revenue': 'Revenue Streams',
};

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    type: 'camera_left',
    patterns: [
      /\b(?:go|move|switch|show|view)\s+(?:to\s+)?(?:the\s+)?left/i,
      /\bleft\s+view\b/i,
      /\bperspective\s+left\b/i,
      /\brotate\s+left\b/i,
    ],
  },
  {
    type: 'camera_right',
    patterns: [
      /\b(?:go|move|switch|show|view)\s+(?:to\s+)?(?:the\s+)?right/i,
      /\bright\s+view\b/i,
      /\bperspective\s+right\b/i,
      /\brotate\s+right\b/i,
    ],
  },
  {
    type: 'camera_top',
    patterns: [
      /\b(?:go|move|switch|show|view)\s+(?:to\s+)?(?:the\s+)?top/i,
      /\btop\s+(?:view|down)\b/i,
      /\bbird'?s?\s*eye/i,
      /\boverview\b/i,
      /\blook\s+down\b/i,
    ],
  },
  {
    type: 'camera_front',
    patterns: [
      /\b(?:go|move|switch|show|view)\s+(?:to\s+)?(?:the\s+)?front/i,
      /\bfront\s+view\b/i,
      /\bface\s+(?:me|front)\b/i,
    ],
  },
  {
    type: 'camera_zoom_in',
    patterns: [
      /\bzoom\s+in\b/i,
      /\bcloser\b/i,
      /\bget\s+closer\b/i,
      /\bmagnify\b/i,
    ],
  },
  {
    type: 'camera_zoom_out',
    patterns: [
      /\bzoom\s+out\b/i,
      /\bfarther\b/i,
      /\bpull\s+(?:back|out)\b/i,
      /\bwider\b/i,
    ],
  },
  {
    type: 'camera_reset',
    patterns: [
      /\breset\s+(?:camera|view)\b/i,
      /\bdefault\s+view\b/i,
      /\breset\b/i,
    ],
  },
  {
    type: 'template_business_model',
    patterns: [
      /\b(?:show|open|switch\s+to|go\s+to)\s+(?:the\s+)?business\s+model/i,
      /\bbusiness\s+model\s+canvas\b/i,
      /\bBMC\b/i,
      /\bshow\s+(?:the\s+)?canvas\b/i,
    ],
  },
  {
    type: 'template_financials',
    patterns: [
      /\b(?:show|open|switch\s+to|go\s+to)\s+(?:the\s+)?financials?\b/i,
      /\bincome\s+statement\b/i,
      /\bfinancial\s+(?:view|data|model)\b/i,
    ],
  },
  {
    type: 'deselect',
    patterns: [
      /\b(?:deselect|unselect|clear)\s*(?:all|selection)?\b/i,
      /\bclose\s+panel\b/i,
      /\bnothing\b/i,
    ],
  },
];

const SECTION_PATTERN = /\b(?:select|show|open|click|focus\s+on|highlight)\s+(?:the\s+)?([\w\s]+)/i;

export class VoiceCommandEngine {
  public parse(transcript: string): VoiceCommand {
    const cleaned = transcript.trim().toLowerCase();

    for (const cmd of COMMAND_PATTERNS) {
      for (const pattern of cmd.patterns) {
        const match = cleaned.match(pattern);
        if (match) {
          return {
            type: cmd.type,
            payload: cmd.payload?.(match),
            confidence: 1.0,
            transcript,
          };
        }
      }
    }

    const sectionMatch = cleaned.match(SECTION_PATTERN);
    if (sectionMatch) {
      const spoken = sectionMatch[1].trim().toLowerCase();
      const resolved = this.resolveSection(spoken);
      if (resolved) {
        return {
          type: 'select_section',
          payload: resolved,
          confidence: 0.9,
          transcript,
        };
      }
    }

    for (const [alias, section] of Object.entries(SECTION_ALIASES)) {
      if (cleaned.includes(alias)) {
        return {
          type: 'select_section',
          payload: section,
          confidence: 0.7,
          transcript,
        };
      }
    }

    return { type: 'unknown', confidence: 0, transcript };
  }

  private resolveSection(spoken: string): string | null {
    if (SECTION_ALIASES[spoken]) {
      return SECTION_ALIASES[spoken];
    }

    for (const [alias, section] of Object.entries(SECTION_ALIASES)) {
      if (alias.includes(spoken) || spoken.includes(alias)) {
        return section;
      }
    }

    return null;
  }

  public getSupportedCommands(): string[] {
    return [
      '"Go left" / "Left view" — rotate camera left',
      '"Go right" / "Right view" — rotate camera right',
      '"Top view" / "Overview" — bird\'s eye view',
      '"Front view" — face the model',
      '"Zoom in" / "Zoom out" — adjust distance',
      '"Reset view" — default camera position',
      '"Show business model" — switch to BMC template',
      '"Show financials" — switch to Financials template',
      '"Select [section name]" — highlight a section',
      '"Deselect" / "Clear" — remove selection',
    ];
  }
}
