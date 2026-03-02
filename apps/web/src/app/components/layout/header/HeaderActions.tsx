import {
    Box,
    IconButton,
    Badge,
    Button,
    Menu,
    MenuItem,
    Divider,
    Tooltip,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/auth-context';
import { KeycloakTokenParsed } from 'keycloak-js';
import { LoginModal } from '../../auth/LoginModal';
import { useState, useRef } from 'react';
import { RegisterModal } from '../../auth/RegisterModal';

// Extend the standard token type to include our custom Keycloak attribute
type AppToken = KeycloakTokenParsed & { friendlyName?: string };

const navButtonSx = {
  color: 'text.primary',
  textTransform: 'none' as const,
  fontWeight: 'fontWeightMedium',
} as const;

interface HeaderActionsProps {
    cartItemCount?: number;
}

export const HeaderActions = ({ cartItemCount = 0 }: HeaderActionsProps) => {
  const { t } = useTranslation('common');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    authenticated, user, logout,
    loginModalOpen, openLoginModal, closeLoginModal,
    loginWithCredentials, loginWithProvider,
  } = useAuth();

  const displayName =
    (user as AppToken)?.friendlyName ?? user?.given_name ?? t('nav.guest');

  const [anchorEl,         setAnchorEl]         = useState<HTMLElement | null>(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [postReg,           setPostReg]           = useState<{ title: string; username: string } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMenuClose = () => { if (anchorEl) setAnchorEl(null); };

  const handleOpenRegister = () => { closeLoginModal(); setRegisterModalOpen(true); };

  const handleRegisterSuccess = (username: string) => {
    setPostReg({ title: t('postReg.signInWithNewAccount'), username });
    setRegisterModalOpen(false);
    openLoginModal();
  };

  const handleLoginModalClose = () => { setPostReg(null); closeLoginModal(); };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 3, flexShrink: 0 }}>

        <Button component={Link} to="/rewards" sx={navButtonSx}>
          {t('nav.rewards')}
        </Button>

        <Button component={Link} to="/help" sx={navButtonSx}>
          {t('nav.help')}
        </Button>

        {authenticated ? (
          <Box
            onMouseEnter={() => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
              setAnchorEl(buttonRef.current);
            }}
            onMouseLeave={() => {
              closeTimer.current = setTimeout(() => setAnchorEl(null), 200);
            }}
            sx={{ display: 'inline-block' }}
          >
            <Button ref={buttonRef} sx={navButtonSx}>
              {displayName}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>{t('account.welcome', { name: displayName })}</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>{t('account.myAccount')}</MenuItem>
              <MenuItem onClick={handleMenuClose}>{t('account.myOrders')}</MenuItem>
              <Divider />
              <MenuItem onClick={() => { handleMenuClose(); logout(); }}>
                {t('account.signOut')}
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Tooltip title={t('account.welcomeGuest')} arrow>
            <Button onClick={openLoginModal} sx={navButtonSx}>
              {t('nav.signIn')}
            </Button>
          </Tooltip>
        )}

        <IconButton component={Link} to="/cart" aria-label={t('nav.cartAriaLabel')}>
          <Badge
            badgeContent={cartItemCount}
            color="secondary"
            sx={{ '& .MuiBadge-badge': { bgcolor: '#00695c', color: 'white' } }}
          >
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </Box>

      <LoginModal
        open={loginModalOpen}
        onClose={handleLoginModalClose}
        onLogin={loginWithCredentials}
        onLoginWithProvider={loginWithProvider}
        onRegister={handleOpenRegister}
        title={postReg?.title}
        defaultUsername={postReg?.username}
      />
      <RegisterModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
        onLoginWithProvider={loginWithProvider}
      />
    </>
  );
};

export default HeaderActions;
