import { Text, TextProps } from 'react-native';

type Level = 1 | 2 | 3;

interface HeadingProps extends TextProps {
  level?: Level;
}

const sizeByLevel: Record<Level, string> = {
  1: 'text-3xl',
  2: 'text-2xl',
  3: 'text-lg',
};

export function Heading({
  level = 1,
  className = '',
  children,
  ...rest
}: HeadingProps) {
  return (
    <Text
      className={`${sizeByLevel[level]} font-bold text-text-light dark:text-text-dark ${className}`}
      {...rest}
    >
      {children}
    </Text>
  );
}
