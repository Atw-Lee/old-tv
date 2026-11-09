import type {ComponentProps} from 'react';
import * as Primitive from '@radix-ui/react-alert-dialog';
export const AlertDialog=Primitive.Root;
export const AlertDialogTitle=Primitive.Title;
export const AlertDialogDescription=Primitive.Description;
export const AlertDialogCancel=Primitive.Cancel;
export function AlertDialogContent({children,...props}:ComponentProps<typeof Primitive.Content>){
  return <Primitive.Portal><Primitive.Overlay className="confirm-backdrop"/><Primitive.Content data-slot="alert-dialog-content" className="ui-confirm management-surface" {...props}>{children}</Primitive.Content></Primitive.Portal>;
}
