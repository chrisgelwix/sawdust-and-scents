import { useState } from 'react';
import { Box, Button, InputBase, Typography } from '@mui/material';
import { FOOTER_MUTED, FOOTER_BRIGHT, FOOTER_ACCENT } from './footer.constants';

// Rendered as the first column inside FooterLinkGrid — no zone wrapper needed.
export const FooterSubscribe = () => {
    const [email, setEmail]           = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = () => {
        if (email.trim() && email.includes('@')) {
            // TODO: wire to email marketing API (Klaviyo / Mailchimp)
            setSubscribed(true);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {/* Heading — matches FooterLinkColumn heading style */}
            <Typography
                variant="subtitle2"
                sx={{
                    color: FOOTER_BRIGHT,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    mb: 0.5,
                }}>
                Stay in the Loop
            </Typography>

            <Typography variant="body2" sx={{ color: FOOTER_MUTED }}>
                Exclusive deals, new arrivals, and craft inspiration — straight to your inbox.
            </Typography>

            {subscribed ? (
                <Typography sx={{ color: FOOTER_ACCENT, fontWeight: 600, fontSize: '0.9rem' }}>
                    🎉 You're subscribed! Watch your inbox for updates.
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
                    <InputBase
                        fullWidth
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
                        inputProps={{ 'aria-label': 'Email address for newsletter' }}
                        sx={{
                            bgcolor: '#4e342e',
                            borderRadius: 1,
                            px: 2,
                            py: 0.75,
                            color: FOOTER_BRIGHT,
                            fontSize: '0.9rem',
                            '& input::placeholder': { color: FOOTER_MUTED, opacity: 1 },
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSubscribe}
                        fullWidth
                        sx={{
                            bgcolor: FOOTER_ACCENT,
                            color: '#3e2723',
                            fontWeight: 700,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#ffa726' },
                        }}>
                        Subscribe
                    </Button>
                </Box>
            )}
        </Box>
    );
};
