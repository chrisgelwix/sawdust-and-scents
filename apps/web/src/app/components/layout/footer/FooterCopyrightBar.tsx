import { Box, Container, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { FOOTER_BG_BAR, FOOTER_MUTED, FOOTER_ACCENT } from './footer.constants';

const LEGAL_LINKS = [
    { label: 'Terms of Sale', to: '/terms' },
    { label: 'Privacy Policy', to: '/privacy' },
];

export const FooterCopyrightBar = () => (
    <Box sx={{ bgcolor: FOOTER_BG_BAR, py: 2 }}>
        <Container maxWidth="lg">
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: { xs: 1, sm: 3 },
                    textAlign: 'center',
                }}>
                <Typography variant="caption" sx={{ color: FOOTER_MUTED }}>
                    © {new Date().getFullYear()} Sawdust &amp; Scents. All rights reserved.
                </Typography>
                {LEGAL_LINKS.map(({ label, to }) => (
                    <Link
                        key={label}
                        component={RouterLink}
                        to={to}
                        sx={{
                            color: FOOTER_MUTED,
                            fontSize: '0.75rem',
                            textDecoration: 'none',
                            '&:hover': { color: FOOTER_ACCENT },
                        }}>
                        {label}
                    </Link>
                ))}
            </Box>
        </Container>
    </Box>
);
