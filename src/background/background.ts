// Background service worker for Chrome extension
interface AnalysisRequest {
  action: string;
  content: string;
  language: string;
}

interface AnalysisResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  keyPoints: string[];
  redFlags: string[];
  timestamp: number;
}

class AIProcessor {
  private apiKey: string | null = null;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get(['geminiApiKey']);
      this.apiKey = result.geminiApiKey || null;
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  }

  async processTerms(termsText: string, language: string): Promise<AnalysisResult> {
    if (!this.apiKey) {
      throw new Error('API key not configured. Please set your Gemini API key in settings.');
    }

    try {
      const summary = await this.callGeminiAPI(termsText, language);
      const result = this.parseAIResponse(summary);
      
      return {
        ...result,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('AI processing failed:', error);
      throw error;
    }
  }

  private async callGeminiAPI(text: string, language: string): Promise<string> {
    const prompt = this.buildPrompt(text, language);
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey!
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  private buildPrompt(termsText: string, language: string): string {
    const languageInstructions = {
      'en': 'Provide the response in English.',
      'hi': 'Provide the response in Hindi (हिन्दी).',
      'ta': 'Provide the response in Tamil (தமிழ்).'
    };

    return `
Analyze the following Terms and Conditions and provide a structured summary in JSON format.

${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

Format your response as JSON:
{
  "summary": "Clear summary in simple language",
  "riskLevel": "low|medium|high",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "redFlags": ["Red flag 1", "Red flag 2"]
}

Focus on: user obligations, company rights, data privacy, account termination, dispute resolution, liability.

Terms to analyze:
${termsText.substring(0, 8000)}
`;
  }

  private parseAIResponse(aiResponse: string): Omit<AnalysisResult, 'timestamp'> {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Analysis completed',
          riskLevel: ['low', 'medium', 'high'].includes(parsed.riskLevel) ? parsed.riskLevel : 'medium',
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 8) : ['Analysis completed'],
          redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.slice(0, 5) : []
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    return {
      summary: aiResponse.substring(0, 1000),
      riskLevel: 'medium',
      keyPoints: ['Analysis completed - see summary for details'],
      redFlags: []
    };
  }
}

const aiProcessor = new AIProcessor();

// Message handler
chrome.runtime.onMessage.addListener((request: AnalysisRequest, _sender, sendResponse) => {
  if (request.action === 'analyzeTerms') {
    handleAnalysisRequest(request, sendResponse);
    return true;
  }
  return false;
});

async function handleAnalysisRequest(request: AnalysisRequest, sendResponse: (response: any) => void) {
  try {
    if (!request.content || request.content.length < 100) {
      sendResponse({
        success: false,
        error: 'Terms content is too short or empty'
      });
      return;
    }

    const result = await aiProcessor.processTerms(request.content, request.language);
    
    sendResponse({
      success: true,
      result: result
    });
  } catch (error) {
    console.error('Analysis failed:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    });
  }
}

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      hasConsent: false,
      language: 'en',
      geminiApiKey: null
    });
  }
});