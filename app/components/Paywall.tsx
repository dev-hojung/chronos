import { Modal, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Heading } from './Heading';
import { Text } from './Text';
import { Card } from './Card';
import { useShowRewardedFor } from '../lib/queries/entitlements';
import { usePaywallStore } from '../lib/paywall';
import type { CoreFeature } from '../lib/api/entitlements';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  feature?: CoreFeature;
  onAdGranted?: () => void;
  variant?: 'soft' | 'fullscreen';
}

export function Paywall({
  visible,
  onClose,
  feature,
  onAdGranted,
  variant = 'fullscreen',
}: PaywallProps) {
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');
  const showRewarded = useShowRewardedFor(feature ?? 'plan.generate');
  const recordShown = usePaywallStore((s) => s.recordShown);
  const incrementAdViews = usePaywallStore((s) => s.incrementAdViews);

  const handleWatchAd = async () => {
    if (!feature) return;
    try {
      await showRewarded.mutateAsync();
      incrementAdViews();
      recordShown();
      onAdGranted?.();
      onClose();
    } catch {
      // 사용자에게 토스트는 상위에서 처리
    }
  };

  const handleSubscribe = () => {
    // W10 RevenueCat에서 실제 구매 트리거
    recordShown();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={variant === 'fullscreen' ? 'pageSheet' : 'overFullScreen'}
      transparent={variant === 'soft'}
      onRequestClose={onClose}
    >
      <View
        className={
          variant === 'soft'
            ? 'flex-1 justify-end bg-black/40'
            : 'flex-1 bg-surface-light dark:bg-surface-dark'
        }
      >
        <View
          className={
            variant === 'soft'
              ? 'bg-surface-light dark:bg-surface-dark rounded-t-3xl p-6'
              : 'flex-1 p-6'
          }
        >
          <Heading level={2}>매일 광고 없이</Heading>
          <Text size="sm" tone="muted" className="mt-1">
            Chronos Pro로 핵심 기능을 무제한 사용하세요
          </Text>

          <Card>
            <Text size="base" className="font-semibold">3가지 핵심</Text>
            <Text size="sm">⚡ 자동 묶기 — Inbox 정리</Text>
            <Text size="sm">📈 루틴 분석 — 자가 조정 제안</Text>
            <Text size="sm">🎯 Gravity 정렬 — 목표 우선 순서</Text>
          </Card>

          <View className="flex-row gap-2 mt-2">
            <TouchableOpacity
              onPress={() => setPlan('yearly')}
              className={`flex-1 p-3 rounded-xl border ${
                plan === 'yearly'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                  : 'border-border-light dark:border-border-dark'
              }`}
            >
              <Text size="xs" tone="muted">연간 (45% 할인)</Text>
              <Text size="lg" className="font-bold">₩39,000</Text>
              <Text size="xs" tone="muted">월 ₩3,250 · 7일 무료</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPlan('monthly')}
              className={`flex-1 p-3 rounded-xl border ${
                plan === 'monthly'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                  : 'border-border-light dark:border-border-dark'
              }`}
            >
              <Text size="xs" tone="muted">월간</Text>
              <Text size="lg" className="font-bold">₩5,900</Text>
              <Text size="xs" tone="muted">매월</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSubscribe}
            className="bg-primary-500 rounded-xl py-3 mt-3 items-center"
          >
            <Text size="base" className="font-semibold text-white">
              {plan === 'yearly' ? '7일 무료 시작' : '구독하기'}
            </Text>
          </TouchableOpacity>

          {feature && (
            <TouchableOpacity
              onPress={handleWatchAd}
              disabled={showRewarded.isPending}
              className="bg-gray-100 dark:bg-gray-800 rounded-xl py-3 mt-2 items-center"
            >
              {showRewarded.isPending ? (
                <ActivityIndicator />
              ) : (
                <Text size="sm">오늘 1회 광고 보고 사용</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} className="py-3 mt-2 items-center">
            <Text size="sm" tone="muted">나중에</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
