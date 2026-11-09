import type {ReactNode} from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {GripVertical} from 'lucide-react';
import {TableRow,TableCell} from '../../components/ui/table.js';
import {Button} from '../../components/ui/button.js';
export function SortableChannelRow({id,name,disabled,children}:{id:string;name:string;disabled:boolean;children:ReactNode}){
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id,disabled});
  return <TableRow ref={setNodeRef} className={isDragging?'channel-dragging':undefined} style={{transform:CSS.Transform.toString(transform),transition,position:'relative',zIndex:isDragging?2:undefined}}>
    <TableCell className="drag-cell"><Button ref={setActivatorNodeRef} variant="ghost" className="icon-button drag-handle" disabled={disabled} {...attributes} {...listeners} aria-label={`拖动排序 ${name}`} title="拖动排序；也可按空格选中，再用上下方向键移动"><GripVertical/></Button></TableCell>{children}
  </TableRow>;
}
