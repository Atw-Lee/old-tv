import type {ComponentProps, Ref} from "react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../../components/ui/select.js";

type Props = ComponentProps<typeof Select> & {
  label: string;
  id?: string;
  placeholder?: string;
  options: {value: string; label: string}[];
  triggerRef?: Ref<HTMLButtonElement>;
};

export function SelectField({label, id, placeholder = "请选择", options, triggerRef, ...props}: Props) {
  return (
    <Select {...props}>
      <SelectTrigger ref={triggerRef} id={id} aria-label={label} className="w-full">
        <SelectValue placeholder={placeholder}/>
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
