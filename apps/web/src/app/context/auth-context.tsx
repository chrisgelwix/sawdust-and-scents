import { createContext, useEffect, useState, useContext, useRef } from 'react';
import Keycloak, { KeycloakTokenParsed } from 'keycloak-js';

const keycloak = new Keycloak({
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'sdas-realm',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'sdas-web',
});

interface AuthContextType {
    authenticated: boolean;
    user: KeycloakTokenParsed | null;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
    authenticated: false, 
    user: null, 
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    login: () => {}, 
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logout: () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth, setAuth] = useState<{ authenticated: boolean; user: KeycloakTokenParsed | null }>({ authenticated: false, user: null });
    const isRun = useRef(false);

    const login = () => {
        console.log('Login clicked');
        keycloak.login().catch(err => console.error('Login failed', err));
    };

    const logout = () => {
        console.log('Logout clicked');
        keycloak.logout().catch(err => console.error('Logout failed', err));
    };

    useEffect(() => {
        if (isRun.current) return;

        isRun.current = true;
        console.log('Keycloak Init Config:', {
            url: keycloak.authServerUrl,
            realm: keycloak.realm,
            clientId: keycloak.clientId
        });

        keycloak.init({ onLoad: 'check-sso' })
            .then((authenticated: boolean) => {
                console.log('Keycloak Authenticated:', authenticated);
                setAuth({ authenticated, user: keycloak.tokenParsed || null });
            })
            .catch((err) => {
                console.error('Keycloak Init Error', err);
            });
        }, []);

        return (
            <AuthContext.Provider value={{...auth, login, logout}}>
                {children}
            </AuthContext.Provider>
        );
};

export const useAuth = () => useContext(AuthContext);
