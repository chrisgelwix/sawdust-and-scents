import { Box, Container, Typography } from '@mui/material';

interface PageWrapperProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

/**
 * Shared layout wrapper for all full-page content routes.
 * Renders a branded hero banner with the page title, then a
 * centred content area below it.
 */
export const PageWrapper = ({ title, subtitle, children }: PageWrapperProps) => (
    <Box>
        {/* ── Hero banner ──────────────────────────────────────────────── */}
        <Box
            sx={{
                bgcolor: '#3e2723',
                color: 'white',
                py: { xs: 5, md: 7 },
                px: 3,
                textAlign: 'center',
            }}>
            <Typography
                variant="h3"
                component="h1"
                sx={{
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    mb: subtitle ? 1.5 : 0,
                }}>
                {title}
            </Typography>
            {subtitle && (
                <Typography
                    variant="subtitle1"
                    sx={{ color: '#bcaaa4', maxWidth: 560, mx: 'auto' }}>
                    {subtitle}
                </Typography>
            )}
        </Box>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <Container maxWidth="md" sx={{ py: { xs: 5, md: 8 } }}>
            {children}
        </Container>
    </Box>
);
