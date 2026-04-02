import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import { useProduct } from '../../hooks/useProduct';

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { product, loading, error } = useProduct(id);

  if (loading) {
    return (
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Button onClick={() => navigate(-1)} sx={{ mb: 4 }}>
          ← Back to Catalog
        </Button>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rounded" height={420} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton width="30%" />
            <Skeleton width="80%" height={64} />
            <Skeleton width="40%" height={48} />
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton variant="rounded" height={48} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Button onClick={() => navigate(-1)} sx={{ mb: 4 }}>
          ← Back to Catalog
        </Button>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Button onClick={() => navigate(-1)} sx={{ mb: 4 }}>
          ← Back to Catalog
        </Button>
        <Typography>Product not found</Typography>
      </Container>
    );
  }

  const attributes = product.attributes ?? {};

  return (
    <Container sx={{ py: 8 }} maxWidth="lg">
      <Button onClick={() => navigate(-1)} sx={{ mb: 4 }}>
        ← Back to Catalog
      </Button>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            component="img"
            src={product.imageUrl}
            alt={product.name}
            sx={{ width: '100%', borderRadius: 2, objectFit: 'cover' }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {product.category ? (
              <Chip size="small" label={product.category} />
            ) : null}
            {!product.inStock ? (
              <Chip size="small" color="error" label="Out of stock" />
            ) : null}
          </Box>

          <Typography variant="h3" component="h1" gutterBottom>
            {product.name}
          </Typography>
          <Typography variant="h4" color="primary" sx={{ mb: 2, fontWeight: 700 }}>
            ${product.price.toFixed(2)}
          </Typography>

          {product.description ? (
            <Typography variant="body1" paragraph>
              {product.description}
            </Typography>
          ) : null}

          <Box sx={{ my: 4 }}>
            <Typography variant="h6" gutterBottom>
              Specifications
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {Object.keys(attributes).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No additional details provided.
              </Typography>
            ) : (
              Object.entries(attributes).map(([key, value]) => (
                <Box
                  key={key}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {key}
                  </Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right' }}>
                    {String(value)}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!product.inStock}
          >
            {product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}

