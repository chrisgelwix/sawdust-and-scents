import { Box, Container, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FOOTER_MUTED, FOOTER_BRIGHT, FOOTER_ACCENT } from './footer.constants';
import { FooterSubscribe } from './FooterSubscribe';

interface FooterLink {
    label: string;
    to: string;
}

// ── Shared link style ──────────────────────────────────────────────────────────
const linkSx = {
    color: FOOTER_MUTED,
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'block',
    transition: 'color 0.15s',
    '&:hover': { color: FOOTER_ACCENT },
} as const;

// ── FooterLinkColumn ───────────────────────────────────────────────────────────
interface FooterLinkColumnProps {
    title: string;
    links: FooterLink[];
}

const FooterLinkColumn = ({ title, links }: FooterLinkColumnProps) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Typography
            variant="subtitle2"
            sx={{
                color: FOOTER_BRIGHT,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                mb: 0.5,
            }}>
            {title}
        </Typography>
        {links.map((link) => (
            <Link key={link.label} component={RouterLink} to={link.to} sx={linkSx}>
                {link.label}
            </Link>
        ))}
    </Box>
);

// ── FooterLinkGrid ─────────────────────────────────────────────────────────────
export const FooterLinkGrid = () => {
    const { t } = useTranslation('footer');

    const COLUMNS: { title: string; links: FooterLink[] }[] = [
        {
            title: t('columns.customers.title'),
            links: [
                { label: t('columns.customers.helpSupport'),     to: '/help' },
                { label: t('columns.customers.holidaySchedule'), to: '/holiday-schedule' },
                { label: t('columns.customers.shippingTimes'),   to: '/shipping-times' },
            ],
        },
        {
            title: t('columns.company.title'),
            links: [
                { label: t('columns.company.aboutUs'),       to: '/about' },
                { label: t('columns.company.accessibility'),  to: '/accessibility' },
                { label: t('columns.company.sitemap'),       to: '/sitemap' },
            ],
        },
        {
            title: t('columns.contact.title'),
            links: [
                { label: t('columns.contact.sendMessage'), to: '/contact' },
                { label: t('columns.contact.returns'),     to: '/returns' },
            ],
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ py: 5 }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                    gap: { xs: 4, md: 6 },
                    alignItems: 'start',
                }}>
                <FooterSubscribe />
                {COLUMNS.map((col) => (
                    <FooterLinkColumn
                        key={col.title}
                        title={col.title}
                        links={col.links}
                    />
                ))}
            </Box>
        </Container>
    );
};
