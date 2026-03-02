import { Box, Button, Link, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Trans, useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

interface FaqItem     { q: string; a: string }
interface FaqCategory { name: string; items: FaqItem[] }

export const HelpPage = () => {
    const { t } = useTranslation('help');

    const categories = t('categories', { returnObjects: true }) as FaqCategory[];

    return (
        <PageWrapper title={t('title')} subtitle={t('subtitle')}>

            {categories.map((cat, catIdx) => (
                <Box key={cat.name} sx={{ mb: 5 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: '#3e2723' }}>
                        {cat.name}
                    </Typography>

                    {cat.items.map((item, itemIdx) => (
                        <Accordion key={item.q} elevation={1} sx={{ mb: 1 }}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`cat${catIdx}-item${itemIdx}-content`}
                                id={`cat${catIdx}-item${itemIdx}-header`}>
                                <Typography variant="subtitle1" fontWeight={500}>
                                    {item.q}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" color="text.secondary">
                                    <Trans
                                        ns="help"
                                        i18nKey={`categories.${catIdx}.items.${itemIdx}.a`}
                                        components={{
                                            contactLink: <Link component={RouterLink} to="/contact" />,
                                        }}
                                    />
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            ))}

            {/* Still need help? */}
            <Box sx={{ textAlign: 'center', mt: 6, py: 4, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                    {t('stillTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('stillBody')}
                </Typography>
                <Button
                    component={RouterLink}
                    to="/contact"
                    variant="contained"
                    color="primary"
                    size="large">
                    {t('stillCta')}
                </Button>
            </Box>
        </PageWrapper>
    );
};
