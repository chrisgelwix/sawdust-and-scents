import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginModal } from './LoginModal';
import '@testing-library/jest-dom'

jest.mock('../../context/auth-context', () => ({}));
jest.mock('./SocialLoginButtons', () => {
    return {
        SocialLoginButtons: () => <div data-testid="social-login-buttons" />,
    }
});

describe('LoginModal', () => {
    const onClose = jest.fn();
    const onLogin = jest.fn(); 
    const onLoginWithProvider = jest.fn();
    const onRegister = jest.fn();

    const defaultProps ={
        open: true,
        onClose,
        onLogin,
        onLoginWithProvider,
        onRegister,
    };

    // clearMocks: true in jest.config.cts handles mock resets automatically

    it('renders the dialog when open is true', () => {
        render(<LoginModal {...defaultProps} />);
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('Shows "Sign In" as the default title', () => {
        render(<LoginModal {...defaultProps} />);
        expect(screen.getByRole('heading', {name: /sign in/i})).toBeTruthy();
    });

    it('shows a custom title when the title prop is provided', () => {
        render(<LoginModal {...defaultProps} title="Sign in with your new account" />);
        expect(screen.getByText('Sign in with your new account')).toBeTruthy();
    });

    it('pre-fills the email field when defaultUsername is provided', () => {
        render(<LoginModal {...defaultProps} defaultUsername="test@example.com" />);
        const emailInput = screen.getByRole('textbox', { name: /email/i });
        expect(emailInput).toHaveValue('test@example.com');
    });

    it('shows validation errors when the form is submitted with invalid inputs', () => {
        render(<LoginModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
        expect(screen.getByText('Email is required')).toBeTruthy();
        expect(screen.getByText('Password is required')).toBeTruthy();
    });

    it('does not call onLogin when validation fails', () => {
        render(<LoginModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', {name: /sign in/i}));
        expect(onLogin).not.toHaveBeenCalled();
    });

    it('shows a password error when the password is less than 8 characters', () => {
        render(<LoginModal {...defaultProps }/>);
        fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
            target: {value: 'user@example.com' }, 
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'short' },
        });
        fireEvent.click(screen.getByRole('button', {name: /sign in/i }));
        expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });

    it('calls onLogin with the correct credentials when the form is submitted with valid inputs', async () => {
        onLogin.mockResolvedValueOnce(undefined);
        render(<LoginModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', {name: /sign in/i }));
        await waitFor(() => expect(onLogin).toHaveBeenCalledWith('user@example.com', 'password123'));
        expect(onClose).toHaveBeenCalled();
    });
    
    it('displays a server error message when the login fails', async () => { 
        onLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
        render(<LoginModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByLabelText(/password/i), {
            target: {value: 'ValidPass1!' },
        });
        fireEvent.click(screen.getByRole('button', {name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeTruthy();
        });
    });

    it('calls onRegister when "Create Account" is clicked', () => {
        render(<LoginModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', {name: /create account/i}));
        expect(onRegister).toHaveBeenCalled();
    });
});