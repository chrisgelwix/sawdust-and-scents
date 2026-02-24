import { createTheme } from '@mui/material';
import { themeConfig } from './theme.config';

export const theme = createTheme({
    palette: {
        primary: { main: themeConfig.palette.primary },
        secondary: { main: themeConfig.palette.secondary },
    },
    typography: {
        fontFamily: themeConfig.typography.fontFamily,
        fontWeightRegular: themeConfig.typography.fontWeightRegular, 
        fontWeightMedium: themeConfig.typography.fontWeightMedium,
        fontWeightBold: themeConfig.typography.fontWeightBold,
    }
})