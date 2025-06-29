import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import Popup from './components/Popup';
import './index.css';

// Initialize i18n
i18n.init();

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <Popup />
      </LanguageProvider>
    </I18nextProvider>
  );
}

export default App;