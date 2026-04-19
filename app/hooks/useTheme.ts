import { useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';
import { useColorScheme } from 'nativewind';
import { resolveSemantic, type ColorScheme } from '../theme/tokens';
import { useThemeStore } from '../stores/themeStore';

/**
 * useTheme — resolves the user's theme preference against the system scheme
 * and keeps NativeWind's colorScheme in sync.
 */
export function useTheme() {
  const { preference } = useThemeStore();
  const { colorScheme, setColorScheme } = useColorScheme();

  const effective: ColorScheme = useMemo(() => {
    if (preference === 'auto') {
      const system = Appearance.getColorScheme();
      return system === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference]);

  useEffect(() => {
    if (colorScheme !== effective) {
      setColorScheme(effective);
    }
  }, [effective, colorScheme, setColorScheme]);

  const tokens = useMemo(() => resolveSemantic(effective), [effective]);

  return { scheme: effective, tokens };
}
