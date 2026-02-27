import { useState } from 'react';
import {
    Box,
    ButtonBase,
    Container,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Link,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import { FOOTER_MUTED, FOOTER_BRIGHT, FOOTER_ACCENT } from './footer.constants';
import { FooterSubscribe } from './FooterSubscribe';

// ── Types ──────────────────────────────────────────────────────────────────────
type PopupKey = 'holiday' | 'shipping' | 'returns';

type FooterLink =
    | { label: string; to: string; popup?: never }
    | { label: string; popup: PopupKey; to?: never };

// ── Popup content ──────────────────────────────────────────────────────────────
const POPUP_CONTENT: Record<PopupKey, { title: string; body: React.ReactNode }> = {
    holiday: {
        title: 'Holiday Schedule',
        body: (
            <Box>
                <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
                    Our studio and shipping team observe the following holidays. Orders placed during
                    these dates will be processed the next business day.
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Holiday</strong></TableCell>
                            <TableCell><strong>Date</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[
                            ["New Year's Day",   "January 1"],
                            ["Memorial Day",     "Last Monday in May"],
                            ["Independence Day", "July 4"],
                            ["Labor Day",        "First Monday in September"],
                            ["Thanksgiving",     "Fourth Thursday in November"],
                            ["Christmas Eve",    "December 24"],
                            ["Christmas Day",    "December 25"],
                            ["New Year's Eve",   "December 31"],
                        ].map(([holiday, date]) => (
                            <TableRow key={holiday}>
                                <TableCell>{holiday}</TableCell>
                                <TableCell>{date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        ),
    },
    shipping: {
        title: 'Shipping Times',
        body: (
            <Box>
                <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
                    All orders are handcrafted and ship from our studio in the U.S.
                    Processing time is 1–3 business days before your order ships.
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Method</strong></TableCell>
                            <TableCell><strong>Estimated Delivery</strong></TableCell>
                            <TableCell><strong>Cost</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[
                            ["Standard",      "5–8 business days", "From $4.99"],
                            ["Expedited",     "2–4 business days", "From $12.99"],
                            ["Overnight",     "Next business day", "From $24.99"],
                            ["Free Shipping", "5–8 business days", "Orders over $75"],
                        ].map(([method, time, cost]) => (
                            <TableRow key={method}>
                                <TableCell>{method}</TableCell>
                                <TableCell>{time}</TableCell>
                                <TableCell>{cost}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Typography variant="caption" sx={{ mt: 2, display: 'block' }} color="text.secondary">
                    International shipping is available. Rates calculated at checkout.
                </Typography>
            </Box>
        ),
    },
    returns: {
        title: 'Returns & Exchanges',
        body: (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                    We stand behind every item we make. If something isn't right, we'll make it right.
                </Typography>
                {[
                    ["30-day returns",  "Return most items within 30 days of delivery for a full refund."],
                    ["Custom orders",   "Personalized or custom items are final sale and cannot be returned."],
                    ["Damaged items",   "If your order arrives damaged, contact us within 7 days and we'll send a replacement at no charge."],
                    ["How to return",   "Email us at returns@sawdustandscents.com with your order number. We'll send a prepaid label."],
                    ["Refund timeline", "Refunds are processed within 3–5 business days of receiving your return."],
                ].map(([heading, detail]) => (
                    <Box key={heading as string}>
                        <Typography variant="body2" fontWeight={600}>{heading}</Typography>
                        <Typography variant="body2" color="text.secondary">{detail}</Typography>
                    </Box>
                ))}
            </Box>
        ),
    },
};

// ── FooterLinkColumn ───────────────────────────────────────────────────────────
const linkSx = {
    color: FOOTER_MUTED,
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'block',
    transition: 'color 0.15s',
    '&:hover': { color: FOOTER_ACCENT },
} as const;

interface FooterLinkColumnProps {
    title: string;
    links: FooterLink[];
    onOpenPopup: (key: PopupKey) => void;
}

const FooterLinkColumn = ({ title, links, onOpenPopup }: FooterLinkColumnProps) => (
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
        {links.map((link) =>
            link.popup ? (
                <ButtonBase
                    key={link.label}
                    onClick={() => onOpenPopup(link.popup!)}
                    disableRipple
                    sx={{
                        ...linkSx,          // same colour, font-size, hover as Link
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        textAlign: 'left',
                    }}>
                    {link.label}
                </ButtonBase>
            ) : (
                <Link
                    key={link.label}
                    component={RouterLink}
                    to={link.to!}
                    sx={linkSx}>
                    {link.label}
                </Link>
            )
        )}
    </Box>
);

// ── Column definitions ─────────────────────────────────────────────────────────
const COLUMNS: { title: string; links: FooterLink[] }[] = [
    {
        title: 'Customers',
        links: [
            { label: 'Help & Support',   to: '/help' },
            { label: 'Holiday Schedule', popup: 'holiday' },
            { label: 'Shipping Times',   popup: 'shipping' },
        ],
    },
    {
        title: 'Sawdust & Scents',
        links: [
            { label: 'About Us',      to: '/about' },
            { label: 'Accessibility', to: '/accessibility' },
            { label: 'Sitemap',       to: '/sitemap' },
        ],
    },
    {
        title: 'Get in Touch',
        links: [
            { label: 'Send Us a Message',   to: '/contact' },
            { label: 'Returns & Exchanges', popup: 'returns' },
        ],
    },
];

// ── FooterLinkGrid ─────────────────────────────────────────────────────────────
export const FooterLinkGrid = () => {
    const [openModal, setOpenModal] = useState<PopupKey | null>(null);

    return (
        <>
            <Container maxWidth="lg" sx={{ py: 5 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',   // subscribe + 3 link columns
                        },
                        gap: { xs: 4, md: 6 },
                        alignItems: 'start',        // columns pin to top, not stretch
                    }}>
                    {/* Subscribe form — first column on the left */}
                    <FooterSubscribe />

                    {/* Three navigation columns */}
                    {COLUMNS.map((col) => (
                        <FooterLinkColumn
                            key={col.title}
                            title={col.title}
                            links={col.links}
                            onOpenPopup={setOpenModal}
                        />
                    ))}
                </Box>
            </Container>

            {/* ── Popup modals ───────────────────────────────────────────── */}
            <Dialog
                open={openModal !== null}
                onClose={() => setOpenModal(null)}
                fullWidth
                maxWidth="sm">
                {openModal && (
                    <>
                        <DialogTitle
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                pb: 1,
                            }}>
                            <Typography variant="h6" color="primary" fontWeight={600}>
                                {POPUP_CONTENT[openModal].title}
                            </Typography>
                            <IconButton
                                onClick={() => setOpenModal(null)}
                                size="small"
                                aria-label="Close dialog">
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            {POPUP_CONTENT[openModal].body}
                        </DialogContent>
                    </>
                )}
            </Dialog>
        </>
    );
};
