import type {ComponentProps} from 'react';
import * as Primitive from '@radix-ui/react-dialog';
export const Dialog=Primitive.Root;
export const DialogTitle=Primitive.Title;
export function DialogContent({className='',children,...props}:ComponentProps<typeof Primitive.Content>){
  return <Primitive.Portal><Primitive.Overlay className="dialog-backdrop"/><Primitive.Content data-slot="dialog-content" className={`ui-dialog ${className}`} {...props}>{children}</Primitive.Content></Primitive.Portal>;
}
