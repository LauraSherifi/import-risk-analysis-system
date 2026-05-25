import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { ports, routes } from "../data/mapData";

const riskLabels = {
  all: "All routes",
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
};

const routeColors = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function getPortById(portId) {
  return ports.find((port) => port.id === portId);
}

function SearchMapFocus({ selectedPortId }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedPortId) {
      return;
    }

    const selectedPort = getPortById(selectedPortId);
    if (selectedPort) {
      map.flyTo(selectedPort.position, 5, { duration: 0.8 });
    }
  }, [map, selectedPortId]);

  return null;
}

SearchMapFocus.propTypes = {
  selectedPortId: PropTypes.string,
};

function RiskMapPage() {
  const [riskFilter, setRiskFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRoutes, setShowRoutes] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(routes[0]);

  const selectedPort = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return null;
    }

    return ports.find(
      (port) => {
        const fullLabel = `${port.name}, ${port.country}`.toLowerCase();
        return (
          fullLabel.includes(normalizedSearch) ||
          port.name.toLowerCase().includes(normalizedSearch) ||
          port.country.toLowerCase().includes(normalizedSearch)
        );
      }
    );
  }, [searchTerm]);

  const filteredRoutes = useMemo(() => {
    if (riskFilter === "all") {
      return routes;
    }

    return routes.filter((route) => route.risk === riskFilter);
  }, [riskFilter]);

  const visiblePortIds = useMemo(() => {
    const ids = new Set();
    filteredRoutes.forEach((route) => {
      ids.add(route.origin);
      ids.add(route.destination);
    });
    return ids;
  }, [filteredRoutes]);

  const routeStats = useMemo(() => {
    const highRiskRoutes = filteredRoutes.filter((route) => route.risk === "high");
    const mediumRiskRoutes = filteredRoutes.filter(
      (route) => route.risk === "medium"
    );
    const lowRiskRoutes = filteredRoutes.filter((route) => route.risk === "low");
    const totalShipments = filteredRoutes.reduce(
      (sum, route) => sum + route.shipments,
      0
    );
    const riskiestRoute = [...filteredRoutes].sort(
      (a, b) => b.riskScore - a.riskScore
    )[0];

    return {
      totalRoutes: filteredRoutes.length,
      highRiskRoutes: highRiskRoutes.length,
      mediumRiskRoutes: mediumRiskRoutes.length,
      lowRiskRoutes: lowRiskRoutes.length,
      totalShipments,
      riskiestRoute,
    };
  }, [filteredRoutes]);

  useEffect(() => {
    if (!filteredRoutes.some((route) => route.id === selectedRoute?.id)) {
      setSelectedRoute(filteredRoutes[0] || null);
    }
  }, [filteredRoutes, selectedRoute]);

  const portOptions = ports.map((port) => `${port.name}, ${port.country}`);

  const resetMapView = () => {
    setRiskFilter("all");
    setSearchTerm("");
    setShowRoutes(true);
    setShowPorts(true);
    setSelectedRoute(routes[0]);
  };

  return (
    <section className="map-page">
      <MapContainer
        center={[28, 35]}
        className="risk-map"
        maxBounds={[
          [-85, -190],
          [85, 190],
        ]}
        minZoom={2}
        scrollWheelZoom
        zoom={2}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SearchMapFocus selectedPortId={selectedPort?.id} />

        {showRoutes &&
          filteredRoutes.map((route) => {
            const origin = getPortById(route.origin);
            const destination = getPortById(route.destination);

            return (
              <Polyline
                eventHandlers={{
                  click: () => setSelectedRoute(route),
                  mouseover: () => setSelectedRoute(route),
                }}
                key={route.id}
                pathOptions={{
                  color: routeColors[route.risk],
                  opacity: selectedRoute?.id === route.id ? 0.95 : 0.68,
                  weight: selectedRoute?.id === route.id ? 6 : 4,
                }}
                positions={[origin.position, destination.position]}
              >
                <Tooltip sticky>
                  {origin.name} to {destination.name}: {route.riskScore}% risk
                </Tooltip>
              </Polyline>
            );
          })}

        {showPorts &&
          ports
            .filter((port) => riskFilter === "all" || visiblePortIds.has(port.id))
            .map((port) => {
              const riskPercentage = Math.round((port.highRisk / port.shipments) * 100);
              const isSelected = selectedPort?.id === port.id;

              return (
                <CircleMarker
                  center={port.position}
                  key={port.id}
                  pathOptions={{
                    color: isSelected ? "#111827" : "#0f4c81",
                    fillColor: riskPercentage > 15 ? "#ef4444" : "#22c55e",
                    fillOpacity: 0.86,
                    opacity: 0.95,
                    weight: isSelected ? 4 : 2,
                  }}
                  radius={isSelected ? 13 : 9}
                >
                  <Tooltip direction="top" offset={[0, -8]} sticky>
                    {port.name}
                  </Tooltip>
                  <Popup>
                    <strong>{port.name}</strong>
                    <span>{port.country}</span>
                    <span>{port.shipments.toLocaleString()} shipments</span>
                    <span>{riskPercentage}% high risk</span>
                  </Popup>
                </CircleMarker>
              );
            })}
      </MapContainer>

      <div className="map-overlay map-toolbar">
        <div className="map-toolbar-header">
          <div>
            <span>Global Route Monitor</span>
            <strong>{riskLabels[riskFilter]}</strong>
          </div>
          <button type="button" onClick={resetMapView}>
            Reset
          </button>
        </div>

        <label className="map-field">
          <span>Search port</span>
          <input
            list="port-options"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Example: Rotterdam"
            value={searchTerm}
          />
        </label>
        <datalist id="port-options">
          {portOptions.map((portOption) => (
            <option key={portOption} value={portOption} />
          ))}
        </datalist>

        <div className="segmented-control" aria-label="Risk filter">
          {Object.entries(riskLabels).map(([value, label]) => (
            <button
              className={riskFilter === value ? "active" : ""}
              key={value}
              onClick={() => setRiskFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="map-switches">
          <label>
            <input
              checked={showRoutes}
              onChange={(event) => setShowRoutes(event.target.checked)}
              type="checkbox"
            />
            Routes
          </label>
          <label>
            <input
              checked={showPorts}
              onChange={(event) => setShowPorts(event.target.checked)}
              type="checkbox"
            />
            Ports
          </label>
        </div>
      </div>

      <div className="map-overlay map-summary">
        <div className="map-stat-grid">
          <div>
            <span>Routes</span>
            <strong>{routeStats.totalRoutes}</strong>
          </div>
          <div>
            <span>High Risk</span>
            <strong>{routeStats.highRiskRoutes}</strong>
          </div>
          <div>
            <span>Shipments</span>
            <strong>{routeStats.totalShipments.toLocaleString()}</strong>
          </div>
        </div>

        {routeStats.riskiestRoute && (
          <div className="route-detail">
            <span>Selected Route</span>
            <strong>
              {getPortById(selectedRoute?.origin)?.name} to{" "}
              {getPortById(selectedRoute?.destination)?.name}
            </strong>
            <p>{selectedRoute?.reason}</p>
            <div className="map-risk-meter">
              <div
                style={{
                  width: `${selectedRoute?.riskScore || 0}%`,
                  background: routeColors[selectedRoute?.risk || "low"],
                }}
              />
            </div>
            <small>{selectedRoute?.riskScore}% route risk score</small>
          </div>
        )}

        <div className="map-risk-distribution">
          <div className="distribution-row">
            <span>High risk</span>
            <div>
              <i
                style={{
                  width: `${(routeStats.highRiskRoutes / routeStats.totalRoutes) * 100}%`,
                  background: routeColors.high,
                }}
              />
            </div>
            <strong>{routeStats.highRiskRoutes}</strong>
          </div>
          <div className="distribution-row">
            <span>Medium risk</span>
            <div>
              <i
                style={{
                  width: `${(routeStats.mediumRiskRoutes / routeStats.totalRoutes) * 100}%`,
                  background: routeColors.medium,
                }}
              />
            </div>
            <strong>{routeStats.mediumRiskRoutes}</strong>
          </div>
          <div className="distribution-row">
            <span>Low risk</span>
            <div>
              <i
                style={{
                  width: `${(routeStats.lowRiskRoutes / routeStats.totalRoutes) * 100}%`,
                  background: routeColors.low,
                }}
              />
            </div>
            <strong>{routeStats.lowRiskRoutes}</strong>
          </div>
        </div>

        <div className="map-legend">
          <span><i className="legend-high" /> High risk route</span>
          <span><i className="legend-medium" /> Medium risk route</span>
          <span><i className="legend-low" /> Low risk route</span>
        </div>
      </div>
    </section>
  );
}

export default RiskMapPage;
