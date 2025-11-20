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

const NumericInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, onChange, ...props }, ref) => {
      const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        const numericValue = value.replace(/\D/g, '');
        event.target.value = numericValue;
        if (onChange) {
          onChange(event);
        }
      };
  
      return (
        <Input
          type="text"
          inputMode="numeric"
          onChange={handleInputChange}
          className={cn("font-mono", className)}
          ref={ref}
          {...props}
        />
      );
    }
  );
NumericInput.displayName = "NumericInput";

const ExpiryDateInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, onChange, ...props }, ref) => {
      const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        let { value } = event.target;
        // Remove all non-digit characters
        let numericValue = value.replace(/\D/g, '');
  
        // Add slash after the first two digits
        if (numericValue.length > 2) {
          numericValue = numericValue.slice(0, 2) + '/' + numericValue.slice(2, 4);
        }
        
        event.target.value = numericValue;
  
        if (onChange) {
          onChange(event);
        }
      };
  
      return (
        <Input
          type="text"
          inputMode="numeric"
          maxLength={5}
          onChange={handleInputChange}
          className={cn("font-mono", className)}
          ref={ref}
          {...props}
        />
      );
    }
);
ExpiryDateInput.displayName = "ExpiryDateInput";


export { Input, CurrencyInput, NumericInput, ExpiryDateInput }
