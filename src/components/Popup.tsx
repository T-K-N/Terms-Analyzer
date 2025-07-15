/// <reference types="chrome"/>
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Description as DescriptionIcon,
  HourglassEmpty as LoadingIcon,
  Settings as SettingsIcon,
  Error as ErrorIcon,
  WifiOff
} from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import { NetworkManager } from '../services/NetworkManager';

interface TermsData {
  found: boolean;
  content?: string;
  location?: string;
  title?: string;
}

interface AnalysisResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  keyPoints: string[];
  redFlags: string[];
  timestamp: number;
}

const Popup: React.FC = () => {
  const { t } = useTranslation(['popup', 'common']);
  const { language } = useLanguage();

  const [hasConsent, setHasConsent] = useState(false);
  const [termsData, setTermsData] = useState<TermsData>({ found: false });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const networkManager = NetworkManager.getInstance();

    const handleOnlineStatus = (status: boolean) => {
      setIsOnline(status);
      if (status && error?.includes('internet connection')) {
        setError(null);
      }
    };

    networkManager.addListener(handleOnlineStatus);

    chrome.storage.sync.get(['hasConsent'], (result: { hasConsent?: boolean }) => {
      if (result.hasConsent) {
        setHasConsent(true);
        detectTermsAndConditions();
      }
    });

    return () => {
      networkManager.removeListener(handleOnlineStatus);
    };
  }, [error]);

  const detectTermsAndConditions = async () => {
    if (!isOnline) {
      setError(t('popup:errors.offline'));
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id || !tab.url) {
        setError(t('popup:errors.noTermsFound'));
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'detectTerms',
        language: language
      });

      if (response && response.found) {
        setTermsData(response);
        setError(null);

        // Check for cached analysis
        const cachedMessage = await chrome.runtime.sendMessage({
          action: 'getCachedAnalysis',
          url: tab.url,
          language: language
        });

        if (cachedMessage && cachedMessage.success) {
          setAnalysisResult(cachedMessage.result);
        }
      } else {
        setError(t('popup:errors.noTermsFound'));
      }
    } catch (err) {
      console.error('Error detecting terms:', err);
      setError(isOnline ? t('popup:errors.noTermsFound') : t('popup:errors.offline'));
    }
  };

  const handleConsentAccept = () => {
    setHasConsent(true);
    chrome.storage.sync.set({ hasConsent: true });
    detectTermsAndConditions();
  };

  const handleAnalyze = async () => {
    if (!termsData?.content) {
      setError(t('popup:errors.noTermsFound'));
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      // Send directly to background script for analysis using existing terms data
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeTerms',
        content: termsData.content,
        language: language,
        url: tab.url
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze terms');
      }

      setAnalysisResult(response.data);
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze terms');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-96 min-h-96 bg-white">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DescriptionIcon className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">{t('popup:title')}</h1>
              <p className="text-sm opacity-90">{t('popup:subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LanguageSelector />
            <SettingsIcon className="w-5 h-5" />
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {!hasConsent ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('popup:consentSection.title')}</h2>
            <p className="text-sm text-gray-600">{t('popup:consentSection.description')}</p>

            <ul className="text-sm space-y-2">
              {(t('popup:consentSection.points', { returnObjects: true }) as string[]).map((point, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleConsentAccept}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('popup:consentSection.acceptButton')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              {termsData.found ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">{t('popup:detection.found')}</p>
                    {termsData.title && (
                      <p className="text-sm text-gray-600">{termsData.title}</p>
                    )}
                  </div>
                </>
              ) : error ? (
                <>
                  <ErrorIcon className="w-5 h-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </>
              ) : (
                <>
                  <LoadingIcon className="w-5 h-5 text-blue-500 animate-spin" />
                  <p className="text-gray-600">{t('popup:detection.searching')}</p>
                </>
              )}
            </div>

            {termsData.found && !analysisResult && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isAnalyzing ? (
                  <>
                    <LoadingIcon className="w-4 h-4 animate-spin" />
                    <span>{t('popup:analysis.processing')}</span>
                  </>
                ) : (
                  <span>{t('popup:detection.analyzeButton')}</span>
                )}
              </button>
            )}

            {analysisResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{t('popup:analysis.title')}</h3>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${analysisResult.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                    analysisResult.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                    {t(`popup:analysis.riskLevels.${analysisResult.riskLevel}`)}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-gray-700">{analysisResult.summary}</p>
                </div>

                {analysisResult.keyPoints.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-800">Key Points</h4>
                    <ul className="space-y-1">
                      {analysisResult.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.redFlags.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-red-800">⚠️ Important Concerns</h4>
                    <ul className="space-y-1">
                      {analysisResult.redFlags.map((flag, index) => (
                        <li key={index} className="text-sm text-red-700 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                    {t('popup:actions.viewOriginal')}
                  </button>
                  <button className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    {t('popup:actions.exportSummary')}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex items-start space-x-2">
                <WarningIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">⚠️ Important Disclaimer</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    AI summaries are for informational purposes only. Always read the original terms and consult legal professionals for important decisions.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t p-3 text-center text-xs text-gray-500">
        <div className="flex justify-center space-x-4">
          <a href="#" className="hover:text-blue-600">{t('common:privacyPolicy')}</a>
          <span>|</span>
          <a href="#" className="hover:text-blue-600">{t('common:termsOfService')}</a>
        </div>
      </footer>

      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-red-100 border-t border-red-300 text-red-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-5 h-5" />
            <span className="text-sm">{t('popup:offline.message')}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-semibold underline"
          >
            {t('popup:offline.reloadButton')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Popup;
