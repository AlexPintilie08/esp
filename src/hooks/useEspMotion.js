import { useState, useEffect } from 'react';

export function useEspMotion(backendIp) {
    const [motion, setMotion] = useState({ roll: 0, pitch: 0, accel: 0 });

    useEffect(() => {
        if (!backendIp) return;

        // Ne conectăm la portul 81 configurat în ESP32
        const ws = new WebSocket(`ws://${backendIp}:81`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setMotion(data);
            } catch (err) {
                console.error("WS Parsing error:", err);
            }
        };

        return () => ws.close();
    }, [backendIp]);

    return motion;
}