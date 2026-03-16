import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import Button from './Button';

const meta: Meta<typeof Button> = {
    title: 'Components/Button', 
    component: Button, 
    tags: ['autodocs'], // Enables auto-generated documentation
    parameters: {
        layout: 'cntered', // Centers the component in the canvas
    },
    argTypes: { // Defines the props for the component
        variant: { // Defines the variant prop
            control: 'select', // Creates a select control in Storybook
            options: ['primary', 'secondary', 'text'], // Creates a list of options for the control
            description: 'Visual style of the button', // Adds a description to the control
        },
        loading: {
            control: 'boolean', // Creates a boolean control in Storybook
            description: 'Shows loading state', // Adds a description to the control
        },
        disabled: {
            control: 'boolean', // Creates a boolean control in Storybook
            description: 'Disables the button', // Adds a description to the control
        },
    },
    args: {
        onClick: fn(),  // Creates a spy function that logs when called
    },
}; 

export default meta; // Exports the meta object for Storybook to use
type Story = StoryObj<typeof meta>; // Defines the type of the story

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
        variant: 'text', // Sets the variant to text
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
        <Button {...args} startIcon=<span>🛒</span> />
    ),
};