import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import TermsOfService from './pages/TermsOfService.tsx'
import PrivacyPolicy from './pages/PrivacyPolicy.tsx'
import ThirdParty from './pages/ThirdParty.tsx'
import RefundPolicy from './pages/RefundPolicy.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/third-party" element={<ThirdParty />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

