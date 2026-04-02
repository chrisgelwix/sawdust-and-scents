import { Container, Grid, Skeleton, Typography } from '@mui/material';
import { ProductCard } from '../../components/ProductCard/ProductCard';
import { useProducts } from '../../hooks/useProducts';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ProductGrid() { 
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category');

    const { products, loading, error } = useProducts(category);
    const navigate = useNavigate();

    if (loading) {
      return (
        <Container sx={{ py: 8 }} maxWidth="lg">
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Our Collection
          </Typography>
          <Grid container spacing={4}>
            {Array.from({ length: 9 }).map((_, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                <Skeleton variant="rounded" height={420} />
              </Grid>
            ))}
          </Grid>
        </Container>
      );
    }

    if (error) {
      return (
        <Container sx={{ py: 8 }} maxWidth="lg">
          <Typography color="error">{error}</Typography>
        </Container>
      );
    }

    return (
      <Container sx={{ py: 8 }} maxWidth="lg">
        <Typography variant="h3" component="h1" gutterBottom align="center">
          {category ? category.replace(/-/g, ' ') : 'Our Collection'}
        </Typography>

        {products.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
            No products found for this category.
          </Typography>
        ) : null}
        <Grid container spacing={4}>
          {products.map((product) => (
            <Grid key={product._id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ProductCard
                {...product}
                onViewDetails={() => navigate(`/products/${product._id}`)}
                onAddToCart={() => console.log('Add to cart: ', product._id)}
                showCategoryBadge={category === 'sale'}
                onCategoryClick={(cat) => navigate(`/products?category=${encodeURIComponent(cat)}`)}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
};