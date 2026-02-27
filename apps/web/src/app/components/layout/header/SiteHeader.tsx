import {
    AppBar,
    Box,
    Toolbar,
} from '@mui/material';
import { AnnouncementBanner } from './AnnouncementBanner';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { HeaderActions } from './HeaderActions';
import { CategoryNav } from './CategoryNav';

export const SiteHeader = () => {
    return (
        <Box
          component="header">
            {/* Zone 1: Announcement strip */}
            <AnnouncementBanner
                message="Free shipping on orders over $75!"
                ctaText="Shop Now"
                ctaHref="/poducts"
                />
            {/* Zone 2: Main header — Logo + Search + Actions */}
            <AppBar
              position="sticky" //Sticks to the top as you scroll
              elevation={0} //No drop shadow
              sx={{
                bgcolor: 'white',
                borderBottom: '1px solid',
                borderColor: 'divider',
                top: 0,
              }}
              >
                <Toolbar sx={{ gap: 2, py: 1}}>
                    <Logo />
                    <SearchBar />
                    <HeaderActions cartItemCount={0} />
                </Toolbar>
              </AppBar>
          </Box>
    );
};