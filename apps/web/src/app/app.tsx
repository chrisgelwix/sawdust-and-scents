import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { SiteHeader } from './components/layout/SiteHeader';
import { theme } from './theme/theme';


export function App() {
  //const { authenticated, user, login, logout } = useAuth();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline/> {/* Resets default browser styles */}
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <SiteHeader />
        <Box
          component="main"
          sx={{ px: 3, py: 4 }} >
          
            <Routes>
              <Route path="/" element={<div>Welcome to Sawdust & Scents!</div>} />
              <Route path="/products" element={<div>Product Catalog</div>} />
              <Route path="/cart" element={<div>Shopping Cart</div>} />
              <Route path="/rewards" element={<div>Rewards Program</div>} />
              <Route path="/help" element={<div>Help Center</div>} />
            </Routes>
          </Box>
      </Box>
    </ThemeProvider>
  )
}
export default App;
