import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext.jsx';
import { ProductsProvider } from './state/ProductsContext.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PriceCoach from './pages/PriceCoach.jsx';
import Products from './pages/Products.jsx';
import Watch from './pages/Watch.jsx';
import Competitors from './pages/Competitors.jsx';
import Returns from './pages/Returns.jsx';
import Settings from './pages/Settings.jsx';
import AdsPlanner from './pages/AdsPlanner.jsx';
import Launch from './pages/Launch.jsx';

export default function App() {
  return (
    <LanguageProvider>
      <ProductsProvider>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="price-coach" element={<PriceCoach />} />
              <Route path="ads" element={<AdsPlanner />} />
              <Route path="products" element={<Products />} />
              <Route path="launch" element={<Launch />} />
              <Route path="competitors" element={<Competitors />} />
              <Route path="returns" element={<Returns />} />
              <Route path="watch" element={<Watch />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ProductsProvider>
    </LanguageProvider>
  );
}
