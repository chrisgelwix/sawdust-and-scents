import { Box, CssBaseline, ThemeProvider, createTheme, AppBar, Toolbar, Button, Typography } from '@mui/material';
import { Route, Routes } from 'react-router-dom';
import { useAuth } from './context/auth-context';

const theme = createTheme({ 
  palette: {
    primary: { main: '#5d4037' }, // Wood Brown
    secondary: { main: '#ffb74d'}, // Candle Amber
  },
});



export function App() {
  const { authenticated, user, login, logout } = useAuth();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline/> {/* Resets default browser styles */}
      <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Sawdust & Scents</Typography>
            {authenticated ? (
              <>
                <Typography sx={{ mr: 2 }}>Welcome, {user?.given_name}</Typography>
                <Button color="inherit" onClick={logout}>Logout</Button>
              </>
            ) : (
              <Button color="inherit" onClick={login}>Login</Button>
            )}
          </Toolbar>
        </AppBar>
        <Routes>
          <Route path="/" element={<div>Welcome to Sawdust & Scents!</div>} />
          <Route path="/products" element={<div>Product Catalog</div>} />
        </Routes>
      </Box>
    </ThemeProvider>
  )
}
export default App;
