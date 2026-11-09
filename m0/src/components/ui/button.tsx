// shadcn/ui button pattern: owned source, Radix Slot + CVA + Tailwind.
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const variants = cva('inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2', {variants:{variant:{default:'bg-slate-900 text-white hover:bg-slate-700',outline:'border border-slate-300 bg-white hover:bg-slate-100'}},defaultVariants:{variant:'default'}});
export function Button({className,variant='default',asChild=false,...props}:React.ComponentProps<'button'> & {variant?:'default'|'outline';asChild?:boolean}) {const Comp=asChild?Slot:'button';return <Comp className={twMerge(clsx(variants({variant}),className))} {...props}/>;}
