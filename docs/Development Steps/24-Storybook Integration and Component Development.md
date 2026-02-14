# Step 21: Storybook Integration and Component Development

## 1. The "Why" Behind This Step: The Component Playground

Building a React application without Storybook is like building furniture without first testing the individual pieces. **Storybook** is your "Component Workshop"—a place where you can build, test, and document each UI component in isolation before assembling them into the full application.

**The Strategy**: We integrate **Storybook** into our Nx monorepo.
- **The Analogy**: Think of Storybook as a showroom where you display each button, card, and form separately. Designers can review them, developers can test them, and QA can verify them—all without running the entire application.
- **The Benefit**: Find bugs faster, collaborate better, and create a living style guide.

---

## 2. Core Concepts & Definitions

### 2.1 Component-Driven Development (CDD)

- **Definition**: Building UI components in isolation before composing them into pages.
- **The Logic**: Instead of building a full checkout page and then realizing the button is wrong, you build the button perfectly first, then compose it into the page.

### 2.2 Stories

- **Definition**: A Story is a single state of a component. A Button component might have stories for: "Primary Button," "Secondary Button," "Disabled Button," "Loading Button," etc.
- **The Logic**: Each story is like a photo in a catalog—it shows one specific version of the component.

### 2.3 Addons

- **Definition**: Storybook plugins that extend functionality.
- **Common Addons**:
  - **Controls**: Interactive controls to change props on the fly
  - **Actions**: Log events like clicks
  - **Docs**: Auto-generate documentation
  - **Accessibility**: Test for a11y compliance
  - **Viewport**: Test responsive designs

### 2.4 Component Documentation

- **The Logic**: Storybook auto-generates documentation from your TypeScript types and JSDoc comments. Write once, document automatically.

---

## 3. Prerequisites

Before proceeding with this step, ensure you have completed:

- ✅ Step 19 - React Frontend Foundation
- ✅ React app running at `http://localhost:4200`
- ✅ Material-UI installed

---

## 4. Step-by-Step Implementation

### Step 4.1: Install Storybook in the Nx Workspace

Nx has first-class support for Storybook. We'll use the Nx generator to set it up.

```bash
# Install Storybook for React
npm install --save-dev @nx/storybook @storybook/react-vite @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y

# Generate Storybook configuration for the web app
npx nx generate @nx/react:storybook-configuration web
```

**What This Does:**
1. Installs Storybook and necessary addons
2. Creates `.storybook/` configuration folder
3. Updates `project.json` with Storybook targets
4. Adds example stories (which we'll customize)

### Step 4.2: Configure Storybook with Material-UI Theme

Update `apps/web/.storybook/preview.tsx` to wrap all stories with your theme:

```tsx
import type { Preview } from '@storybook/react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Match the theme from your app.tsx
const theme = createTheme({
  palette: {
    primary: { main: '#5d4037' }, // Wood Brown
    secondary: { main: '#ffb74d' }, // Candle Amber
  },
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'dark', value: '#333333' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
```

### Step 4.3: Install Accessibility Addon

Update `apps/web/.storybook/main.ts` to include the a11y addon:

```ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y', // Accessibility testing
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

### Step 4.4: Create Your First Component Story

Let's create a reusable Button component and its story.

**Create the Component**: `apps/web/src/components/Button/Button.tsx`

```tsx
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant'> {
  /** Button text */
  label: string;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'text';
  /** Loading state */
  loading?: boolean;
}

/**
 * Custom Button component for Sawdust & Scents
 * Wraps Material-UI Button with consistent styling
 */
export function Button({ 
  label, 
  variant = 'primary', 
  loading = false,
  disabled,
  onClick,
  ...props 
}: ButtonProps) {
  // Map our custom variants to MUI variants
  const muiVariant = variant === 'text' ? 'text' : 'contained';
  const color = variant === 'secondary' ? 'secondary' : 'primary';

  return (
    <MuiButton
      variant={muiVariant}
      color={color}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? 'Loading...' : label}
    </MuiButton>
  );
}

export default Button;
```

**Create the Story**: `apps/web/src/components/Button/Button.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import Button from './Button';

/**
 * The Button component is used throughout the application for user actions.
 * It's built on top of Material-UI's Button with custom theming.
 */
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'text'],
      description: 'Visual style of the button',
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Story 1: Primary Button (Default)
export const Primary: Story = {
  args: {
    label: 'Add to Cart',
    variant: 'primary',
  },
};

// Story 2: Secondary Button
export const Secondary: Story = {
  args: {
    label: 'View Details',
    variant: 'secondary',
  },
};

// Story 3: Text Button
export const Text: Story = {
  args: {
    label: 'Cancel',
    variant: 'text',
  },
};

// Story 4: Loading State
export const Loading: Story = {
  args: {
    label: 'Processing',
    loading: true,
    variant: 'primary',
  },
};

// Story 5: Disabled State
export const Disabled: Story = {
  args: {
    label: 'Out of Stock',
    disabled: true,
    variant: 'primary',
  },
};

// Story 6: With Icon (Advanced)
export const WithIcon: Story = {
  args: {
    label: 'Add to Cart',
    variant: 'primary',
  },
  render: (args) => (
    <Button {...args} startIcon={<span>🛒</span>} />
  ),
};
```

### Step 4.5: Create a ProductCard Component with Story

Let's create a more complex component to showcase Storybook's power.

**Create the Component**: `apps/web/src/components/ProductCard/ProductCard.tsx`

```tsx
import { Card, CardContent, CardMedia, Typography, CardActions, Box, Chip } from '@mui/material';
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
  /** Product category tag */
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
  const getCategoryColor = () => {
    switch (category) {
      case 'candle': return 'warning';
      case 'sign': return 'primary';
      case 'decor': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ maxWidth: 345, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="200"
        image={imageUrl}
        alt={name}
        sx={{ objectFit: 'cover', cursor: 'pointer' }}
        onClick={onViewDetails}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
          <Typography gutterBottom variant="h6" component="h2" sx={{ mb: 0 }}>
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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Typography variant="h5" color="primary" fontWeight="bold">
          ${price.toFixed(2)}
        </Typography>
        {!inStock && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
            Out of Stock
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
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
```

**Create the Story**: `apps/web/src/components/ProductCard/ProductCard.stories.tsx`

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Box } from '@mui/material';
import ProductCard from './ProductCard';

const meta: Meta<typeof ProductCard> = {
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

// Story 1: Lavender Candle (In Stock)
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

// Story 2: Wooden Sign (In Stock)
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

// Story 5: Grid Display (Multiple Cards)
export const GridDisplay: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      <ProductCard {...LavenderCandle.args!} />
      <ProductCard {...WoodenSign.args!} />
      <ProductCard {...OutOfStock.args!} />
    </Box>
  ),
  parameters: {
    layout: 'padded',
  },
};
```

---

## 5. Deep Dive: Code Keyword Breakdown

### 5.1 `Meta<typeof Component>`

- **The Logic**: This TypeScript type tells Storybook about your component's props, enabling auto-complete and type checking in stories.

### 5.2 `tags: ['autodocs']`

- **The Logic**: Automatically generates documentation from your TypeScript types and JSDoc comments. No extra work needed!

### 5.3 `argTypes`

- **The Logic**: Defines how Storybook's Controls panel should display each prop. You can specify control types (select, boolean, text) and descriptions.

### 5.4 `args`

- **The Logic**: Default values for all stories. Individual stories can override these.

### 5.5 `fn()` from `@storybook/test`

- **The Logic**: Creates a spy function that logs when called. Perfect for testing click handlers in the Actions panel.

### 5.6 `render`

- **The Logic**: Advanced story feature that lets you wrap the component or compose multiple components. Used in the "GridDisplay" story.

---

## 6. Running and Using Storybook

### Step 6.1: Start Storybook

```bash
# Start Storybook development server
npx nx storybook web

# Opens at http://localhost:4400 (or next available port)
```

### Step 6.2: Explore the Interface

When Storybook opens, you'll see:

1. **Sidebar**: Component tree showing all stories
2. **Canvas**: The rendered component
3. **Controls Panel** (bottom): Interactive prop editor
4. **Actions Panel** (bottom): Logs of event callbacks
5. **Docs Tab**: Auto-generated documentation
6. **Accessibility Tab**: a11y violations and warnings

### Step 6.3: Interactive Testing

Try these interactions:

1. **Change Props**: Use Controls to change the button label, variant, or disabled state
2. **Test Events**: Click buttons and watch the Actions panel
3. **Check Accessibility**: Switch to the Accessibility tab and fix any violations
4. **Responsive Testing**: Use the viewport toolbar to test mobile/tablet/desktop

---

## 7. Best Practices for Storybook

### 7.1 Story Organization

```
Components/
├── Button
├── ProductCard
└── Forms/
    ├── Input
    ├── Checkbox
    └── Select
```

Use the `title` field to create hierarchy: `'Components/Forms/Input'`

### 7.2 Document Everything

```tsx
/**
 * Primary button for main actions
 * @param label - Text displayed on the button
 * @param onClick - Handler function when clicked
 */
```

These JSDoc comments appear in Storybook's Docs tab!

### 7.3 Test All States

Every component should have stories for:
- ✅ Default state
- ✅ Loading state
- ✅ Disabled state
- ✅ Error state (if applicable)
- ✅ Empty state (for lists/tables)
- ✅ Edge cases (very long text, no data, etc.)

### 7.4 Use Composition

Build complex components from simpler ones:

```tsx
// ProductCard uses Button component
import { Button } from '../Button/Button';
```

This creates a dependency graph you can visualize in Storybook.

---

## 8. Building a Storybook Library

### Step 8.1: Create a Component Library Structure

```bash
# Create directories
mkdir -p apps/web/src/components/Button
mkdir -p apps/web/src/components/ProductCard
mkdir -p apps/web/src/components/Input
mkdir -p apps/web/src/components/Layout
```

### Step 8.2: Export Components from Index

Create `apps/web/src/components/index.ts`:

```typescript
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button';

export { ProductCard } from './ProductCard/ProductCard';
export type { ProductCardProps } from './ProductCard/ProductCard';

// Add more exports as you create components
```

### Step 8.3: Use in Your App

```tsx
// apps/web/src/app/pages/Products.tsx
import { ProductCard } from '../../components';

function ProductsPage() {
  return <ProductCard {...productData} />;
}
```

---

## 9. Building Static Storybook for Deployment

### Step 9.1: Build Storybook

```bash
# Build static Storybook files
npx nx build-storybook web

# Output: dist/storybook/web
```

### Step 9.2: Deploy Options

1. **GitHub Pages**: Free hosting for your component library
2. **Chromatic**: Automatic visual regression testing
3. **Netlify/Vercel**: Easy deployment with preview URLs
4. **S3 + CloudFront**: AWS hosting alongside your app

### Step 9.3: Add to CI/CD

Update `.github/workflows/ci.yml`:

```yaml
  storybook_build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Build Storybook
        run: npx nx build-storybook web
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/storybook/web
```

---

## 10. Advanced Features

### 10.1 Interaction Testing

Test user flows directly in Storybook:

```tsx
import { userEvent, within } from '@storybook/test';

export const AddToCartFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Simulate clicking "Add to Cart"
    const addButton = canvas.getByRole('button', { name: /add to cart/i });
    await userEvent.click(addButton);
    
    // Check if action was logged
    // (You'd add actual assertions here)
  },
};
```

### 10.2 Visual Regression Testing with Chromatic

```bash
# Install Chromatic
npm install --save-dev chromatic

# Run visual tests
npx chromatic --project-token=YOUR_TOKEN
```

Chromatic automatically detects visual changes and requires approval before merging.

### 10.3 Figma Integration

Connect Storybook to Figma designs:

```bash
npm install --save-dev storybook-addon-designs
```

Link stories to Figma frames for design-dev alignment.

---

## 11. Verification & Learning Check

### 11.1 The "Component Catalog" Test

1. **Start Storybook**: `npx nx storybook web`
2. **Navigate**: Find your Button and ProductCard stories
3. **Interact**: Change props using Controls
4. **Test**: Click buttons and see Actions logged
5. **The Lesson**: If you can modify props and see results instantly, you've mastered component isolation!

### 11.2 The "Accessibility" Test

1. **Open a Story**: View the ProductCard
2. **Switch to Accessibility Tab**: Check for violations
3. **Fix Issues**: Add missing alt text, ARIA labels, etc.
4. **The Lesson**: Storybook helps you catch a11y issues before they reach production

---

## 12. Checklist for Success

- [ ] **Storybook Installed**: Can run `npx nx storybook web`
- [ ] **Theme Applied**: Stories use your Material-UI theme
- [ ] **Button Stories**: All button variants documented
- [ ] **ProductCard Stories**: Complex component with multiple states
- [ ] **Controls Working**: Can modify props interactively
- [ ] **Actions Logging**: Click events appear in Actions panel
- [ ] **Accessibility**: No critical a11y violations
- [ ] **Documentation**: JSDoc comments appear in Docs tab
- [ ] **Build Successful**: `npx nx build-storybook web` completes

---

## 13. Vocabulary Breakdown

- **Story**: A single rendered state of a component
- **Args**: Props passed to a component in a story
- **Controls**: Interactive UI for modifying props
- **Actions**: Panel that logs component events
- **Decorators**: Wrappers that add context (like ThemeProvider)
- **Addons**: Extensions that add functionality to Storybook
- **Canvas**: Main area where the component renders
- **Autodocs**: Automatically generated documentation
- **Play Function**: Automated interaction testing

---

## 14. Next Steps

Now that you have Storybook set up, you can:

1. **Build Your Component Library**: Create Input, Select, Modal, Card, etc.
2. **Document Design System**: Define colors, typography, spacing
3. **Share with Team**: Deploy Storybook for designers and QA
4. **Add Visual Testing**: Integrate Chromatic for regression testing
5. **Move to Step 22**: Implement Playwright for full E2E testing

**Congratulations!** You now have a professional component development environment. Your components are isolated, documented, and ready to compose into full pages!

---

## 15. Common Troubleshooting

### Issue: Storybook won't start

```bash
# Clear cache and reinstall
rm -rf node_modules/.cache
npm ci
```

### Issue: Theme not applied

Check that `preview.tsx` includes the ThemeProvider decorator.

### Issue: Stories not appearing

Verify the `stories` glob pattern in `.storybook/main.ts` matches your file structure.

### Issue: TypeScript errors in stories

Ensure `tsconfig.json` includes Storybook types:

```json
{
  "compilerOptions": {
    "types": ["@storybook/react", "node"]
  }
}
```

---

**Remember**: Storybook is your component workshop. Build small, test thoroughly, then compose into greatness! 🎨
