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
import { SocialLoginButtons } from './SocialLoginButtons';
import { SocialProvider } from '../../context/auth-context';
import Filter from 'bad-words';
import naughtyWords from 'naughty-words';

const profanityFilter = new Filter();
// Extend with naughty-words English list (slurs, hate speech, identity-based terms)
profanityFilter.addWords(...naughtyWords.en);

// ── Validation ────────────────────────────────────────────────────────────────
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
// Accepts: 555-555-5555 | (555) 555-5555 | 5555555555 | +1 555 555 5555
const PHONE_REGEX = /^\+?1?\s?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}$/;

function validateRegister(fields: {
    email: string;
    firstName: string;
    lastName: string;
    friendlyName: string;
    phone: string;
    password: string;
    confirmPassword: string;
}): RegisterErrors {
    const errors: RegisterErrors = {};

    // Email (primary login identifier)
    if (!fields.email.trim()) {
        errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(fields.email.trim())) {
        errors.email = 'Please enter a valid email address';
    }

    // First name
    if (!fields.firstName.trim()) {
        errors.firstName = 'First name is required';
    }

    // Last name
    if (!fields.lastName.trim()) {
        errors.lastName = 'Last name is required';
    }

    // Friendly Name — optional, but if provided must be 2–30 chars and family-friendly
    if (fields.friendlyName.trim() && fields.friendlyName.trim().length < 2) {
        errors.friendlyName = 'Display name must be at least 2 characters';
    } else if (fields.friendlyName.trim().length > 30) {
        errors.friendlyName = 'Display name must be 30 characters or fewer';
    } else if (fields.friendlyName.trim() && profanityFilter.isProfane(fields.friendlyName.trim())) {
        errors.friendlyName = 'Please choose a family-friendly display name';
    }

    // Phone — optional, but if provided must match US format
    if (fields.phone.trim() && !PHONE_REGEX.test(fields.phone.trim())) {
        errors.phone = 'Please enter a valid US phone number (e.g. 555-555-5555)';
    }

    // Password
    if (!fields.password) {
        errors.password = 'Password is required';
    } else if (fields.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(fields.password)) {
        errors.password =
            'Password must contain an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&)';
    }

    // Confirm password
    if (!fields.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
    } else if (fields.password !== fields.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
}

// ── Component ────────────────────────────────────────────────────────────────
interface RegisterModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (email: string) => void;
    onLoginWithProvider: (provider: SocialProvider) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
    open,
    onClose,
    onSuccess,
    onLoginWithProvider,
}) => {
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [friendlyName, setFriendlyName] = useState('');
    const [phone, setPhone] = useState('');
    const [smsOptIn, setSmsOptIn] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [errors, setErrors] = useState<RegisterErrors>({});

    // Clear a single field's inline error as the user corrects it
    const clearFieldError = (field: keyof RegisterErrors) => {
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async () => {
        const validationErrors = validateRegister({
            email,
            firstName,
            lastName,
            friendlyName,
            phone,
            password,
            confirmPassword,
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    friendlyName: friendlyName.trim() || undefined,
                    phoneNumber: phone.trim() || undefined,
                    smsOptIn: phone.trim() ? smsOptIn : undefined,
                    password,
                }),
            });

            if (response.status === 409) {
                setServerError('An account with this email already exists.');
                return;
            }
            if (!response.ok) {
                throw new Error('Registration failed. Please try again.');
            }

            onSuccess(email.trim());
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle variant="h6" color="primary" align="center">
                Create Account
            </DialogTitle>
            <DialogContent>

                <SocialLoginButtons onLoginWithProvider={onLoginWithProvider} />

                {/* ── Form Fields ───────────────────────────────────────── */}
                <TextField
                    label="Email"
                    value={email}
                    type="email"
                    onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.email}
                    helperText={errors.email ?? 'This will be your login email'}
                    fullWidth
                    margin="normal"
                    required
                    autoFocus
                    sx={{ mb: 1 }}
                />
                <TextField
                    label="First Name"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    fullWidth
                    margin="normal"
                    required
                    sx={{ mb: 1 }}
                />
                <TextField
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                    fullWidth
                    margin="normal"
                    required
                    sx={{ mb: 1 }}
                />
                <TextField
                    label="Display Name"
                    value={friendlyName}
                    onChange={(e) => { setFriendlyName(e.target.value); clearFieldError('friendlyName'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.friendlyName}
                    helperText={errors.friendlyName ?? 'Optional — shown on reviews and comments'}
                    fullWidth
                    margin="normal"
                    sx={{ mb: 1 }}
                />
                <TextField
                    label="Phone Number"
                    value={phone}
                    type="tel"
                    onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); if (!e.target.value.trim()) setSmsOptIn(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.phone}
                    helperText={errors.phone ?? 'Optional — for order updates and exclusive offers'}
                    fullWidth
                    margin="normal"
                    sx={{ mb: 0 }}
                />
                {/* SMS opt-in — only show when a phone number has been entered */}
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
                                Send me SMS updates about sales and new products
                            </Typography>
                        }
                    />
                )}
                <TextField
                    label="Password"
                    value={password}
                    type="password"
                    onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.password}
                    helperText={
                        errors.password ??
                        'Min 8 characters — must include uppercase, lowercase, number, and special character'
                    }
                    fullWidth
                    margin="normal"
                    required
                    sx={{ mb: 1 }}
                />
                <TextField
                    label="Confirm Password"
                    value={confirmPassword}
                    type="password"
                    onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
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
                    {loading ? 'Creating account...' : 'Create Account'}
                    {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Button>

                {/* ── Server Error ───────────────────────────────────────── */}
                {serverError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {serverError}
                    </Alert>
                )}

                {/* ── Switch back to Sign In ─────────────────────────────── */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mt: 3,
                        gap: 1,
                    }}>
                    <Typography variant="body2" color="text.secondary">
                        Already have an account?
                    </Typography>
                    <Button
                        size="small"
                        onClick={onClose}
                        sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Sign In →
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
