import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Box,
    Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SocialLoginButtons } from './SocialLoginButtons';
import { SocialProvider } from '../../context/auth-context';

interface LoginModalProps {
    open: boolean;
    onClose: () => void;
    onLogin: (username: string, password: string) => Promise<void>;
    onLoginWithProvider: (provider: SocialProvider) => void;
    onRegister: () => void;
    title?: string;
    defaultUsername?: string;
}

// ── Validation — returns i18n keys, translated in JSX ─────────────────────────
type LoginErrors = { username?: string; password?: string };

function validateLogin(username: string, password: string): LoginErrors {
    const errors: LoginErrors = {};
    if (!username.trim())  errors.username = 'login.errors.emailRequired';
    if (!password)         errors.password = 'login.errors.passwordRequired';
    else if (password.length < 8) errors.password = 'login.errors.passwordMinLength';
    return errors;
}

export const LoginModal: React.FC<LoginModalProps> = ({
    open,
    onClose,
    onLogin,
    onLoginWithProvider,
    onRegister,
    title,
    defaultUsername = '',
}) => {
    const { t } = useTranslation('auth');

    const [username,    setUsername]    = useState(defaultUsername);
    const [password,    setPassword]    = useState('');
    const [loading,     setLoading]     = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [errors,      setErrors]      = useState<LoginErrors>({});

    // Sync pre-filled username whenever the modal opens with a new defaultUsername
    useEffect(() => {
        if (open) setUsername(defaultUsername);
    }, [open, defaultUsername]);

    const clearFieldError = (field: keyof LoginErrors) => {
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async () => {
        const validationErrors = validateLogin(username, password);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        setServerError(null);
        setErrors({});
        try {
            await onLogin(username.trim(), password);
            onClose();
        } catch (error) {
            setServerError(error instanceof Error ? error.message : t('login.errors.generic'));
        } finally {
            setLoading(false);
        }
    };

    const modalTitle = title ?? t('login.title');

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle variant="h6" color="primary" align="center">
                {modalTitle}
            </DialogTitle>
            <DialogContent>

                <SocialLoginButtons onLoginWithProvider={onLoginWithProvider} />

                <TextField
                    label={t('login.emailLabel')}
                    value={username}
                    type="email"
                    onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.username}
                    helperText={errors.username ? t(errors.username) : undefined}
                    fullWidth
                    margin="normal"
                    required
                    autoFocus
                    sx={{ mb: 2 }}
                />
                <TextField
                    label={t('login.passwordLabel')}
                    value={password}
                    type="password"
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.password}
                    helperText={errors.password ? t(errors.password) : undefined}
                    fullWidth
                    margin="normal"
                    required
                    sx={{ mb: 2 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    onClick={handleSubmit}>
                    {loading ? t('login.signingIn') : t('login.signInBtn')}
                    {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Button>

                {serverError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {serverError}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('login.newHere')}
                    </Typography>
                    <Button
                        size="small"
                        onClick={onRegister}
                        sx={{ textTransform: 'none', fontWeight: 600 }}>
                        {t('login.createAccountBtn')}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
