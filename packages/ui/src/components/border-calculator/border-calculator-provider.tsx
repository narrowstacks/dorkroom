import type { ReactNode } from 'react';
import {
  BorderCalculatorContext,
  type BorderCalculatorContextValue,
} from './border-calculator-context';

interface BorderCalculatorProviderProps {
  value: BorderCalculatorContextValue;
  children: ReactNode;
}

export function BorderCalculatorProvider({
  value,
  children,
}: BorderCalculatorProviderProps) {
  return (
    <BorderCalculatorContext value={value}>{children}</BorderCalculatorContext>
  );
}
