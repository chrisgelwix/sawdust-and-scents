import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import { PageWrapper } from '../components/layout/PageWrapper';

type FormErrors = Partial<Record<'name' | 'email' | 'subject' | 'message', string>>;

export const ContactPage = () => {
    const { t } = useTranslation('contact');

    // ── Form field state ────────────────────────────────────────────────────────
    const [name,        setName]        = useState('');
    const [email,       setEmail]       = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [subject,     setSubject]     = useState('');
    const [message,     setMessage]     = useState('');

    // ── UI state ────────────────────────────────────────────────────────────────
    const [errors,      setErrors]      = useState<FormErrors>({});
    const [submitting,  setSubmitting]  = useState(false);
    const [submitted,   setSubmitted]   = useState(false);
    const [serverError, setServerError] = useState('');

    // ── Validation ──────────────────────────────────────────────────────────────
    const validate = (): FormErrors => {
        const e: FormErrors = {};
        if (!name.trim())                        e.name    = t('validation.nameRequired');
        if (!email.trim())                       e.email   = t('validation.emailRequired');
        else if (!/\S+@\S+\.\S+/.test(email))    e.email   = t('validation.emailInvalid');
        if (!subject)                            e.subject = t('validation.subjectRequired');
        if (!message.trim())                     e.message = t('validation.messageRequired');
        else if (message.trim().length < 20)     e.message = t('validation.messageTooShort');
        return e;
    };

    // ── Submit ──────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setSubmitting(true);
        setServerError('');
        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, orderNumber, subject, message }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            setSubmitted(true);
        } catch {
            setServerError(t('error'));
        } finally {
            setSubmitting(false);
        }
    };

    // ── Success screen ──────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <PageWrapper title={t('title')}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        {t('success.title')}
                    </Typography>
                    <Typography color="text.secondary">
                        {t('success.body', { email })}
                    </Typography>
                </Box>
            </PageWrapper>
        );
    }

    // ── Form ────────────────────────────────────────────────────────────────────
    const subjects = t('subjects', { returnObjects: true }) as string[];

    return (
        <PageWrapper title={t('title')} subtitle={t('subtitle')}>
            <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                {/* Name */}
                <TextField
                    label={t('fields.name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={!!errors.name}
                    helperText={errors.name}
                    required
                    fullWidth
                />

                {/* Email */}
                <TextField
                    label={t('fields.email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                    required
                    fullWidth
                    type="email"
                />

                {/* Order number — optional, no validation */}
                <TextField
                    label={t('fields.orderNumber')}
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    fullWidth
                />

                {/* Subject dropdown */}
                <FormControl required error={!!errors.subject} fullWidth>
                    <InputLabel>{t('fields.subject')}</InputLabel>
                    <Select
                        value={subject}
                        label={t('fields.subject')}
                        onChange={(e) => setSubject(e.target.value)}>
                        {subjects.map((s) => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </Select>
                    {errors.subject && (
                        <FormHelperText>{errors.subject}</FormHelperText>
                    )}
                </FormControl>

                {/* Message */}
                <TextField
                    label={t('fields.message')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    error={!!errors.message}
                    helperText={errors.message}
                    required
                    fullWidth
                    multiline
                    rows={5}
                />

                {/* Server error */}
                {serverError && (
                    <Alert severity="error">{serverError}</Alert>
                )}

                {/* Submit */}
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                    sx={{ alignSelf: 'flex-start', px: 4 }}>
                    {submitting ? t('fields.sending') : t('fields.send')}
                </Button>
            </Box>
        </PageWrapper>
    );
};
