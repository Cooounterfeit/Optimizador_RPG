import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[2px] border text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-primary font-bold text-primary-foreground hover:bg-[oklch(0.99_0_0)]',
        outline:
          'border-line-strong bg-transparent text-foreground hover:border-muted-foreground hover:bg-raised',
        ghost: 'border-transparent bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground',
      },
      size: {
        md: 'h-[38px] px-4',
        sm: 'h-8 px-3 text-xs',
        icon: 'h-[38px] w-[38px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
