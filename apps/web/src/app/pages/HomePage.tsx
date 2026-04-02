import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const HERO_HEIGHT = 360;

export function HomePage() {
  return (
    <Box sx={{ bgcolor: '#f5f5f5' }}>
      <Box
        sx={{
          height: HERO_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          background:
            'radial-gradient(1200px 400px at 20% 10%, rgba(156, 124, 88, 0.25), transparent 60%),' +
            'radial-gradient(1000px 400px at 80% 20%, rgba(46, 125, 50, 0.18), transparent 55%),' +
            'linear-gradient(180deg, #ffffff 0%, #faf7f2 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Stack spacing={2} sx={{ maxWidth: 720 }}>
            <Typography variant="h2" component="h1" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
              Sawdust &amp; Scents
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1.5 }}>
              Handmade wood signs, candles, and gift-ready bundles—crafted for cozy spaces and
              thoughtful moments.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
              <Button component={Link} to="/products" variant="contained" size="large">
                Browse products
              </Button>
              <Button component={Link} to="/products?category=sale" variant="outlined" size="large">
                Shop sale
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Box sx={{ py: 6 }}>
        <Container maxWidth="lg">
          <Stack spacing={1.5}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 800 }}>
              Pick a category to start
            </Typography>
            <Typography color="text.secondary">
              Use the menu to filter by product type—wood signs, candles, gift sets, and more.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

