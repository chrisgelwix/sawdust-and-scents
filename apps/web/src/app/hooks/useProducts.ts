import { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

export interface Product {
    _id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    inStock: boolean;
    category?: string;
    attributes?: Record<string, unknown>;
}

type ApiProduct = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  attributes?: Record<string, unknown>;
};

function firstImageUrl(attributes: Record<string, unknown> | undefined): string | undefined {
  if (!attributes) return undefined;
  const direct = attributes['imageUrl'];
  if (typeof direct === 'string' && direct.trim()) return direct;

  const images = attributes['images'];
  if (Array.isArray(images) && typeof images[0] === 'string' && images[0].trim()) {
    return images[0];
  }

  return undefined;
}

function computeInStock(attributes: Record<string, unknown> | undefined): boolean {
  if (!attributes) return true;
  const inStock = attributes['inStock'];
  if (typeof inStock === 'boolean') return inStock;
  const stock = attributes['stock'];
  if (typeof stock === 'number') return stock > 0;
  return true;
}

function normalizeProduct(p: ApiProduct): Product {
  const imageUrl =
    firstImageUrl(p.attributes) ??
    'https://placehold.co/800x600?text=Product';

  return {
    _id: p._id,
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    category: p.category,
    attributes: p.attributes,
    imageUrl,
    inStock: computeInStock(p.attributes),
  };
}

export function useProducts(category?: string | null) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState (true);
    const [error, setError] = useState<string | null> (null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                const response = await axios.get<ApiProduct[]>(
                  category
                    ? `${getApiBaseUrl()}/products/category/${encodeURIComponent(category)}`
                    : `${getApiBaseUrl()}/products`
                );
                setProducts((response.data ?? []).map(normalizeProduct));
            } catch {
                setError('Failed to load products');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [category]);

    return { products, loading, error };
}