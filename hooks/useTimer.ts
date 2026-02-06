import { useState, useRef, useEffect } from 'react';

interface TimerState {
    isRunning: boolean;
    startTime: Date | null;
    elapsedSeconds: number;
}

interface UseTimerReturn {
    isRunning: boolean;
    startTime: Date | null;
    elapsedSeconds: number;
    startTimer: () => void;
    stopTimer: () => Date;
    resetTimer: () => void;
}

export const useTimer = (): UseTimerReturn => {
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const intervalRef = useRef<number | null>(null);

    const startTimer = () => {
        const now = new Date();
        setStartTime(now);
        setIsRunning(true);

        intervalRef.current = window.setInterval(() => {
            const seconds = Math.floor((new Date().getTime() - now.getTime()) / 1000);
            setElapsedSeconds(seconds);
        }, 1000);
    };

    const stopTimer = (): Date => {
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
        }
        setIsRunning(false);
        const endTime = new Date();
        return endTime;
    };

    const resetTimer = () => {
        if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
        }
        setIsRunning(false);
        setStartTime(null);
        setElapsedSeconds(0);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
            }
        };
    }, []);

    return {
        isRunning,
        startTime,
        elapsedSeconds,
        startTimer,
        stopTimer,
        resetTimer,
    };
};
