import React, { useEffect, useState, lazy, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Sidebar from './components/Sidebar';
import useWebSocket from './hooks/useWebSocket';

// Lazy loading del modal de reset y del MapView unificado
const ResetModal = lazy(() => import('./components/ResetModal'));
const MapView = lazy(() => import('./MapView'));

function App() {
  // Actualiza la URL para incluir el parámetro "map" si no está presente.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("map")) {
      params.set("map", "arcgis");
      const newRelativePathQuery = window.location.pathname + "?" + params.toString();
      console.log("Actualizando URL a:", newRelativePathQuery);
      window.history.replaceState(null, "", newRelativePathQuery);
    }
  }, []);

  const params = new URLSearchParams(window.location.search);
  const [mapType, setMapType] = useState(params.get("map") || "arcgis");

  const [devices, setDevices] = useState({});
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth < 768 ? false : true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState("");

  const isMobile = window.innerWidth < 768;
  const wsUrl = 'wss://fabspace-server.uniandes.edu.co/cbusatelites/lab2/ws/devices/';

  // Callback para manejar los mensajes recibidos por el WebSocket
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "init" && data.devices) {
        const devicesObj = {};
        data.devices.forEach(device => {
          devicesObj[device.device_id || device.ID] = device;
        });
        setDevices(devicesObj);
      } else if (data.type === "reset_success") {
        setDevices({});
        setMessageModalContent("La base de datos se ha borrado correctamente.");
        setShowMessageModal(true);
      } else if (data.type === "reset_error") {
        setMessageModalContent(data.message);
        setShowMessageModal(true);
      } else {
        setDevices(prev => ({
          ...prev,
          [data.ID]: data,
        }));
      }
    } catch (error) {
      console.error('Error parseando mensaje:', error);
    }
  }, []);

  // Obtiene la función para enviar mensajes a través del WebSocket
  const sendMessage = useWebSocket(wsUrl, handleMessage);

  // Actualiza el dispositivo seleccionado solo si existe en devices
  useEffect(() => {
    if (selectedDevice && devices[selectedDevice.ID]) {
      setSelectedDevice(devices[selectedDevice.ID]);
    }
  }, [devices, selectedDevice]);

  useEffect(() => {
    const setVhProperty = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVhProperty();
    window.addEventListener('resize', setVhProperty);
    return () => window.removeEventListener('resize', setVhProperty);
  }, []);

  const handleReset = () => {
    sendMessage({
      type: "reset",
      password: resetPassword,
    });
    setShowResetModal(false);
    setResetPassword("");
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
        isMobile={isMobile}
        setShowResetModal={setShowResetModal}
      />

      {/* Mapa */}
      <main className="map-wrapper">
        <MapView
          mapType={mapType}
          setMapType={setMapType}
          devices={devices}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        {!sidebarOpen && (
          <button
            className="open-sidebar-button"
            aria-label="Abrir panel"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="open-icon">☰</span>
          </button>
        )}
      </main>

      {/* Modal para ingresar contraseña (reset) */}
      {showResetModal && (
        <ResetModal
          resetPassword={resetPassword}
          setResetPassword={setResetPassword}
          handleReset={handleReset}
          onClose={() => setShowResetModal(false)}
        />
      )}

      {/* Modal para mensajes del servidor */}
      {showMessageModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>{messageModalContent}</h3>
            <div className="modal-buttons">
              <button onClick={() => setShowMessageModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
