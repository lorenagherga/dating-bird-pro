import { useEffect, useState } from 'react';

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
  const diff = end.getTime() - Date.now();
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

  useEffect(() => {
    setRemaining(computeRemaining(endTime));
    const interval = setInterval(() => {
      setRemaining(computeRemaining(endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return remaining;
}

export function isUrgent(r: TimeRemaining): boolean {
  return !r.ended && r.totalMs < 2 * 60 * 60 * 1000;
}
