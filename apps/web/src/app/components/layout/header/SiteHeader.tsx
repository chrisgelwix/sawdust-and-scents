import { AppBar, Box, Toolbar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AnnouncementBanner } from './AnnouncementBanner';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { HeaderActions } from './HeaderActions';
import { CategoryNav } from './CategoryNav';

export const SiteHeader = () => {
    const { t } = useTranslation('common');

    return (
        <Box component="header">
            <AnnouncementBanner
                message={t('announcement.freeShipping')}
                ctaText={t('announcement.shopNow')}
                ctaHref="/products"
            />
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    bgcolor: 'white',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    top: 0,
                }}
            >
                <Toolbar sx={{ gap: 2, py: 1 }}>
                    <Logo />
                    <SearchBar />
                    <HeaderActions cartItemCount={0} />
                </Toolbar>
            </AppBar>
            <CategoryNav />
        </Box>
    );
};
