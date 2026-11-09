import type {ComponentProps} from 'react';
import * as Primitive from '@radix-ui/react-dropdown-menu';
export const DropdownMenu=Primitive.Root;
export const DropdownMenuTrigger=Primitive.Trigger;
export function DropdownMenuContent({children,...props}:ComponentProps<typeof Primitive.Content>){
  return <Primitive.Portal><Primitive.Content className="management-surface ui-dropdown-content" sideOffset={6} collisionPadding={8} {...props}>{children}</Primitive.Content></Primitive.Portal>;
}
export function DropdownMenuItem(props:ComponentProps<typeof Primitive.Item>){
  return <Primitive.Item className="ui-dropdown-item" {...props}/>;
}
