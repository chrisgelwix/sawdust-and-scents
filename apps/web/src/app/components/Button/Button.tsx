import {Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

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
    const muiVariant = variant === 'text' ? 'text' : 'contained';
    const color = variant === 'secondary' ? 'secondary' : 'primary';

    return (
        <MuiButton 
            variant={ muiVariant }
            color={ color }
            disabled={ disabled || loading }
            onClick={ onClick }
            { ...props }
        >
            { loading ? 'Loading...' : label}
        </MuiButton>
    );
 }

 export default Button;