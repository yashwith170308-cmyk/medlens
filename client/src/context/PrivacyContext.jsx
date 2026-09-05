import React, { createContext, useContext, useState, useEffect } from 'react';

const PrivacyContext = createContext();

export function PrivacyProvider({ children }) {
  const [privacyMode, setPrivacyMode] = useState(() => {
    return localStorage.getItem('medlens_privacy_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('medlens_privacy_mode', privacyMode ? 'true' : 'false');
  }, [privacyMode]);

  const togglePrivacyMode = () => setPrivacyMode(prev => !prev);

  // Anonymization helper
  const maskName = (name) => {
    if (!name) return '';
    if (!privacyMode) return name;
    
    // Check if demo tag is present
    const isDemo = name.toUpperCase().includes('(DEMO)');
    const clean = name.replace(/\(DEMO\)/i, '').trim();
    const parts = clean.split(/\s+/);
    const maskedParts = parts.map(p => p.charAt(0) + '***');
    return maskedParts.join(' ') + (isDemo ? ' (DEMO)' : '');
  };

  const maskIdentifier = (id) => {
    if (!id) return '';
    if (!privacyMode) return id;
    if (id.length <= 4) return '****';
    return id.substring(0, 3) + '-****';
  };

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacyMode, maskName, maskIdentifier }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) throw new Error('usePrivacy must be used within PrivacyProvider');
  return context;
}
