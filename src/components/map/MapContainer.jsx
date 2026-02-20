import React, { useEffect, useRef, useState } from "react";
import { MapContainer as LeafletMap, TileLayer, GeoJSON, Popup, useMap, useMapEvents } from "react-leaflet";
import { Loader2 } from "lucide-react";
import LeafletDrawControl from "./LeafletDrawControl";
import { fetchCountyPopulation, getCountyName } from "./censusApi";
import L from "leaflet";

const US_CENTER = [39.8283, -98.5795];
const US_ZOOM = 4;

function MapEventHandler({ onMapClick, drawingMode }) {
  useMapEvents({
    click: (e) => {
      if (drawingMode) onMapClick?.(e.latlng);
    },
  });
  return null;
}

function FitBoundsComponent({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [20, 20] });
  }, [bounds, map]);
  return null;
}

function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const timer0 = setTimeout(() => map.invalidateSize(false), 0);
    map.invalidateSize(false);

    const timer1 = setTimeout(() => map.invalidateSize(false), 100);
    const timer2 = setTimeout(() => map.invalidateSize(false), 300);
    const timer3 = setTimeout(() => map.invalidateSize(false), 600);

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => map.invalidateSize(false), 200);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(timer0); clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);
  return null;
}

function DataChangeInvalidator({ savedZones }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(timer);
  }, [savedZones, map]);
  return null;
}

export default function MapContainerComponent({
  territories = [],
  activeTerritoryId,
  addModeTerritoryId,
  addCountyToActiveTerritory,
  countyBoundaries,
}) {
  const mapRef = useRef();
  const wrapperRef = useRef();

  const TERRITORY_COLORS = [
    "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7",
  ];

  const [popupInfo, setPopupInfo] = useState(null);

  console.log("MapContainer received props:", {
    territoriesLength: territories.length,
    activeTerritoryId,
    addModeTerritoryId,
    addCountyFunctionExists: !!addCountyToActiveTerritory,
    countyBoundariesFeatures: countyBoundaries?.features?.length || "missing",
  });

  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current;
      window._debugMapRef = map;
      console.log("Map init size:", map.getSize());

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize(false);
          console.log("Late force size (3s):", mapRef.current.getSize());
        }
      }, 3000);
    }
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    console.log("Wrapper initial size:", rect);

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        console.log("ResizeObserver:", width, height);
        if (mapRef.current && width > 100 && height > 100) {
          mapRef.current.invalidateSize(false);
          setTimeout(() => {
            mapRef.current?.invalidateSize(false);
            mapRef.current?.setView(US_CENTER, US_ZOOM);
          }, 100);
        }
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mutationObserver = new MutationObserver(() => {
      mapRef.current?.invalidateSize(false);
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => mutationObserver.disconnect();
  }, []);

  // County click handler - add/remove from territory in add mode
  const handleCountyClick = async (feature, layer) => {
    console.log("=== COUNTY CLICK DETECTED ===");
    console.log("Feature properties:", feature.properties);
    console.log("Active territory ID (prop):", activeTerritoryId);
    console.log("Add mode territory ID (prop):", addModeTerritoryId);
    console.log("addCountyToActiveTerritory prop exists?", !!addCountyToActiveTerritory);

    const props = feature.properties || {};
    let fips = props.GEOID || (props.STATEFP + props.COUNTYFP) || props.FIPS || props.statefp + props.countyfp || props.countyfp;
    if (!fips || fips.length < 5) {
      console.log("No valid FIPS found - properties:", props);
      const name = props.NAME || props.name || "Unknown County";
      setPopupInfo({ name, population: null });
      return;
    }

    const stateFips = fips.slice(0, 2);
    const countyFips = fips.slice(2);

    console.log("Fetching population for state:", stateFips, "county:", countyFips);

    const name = await getCountyName(stateFips, countyFips) || props.NAME || "Unknown County";
    const population = await fetchCountyPopulation(stateFips, countyFips);

    console.log("Population fetched:", population);

    if (addModeTerritoryId) {
      console.log("Mode active - calling addCountyToActiveTerritory");
      addCountyToActiveTerritory(fips, population, name);
    } else {
      console.log("No add mode active - skipping add");
    }

    setPopupInfo({
      lat: layer.getBounds().getCenter().lat,
      lng: layer.getBounds().getCenter().lng,
      name,
      population,
      state: props.STATE_NAME || props.state || "Unknown",
    });
  };

  return (
    <div ref={wrapperRef} style={{ height: "100vh", width: "100vw", position: "relative" }}>
      <LeafletMap
        ref={mapRef}
        center={US_CENTER}
        zoom={US_ZOOM}
        style={{ height: "100%", width: "100%" }}
        minZoom={3}
        maxZoom={19}
        zoomControl={true}
        scrollWheelZoom={true}
        preferCanvas={true}
        crs={L.CRS.EPSG3857}
        whenCreated={(map) => {
          window._debugMapRef = map;
          setTimeout(() => {
            map.invalidateSize(false);
            map.setView(US_CENTER, US_ZOOM);
          }, 300);
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <MapInvalidator />
        <DataChangeInvalidator savedZones={territories} />
        <MapEventHandler onMapClick={null} drawingMode={false} />

        {/* County boundaries - clickable */}
        {countyBoundaries?.features && (
          <GeoJSON
            key={`counties-${territories.length}-${addModeTerritoryId}`}  // force re-render when territories or mode change
            data={countyBoundaries}
            style={(feature) => {
              const territory = territories.find((t) => t.id === addModeTerritoryId);
              const isInTerritory = territory && territory.counties.some((c) => c.fips === feature.properties.GEOID);
              return {
                color: isInTerritory ? territory.color : "#64748b",
                weight: isInTerritory ? 3 : 1.5,
                fillColor: isInTerritory ? territory.color : "#e2e8f0",
                fillOpacity: isInTerritory ? 0.7 : 0.4,
                pointerEvents: "visiblePainted",
                interactive: true,
              };
            }}
            onEachFeature={(feature, layer) => {
              console.log("Adding click handler to county:", feature.properties);
              layer.bindTooltip(feature.properties.NAME || "County", { permanent: false, direction: "center", className: "county-tooltip" });
              layer.on({
                click: (e) => {
                  console.log("Click event fired on county:", feature.properties);
                  handleCountyClick(feature, layer);
                },
                mouseover: (e) => {
                  e.target.setStyle({ weight: 3, color: "#ff7800", fillOpacity: 0.6 });
                },
                mouseout: (e) => {
                  e.target.setStyle({ weight: 1.5, color: "#64748b", fillOpacity: 0.4 });
                }
              });
            }}
          />
        )}

        {/* Territory overlays */}
        {territories.map((territory, idx) => {
          let geojson;
          try {
            geojson = JSON.parse(territory.geometry);
          } catch {
            return null;
          }
          if (!geojson) return null;

          const color = territory.color || TERRITORY_COLORS[idx % TERRITORY_COLORS.length];

          return (
            <GeoJSON
              key={territory.id}
              data={geojson}
              style={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.2,
              }}
            />
          );
        })}

        {/* Popup */}
        {popupInfo && (
          <Popup position={[popupInfo.lat, popupInfo.lng]} onClose={() => setPopupInfo(null)}>
            <div className="min-w-[200px]">
              <h3 className="font-semibold text-sm text-gray-900">{popupInfo.name}</h3>
              <p className="text-xs text-gray-500">{popupInfo.state}</p>
              {popupInfo.population !== null ? (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Population (2023 est.)</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {popupInfo.population.toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              )}
            </div>
          </Popup>
        )}
      </LeafletMap>
    </div>
  );
}