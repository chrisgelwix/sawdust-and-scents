import { Box, Typography, Button} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface AnnouncementBannerProps {
    message: string;
    ctaText?: string;
    ctaHref?: string;
}

export const AnnouncementBanner = ({
    message,
    ctaText,
    ctaHref,
}: AnnouncementBannerProps) => {
    return (
        <Box 
          sx={{
            bgcolor: '#e0f2f1',
            px: 3,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
         >
            <Typography variant="body2" 
              sx={{ 
                color: '#00695c',
                fontWeight: 500
              }}>
                {message}
              </Typography>
              {ctaText && ctaHref && (
                <Button
                  href={ctaHref}
                  variant="contained"
                  size="small"
                  endIcon={<ChevronRightIcon />}
                  sx={{
                    bgcolor: '#00695c',
                    borderRadius: '20px',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#004d40' }
                }}
                >
                    {ctaText}
                </Button>
              )}
        </Box>
    );

};