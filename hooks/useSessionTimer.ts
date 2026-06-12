import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

interface UseSessionTimerReturn {
  duration: number;
  startTimer: (onTick?: (duration: number) => void) => void;
  clearTimer: () => void;
  getDuration: () => number;
  setDuration: Dispatch<SetStateAction<number>>;
}

/**
 * Custom hook for managing session timer
 * Returns duration state, and methods to start/stop timer
 */
export const useSessionTimer = (): UseSessionTimerReturn => {
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);

  // Duration state is managed by parent hook to integrate with Vapi state management
  const getDuration = useCallback((): number => {
    if (!startedAtRef.current) return 0;
    return Math.floor((Date.now() - startedAtRef.current) / 1000);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
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
    getDuration,
    setDuration,
  };
};
