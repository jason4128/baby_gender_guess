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

function PortraitOverlay() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobile = window.innerWidth <= 1024 && isTouchDevice;
      const isHorizontal = window.innerWidth > window.innerHeight;
      setIsLandscape(isMobile && isHorizontal);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="text-6xl mb-6 transform -rotate-90">📱</div>
      <h2 className="text-2xl font-bold mb-4 tracking-wider">請將手機轉為直向</h2>
      <p className="text-slate-300 font-medium leading-relaxed">為了獲得最佳體驗，此活動限定直向顯示。<br/>請將您的設備轉為直向 (Portrait) 使用。</p>
    </div>
  );
}

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

    // Preload important images
    const imagesToPreload = [
      `${(import.meta as any).env.BASE_URL || ''}safe-close.png`,
      `${(import.meta as any).env.BASE_URL || ''}safe-open.png`,
      `${(import.meta as any).env.BASE_URL || ''}IMG_1604.png`,
      `${(import.meta as any).env.BASE_URL || ''}casino.png`,
      `${(import.meta as any).env.BASE_URL || ''}storybook/page1.jpg`,
      `${(import.meta as any).env.BASE_URL || ''}storybook/page2.jpg`,
      `${(import.meta as any).env.BASE_URL || ''}storybook/page3.jpg`,
      `${(import.meta as any).env.BASE_URL || ''}storybook/page4.jpg`,
      `${(import.meta as any).env.BASE_URL || ''}letter.png`,
      `${(import.meta as any).env.BASE_URL || ''}letter2.png`,
    ];

    imagesToPreload.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [themeId]);

  const handleStoryComplete = () => {
    setHasSeenStory(true);
  };

  return (
    <>
      <PortraitOverlay />
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

