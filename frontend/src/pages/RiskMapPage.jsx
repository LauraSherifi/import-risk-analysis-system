import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { getAuthHeaders } from "../auth";

const riskLabels = {
  all: "All ports",
  high: "High risk",
  medium: "Watchlist",
  low: "Low risk",
};

const riskColors = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const defaultSummary = {
  totalPorts: 0,
  totalShipments: 0,
  highRiskShipments: 0,
  lowRiskShipments: 0,
  skippedRows: 0,
  matchedRows: 0,
  datasetRiskScore: 0,
};

const defaultFilters = {
  selectedDate: "all",
  product: "",
  availableDates: [],
  topProducts: [],
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(Number(value || 0));

function SearchMapFocus({ selectedPort }) {
  const map = useMap();

  useEffect(() => {
    if (selectedPort) {
      const handleMoveEnd = () => {
        map.panBy([130, 0], { animate: true, duration: 0.35 });
      };

      map.once("moveend", handleMoveEnd);
      map.flyTo(selectedPort.position, 5, { duration: 0.8 });

      return () => {
        map.off("moveend", handleMoveEnd);
      };
    }

    return undefined;
  }, [map, selectedPort]);

  return null;
}

SearchMapFocus.propTypes = {
  selectedPort: PropTypes.shape({
    position: PropTypes.arrayOf(PropTypes.number).isRequired,
  }),
};

function RiskMapPage() {
  const [ports, setPorts] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [datasetFilters, setDatasetFilters] = useState(defaultFilters);
  const [riskFilter, setRiskFilter] = useState("all");
  const [selectedPortFilter, setSelectedPortFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [appliedProductSearch, setAppliedProductSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedPortId, setSelectedPortId] = useState("");
  const [focusPortId, setFocusPortId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedProductSearch(productSearch.trim());
    }, 450);

    return () => window.clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadRiskMapData() {
      if (ports.length === 0) {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (selectedDate !== "all") {
          params.set("date", selectedDate);
        }
        if (appliedProductSearch) {
          params.set("product", appliedProductSearch);
        }

        const queryString = params.toString();
        const response = await fetch(`/risk-map${queryString ? `?${queryString}` : ""}`, {
          headers: getAuthHeaders(),
          signal: controller.signal,
        });
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          throw new Error("Risk map API returned a non-JSON response. Check that the backend server is running.");
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load risk map data");
        }

        if (isMounted) {
          setPorts(data.ports || []);
          setHotspots(data.hotspots || []);
          setSummary(data.summary || defaultSummary);
          setDatasetFilters(data.filters || defaultFilters);
          setSelectedPortId((current) => current || data.ports?.[0]?.id || "");
          setFocusPortId((current) => current || data.ports?.[0]?.id || "");
          setError("");
        }
      } catch (loadError) {
        if (loadError.name === "AbortError") {
          return;
        }

        if (isMounted) {
          setError(loadError.message);
          setPorts([]);
          setHotspots([]);
          setSummary(defaultSummary);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRiskMapData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [appliedProductSearch, selectedDate]);

  useEffect(() => {
    if (!isPlaying || datasetFilters.availableDates.length === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSelectedDate((currentDate) => {
        const dates = datasetFilters.availableDates;
        const currentIndex = dates.indexOf(currentDate);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % dates.length;
        return dates[nextIndex];
      });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [datasetFilters.availableDates, isPlaying]);

  useEffect(() => {
    if (selectedPortFilter === "all") {
      return;
    }

    const selectedPort = ports.find((port) => port.id === selectedPortFilter);
    if (selectedPort) {
      setSelectedPortId(selectedPort.id);
      setFocusPortId(selectedPort.id);
    }
  }, [ports, selectedPortFilter]);

  const filteredPorts = useMemo(() => {
    return ports.filter((port) => {
      const matchesRisk =
        riskFilter === "all" || port.risk === riskFilter;
      const matchesPort =
        selectedPortFilter === "all" || port.id === selectedPortFilter;

      return matchesRisk && matchesPort;
    });
  }, [ports, riskFilter, selectedPortFilter]);

  const selectedPort = useMemo(
    () =>
      filteredPorts.find((port) => port.id === selectedPortId) ||
      filteredPorts[0] ||
      null,
    [filteredPorts, selectedPortId]
  );

  useEffect(() => {
    if (!filteredPorts.some((port) => port.id === selectedPortId)) {
      setSelectedPortId(filteredPorts[0]?.id || "");
    }
  }, [filteredPorts, selectedPortId]);

  const focusPort = useMemo(
    () => ports.find((port) => port.id === focusPortId) || null,
    [focusPortId, ports]
  );

  const shipmentRange = useMemo(() => {
    const shipmentCounts = ports.map((port) => port.shipments);
    return {
      min: Math.min(...shipmentCounts, 0),
      max: Math.max(...shipmentCounts, 0),
    };
  }, [ports]);

  const productChips = useMemo(() => {
    const chipMap = new Map();
    hotspots.forEach((hotspot) => {
      if (!chipMap.has(hotspot.name)) {
        chipMap.set(hotspot.name, hotspot);
      }
    });
    datasetFilters.topProducts.forEach((product) => {
      if (!chipMap.has(product.name)) {
        chipMap.set(product.name, product);
      }
    });
    return [...chipMap.values()].slice(0, 8);
  }, [datasetFilters.topProducts, hotspots]);

  const portStats = useMemo(() => {
    const highHotspots = filteredPorts.filter((port) => port.hotspotRisk === "high");
    const totalShipments = filteredPorts.reduce(
      (sum, port) => sum + port.shipments,
      0
    );
    const highRiskShipments = filteredPorts.reduce(
      (sum, port) => sum + port.highRisk,
      0
    );
    const topHotspotPort = [...filteredPorts].sort(
      (left, right) => right.hotspotRiskScore - left.hotspotRiskScore
    )[0];
    const busiestPort = [...filteredPorts].sort(
      (left, right) => right.shipments - left.shipments
    )[0];

    return {
      totalPorts: filteredPorts.length,
      highHotspots: highHotspots.length,
      totalShipments,
      highRiskShipments,
      topHotspotPort,
      busiestPort,
    };
  }, [filteredPorts]);

  const activeHotspot = selectedPort?.hotspot || null;
  const topHotspot = hotspots[0] || null;
  const activeTrend = selectedPort?.dailyTrend || [];
  const trendPeak = Math.max(...activeTrend.map((item) => item.riskScore), 1);

  const resetMapView = () => {
    setRiskFilter("all");
    setSelectedPortFilter("all");
    setProductSearch("");
    setAppliedProductSearch("");
    setSelectedDate("all");
    setIsPlaying(false);
    setSelectedPortId(ports[0]?.id || "");
    setFocusPortId(ports[0]?.id || "");
  };

  const selectPort = (portId) => {
    setSelectedPortId(portId);
    setFocusPortId(portId);
  };

  const getMarkerRadius = (shipments, isSelected) => {
    if (shipmentRange.max <= shipmentRange.min) {
      return isSelected ? 17 : 12;
    }

    const scale =
      (shipments - shipmentRange.min) / (shipmentRange.max - shipmentRange.min);
    return Math.round((isSelected ? 17 : 11) + scale * 9);
  };

  const setProductAndStop = (productName) => {
    setProductSearch(productName);
    setAppliedProductSearch(productName);
    setIsPlaying(false);
  };

  return (
    <section className="map-page hotspot-map-page">
      <MapContainer
        center={[25, 118]}
        className="risk-map"
        maxBounds={[
          [-85, -190],
          [85, 190],
        ]}
        minZoom={2}
        scrollWheelZoom
        zoom={3}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SearchMapFocus selectedPort={focusPort} />

        {filteredPorts.map((port) => {
          const isSelected = selectedPort?.id === port.id;
          const isTopHotspot = topHotspot?.portId === port.id;
            const markerRisk = port.risk;

          return (
            <CircleMarker
              center={port.position}
              eventHandlers={{
                click: () => selectPort(port.id),
              }}
              key={port.id}
              pathOptions={{
                className: isTopHotspot ? "risk-marker-pulse" : "risk-marker",
                color: isSelected ? "#111827" : "#0f4c81",
                fillColor: riskColors[markerRisk],
                fillOpacity: isSelected ? 0.92 : 0.8,
                opacity: 0.95,
                weight: isSelected ? 4 : 2,
              }}
              radius={getMarkerRadius(port.shipments, isSelected)}
            >
              <Tooltip direction="top" offset={[0, -8]} sticky>
                {port.name}: {port.hotspot?.name || "No product hotspot"}{" "}
                {port.riskScore}% risk
              </Tooltip>
              <Popup>
                <strong>{port.name}</strong>
                <span>{port.country}</span>
                <span>{formatNumber(port.shipments)} matching shipments</span>
                <span>{formatNumber(port.highRisk)} high-risk shipments</span>
                <span>
                  Hotspot: {port.hotspot?.name || "No hotspot"} (
                    {port.riskScore}%)
                </span>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="map-overlay map-title-panel">
        <span>Shipment Risk Hotspots</span>
        <strong>{topHotspot?.name || "Dataset monitor"}</strong>
        <p>
          {topHotspot
            ? `${topHotspot.portName} leads the current view at ${topHotspot.riskScore}% high risk.`
            : "No hotspot found for the current filters."}
        </p>
      </div>

      <div className="map-overlay map-toolbar">
        <div className="map-toolbar-header">
          <div>
            <span>Controls</span>
            <strong>{riskLabels[riskFilter]}</strong>
          </div>
          <button type="button" onClick={resetMapView}>
            Reset
          </button>
        </div>

        <div className="map-filter-grid">
          <label className="map-field">
            <span>Port</span>
            <select
              onChange={(event) => {
                setSelectedPortFilter(event.target.value);
                setIsPlaying(false);
              }}
              value={selectedPortFilter}
            >
              <option value="all">All ports</option>
              {ports.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.name}, {port.country}
                </option>
              ))}
            </select>
          </label>

          <label className="map-field">
            <span>Date</span>
            <select
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setIsPlaying(false);
              }}
              value={selectedDate}
            >
              <option value="all">All dates</option>
              {datasetFilters.availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="map-field">
          <span>Product filter</span>
          <input
            list="product-options"
            onChange={(event) => {
              setProductSearch(event.target.value);
              setIsPlaying(false);
            }}
            placeholder="Example: Big Bag with Fertilizer"
            value={productSearch}
          />
        </label>

        <datalist id="product-options">
          {datasetFilters.topProducts.map((product) => (
            <option key={product.name} value={product.name} />
          ))}
        </datalist>

        <div className="segmented-control" aria-label="Risk mode">
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

        <div className="map-play-row">
          <button
            className={isPlaying ? "active" : ""}
            disabled={datasetFilters.availableDates.length === 0}
            onClick={() => setIsPlaying((current) => !current)}
            type="button"
          >
            {isPlaying ? "Pause Timeline" : "Play Timeline"}
          </button>
          <span>{selectedDate === "all" ? "All dates" : selectedDate}</span>
        </div>

        <div className="map-chip-row">
          {productChips.map((product) => (
            <button
              className={productSearch === product.name ? "active" : ""}
              key={product.name}
              onClick={() => setProductAndStop(product.name)}
              type="button"
            >
              {product.name}
            </button>
          ))}
        </div>

        <div className="map-filter-summary">
          <span>{formatNumber(filteredPorts.length)} ports shown</span>
          <span>{formatNumber(summary.matchedRows)} matching shipments</span>
        </div>

        {loading && <p className="map-status-text">Loading dataset risk map...</p>}
        {error && <p className="map-status-text map-status-error">{error}</p>}
      </div>

      <div className="map-overlay map-summary hotspot-summary">
        <div className="hotspot-panel-header">
          <div>
            <span>Selected Port Profile</span>
            <strong>
              {selectedPort
                ? `${selectedPort.name}, ${selectedPort.country}`
                : "No port selected"}
            </strong>
          </div>
          <small>{summary.datasetRiskScore}% dataset baseline</small>
        </div>

        <div className="map-stat-grid">
          <div>
            <span>Hotspot</span>
            <strong>{activeHotspot ? `${activeHotspot.riskScore}%` : "--"}</strong>
          </div>
          <div>
            <span>High Risk</span>
            <strong>{formatNumber(selectedPort?.highRisk)}</strong>
          </div>
          <div>
            <span>Shipments</span>
            <strong>{formatNumber(selectedPort?.shipments)}</strong>
          </div>
        </div>

        {activeHotspot && (
          <div className="hotspot-focus-card">
            <span>Current Hotspot</span>
            <strong>{activeHotspot.name}</strong>
            <p>
              {formatNumber(activeHotspot.highRisk)} high-risk shipments out of{" "}
              {formatNumber(activeHotspot.shipments)} matching records.
            </p>
            <div className="map-risk-meter">
              <div
                style={{
                  width: `${Math.min(activeHotspot.riskScore, 100)}%`,
                  background: riskColors[activeHotspot.risk],
                }}
              />
            </div>
          </div>
        )}

        <div className="hotspot-leaderboard">
          <div className="map-trend-header">
            <span>Top Hotspots</span>
            <strong>{hotspots.length} signals</strong>
          </div>
          {hotspots.slice(0, 5).map((hotspot, index) => (
            <button
              className={selectedPort?.id === hotspot.portId ? "active" : ""}
              key={`${hotspot.portId}-${hotspot.name}`}
              onClick={() => {
                selectPort(hotspot.portId);
                setProductSearch(hotspot.name);
                setAppliedProductSearch(hotspot.name);
                setIsPlaying(false);
              }}
              type="button"
            >
              <span>{index + 1}</span>
              <div>
                <strong>{hotspot.name}</strong>
                <small>
                  {hotspot.portName} - {hotspot.riskScore}% -{" "}
                  {formatNumber(hotspot.highRisk)} high risk
                </small>
              </div>
            </button>
          ))}
        </div>

        {activeTrend.length > 0 && (
          <div className="map-trend">
            <div className="map-trend-header">
              <span>Daily Risk Trend</span>
              <div>
                {selectedDate !== "all" && (
                  <button
                    onClick={() => {
                      setSelectedDate("all");
                      setIsPlaying(false);
                    }}
                    type="button"
                  >
                    All dates
                  </button>
                )}
                <strong>{selectedPort?.name}</strong>
              </div>
            </div>
            <div className="map-trend-bars">
              {activeTrend.map((item) => (
                <button
                  className={selectedDate === item.date ? "active" : ""}
                  key={item.date}
                  onClick={() => {
                    setSelectedDate((currentDate) =>
                      currentDate === item.date ? "all" : item.date
                    );
                    setIsPlaying(false);
                  }}
                  style={{ height: `${28 + (item.riskScore / trendPeak) * 72}px` }}
                  title={`${item.date}: ${item.riskScore}% high risk`}
                  type="button"
                >
                  <i style={{ background: riskColors[getRiskBand(item.riskScore)] }} />
                  <span>{item.date.slice(5)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPort?.productHotspots?.length > 0 && (
          <div className="map-port-intel hotspot-products">
            <div>
              <span>Port Hotspots</span>
              {selectedPort.productHotspots.slice(0, 4).map((product) => (
                <button
                  key={product.name}
                  onClick={() => setProductAndStop(product.name)}
                  type="button"
                >
                  <strong>{product.name}</strong>
                  <small>
                    {product.riskScore}% risk - {formatNumber(product.highRisk)} high
                  </small>
                </button>
              ))}
            </div>

            <div>
              <span>Common Products</span>
              {selectedPort.topProducts.slice(0, 4).map((product) => (
                <button
                  key={product.name}
                  onClick={() => setProductAndStop(product.name)}
                  type="button"
                >
                  <strong>{product.name}</strong>
                  <small>{formatNumber(product.shipments)} shipments</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="map-legend">
          <span><i className="legend-high" /> High risk</span>
          <span><i className="legend-medium" /> Watchlist</span>
          <span><i className="legend-low" /> Low risk</span>
        </div>

        {summary.skippedRows > 0 && (
          <small className="map-footnote">
            {formatNumber(summary.skippedRows)} shipment rows skipped because the
            destination port has no map coordinates.
          </small>
        )}
      </div>
    </section>
  );
}

function getRiskBand(riskScore) {
  if (riskScore >= 18) {
    return "high";
  }

  if (riskScore >= 12) {
    return "medium";
  }

  return "low";
}

export default RiskMapPage;
