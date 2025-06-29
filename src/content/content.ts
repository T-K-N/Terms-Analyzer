// Content script for detecting Terms and Conditions
interface TermsDetectionResult {
  found: boolean;
  content?: string;
  location?: string;
  title?: string;
}

class TermsDetector {
  private termsIndicators = [
    'terms of service', 'terms and conditions', 'user agreement',
    'terms of use', 'service agreement', 'legal terms'
  ];

  detectTermsAndConditions(): TermsDetectionResult {
    try {
      // Strategy 1: Look for modal dialogs
      const modalResult = this.searchInModals();
      if (modalResult.found) return modalResult;

      // Strategy 2: Check if current page is terms page
      const pageResult = this.searchInPage();
      if (pageResult.found) return pageResult;

      // Strategy 3: Look for embedded content
      const embeddedResult = this.searchEmbeddedContent();
      if (embeddedResult.found) return embeddedResult;

      return { found: false };
    } catch (error) {
      console.error('Terms detection error:', error);
      return { found: false };
    }
  }

  private searchInModals(): TermsDetectionResult {
    const modalSelectors = [
      '.modal', '.popup', '.dialog', '[role="dialog"]', '[aria-modal="true"]'
    ];

    for (const selector of modalSelectors) {
      const modals = document.querySelectorAll(selector);
      
      for (const modal of modals) {
        if (this.isVisible(modal as HTMLElement)) {
          const result = this.analyzeElement(modal as HTMLElement);
          if (result.found) {
            return { ...result, location: 'modal' };
          }
        }
      }
    }

    return { found: false };
  }

  private searchInPage(): TermsDetectionResult {
    const pageTitle = document.title.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    if (this.containsTermsIndicators(pageTitle) || this.containsTermsIndicators(url)) {
      const content = this.extractPageContent();
      if (content && content.length > 500) {
        return {
          found: true,
          content: content,
          location: 'page',
          title: document.title
        };
      }
    }

    return { found: false };
  }

  private searchEmbeddedContent(): TermsDetectionResult {
    const contentSelectors = [
      'main', '[role="main"]', '.main-content', '.content',
      '.terms-content', '.legal-content', '.agreement-content'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const result = this.analyzeElement(element as HTMLElement);
        if (result.found) {
          return { ...result, location: 'main-content' };
        }
      }
    }

    return { found: false };
  }

  private analyzeElement(element: HTMLElement): TermsDetectionResult {
    const text = this.extractTextContent(element);
    
    if (!text || text.length < 200) {
      return { found: false };
    }

    if (this.calculateConfidence(text) > 0.6) {
      return {
        found: true,
        content: text
      };
    }

    return { found: false };
  }

  private extractTextContent(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Remove script and style elements
    const scriptsAndStyles = clone.querySelectorAll('script, style, noscript');
    scriptsAndStyles.forEach(el => el.remove());
    
    const text = clone.textContent || clone.innerText || '';
    
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000);
  }

  private extractPageContent(): string {
    const excludeSelectors = [
      'nav', 'header', 'footer', '.navigation', '.nav',
      '.sidebar', '.menu', '.breadcrumb'
    ];

    const body = document.body.cloneNode(true) as HTMLElement;
    
    excludeSelectors.forEach(selector => {
      const elements = body.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    return this.extractTextContent(body);
  }

  private calculateConfidence(text: string): number {
    let confidence = 0;
    const lowerText = text.toLowerCase();
    
    // Check for terms indicators
    const termsMatches = this.termsIndicators.filter(indicator => 
      lowerText.includes(indicator)
    ).length;
    confidence += termsMatches * 0.2;
    
    // Check for legal language patterns
    const legalPatterns = [
      'hereby agree', 'privacy policy', 'liability', 'jurisdiction',
      'governing law', 'dispute resolution', 'termination'
    ];
    
    const legalMatches = legalPatterns.filter(pattern => 
      lowerText.includes(pattern)
    ).length;
    confidence += legalMatches * 0.1;
    
    // Check text length
    if (text.length > 1000) confidence += 0.1;
    if (text.length > 5000) confidence += 0.1;
    if (text.length < 500) confidence -= 0.3;
    
    return Math.min(confidence, 1.0);
  }

  private containsTermsIndicators(text: string): boolean {
    return this.termsIndicators.some(indicator => 
      text.includes(indicator)
    );
  }

  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }
}

// Initialize detector
const detector = new TermsDetector();

// Message listener
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'detectTerms') {
    try {
      const result = detector.detectTermsAndConditions();
      sendResponse(result);
    } catch (error) {
      console.error('Terms detection failed:', error);
      sendResponse({ found: false, error: 'Detection failed' });
    }
    return true;
  }
  
  return false;
});