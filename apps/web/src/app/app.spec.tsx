import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './app';

// Mock auth-context to avoid loading keycloak-js in unit tests
jest.mock('./context/auth-context', () => ({
  useAuth: () => ({ authenticated: false, user: null, login: jest.fn(), logout: jest.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(baseElement).toBeTruthy();
  });

  it('should display the app title', () => {
    const { getByText } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(getByText('Sawdust & Scents')).toBeTruthy();
  });
});
