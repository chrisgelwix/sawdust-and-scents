import React from 'react';
import { 
    Card,
    CardContent,
    CardMedia, 
    Typography,
    CardActions,
    Box, 
    Chip,
} from '@mui/material';
import { Button } from '../Button/Button';

export interface ProductCardProps {
    /** Product name */
    name: string;
    /** Product description */
    description: string;
    /** Price in USD */
    price: number;
    /** Image URL */
    imageUrl: string;
    /** Stock availability */
    inStock: boolean;
    category?: 'candle' | 'sign' | 'decor';
    /** Callback when add to cart is clicked */
    onAddToCart?: () => void;
    /** Callback when product is clicked */
    onViewDetails?: () => void;
}

/**
 * ProductCard displays a single product in the catalog
 * with image, details, and action buttons
 */
export function ProductCard({ 
    name,
    description,
    price,
    imageUrl,
    inStock,
    category,
    onAddToCart,
    onViewDetails,
}: ProductCardProps) {
    const getCategoryColor =() => {
        switch (category) {
            case 'candle': return 'warning';
            case 'sign': return 'primary';
            case 'decor': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <Card
          sx= {{
            maxWidth: 345,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <CardMedia 
              component="img"
              height="200"
              image={imageUrl}
              alt={name}
              sx={{ 
                objectFit: 'cover', 
                cursor: 'pointer' }}
              onClick={onViewDetails}
            />
            <CardContent
              sx={{flexGrow: 1}}>
                <Box sx={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    mb: 1
                }}>
                    <Typography
                      gutterBottom 
                      variant="h6"
                      component="h2"
                      sx={{ mb: 0 }}>
                        {name}
                      </Typography>
                      {category && (
                        <Chip
                          label={category}
                          size="small"
                          color={getCategoryColor()}
                          />
                      )}
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb:2}}
                  >
                    {description}
                  </Typography>
                  <Typography
                    variant="h5"
                    color="primary"
                    fontWeight="bold">
                        ${price.toFixed(2)}
                    </Typography>
                    {!inStock && (
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ display: 'block', mt: 1 }}
                        >
                            Out of Stock
                        </Typography>
                    )}
                </CardContent>
                <CardActions
                  sx={{ px: 2, pb: 2 }}>
                    <Button
                      label="Add to Cart"
                      variant="primary"
                      disabled={!inStock}
                      onClick={onAddToCart}
                      fullWidth
                      />
                    <Button 
                      label="Details"
                      variant="text"
                      onClick={onViewDetails}
                    />
                </CardActions>
          </Card>
    );
}

export default ProductCard;