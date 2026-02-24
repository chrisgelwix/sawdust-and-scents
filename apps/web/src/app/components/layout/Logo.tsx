import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { theme } from '../../theme/theme';

export const Logo = () => {
    return (
        <Box
          component={Link}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none', //Revmoes the default link underline
            mr: 4, //Pushes the search bar away from the logo
            flexShrink: 0, //Never let the logo shrink or wrap
          }}
          >
            {/* Brand Icon - the "S&S" square */}
            <Box>
                <img src="/logo-only-transparent.png" alt="Welcome to Sawdust & Scents" width={48} height={48} style={{ display: 'block', margin: '0 auto' }} />
                </Box>
                  { /* Brand Name Text */ }
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        color: '#3e2723',
                        fontWeight: theme.typography.fontWeightRegular,
                        lineHeight: 1,
                      }}
                      >
                        <Box
                          component="span"
                          sx={{
                            fontWeight: theme.typography.fontWeightBold, fontFamily: theme.typography.fontFamily }}>SAWDUST & SCENTS</Box>
                        </Typography>
              </Box>
          </Box>
    );
};