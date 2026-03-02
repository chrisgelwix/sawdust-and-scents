import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../components/layout/PageWrapper';

export const ShippingPage = () => {
    const { t } = useTranslation('footer');
    const rows = t('popups.shipping.rows', { returnObjects: true }) as [string, string, string][];

    return (
        <PageWrapper
            title={t('popups.shipping.title')}
            subtitle={t('popups.shipping.intro')}
        >
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell><strong>{t('popups.shipping.colMethod')}</strong></TableCell>
                        <TableCell><strong>{t('popups.shipping.colDelivery')}</strong></TableCell>
                        <TableCell><strong>{t('popups.shipping.colCost')}</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(([method, time, cost]) => (
                        <TableRow key={method}>
                            <TableCell>{method}</TableCell>
                            <TableCell>{time}</TableCell>
                            <TableCell>{cost}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Typography variant="caption" sx={{ mt: 3, display: 'block' }} color="text.secondary">
                {t('popups.shipping.international')}
            </Typography>
        </PageWrapper>
    );
};
