import { useState } from 'react';
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
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SocialLoginButtons } from './SocialLoginButtons';
import { SocialProvider } from '../../context/auth-context';
import Filter from 'bad-words';
import naughtyWords from 'naughty-words';

const profanityFilter = new Filter();
profanityFilter.addWords(...naughtyWords.en);

// ── Validation — returns i18n keys, translated in JSX ─────────────────────────
type RegisterErrors = {
    email?: string;
    firstName?: string;
    lastName?: string;
    friendlyName?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PHONE_REGEX = /^\+?1?\s?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$/;

function validateRegister(fields: {
    email: string; firstName: string; lastName: string;
    friendlyName: string; phone: string; password: string; confirmPassword: string;
}): RegisterErrors {
    const errors: RegisterErrors = {};

    if (!fields.email.trim())                              errors.email = 'register.errors.emailRequired';
    else if (!EMAIL_REGEX.test(fields.email.trim()))       errors.email = 'register.errors.emailInvalid';

    if (!fields.firstName.trim())  errors.firstName = 'register.errors.firstNameRequired';
    if (!fields.lastName.trim())   errors.lastName  = 'register.errors.lastNameRequired';

    if (fields.friendlyName.trim() && fields.friendlyName.trim().length < 2)
        errors.friendlyName = 'register.errors.displayNameMinLength';
    else if (fields.friendlyName.trim().length > 30)
        errors.friendlyName = 'register.errors.displayNameMaxLength';
    else if (fields.friendlyName.trim() && profanityFilter.isProfane(fields.friendlyName.trim()))
        errors.friendlyName = 'register.errors.displayNameProfanity';

    if (fields.phone.trim() && !PHONE_REGEX.test(fields.phone.trim()))
        errors.phone = 'register.errors.phoneInvalid';

    if (!fields.password)                                         errors.password = 'register.errors.passwordRequired';
    else if (fields.password.length < 8)                          errors.password = 'register.errors.passwordMinLength';
    else if (!PASSWORD_COMPLEXITY_REGEX.test(fields.password))    errors.password = 'register.errors.passwordComplexity';

    if (!fields.confirmPassword)                                  errors.confirmPassword = 'register.errors.confirmPasswordRequired';
    else if (fields.password !== fields.confirmPassword)          errors.confirmPassword = 'register.errors.passwordMismatch';

    return errors;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface RegisterModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (email: string) => void;
    onLoginWithProvider: (provider: SocialProvider) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
    open, onClose, onSuccess, onLoginWithProvider,
}) => {
    const { t } = useTranslation('auth');

    const [email,           setEmail]           = useState('');
    const [firstName,       setFirstName]       = useState('');
    const [lastName,        setLastName]        = useState('');
    const [friendlyName,    setFriendlyName]    = useState('');
    const [phone,           setPhone]           = useState('');
    const [smsOptIn,        setSmsOptIn]        = useState(false);
    const [password,        setPassword]        = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading,         setLoading]         = useState(false);
    const [serverError,     setServerError]     = useState<string | null>(null);
    const [errors,          setErrors]          = useState<RegisterErrors>({});

    const clearFieldError = (field: keyof RegisterErrors) => {
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async () => {
        const validationErrors = validateRegister({
            email, firstName, lastName, friendlyName, phone, password, confirmPassword,
        });
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setLoading(true);
        setServerError(null);
        setErrors({});
        try {
            const response = await fetch(`${process.env.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email:        email.trim(),
                    firstName:    firstName.trim(),
                    lastName:     lastName.trim(),
                    friendlyName: friendlyName.trim() || undefined,
                    phoneNumber:  phone.trim() || undefined,
                    smsOptIn:     phone.trim() ? smsOptIn : undefined,
                    password,
                }),
            });

            if (response.status === 409) {
                setServerError(t('register.errors.emailConflict'));
                return;
            }
            if (!response.ok) {
                setServerError(t('register.errors.registrationFailed'));
                return;
            }
            onSuccess(email.trim());
        } catch (err) {
            setServerError(err instanceof Error ? err.message : t('register.errors.generic'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle variant="h6" color="primary" align="center">
                {t('register.title')}
            </DialogTitle>
            <DialogContent>

                <SocialLoginButtons onLoginWithProvider={onLoginWithProvider} />

                <TextField
                    label={t('register.emailLabel')}
                    value={email}
                    type="email"
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.email}
                    helperText={errors.email ? t(errors.email) : t('register.emailHelper')}
                    fullWidth margin="normal" required autoFocus sx={{ mb: 1 }}
                />
                <TextField
                    label={t('register.firstNameLabel')}
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.firstName}
                    helperText={errors.firstName ? t(errors.firstName) : undefined}
                    fullWidth margin="normal" required sx={{ mb: 1 }}
                />
                <TextField
                    label={t('register.lastNameLabel')}
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.lastName}
                    helperText={errors.lastName ? t(errors.lastName) : undefined}
                    fullWidth margin="normal" required sx={{ mb: 1 }}
                />
                <TextField
                    label={t('register.displayNameLabel')}
                    value={friendlyName}
                    onChange={(e) => { setFriendlyName(e.target.value); clearFieldError('friendlyName'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.friendlyName}
                    helperText={errors.friendlyName ? t(errors.friendlyName) : t('register.displayNameHelper')}
                    fullWidth margin="normal" sx={{ mb: 1 }}
                />
                <TextField
                    label={t('register.phoneLabel')}
                    value={phone}
                    type="tel"
                    onChange={(e) => {
                        setPhone(e.target.value);
                        clearFieldError('phone');
                        if (!e.target.value.trim()) setSmsOptIn(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.phone}
                    helperText={errors.phone ? t(errors.phone) : t('register.phoneHelper')}
                    fullWidth margin="normal" sx={{ mb: 0 }}
                />
                {phone.trim() && (
                    <FormControlLabel
                        sx={{ mt: 0.5, mb: 1, ml: 0 }}
                        control={
                            <Checkbox
                                checked={smsOptIn}
                                onChange={(e) => setSmsOptIn(e.target.checked)}
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="caption" color="text.secondary">
                                {t('register.smsOptIn')}
                            </Typography>
                        }
                    />
                )}
                <TextField
                    label={t('register.passwordLabel')}
                    value={password}
                    type="password"
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.password}
                    helperText={errors.password ? t(errors.password) : t('register.passwordHelper')}
                    fullWidth margin="normal" required sx={{ mb: 1 }}
                />
                <TextField
                    label={t('register.confirmPasswordLabel')}
                    value={confirmPassword}
                    type="password"
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword ? t(errors.confirmPassword) : undefined}
                    fullWidth margin="normal" required sx={{ mb: 2 }}
                />

                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading}
                    onClick={handleSubmit}>
                    {loading ? t('register.creatingAccount') : t('register.createAccountBtn')}
                    {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Button>

                {serverError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {serverError}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('register.alreadyHaveAccount')}
                    </Typography>
                    <Button
                        size="small"
                        onClick={onClose}
                        sx={{ textTransform: 'none', fontWeight: 600 }}>
                        {t('register.signInBtn')}
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
