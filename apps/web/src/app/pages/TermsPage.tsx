import { Box, Divider, Link, Typography } from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

export const TermsPage = () => {
    const { t } = useTranslation('terms');

    // Shared Trans components available in any section body
    const transComponents = {
        helpLink:       <Link component={RouterLink} to="/help" />,
        contactLink:    <Link component={RouterLink} to="/contact" />,
        returnsEmailLink: <Link href="mailto:returns@sawdustandscents.com" />,
        legalEmailLink:   <Link href="mailto:legal@sawdustandscents.com" />,
    };

    const SECTIONS = [
        { key: 's1',  title: t('sections.s1.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s1.body')}</Typography> },
        { key: 's2',  title: t('sections.s2.title'),
          content: (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>{t('sections.s2.p1')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('sections.s2.p2')}</Typography>
            </>
          )},
        { key: 's3',  title: t('sections.s3.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s3.body')}</Typography> },
        { key: 's4',  title: t('sections.s4.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s4.body')}</Typography> },
        { key: 's5',  title: t('sections.s5.title'),
          content: (
            <Typography variant="body2" color="text.secondary">
              <Trans ns="terms" i18nKey="sections.s5.body" components={transComponents} />
            </Typography>
          )},
        { key: 's6',  title: t('sections.s6.title'),
          content: (
            <Typography variant="body2" color="text.secondary">
              <Trans ns="terms" i18nKey="sections.s6.body" components={transComponents} />
            </Typography>
          )},
        { key: 's7',  title: t('sections.s7.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s7.body')}</Typography> },
        { key: 's8',  title: t('sections.s8.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s8.body')}</Typography> },
        { key: 's9',  title: t('sections.s9.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s9.body')}</Typography> },
        { key: 's10', title: t('sections.s10.title'),
          content: (
            <Typography variant="body2" color="text.secondary">
              <Trans ns="terms" i18nKey="sections.s10.body" components={transComponents} />
            </Typography>
          )},
    ];

    return (
        <PageWrapper title={t('title')} subtitle={t('subtitle')}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {t('intro')}
            </Typography>

            {SECTIONS.map(({ key, title, content }, i) => (
                <Box key={key}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: '#3e2723' }}>
                        {title}
                    </Typography>
                    {content}
                    {i < SECTIONS.length - 1 && <Divider sx={{ my: 3 }} />}
                </Box>
            ))}
        </PageWrapper>
    );
};
