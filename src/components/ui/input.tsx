import * as React from "react"

import { cn, toEnglishDigits } from "@/lib/utils"

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
  ({ className, value, onChange, onBlur, ...props }, ref) => {
    
    // Create the display value directly from the `value` prop.
    // This avoids using a separate state and prevents infinite loops.
    const displayValue = React.useMemo(() => {
        const numericValue = (typeof value !== 'number' || isNaN(value)) ? 0 : value;
        // Don't format the number if it's 0, just show an empty string
        // so the user can start typing easily.
        if (numericValue === 0) return '';
        return new Intl.NumberFormat('fa-IR').format(numericValue);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const englishValue = toEnglishDigits(e.target.value);
      // Remove all non-digit characters, including commas.
      const rawValue = englishValue.replace(/[^\d]/g, '');
      const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);

      // Only call onChange if the numeric value has actually changed.
      // This is a crucial check to prevent unnecessary re-renders.
      if (!isNaN(numValue) && numValue !== value) {
        onChange(numValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // If the input is empty on blur, ensure the value is set to 0.
        if (e.target.value === '' && value !== 0) {
            onChange(0);
        }
        // Call any external onBlur handler as well.
        if (onBlur) {
            onBlur(e);
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
        const englishValue = toEnglishDigits(value);
        const numericValue = englishValue.replace(/\D/g, '');
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
        // Convert Persian/Arabic digits to English, then remove non-digits
        let numericValue = toEnglishDigits(value).replace(/\D/g, '');
  
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
