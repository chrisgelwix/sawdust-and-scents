import { Box } from '@mui/material';
import { FooterSocialBar } from './FooterSocialBar';
import { FooterLinkGrid } from './FooterLinkGrid';
import { FooterCopyrightBar } from './FooterCopyrightBar';
import { FOOTER_BG } from './footer.constants';

export const SiteFooter = () => (
    <Box component="footer" sx={{ bgcolor: FOOTER_BG, mt: 'auto' }}>
        <FooterSocialBar />
        <FooterLinkGrid />
        <FooterCopyrightBar />
    </Box>
);
