import { useState } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    TextField, 
    Button, 
    CircularProgress,
    Alert,
    Box } from '@mui/material';

interface LoginModalProps {
    open: boolean;
    onClose: ()=> void;
    onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose, onLogin }) => {
    const [ username, setUsername ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ loading, setLoading ] = useState(false);
    const [ error, setError ] = useState<string | null>(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try{
            await onLogin( username, password);
            onClose();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An error occurred');
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
                    Sign In
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="User Name"
                    value={ username }
                    onChange={ (e) => setUsername(e.target.value) }
                    fullWidth
                    margin="normal"
                    required
                    autoFocus
                    sx={{ mb: 2 }} />
                <TextField
                    label="Password"
                    value={ password }
                    onChange={ (e) => setPassword(e.target.value) }
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
                        { loading ? 'Loading...' : 'Sign In' }
                        { loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                    { error && <Alert severity="error" sx={{ mt: 2 }}>{ error }</Alert> }
                </Box>
            </DialogContent>
          </Dialog>   
    )
}