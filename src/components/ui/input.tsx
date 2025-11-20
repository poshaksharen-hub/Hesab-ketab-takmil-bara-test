import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"


interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(value ? new Intl.NumberFormat('en-US').format(value) : '');

    React.useEffect(() => {
        if (value) {
            const formatted = new Intl.NumberFormat('en-US').format(value);
            if(formatted !== displayValue) {
               setDisplayValue(formatted);
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/,/g, '');
      if (/^\d*$/.test(rawValue)) { // Only allow digits
        const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
        if (!isNaN(numValue)) {
            setDisplayValue(rawValue === '' ? '' : new Intl.NumberFormat('en-US').format(numValue));
            onChange(numValue);
        }
      }
    };
    
    const handleBlur = () => {
        if (value) {
            setDisplayValue(new Intl.NumberFormat('en-US').format(value));
        }
    }

    return (
      <Input
        type="text"
        inputMode="numeric"
        dir="ltr"
        className={cn("font-mono", className)}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        ref={ref}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";


export { Input, CurrencyInput }
