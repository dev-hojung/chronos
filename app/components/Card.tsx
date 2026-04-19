import { PropsWithChildren } from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  tone?: 'default' | 'accent';
}

export function Card({
  children,
  tone = 'default',
  className = '',
  ...rest
}: PropsWithChildren<CardProps>) {
  const base =
    'rounded-lg p-4 border border-border-light dark:border-border-dark';
  const toneCls =
    tone === 'accent'
      ? 'bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700'
      : 'bg-surface-light dark:bg-surfaceAlt-dark';
  return (
    <View className={`${base} ${toneCls} ${className}`} {...rest}>
      {children}
    </View>
  );
}
