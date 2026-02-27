import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterModal } from './RegisterModal';
import '@testing-library/jest-dom'

jest.mock('../../context/auth-context', () => ({}));
jest.mock('./SocialLoginButtons', () => {
    return {
        SocialLoginButtons: () => <div data-testid="social-login-buttons" />,
    }
});

describe('RegisterModal', () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    const onLoginWithProvider = jest.fn();

    const defaultProps = {
        open: true,
        onClose,
        onSuccess,
        onLoginWithProvider,
    };

    beforeEach(() => {
        // clearMocks: true in jest.config.cts handles mock resets automatically
        global.fetch = jest.fn();
    });

    const fillValidform = () => {
        fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: /first name/i }), {
            target: { value: 'John' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: /last name/i }), {
            target: { value: 'Doe' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: /display name/i }), {
            target: { value: 'John Doe' },
        });
        fireEvent.change(screen.getByRole('textbox', { name: /phone number/i }), {
            target: { value: '555-555-5555' },
        });
        fireEvent.change(screen.getByLabelText(/^password/i), {
            target: { value: 'ValidPass1!' },
        });
        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: 'ValidPass1!' },
        });
    }

    it('renders the dialog when open is true', () => {
        render(<RegisterModal {...defaultProps} />);
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('shows "Create Account" as the default title', () => {
        render(<RegisterModal {...defaultProps} />);
        expect(screen.getByRole('heading', {name: /create account/i})).toBeTruthy();
    });
    
    it('renders the social login buttons', () => {
        render(<RegisterModal {...defaultProps} />);
        expect(screen.getByTestId('social-login-buttons')).toBeTruthy();
    });

    it('shows validation errors when the form is submitted with invalid inputs', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', {name: /create account/i}));
        expect(screen.getByText('Email is required')).toBeTruthy();
        expect(screen.getByText('First name is required')).toBeTruthy();
    });

    it('does not call onSuccess when validation fails', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', {name: /create account/i}));
        expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows a password error when the password is less than 8 characters', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByLabelText(/^password/i), {
            target: { value: 'short' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });

    it('shows a complexity error when the password is long enough but not complex', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByLabelText(/^password/i), {
            target: { value: 'alllowercase1!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText(/uppercase letter/i)).toBeTruthy();
    });

    it('shows an error when passwords do not match', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByLabelText(/^password/i), {
            target: { value: 'ValidPass1!' },
        });
        fireEvent.change(screen.getByLabelText(/confirm password/i), {
            target: { value: 'DifferentPass1!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText('Passwords do not match')).toBeTruthy();
    });

    it('shows an error for an invalid email format', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /email/i }), {
            target: { value: 'notanemail' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });

    it('shows an error when the display name is too short', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /display name/i }), {
            target: { value: 'a' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText('Display name must be at least 2 characters')).toBeTruthy();
    });

    it('shows an error when the display name exceeds 30 characters', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /display name/i }), {
            target: { value: 'a'.repeat(31) },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText('Display name must be 30 characters or fewer')).toBeTruthy();
    });

    it('shows an error when the display name contains profanity', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /display name/i }), {
            target: { value: 'shit' }, // known entry in the bad-words default list
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText('Please choose a family-friendly display name')).toBeTruthy();
    });

    it('shows an error for an invalid phone number format', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /phone number/i }), {
            target: { value: '123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(screen.getByText(/valid US phone number/i)).toBeTruthy();
    });

    it('does not call fetch when validation fails', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));
        expect(global.fetch).not.toHaveBeenCalled();
    });

    // ── SMS opt-in checkbox ────────────────────────────────────────────────────

    it('does not show the SMS opt-in checkbox when the phone field is empty', () => {
        render(<RegisterModal {...defaultProps} />);
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('shows the SMS opt-in checkbox when a phone number is entered', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /phone number/i }), {
            target: { value: '555-555-5555' },
        });
        expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('hides the SMS opt-in checkbox again when the phone field is cleared', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.change(screen.getByRole('textbox', { name: /phone number/i }), {
            target: { value: '555-555-5555' },
        });
        expect(screen.getByRole('checkbox')).toBeTruthy();

        fireEvent.change(screen.getByRole('textbox', { name: /phone number/i }), {
            target: { value: '' },
        });
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    // ── Successful submission ──────────────────────────────────────────────────

    it('calls onSuccess with the registered email on a successful submission', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 201 });

        render(<RegisterModal {...defaultProps} />);
        fillValidform();
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalledWith('user@example.com');
        });
    });

    // ── Server errors ──────────────────────────────────────────────────────────

    it('shows an "email already exists" error when the server returns 409', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 409 });

        render(<RegisterModal {...defaultProps} />);
        fillValidform();
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText('An account with this email already exists.')).toBeTruthy();
        });
    });

    it('shows a generic error when the server returns a non-409 failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

        render(<RegisterModal {...defaultProps} />);
        fillValidform();
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(screen.getByText('Registration failed. Please try again.')).toBeTruthy();
        });
    });

    it('does not call onSuccess when the server returns an error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

        render(<RegisterModal {...defaultProps} />);
        fillValidform();
        fireEvent.click(screen.getByRole('button', { name: /create account/i }));

        await waitFor(() => {
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });

    // ── Sign In link ───────────────────────────────────────────────────────────

    it('calls onClose when the "Sign In" link is clicked', () => {
        render(<RegisterModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});