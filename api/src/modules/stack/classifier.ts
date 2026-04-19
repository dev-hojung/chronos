export type ContextLabel = 'WORK' | 'PERSONAL' | 'RESEARCH' | 'ADMIN';

export interface ClassifyResult {
  label: ContextLabel;
  confidence: number;
}

const RULES: Array<{ label: ContextLabel; pattern: RegExp }> = [
  { label: 'WORK', pattern: /(회의|미팅|PM|배포|리뷰|스프린트|meeting|standup|PR|deploy)/i },
  { label: 'PERSONAL', pattern: /(엄마|아빠|생일|약속|병원|장보기|birthday|dentist)/i },
  { label: 'RESEARCH', pattern: /(논문|공부|스터디|책|강의|learn|paper|study)/i },
  { label: 'ADMIN', pattern: /(결제|세금|청구|예약|카드|payment|invoice|booking)/i },
];

export function classifyText(rawText: string): ClassifyResult {
  for (const rule of RULES) {
    if (rule.pattern.test(rawText)) {
      return { label: rule.label, confidence: 0.9 };
    }
  }
  return { label: 'WORK', confidence: 0.3 };
}
