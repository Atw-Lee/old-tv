import type {ComponentProps} from 'react';
import * as Primitive from '@radix-ui/react-select';
import {Check,ChevronDown,ChevronUp} from 'lucide-react';
import {cn} from '../../lib/utils.js';
export const Select=Primitive.Root;
export const SelectValue=Primitive.Value;
export function SelectTrigger({className,children,...props}:ComponentProps<typeof Primitive.Trigger>){
  return <Primitive.Trigger data-slot="select-trigger" className={cn('ui-select-trigger',className)} {...props}>{children}<Primitive.Icon asChild><ChevronDown/></Primitive.Icon></Primitive.Trigger>;
}
export function SelectContent({children,...props}:ComponentProps<typeof Primitive.Content>){
  return <Primitive.Portal><Primitive.Content className="management-surface ui-select-content" sideOffset={4} collisionPadding={8} {...props}><Primitive.ScrollUpButton className="select-scroll"><ChevronUp/></Primitive.ScrollUpButton><Primitive.Viewport>{children}</Primitive.Viewport><Primitive.ScrollDownButton className="select-scroll"><ChevronDown/></Primitive.ScrollDownButton></Primitive.Content></Primitive.Portal>;
}
export function SelectItem({children,...props}:ComponentProps<typeof Primitive.Item>){
  return <Primitive.Item className="ui-select-item" {...props}><Primitive.ItemText>{children}</Primitive.ItemText><Primitive.ItemIndicator><Check/></Primitive.ItemIndicator></Primitive.Item>;
}
