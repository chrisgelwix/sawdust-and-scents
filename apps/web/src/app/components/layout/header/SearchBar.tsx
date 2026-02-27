import { useState } from 'react';
import { InputBase, Box, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/search';
import { useNavigate } from 'react-router-dom';

export const SearchBar =() => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = () => {
        if(query.trim()) {
            navigate(`/products?search=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if(e.key === 'Enter') handleSearch();
    }

    return (
        <Box
          sx={{
            flexGrow: 1, //Grow to fill available center space
            maxWidth: 600, //Cap width so it doesn't touch the edges
            mx: 'auto', //Center it horizontally
            bgcolor: '#f0f0f0',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 0.5,
          }}
        >
            <SearchIcon
              sx={{
                color: 'text.secondary',
                mr: 1,
              }}
              />
              <InputBase
                fullWidth
                placeholder="Search wood signs, candles, gift sets..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                sx={{
                    fontSize: '0.95rem' 
                }}
                />
                {query && (
                    <IconButton
                      size="small"
                      onClick={handleSearch}
                      aria-label="search">
                        <SearchIcon fontSize="small" />
                      </IconButton>
                )}
        </Box>
    );
};