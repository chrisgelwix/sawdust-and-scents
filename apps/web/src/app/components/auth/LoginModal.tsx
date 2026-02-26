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
    Typography
} from '@mui/material';
import { SocialLoginButtons } from './SocialLoginButtons';
import { SocialProvider } from '../../context/auth-context';

interface LoginModalProps {
    open: boolean;
    onClose: ()=> void;
    onLogin: (username: string, password: string) => Promise<void>;
    onLoginWithProvider: (provider: SocialProvider) => void;
    onRegister: () => void;
    title?: string;
    defaultUsername?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────
type LoginErrors = { username?: string; password?: string };

function validateLogin(username: string, password: string): LoginErrors {
    const errors: LoginErrors = {};

    if (!username.trim()) {
        errors.username = 'Email is required';
    }

    if (!password) {
        errors.password = 'Password is required';
    } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    }

    return errors;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
    open, 
    onClose, 
    onLogin, 
    onLoginWithProvider,
    onRegister,
    title = 'Sign In',
    defaultUsername = '',
    }) => {
    const [ username, setUsername ] = useState(defaultUsername);
    const [ password, setPassword ] = useState('');

    // Sync pre-filled username whenever the modal opens with a new defaultUsername
    useEffect(() => {
        if (open) setUsername(defaultUsername);
    }, [open, defaultUsername]);
    const [ loading, setLoading ] = useState(false);
    const [ serverError, setServerError ] = useState<string | null>(null);
    const [ errors, setErrors ] = useState<LoginErrors>({});

    // Clear a field's inline error as soon as the user starts correcting it
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
        try{
            await onLogin(username.trim(), password);
            onClose();
        } catch (error) {
            setServerError(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog 
          open={ open }
          onClose= { onClose }
          fullWidth
          maxWidth="sm">
            <DialogTitle 
                variant="h6" 
                color="primary" 
                align="center">
                    { title }
            </DialogTitle>
            <DialogContent>

                {/* ── Social Login Buttons + Divider ──────────────────────────── */}
                <SocialLoginButtons onLoginWithProvider={onLoginWithProvider} />

                {/* ── Username / Password Form ──────────────────────────── */}
                <TextField
                    label="Email"
                    value={ username }
                    type="email"
                    onChange={ (e) => { setUsername(e.target.value); clearFieldError('username'); }}
                    onKeyDown={ (e) => e.key === 'Enter' && handleSubmit() }
                    error={ !!errors.username }
                    helperText={ errors.username }
                    fullWidth
                    margin="normal"
                    required
                    autoFocus
                    sx={{ mb: 2 }} />
                <TextField
                    label="Password"
                    value={ password }
                    onChange={ (e) => { setPassword(e.target.value); clearFieldError('password'); }}
                    onKeyDown={ (e) => e.key === 'Enter' && handleSubmit() }
                    error={ !!errors.password }
                    helperText={ errors.password }
                    fullWidth
                    margin="normal"
                    required
                    type="password"
                    sx={{ mb:2 }} />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={ loading }
                    onClick={ handleSubmit }>
                        { loading ? 'Signing in...' : 'Sign In' }
                        { loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Button>
                {/* ── Server Error ───────────────────────────────────────── */}
                { serverError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        { serverError }
                    </Alert>
                )}
                
                {/* ── Register Link ───────────────────────────────────── */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        mt: 3, 
                        gap: 1 }}>
                            <Typography 
                                variant="body2" 
                                color="text.secondary">
                                    New here?
                                </Typography>
                                <Button
                                    size="small"
                                    onClick={onRegister}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}>
                                        Create Account →
                                    </Button>
                                </Box>
            </DialogContent>
          </Dialog>   
    )
}