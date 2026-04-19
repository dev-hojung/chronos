import { useState, type ReactNode } from 'react';
import { TouchableOpacity } from 'react-native';
import { useEntitlement } from '../lib/queries/entitlements';
import { Paywall } from './Paywall';
import type { CoreFeature } from '../lib/api/entitlements';

interface EntitlementGateProps {
  feature: CoreFeature;
  onGranted: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * 핵심기능 게이트.
 * - PRO 구독 또는 유효 ad_token이면 onGranted 즉시 실행
 * - 둘 다 없으면 Paywall 모달 노출 (광고 시청/구독 선택)
 */
export function EntitlementGate({
  feature,
  onGranted,
  children,
  className,
}: EntitlementGateProps) {
  const { data, refetch } = useEntitlement(feature);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const handlePress = () => {
    if (data?.granted) {
      onGranted();
      return;
    }
    setPaywallOpen(true);
  };

  const handleAdGranted = async () => {
    await refetch();
    onGranted();
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} className={className}>
        {children}
      </TouchableOpacity>
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        feature={feature}
        onAdGranted={handleAdGranted}
        variant="soft"
      />
    </>
  );
}
