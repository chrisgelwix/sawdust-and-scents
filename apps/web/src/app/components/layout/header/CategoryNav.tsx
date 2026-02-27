import { Box, Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

const CATEGORIES = [
    { label: 'Wood Signs', href: '/products?category=wood-signs' },
    { label: 'Candles', href: '/products?category=candles' },
    { label: 'Gift Sets', href: '/products?category=gift-sets' },
    { label: 'Custom Orders', href: '/products?category=custom' },
    { label: 'Home Decor', href: '/products?category=home-decor' },
    { label: 'New Arrivals', href: '/products?category=new-arrivals' },
    { label: 'Sale', href: '/products?category=sale' },
];

export const CategoryNav = () => {
    const { pathname, search } = useLocation();
    const currentPath = pathname + search;

    return(
        <Box
          component="nav"
          aria-label="Product categories"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider', //MUI's built-in divider color - adapts to dark mode
            overflowX: 'auto', //Scroll horizontally on small screens
            '&::-webkit-scrollbar': { display: 'none' }, //Hide scrollbar but keep scroll
          }}
          >
            {CATEGORIES.map((cat => {
                const isActive = currentPath === cat.href;
                return (
                    <Button
                      key={cat.href}
                      component={Link}
                      to={cat.href}
                      sx={{
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontWeight: isActive ? 700 : 500, 
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap', //Never let a category label line-break
                        borderBottom: isActive ? 
                        '2px solid' : '2px solid transparent',
                        borderColor: isActive ? 'primary.main' : 'transparent',
                        borderRadius: 0,
                        py: 1.5,
                      }}
                      >
                        {cat.label}
                      </Button>
                );
            }))}
          </Box>
    );
};