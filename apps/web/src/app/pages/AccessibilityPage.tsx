import { Box, Link, List, ListItem, Typography } from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

export const AccessibilityPage = () => {
    const { t } = useTranslation('accessibility');

    const measures    = t('measures',    { returnObjects: true }) as string[];
    const knownIssues = t('knownIssues', { returnObjects: true }) as string[];

    const lastReviewedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <PageWrapper title={t('title')} subtitle={t('subtitle')}>

            {/* Commitment */}
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#3e2723' }}>
                {t('commitmentTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                <Trans
                    ns="accessibility"
                    i18nKey="commitmentBody"
                    components={{
                        wcagLink: (
                            <Link
                                href="https://www.w3.org/WAI/standards-guidelines/wcag/"
                                target="_blank"
                                rel="noopener noreferrer"
                            />
                        ),
                    }}
                />
            </Typography>

            {/* Measures */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 1, color: '#3e2723' }}>
                {t('measuresTitle')}
            </Typography>
            <List dense disablePadding>
                {measures.map((item) => (
                    <ListItem key={item} sx={{ pl: 0, py: 0.25 }}>
                        <Typography variant="body2" color="text.secondary">
                            • {item}
                        </Typography>
                    </ListItem>
                ))}
            </List>

            {/* Known Issues */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 1, color: '#3e2723' }}>
                {t('knownTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                {t('knownIntro')}
            </Typography>
            <List dense disablePadding>
                {knownIssues.map((item) => (
                    <ListItem key={item} sx={{ pl: 0, py: 0.25 }}>
                        <Typography variant="body2" color="text.secondary">
                            • {item}
                        </Typography>
                    </ListItem>
                ))}
            </List>

            {/* Feedback */}
            <Typography variant="h6" fontWeight={700} sx={{ mt: 3, mb: 1, color: '#3e2723' }}>
                {t('feedbackTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                <Trans
                    ns="accessibility"
                    i18nKey="feedbackBody"
                    components={{
                        contactLink: <Link component={RouterLink} to="/contact" />,
                    }}
                />
            </Typography>

            <Typography variant="caption" display="block" sx={{ mt: 4, color: 'text.secondary' }}>
                {t('lastReviewed')} {lastReviewedDate}.
            </Typography>
        </PageWrapper>
    );
};
