import {render, screen, fireEvent } from '@testing-library/react';
import { SocialLoginButtons } from './SocialLoginButtons';

jest.mock('../../context/auth-context', () => ({}));

describe('SocialLoginButtons', () => {
    const onLoginWithProvider = jest.fn();

    beforeEach(() => {
        onLoginWithProvider.mockClear();
        render(<SocialLoginButtons onLoginWithProvider={onLoginWithProvider} />);
    })

    it('renders the Google button', () => {
        expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy();
    });

    it('renders the GigHub button', () =>{
        expect(screen.getByRole('button', { name: /continue with github/i })).toBeTruthy();
    })

    it('renders the "or" divider', () => {
        expect(screen.getByText('or')).toBeTruthy();
    });

    it('calls onLoginWithProvider with "google" when Google is clicked', ()=> {
        fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
        expect(onLoginWithProvider).toHaveBeenCalledTimes(1);
        expect(onLoginWithProvider).toHaveBeenCalledWith('google');
    });

    it('calls onLoginWithProvider with "github" when GitHub is clicked', ()=> {
        fireEvent.click(screen.getByRole('button', { name: /continue with github/i }));
        expect(onLoginWithProvider).toHaveBeenCalledTimes(1);
        expect(onLoginWithProvider).toHaveBeenCalledWith('github');
    });

    it('does not call onLoginWithProvider before any button is clicked', () => {
        expect(onLoginWithProvider).not.toHaveBeenCalled();
    })
})