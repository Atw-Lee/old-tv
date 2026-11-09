import type {ComponentProps} from 'react';
import {cn} from '../../lib/utils.js';
export function Table({className,...props}:ComponentProps<'table'>) {
  return <table className={cn('ui-table',className)} {...props}/>;
}
export function TableHeader({className,...props}:ComponentProps<'thead'>) {
  return <thead className={className} {...props}/>;
}
export function TableBody({className,...props}:ComponentProps<'tbody'>) {
  return <tbody className={className} {...props}/>;
}
export function TableRow({className,...props}:ComponentProps<'tr'>) {
  return <tr className={className} {...props}/>;
}
export function TableHead({className,...props}:ComponentProps<'th'>) {
  return <th className={className} {...props}/>;
}
export function TableCell({className,...props}:ComponentProps<'td'>) {
  return <td className={className} {...props}/>;
}
