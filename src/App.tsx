/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route } from 'react-router-dom';
import MainSite from './MainSite';
import AdminDashboard from './AdminDashboard';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </HashRouter>
  );
}
