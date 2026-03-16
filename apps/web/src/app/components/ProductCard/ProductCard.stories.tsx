import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { fn } from '@storybook/test';
import { ProductCard, ProductCardProps } from './ProductCard';

const meta: Meta<typeof ProductCard> ={
    title: 'Components/ProductCard',
    component: ProductCard,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    }, 
    args: {
        onAddToCart: fn(),
        onViewDetails: fn(),
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Story 1: Lavender Candle ( In Stock )
export const LavenderCandle: Story = {
    args: {
        name: 'Lavender Dream Candle',
        description: 'Hand-poured soy candle with essential lavender oil. Burns for 40+ hours.',
        price: 24.99,
        imageUrl: 'https://images.unsplash.com/photo-1602874801006-e24814749a6d?w=400',
        inStock: true,
        category: 'candle',
    },
};

// Story 2: Wooden Sign ( In Stock )
export const WoodenSign: Story = {      
    args: {
        name: 'Welcome Home Sign',
        description: 'Handcrafted wooden sign with rustic finish. Perfect for entryways.',
        price: 39.99,
        imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400',
        inStock: true,
        category: 'sign',
    },
};
 
// Story 3: Out of Stock
export const OutOfStock: Story = {
    args: {
        name: 'Seasonal Pine Candle',
        description: 'Limited edition pine-scented candle for the holidays.',
        price: 29.99,
        imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400',
        inStock: false,
        category: 'candle',
    },
};

// Story 4: No Category
export const NoCategory: Story = {
    args: {
        name: 'Artisan Coaster Set',
        description: 'Set of 4 wooden coasters with protective finish.',    
        price: 18.99,
        imageUrl: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=400',
        inStock: true,
    },
};

// Story 5: Grid Display ( Multiple Cards )
export const GridDisplay: Story = {
    render: () => (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            <ProductCard {...LavenderCandle.args! as ProductCardProps} />
            <ProductCard {...WoodenSign.args! as ProductCardProps} />
            <ProductCard {...OutOfStock.args! as ProductCardProps} />
        </Box>
    ),
    parameters: {
        layout: 'padded',
    },
};