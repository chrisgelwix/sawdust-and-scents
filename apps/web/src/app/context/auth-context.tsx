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
    loginWithCredentials: (username: string, password: string) => Promise<void>;
    loginModalOpen: boolean;
    openLoginModal: ()=> void;
    closeLoginModal: ()=> void;
}

const AuthContext = createContext<AuthContextType>({ 
    authenticated: false, 
    user: null, 
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    login: () => {}, 
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logout: () => {} ,
    loginWithCredentials: async (username: string, password: string): Promise<void> => {
        throw new Error('Not implemented');
    },
    loginModalOpen: false,
    openLoginModal: () => {},
    closeLoginModal: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [auth, setAuth] = useState<{ authenticated: boolean; user: KeycloakTokenParsed | null }>({ authenticated: false, user: null });
    const [ loginModalOpen, setLoginModalOpen ] = useState(false);
    const isRun = useRef(false);

    const login = () => {
        console.log('Login clicked');
        keycloak.login().catch(err => console.error('Login failed', err));
    };

    const logout = () => {
        console.log('Logout clicked');
        keycloak.logout().catch(err => console.error('Logout failed', err));
    };

    const openLoginModal = () => {
        setLoginModalOpen(true);
    }

    const closeLoginModal = () => {
        setLoginModalOpen(false);
    }

    const loginWithCredentials = async (username: string, password: string): Promise<void> =>  {
        try {
            const keyCloakUrl = process.env.KEYCLOAK_URL as string;
            const realm = process.env.KEYCLOAK_REALM as string;
            const clientId = process.env.KEYCLOAK_CLIENT_ID as string;

            const response = await fetch(
                `${keyCloakUrl}/realms/${realm}/protocol/openid-connect/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        grant_type: 'password',
                        client_id: clientId,
                        username,
                        password
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || 'Failed to login');
            }

            const data = await response.json();
            const decoded = JSON.parse(atob(data.access_token.split('.')[1])) as KeycloakTokenParsed;
            // what is happening is A JWT has three parts separated by a dot. The first part is the header, the second part is the payload, and the third part is the signature. The payload is a JSON object that contains the claims. We need to decode the payload to get the claims.
            setAuth({ authenticated: true, user: decoded });
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    }

    useEffect(() => {
        if (isRun.current) return;

        isRun.current = true;

        keycloak.init({
                onLoad: 'check-sso',
                silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
            })
            .then((authenticated: boolean) => {
                console.log('Keycloak Authenticated:', authenticated);
                setAuth({ authenticated, user: keycloak.tokenParsed || null });
            })
            .catch((err) => {
                console.error('Keycloak Init Error', err);
            });
        }, []);

        return (
            <AuthContext.Provider value={{
                ...auth, 
                login, 
                logout, 
                loginWithCredentials, 
                loginModalOpen, 
                openLoginModal, 
                closeLoginModal }}>
                {children}
            </AuthContext.Provider>
        );
};

export const useAuth = () => useContext(AuthContext);
