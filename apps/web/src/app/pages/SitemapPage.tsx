import { Box, Divider, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../components/layout/PageWrapper';

// Static URL map — routes don't change per language
const SECTION_URLS: Record<string, string[]> = {
    Shop:             ['/products', '/products?category=wood-signs', '/products?category=candles',
                       '/products?category=gift-sets', '/products?category=custom',
                       '/products?category=home-decor', '/products?category=sale'],
    Account:          ['/', '/cart', '/rewards'],
    Company:          ['/about', '/contact', '/accessibility'],
    'Customer Support': ['/help'],
    Legal:            ['/terms', '/privacy'],
};

interface SitemapLink { label: string; description: string }
interface SitemapSection { heading: string; links: SitemapLink[] }

export const SitemapPage = () => {
    const { t } = useTranslation('sitemap');

    const sections = t('sections', { returnObjects: true }) as SitemapSection[];

    return (
        <PageWrapper title={t('title')} subtitle={t('subtitle')}>
            {sections.map((section, sIdx) => {
                const urls = SECTION_URLS[section.heading] ?? [];
                return (
                    <Box key={section.heading}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5, color: '#3e2723' }}>
                            {section.heading}
                        </Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                gap: 1.5,
                                mb: 1,
                            }}>
                            {section.links.map(({ label, description }, lIdx) => (
                                <Box key={label}>
                                    <Link
                                        component={RouterLink}
                                        to={urls[lIdx] ?? '/'}
                                        sx={{
                                            color: '#5d4037',
                                            fontWeight: 600,
                                            fontSize: '0.95rem',
                                            textDecoration: 'none',
                                            '&:hover': { textDecoration: 'underline' },
                                        }}>
                                        {label}
                                    </Link>
                                    {description && (
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {description}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>
                        {sIdx < sections.length - 1 && <Divider sx={{ my: 3 }} />}
                    </Box>
                );
            })}
        </PageWrapper>
    );
};
