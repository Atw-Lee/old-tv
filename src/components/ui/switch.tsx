import type {ComponentProps} from 'react';
import * as Primitive from '@radix-ui/react-switch';
export function Switch(props:ComponentProps<typeof Primitive.Root>){
  return <Primitive.Root className="ui-switch" {...props}><Primitive.Thumb className="ui-switch-thumb"/></Primitive.Root>;
}
