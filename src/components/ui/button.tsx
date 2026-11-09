import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva} from 'class-variance-authority';
import {cn} from '../../lib/utils.js';
const variants=cva('inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2',{variants:{variant:{default:'bg-slate-900 text-white hover:bg-slate-700',outline:'border border-slate-300 bg-white hover:bg-slate-100',ghost:'bg-transparent text-slate-700 hover:bg-slate-100',destructive:'bg-red-600 text-white hover:bg-red-700'}},defaultVariants:{variant:'default'}});
export function Button({className,variant='default',asChild=false,...props}:React.ComponentProps<'button'>&{variant?:'default'|'outline'|'ghost'|'destructive';asChild?:boolean}){
  const Comp=asChild?Slot:'button';
  return <Comp data-variant={variant} className={cn(variants({variant}),className)} {...props}/>;
}
