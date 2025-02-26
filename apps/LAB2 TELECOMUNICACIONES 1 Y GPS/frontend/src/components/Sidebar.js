// src/components/Sidebar.js
import React from 'react';
import uniandesLogo from '../assets/uniandes_logo.webp';

function Sidebar({
    sidebarOpen,
    setSidebarOpen,
    selectedDevice,
    setSelectedDevice,
    isMobile,
    setShowResetModal,
    }) {
    return (
        <aside
        className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
        aria-label="Panel de información del dispositivo"
        >
        {sidebarOpen && (
            <>
            <button
                className="close-sidebar-button"
                aria-label="Cerrar panel"
                onClick={() => setSidebarOpen(false)}
            >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <line x1="1" y1="1" x2="19" y2="19" stroke="currentColor" strokeWidth="3" />
                <line x1="19" y1="1" x2="1" y2="19" stroke="currentColor" strokeWidth="3" />
                </svg>
            </button>
            <h2>LAB GPS y Telecomunicaciones 1</h2>
            <div className="sidebar-content">
                {selectedDevice ? (
                <div className="device-card" tabIndex="0">
                    <h3>Satélite del {selectedDevice.ID}</h3>
                    <ul>
                    <li>
                        <strong>Latitud:</strong> {selectedDevice.latitud}
                    </li>
                    <li>
                        <strong>Longitud:</strong> {selectedDevice.longitud}
                    </li>
                    <li>
                        <strong>Velocidad:</strong> {selectedDevice.velocidad} Km/h
                    </li>
                    <li>
                        <strong>Satelites conectados:</strong> {selectedDevice.satelites}
                    </li>
                    <li>
                        <strong>HDOP:</strong> {selectedDevice.hdop}
                    </li>
                    <li>
                        <strong>Actualizado en:</strong> {selectedDevice.fechaHora}
                    </li>
                    </ul>
                    <button
                    className="close-device-info-button"
                    onClick={() => {
                        setSelectedDevice(null);
                        if (isMobile) setSidebarOpen(false);
                    }}
                    >
                    Cerrar
                    </button>
                </div>
                ) : (
                <div className="device-card" tabIndex="0">
                    <p>Selecciona un dispositivo haciendo click en un marcador.</p>
                </div>
                )}
            </div>
            {!selectedDevice && (
                <button className="reset-button" onClick={() => setShowResetModal(true)}>
                Restablecer aplicación
                </button>
            )}
            <div className="sidebar-bottom">
                <div className="sidebar-footer">
                <p>
                    David Jimenez Mora (
                    <a href="mailto:d.jimenezm2@uniandes.edu.co">d.jimenezm2@uniandes.edu.co</a>)
                </p>
                <p>CBU - Diseño de Sistemas Satelitales 2025-1</p>
                <p>Dpto. Ing. Eléctrica y Electrónica</p>
                <p>Universidad de los Andes, Bogotá</p>
                </div>
                <img
                    className="footer-image"
                    src={uniandesLogo}
                    alt="Logo de la Universidad de los Andes"
                />
            </div>
            </>
        )}
        </aside>
    );
}

export default Sidebar;
