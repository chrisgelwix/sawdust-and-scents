import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../components/layout/PageWrapper';

export const ReturnsPage = () => {
    const { t } = useTranslation('footer');
    const rows = t('popups.returns.rows', { returnObjects: true }) as [string, string][];

    return (
        <PageWrapper
            title={t('popups.returns.title')}
            subtitle={t('popups.returns.intro')}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {rows.map(([heading, detail]) => (
                    <Box key={heading}>
                        <Typography variant="body1" fontWeight={600} gutterBottom>
                            {heading}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {detail}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </PageWrapper>
    );
};
