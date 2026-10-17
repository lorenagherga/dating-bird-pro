import { useEffect, useState, useRef } from 'react';

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  ended: boolean;
}

function computeRemaining(endTime: string | Date): TimeRemaining {
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, ended: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, totalMs: diff, ended: false };
}

export function useCountdown(endTime: string | Date): TimeRemaining {
  const [remaining, setRemaining] = useState<TimeRemaining>(() => computeRemaining(endTime));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(computeRemaining(endTime));
    timerRef.current = setInterval(() => {
      setRemaining(computeRemaining(endTime));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endTime]);

  return remaining;
}

export function isUrgent(r: TimeRemaining): boolean {
  return !r.ended && r.totalMs < 2 * 60 * 60 * 1000;
}

export function formatTimeRemaining(r: TimeRemaining, t: (k: any) => string): string {
  if (r.ended) return t('aucEnded2');
  if (r.days > 0) return `${r.days} ${r.days === 1 ? t('aucDay') : t('aucDays')} ${r.hours} ${t('aucHour')} ${r.minutes} ${t('aucMin')}`;
  if (r.hours > 0) return `${r.hours} ${t('aucHour')} ${r.minutes} ${t('aucMin')} ${r.seconds} ${t('aucSec')}`;
  return `${r.minutes}:${String(r.seconds).padStart(2, '0')} ${t('aucMin')}`;
}

export function formatLiveCountdown(r: TimeRemaining): string {
  if (r.ended) return '00:00:00';
  const h = String(r.hours + r.days * 24).padStart(2, '0');
  const m = String(r.minutes).padStart(2, '0');
  const s = String(r.seconds).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const ANTI_SNIPE_WINDOW_MS = 3 * 60 * 1000;
export const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000;

export function shouldExtendEndTime(endTime: string): boolean {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const remaining = end - now;
  return remaining > 0 && remaining <= ANTI_SNIPE_WINDOW_MS;
}
