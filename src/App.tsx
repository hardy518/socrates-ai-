import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFail from "./pages/PaymentFail";
import MyInsight from "./pages/MyInsight";
import Settings from "./pages/Settings";
import LegalPages from "./pages/LegalPages";

import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/my-insight" element={<MyInsight />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-fail" element={<PaymentFail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/terms" element={<LegalPages />} />
              <Route path="/settings/privacy" element={<LegalPages />} />
              <Route path="/settings/refund" element={<LegalPages />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
