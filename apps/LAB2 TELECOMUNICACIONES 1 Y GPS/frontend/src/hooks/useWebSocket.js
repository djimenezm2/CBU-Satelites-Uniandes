// src/hooks/useWebSocket.js
import { useEffect, useRef } from 'react';

// Variables globales para el singleton y control de reconexión
let wsSingleton = null;
let reconnectAttempts = 0;
let shouldReconnect = true;

function createWebSocket(url, onMessage) {
    const ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('Conectado al WebSocket');
        reconnectAttempts = 0; // Reinicia los intentos al conectarse correctamente
    };

    ws.onmessage = (event) => {
        if (onMessage) {
        onMessage(event);
        }
    };

    ws.onerror = (error) => {
        console.error('Error en WebSocket:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket cerrado.');
        // Si shouldReconnect es true, intenta reconectar
        if (shouldReconnect) {
        // Calcula el delay usando exponential backoff (con tope máximo de 10 segundos)
        const delay = Math.min(10000, Math.pow(2, reconnectAttempts) * 1000);
        console.log(`Intentando reconectar en ${delay} ms`);
        setTimeout(() => {
            reconnectAttempts++;
            wsSingleton = createWebSocket(url, onMessage);
        }, delay);
        }
    };

    return ws;
    }

    function useWebSocket(url, onMessage) {
    const wsRef = useRef(null);

    useEffect(() => {
        // Cuando el componente se monta, se activa la reconexión
        shouldReconnect = true;

        // Si no existe el singleton o si está cerrado, se crea una nueva conexión
        if (!wsSingleton || wsSingleton.readyState === WebSocket.CLOSED) {
        wsSingleton = createWebSocket(url, onMessage);
        }
        wsRef.current = wsSingleton;

        // Cleanup: marca que no se debe reconectar al desmontar
        return () => {
        shouldReconnect = false;
        };

    }, [url, onMessage]);

    const sendMessage = (message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        } else {
        console.warn("El WebSocket no está abierto, mensaje no enviado");
        }
    };

    return sendMessage;
}

export default useWebSocket;
