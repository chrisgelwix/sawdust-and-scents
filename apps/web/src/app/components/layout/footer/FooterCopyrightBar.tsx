import { Box, Container, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FOOTER_BG_BAR, FOOTER_MUTED, FOOTER_ACCENT } from './footer.constants';

export const FooterCopyrightBar = () => {
    const { t } = useTranslation('footer');

    const legalLinks = [
        { label: t('copyright.terms'),   to: '/terms' },
        { label: t('copyright.privacy'), to: '/privacy' },
    ];

    return (
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
                        {t('copyright.text', { year: new Date().getFullYear() })}
                    </Typography>
                    {legalLinks.map(({ label, to }) => (
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
};
