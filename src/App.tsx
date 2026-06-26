/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainSite from './MainSite';
import AdminDashboard from './AdminDashboard';
import Storybook from './Storybook';
import { themes } from './themes';

export default function App() {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('baby_gender_theme_id') || 'casino-gold';
  });
  
  const [hasSeenStory, setHasSeenStory] = useState(false);

  useEffect(() => {
    const activeTheme = themes.find(t => t.id === themeId) || themes[0];
    localStorage.setItem('baby_gender_theme_id', themeId);
    
    // Apply CSS variables to document.documentElement
    const root = document.documentElement;
    Object.entries(activeTheme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [themeId]);

  const handleStoryComplete = () => {
    setHasSeenStory(true);
  };

  return (
    <>
      {!hasSeenStory && <Storybook onComplete={handleStoryComplete} />}
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainSite themeId={themeId} setThemeId={setThemeId} />} />
          <Route path="/admin" element={<AdminDashboard themeId={themeId} setThemeId={setThemeId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </>
  );
}

