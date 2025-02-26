import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import changeLayersIcon from './assets/changeLayers.webp';

const initialPosition = [4.602608, -74.065423];

function MapUpdater({ selectedDevice }) {
  const map = useMap();
  const centeredDeviceIdRef = useRef(null);

  useEffect(() => {
    if (!selectedDevice) {
      centeredDeviceIdRef.current = null;
    } else if (selectedDevice && selectedDevice.ID !== centeredDeviceIdRef.current) {
      map.setView([selectedDevice.latitud, selectedDevice.longitud], 19);
      centeredDeviceIdRef.current = selectedDevice.ID;
    }
  }, [selectedDevice, map]);

  return null;
}

const Markers = React.memo(
  ({
    devices,
    selectedDevice,
    setSelectedDevice,
    sidebarOpen,
    setSidebarOpen,
    deviceIcon,
  }) => {
    return (
      <>
        {Object.values(devices).map((device) => (
          <Marker
            key={device.ID}
            position={[device.latitud, device.longitud]}
            icon={deviceIcon}
            eventHandlers={{
              click: () => {
                if (!sidebarOpen) {
                  setSidebarOpen(true);
                }
                setSelectedDevice(device);
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[1.5, -40]}
              opacity={1}
              permanent={selectedDevice && selectedDevice.ID === device.ID}
            >
              {device.ID}
            </Tooltip>
          </Marker>
        ))}
      </>
    );
  }
);

function MapView({
  mapType,
  setMapType,
  devices,
  selectedDevice,
  setSelectedDevice,
  sidebarOpen,
  setSidebarOpen,
}) {
  const tileLayerProps = useMemo(() => {
    if (mapType === 'google') {
      return {
        url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        attribution: 'Map data © Google',
        subdomains: ['0', '1', '2', '3'],
        zIndex: 2,
      };
    } else if (mapType === 'osm') {
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
        subdomains: ['a', 'b', 'c'],
        zIndex: 2,
      };
    } else {
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles © Esri',
        zIndex: 2,
      };
    }
  }, [mapType]);

  const deviceIcon = useMemo(
    () =>
      new L.Icon({
        iconUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      }),
    []
  );

  const [mapView, setMapView] = useState({
    center: initialPosition,
    zoom: 17,
  });

  const mapRef = useRef();

  // Estado para controlar la visibilidad del selector de capas
  const [showLayerSelector, setShowLayerSelector] = useState(false);

  // Pre-carga de tiles (función ya existente)
  const preloadTiles = useCallback(() => {
    setTimeout(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      const bounds = map.getBounds();
      const extendedBounds = bounds.pad(0.5);
      const zoom = map.getZoom();
      const crs = map.options.crs;
      const tileSize = 256;
      const nwPoint = crs
        .latLngToPoint(extendedBounds.getNorthWest(), zoom)
        .divideBy(tileSize)
        .floor();
      const sePoint = crs
        .latLngToPoint(extendedBounds.getSouthEast(), zoom)
        .divideBy(tileSize)
        .floor();

      for (let x = nwPoint.x; x <= sePoint.x; x++) {
        for (let y = nwPoint.y; y <= sePoint.y; y++) {
          const tileUrl = L.Util.template(tileLayerProps.url, {
            x: x,
            y: y,
            z: zoom,
            s: tileLayerProps.subdomains
              ? tileLayerProps.subdomains[0]
              : '',
          });
          const img = new Image();
          img.src = tileUrl;
        }
      }
    }, 500);
  }, [tileLayerProps]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    preloadTiles();
    map.on('moveend', preloadTiles);
    return () => {
      map.off('moveend', preloadTiles);
    };
  }, [preloadTiles]);

  const availableLayers = [
    { type: 'arcgis', label: 'ArcGIS' },
    { type: 'google', label: 'Google' },
    { type: 'osm', label: 'OSM' },
  ];

  const handleLayerSelection = (newLayer) => {
    if (mapRef.current) {
      const currentCenter = mapRef.current.getCenter();
      const currentZoom = mapRef.current.getZoom();
      setMapView({
        center: [currentCenter.lat, currentCenter.lng],
        zoom: currentZoom,
      });
    }
    setMapType(newLayer);
    const params = new URLSearchParams(window.location.search);
    params.set('map', newLayer);
    window.history.replaceState(
      null,
      '',
      window.location.pathname + '?' + params.toString()
    );
    setShowLayerSelector(false);
  };

  return (
    // Contenedor padre que agrupa el MapContainer y el selector de capas
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={mapView.center}
        zoom={mapView.zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          {...tileLayerProps}
          key={mapType}
          keepBuffer={4}
          opacity={1}
        />
        <MapUpdater selectedDevice={selectedDevice} />
        <Markers
          devices={devices}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          deviceIcon={deviceIcon}
        />
      </MapContainer>
      {/* Botón para mostrar/ocultar el selector de capas */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowLayerSelector((prev) => !prev);
        }}
        className="layer-selector-button"
        aria-label="Seleccionar capa"
      >
        <img src={changeLayersIcon} alt="Cambiar capa" />
      </button>
      {/* Selector de capas, posicionado fuera del MapContainer */}
      {showLayerSelector && (
        <div
          className="layer-selector-container"
        >
          {availableLayers.map((layer) => (
            <button
              key={layer.type}
              onClick={(e) => {
                e.stopPropagation();
                handleLayerSelection(layer.type);
              }}
            >
              {layer.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MapView;
