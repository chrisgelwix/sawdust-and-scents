import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { SiteHeader } from './components/layout/header/SiteHeader';
import { SiteFooter } from './components/layout/footer/SiteFooter';
import { theme } from './theme/theme';
import { AboutPage }         from './pages/AboutPage';
import { AccessibilityPage } from './pages/AccessibilityPage';
import { SitemapPage }       from './pages/SitemapPage';
import { TermsPage }         from './pages/TermsPage';
import { PrivacyPage }       from './pages/PrivacyPage';
import { HelpPage }          from './pages/HelpPage';
import { HolidayPage }       from './pages/HolidayPage';
import { ShippingPage }      from './pages/ShippingPage';
import { ReturnsPage }       from './pages/ReturnsPage';
import { ContactPage }       from './pages/ContactPage';
import { ScrollToTop }       from './components/layout/ScrollToTop';

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
        <ScrollToTop />
        <SiteHeader />

        {/* Pages manage their own padding — no global px/py here */}
        <Box component="main" sx={{ flex: 1 }}>
          <Routes>
            <Route path="/"            element={<Box sx={{ px: 3, py: 4 }}>Welcome to Sawdust &amp; Scents!</Box>} />
            <Route path="/products"    element={<Box sx={{ px: 3, py: 4 }}>Product Catalog</Box>} />
            <Route path="/cart"        element={<Box sx={{ px: 3, py: 4 }}>Shopping Cart</Box>} />
            <Route path="/rewards"     element={<Box sx={{ px: 3, py: 4 }}>Rewards Program</Box>} />

            {/* Static pages */}
            <Route path="/help"          element={<HelpPage />} />
            <Route path="/about"         element={<AboutPage />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/sitemap"       element={<SitemapPage />} />
            <Route path="/terms"         element={<TermsPage />} />
            <Route path="/privacy"       element={<PrivacyPage />} />

            {/* Former popup pages */}
            <Route path="/holiday-schedule" element={<HolidayPage />} />
            <Route path="/shipping-times"   element={<ShippingPage />} />
            <Route path="/returns"          element={<ReturnsPage />} />

            <Route path="/contact"       element={<ContactPage />} />
          </Routes>
        </Box>

        <SiteFooter />
      </Box>
    </ThemeProvider>
  );
}

export default App;
