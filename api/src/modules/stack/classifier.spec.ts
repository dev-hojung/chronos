import { classifyText } from './classifier';

describe('classifyText', () => {
  // WORK — Korean
  it('labels 회의 as WORK', () => {
    const result = classifyText('오늘 회의 있어요');
    expect(result.label).toBe('WORK');
    expect(result.confidence).toBe(0.9);
  });

  // WORK — English
  it('labels meeting as WORK', () => {
    const result = classifyText('team meeting at 3pm');
    expect(result.label).toBe('WORK');
    expect(result.confidence).toBe(0.9);
  });

  // PERSONAL — Korean
  it('labels 엄마 as PERSONAL', () => {
    const result = classifyText('엄마 생신 선물 사기');
    expect(result.label).toBe('PERSONAL');
    expect(result.confidence).toBe(0.9);
  });

  // PERSONAL — English
  it('labels dentist as PERSONAL', () => {
    const result = classifyText('dentist appointment tomorrow');
    expect(result.label).toBe('PERSONAL');
    expect(result.confidence).toBe(0.9);
  });

  // RESEARCH — Korean
  it('labels 논문 as RESEARCH', () => {
    const result = classifyText('논문 읽기');
    expect(result.label).toBe('RESEARCH');
    expect(result.confidence).toBe(0.9);
  });

  // RESEARCH — English
  it('labels study as RESEARCH', () => {
    const result = classifyText('study for the exam');
    expect(result.label).toBe('RESEARCH');
    expect(result.confidence).toBe(0.9);
  });

  // ADMIN — Korean
  it('labels 결제 as ADMIN', () => {
    const result = classifyText('결제 확인');
    expect(result.label).toBe('ADMIN');
    expect(result.confidence).toBe(0.9);
  });

  // ADMIN — English
  it('labels invoice as ADMIN', () => {
    const result = classifyText('send invoice to client');
    expect(result.label).toBe('ADMIN');
    expect(result.confidence).toBe(0.9);
  });

  // No match — defaults to WORK low confidence
  it('returns WORK with low confidence for unmatched text', () => {
    const result = classifyText('오늘 날씨가 맑다');
    expect(result.label).toBe('WORK');
    expect(result.confidence).toBe(0.3);
  });

  // Case insensitive — uppercase
  it('matches uppercase MEETING', () => {
    const result = classifyText('MEETING with boss');
    expect(result.label).toBe('WORK');
    expect(result.confidence).toBe(0.9);
  });
});
