import { Box, Divider, Link, List, ListItem, Typography } from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';

export const PrivacyPage = () => {
    const { t } = useTranslation('privacy');

    const transComponents = {
        contactLink:      <Link component={RouterLink} to="/contact" />,
        privacyEmailLink: <Link href="mailto:privacy@sawdustandscents.com" />,
    };

    const s2Items = t('sections.s2.items', { returnObjects: true }) as string[];
    const s3Items = t('sections.s3.items', { returnObjects: true }) as string[];
    const s6Items = t('sections.s6.items', { returnObjects: true }) as string[];

    const SECTIONS = [
        { key: 's1', title: t('sections.s1.title'),
          content: (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>{t('sections.s1.p1Label')}</strong> {t('sections.s1.p1Body')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{t('sections.s1.p2Label')}</strong> {t('sections.s1.p2Body')}
              </Typography>
            </>
          )},
        { key: 's2', title: t('sections.s2.title'),
          content: (
            <List dense disablePadding sx={{ pl: 2 }}>
              {s2Items.map((item) => (
                <ListItem key={item} sx={{ pl: 0, py: 0.25 }}>
                  <Typography component="span" variant="body2" color="text.secondary">• {item}</Typography>
                </ListItem>
              ))}
            </List>
          )},
        { key: 's3', title: t('sections.s3.title'),
          content: (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('sections.s3.intro')}
              </Typography>
              <List dense disablePadding sx={{ pl: 2 }}>
                {s3Items.map((item) => (
                  <ListItem key={item} sx={{ pl: 0, py: 0.25 }}>
                    <Typography component="span" variant="body2" color="text.secondary">• {item}</Typography>
                  </ListItem>
                ))}
              </List>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {t('sections.s3.outro')}
              </Typography>
            </>
          )},
        { key: 's4', title: t('sections.s4.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s4.body')}</Typography> },
        { key: 's5', title: t('sections.s5.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s5.body')}</Typography> },
        { key: 's6', title: t('sections.s6.title'),
          content: (
            <>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('sections.s6.intro')}
              </Typography>
              <List dense disablePadding sx={{ pl: 2 }}>
                {s6Items.map((item) => (
                  <ListItem key={item} sx={{ pl: 0, py: 0.25 }}>
                    <Typography component="span" variant="body2" color="text.secondary">• {item}</Typography>
                  </ListItem>
                ))}
              </List>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                <Trans ns="privacy" i18nKey="sections.s6.outro" components={transComponents} />
              </Typography>
            </>
          )},
        { key: 's7', title: t('sections.s7.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s7.body')}</Typography> },
        { key: 's8', title: t('sections.s8.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s8.body')}</Typography> },
        { key: 's9', title: t('sections.s9.title'),
          content: <Typography variant="body2" color="text.secondary">{t('sections.s9.body')}</Typography> },
        { key: 's10', title: t('sections.s10.title'),
          content: (
            <Typography variant="body2" color="text.secondary">
              <Trans ns="privacy" i18nKey="sections.s10.body" components={transComponents} />
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
