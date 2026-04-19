import { Text as RNText, TextProps } from 'react-native';

type Tone = 'default' | 'muted' | 'primary' | 'danger';
type Size = 'xs' | 'sm' | 'base' | 'lg';

interface AppTextProps extends TextProps {
  tone?: Tone;
  size?: Size;
}

const sizeCls: Record<Size, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

const toneCls: Record<Tone, string> = {
  default: 'text-text-light dark:text-text-dark',
  muted: 'text-textMuted-light dark:text-textMuted-dark',
  primary: 'text-primary-600 dark:text-primary-300',
  danger: 'text-danger',
};

export function Text({
  tone = 'default',
  size = 'base',
  className = '',
  children,
  ...rest
}: AppTextProps) {
  return (
    <RNText
      className={`${sizeCls[size]} ${toneCls[tone]} ${className}`}
      {...rest}
    >
      {children}
    </RNText>
  );
}
