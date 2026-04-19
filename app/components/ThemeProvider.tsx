import { PropsWithChildren } from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * ThemeProvider — thin wrapper that activates the hook so NativeWind
 * picks up the effective scheme on mount.
 */
export function ThemeProvider({ children }: PropsWithChildren) {
  useTheme();
  return <>{children}</>;
}
