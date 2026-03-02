import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../components/layout/PageWrapper';

export const HolidayPage = () => {
    const { t } = useTranslation('footer');
    const rows = t('popups.holiday.rows', { returnObjects: true }) as [string, string][];

    return (
        <PageWrapper
            title={t('popups.holiday.title')}
            subtitle={t('popups.holiday.intro')}
        >
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell><strong>{t('popups.holiday.colHoliday')}</strong></TableCell>
                        <TableCell><strong>{t('popups.holiday.colDate')}</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map(([name, date]) => (
                        <TableRow key={name}>
                            <TableCell>{name}</TableCell>
                            <TableCell>{date}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Box sx={{ mt: 4 }}>
                <Typography variant="body2" color="text.secondary">
                    {t('popups.holiday.note')}
                </Typography>
            </Box>
        </PageWrapper>
    );
};
