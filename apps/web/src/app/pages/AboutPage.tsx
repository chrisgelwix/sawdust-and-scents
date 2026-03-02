import { Box, Button, Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

export const AboutPage = () => {
    const { t } = useTranslation('about');

    const values = t('values', { returnObjects: true }) as Array<{ heading: string; body: string }>;

    return (
        <PageWrapper title={t('title')} subtitle={t('subtitle')}>

            {/* Our Story */}
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: '#3e2723' }}>
                {t('storyTitle')}
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
                {t('storyP1')}
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
                {t('storyP2')}
            </Typography>

            <Divider sx={{ my: 4 }} />

            {/* Values */}
            <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#3e2723' }}>
                {t('valuesTitle')}
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 3,
                    mb: 4,
                }}>
                {values.map(({ heading, body }) => (
                    <Box
                        key={heading}
                        sx={{
                            p: 3,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            bgcolor: '#fafafa',
                        }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                            {heading}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {body}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* CTA */}
            <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body1" sx={{ mb: 2 }} color="text.secondary">
                    {t('ctaText')}{' '}
                    <Button
                        component={RouterLink}
                        to="/contact"
                        variant="text"
                        sx={{ textTransform: 'none', fontWeight: 600, p: 0, verticalAlign: 'baseline' }}>
                        {t('ctaLink')}
                    </Button>
                    {' '}{t('ctaEnd')}
                </Typography>
            </Box>
        </PageWrapper>
    );
};
