import { Box, Button } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CategoryNav = () => {
    const { t } = useTranslation('common');
    const { pathname, search } = useLocation();
    const currentPath = pathname + search;

    const CATEGORIES = [
        { label: t('categories.woodSigns'),    href: '/products?category=wood-signs' },
        { label: t('categories.candles'),      href: '/products?category=candles' },
        { label: t('categories.giftSets'),     href: '/products?category=gift-sets' },
        { label: t('categories.customOrders'), href: '/products?category=custom' },
        { label: t('categories.homeDecor'),    href: '/products?category=home-decor' },
        { label: t('categories.newArrivals'),  href: '/products?category=new-arrivals' },
        { label: t('categories.sale'),         href: '/products?category=sale' },
    ];

    return (
        <Box
          component="nav"
          aria-label={t('categories.ariaLabel')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            overflowX: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
            {CATEGORIES.map((cat) => {
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
                        whiteSpace: 'nowrap',
                        borderBottom: isActive ? '2px solid' : '2px solid transparent',
                        borderColor: isActive ? 'primary.main' : 'transparent',
                        borderRadius: 0,
                        py: 1.5,
                      }}
                    >
                        {cat.label}
                    </Button>
                );
            })}
        </Box>
    );
};
