import { 
    Box,
    IconButton,
    Badge,
    Button,
    Menu, 
    MenuItem,
    Divider,
    Tooltip } from '@mui/material';
import  ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { LoginModal } from '../auth/LoginModal';
import { useState, useRef } from 'react';

const navButtonSx = {
  color: 'text.primary',
  textTransform: 'none' as const,
  fontWeight: 'fontWeightMedium',
} as const;

interface HeaderActionsProps {
    cartItemCount?: number;
}

export const HeaderActions = ({ cartItemCount = 0 }: HeaderActionsProps) => {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { authenticated, user, login, logout, loginModalOpen, openLoginModal, closeLoginModal, loginWithCredentials } = useAuth();
  const [ anchorEl, setAnchorEl ] = useState<HTMLElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleMouseEnterButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    if(closeTimer.current) clearTimeout(closeTimer.current);
    setAnchorEl(buttonRef.current);
  };
  const handleMouseLeaveButton = () => {
    closeTimer.current = setTimeout(() => setAnchorEl(null), 150);
  }
  const handleMouseEnterMenu =() => {
    if(closeTimer.current) clearTimeout(closeTimer.current);;
  }
  const handleMouseLeaveMenu = () => {
    setAnchorEl(null);
  }
  const handleMenuClose = () => {
    if(anchorEl) setAnchorEl(null);
  }

    return (
        <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            ml: 3,
            flexShrink: 0, //Never let actions wrap to next line
          }}
          >
            {/* Rewards Link */ }
            <Button
              component={Link}
              to="/rewards"
              sx={navButtonSx}>
                    Rewards
                </Button>

                { /* Help Link */ }
                <Button
                  component={Link}
                  to="/help"
                   sx={navButtonSx}>
                      Help
                    </Button>

                {/* Account — dropdown when Logged in, Login button when not  */}
               {authenticated ? (
                  <>
                  <Box
                      onMouseEnter={() => { 
                        if (closeTimer.current) 
                          clearTimeout(closeTimer.current); 
                        setAnchorEl(buttonRef.current);}}
                      onMouseLeave={() => { closeTimer.current = setTimeout(() => setAnchorEl(null), 200); }}
                      sx={{ display: 'inline-block' }}
                  >
                    <Button ref={buttonRef}
                      sx={navButtonSx}>
                        {user?.given_name ?? 'Sign In'}
                      </Button>
                      <Menu 
                        anchorEl = { anchorEl }
                        open = { Boolean(anchorEl) }
                        onClose = { handleMenuClose } 
                        >
                        
                          <MenuItem disabled>
                            Welcome, {user?.given_name ?? 'Guest' }
                          </MenuItem>

                          <Divider /> 
                          <MenuItem onClick={handleMenuClose}>My Account</MenuItem>
                          <MenuItem onClick={handleMenuClose}>My Orders</MenuItem>
                          <Divider />

                          <MenuItem onClick={() => { handleMenuClose(); logout();}}>
                            Sign Out 
                          </MenuItem>
                        </Menu>
                  </Box>
                  </>
                ) : (
                  <Tooltip title="Welcome, Guest!" arrow>
                      <Button 
                        onClick={openLoginModal} 
                        sx={navButtonSx}>
                          Sign In
                      </Button>
                    </Tooltip>
                )}

                {/* Cart Icon with item badge */}
                <IconButton
                  component={Link}
                  to="/cart"
                  aria-label="Shopping cart">
                  <Badge
                    badgeContent={cartItemCount}
                    color="secondary"
                    sx={{
                        '& .MuiBadge-badge': {
                            bgcolor: '#00695c',
                            color: 'white'
                        },
                    }}
                    >
                        <ShoppingCartIcon />
                    </Badge>
                </IconButton>
          </Box>

          <LoginModal 
            open= { loginModalOpen }
            onClose = { closeLoginModal }
            onLogin = { loginWithCredentials}
          >

          </LoginModal>
          </>
        );
};