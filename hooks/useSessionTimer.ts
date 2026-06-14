import {
  useCallback,
  useRef,
  useState,
} from "react";

interface UseSessionTimerReturn {
  duration: number;
  startTimer: (onTick?: (duration: number) => void) => void;
  clearTimer: () => void;
}

export const useSessionTimer = (): UseSessionTimerReturn => {
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
    setDuration(0);
  }, []);

  const startTimer = useCallback(
    (onTick?: (duration: number) => void) => {
      clearTimer();
      startedAtRef.current = Date.now();
      setDuration(0);
      onTick?.(0);

      timerRef.current = setInterval(() => {
        if (!startedAtRef.current) return;
        const duration = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setDuration(duration);
        onTick?.(duration);
      }, 1000);
    },
    [clearTimer],
  );

  return {
    duration,
    startTimer,
    clearTimer,
  };
};
