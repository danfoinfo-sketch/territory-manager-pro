import React, { useEffect, useRef, useState } from "react";
import { MapContainer as LeafletMap, TileLayer, GeoJSON, Popup, useMap, useMapEvents } from "react-leaflet";
import { Loader2 } from "lucide-react";
import LeafletDrawControl from "./LeafletDrawControl";
import { fetchCountyPopulation, getCountyName, fetchStandAloneHouses } from "./censusApi";
import L from "leaflet";
import usStatesGeoJSON from "../../data/us_states.json";

const US_CENTER = [39.8283, -98.5795];
const US_ZOOM = 4;

const fipsToState = {
  "01": "Alabama",
  "02": "Alaska",
  "04": "Arizona",
  "05": "Arkansas",
  "06": "California",
  "08": "Colorado",
  "09": "Connecticut",
  "10": "Delaware",
  "11": "District of Columbia",
  "12": "Florida",
  "13": "Georgia",
  "15": "Hawaii",
  "16": "Idaho",
  "17": "Illinois",
  "18": "Indiana",
  "19": "Iowa",
  "20": "Kansas",
  "21": "Kentucky",
  "22": "Louisiana",
  "23": "Maine",
  "24": "Maryland",
  "25": "Massachusetts",
  "26": "Michigan",
  "27": "Minnesota",
  "28": "Mississippi",
  "29": "Missouri",
  "30": "Montana",
  "31": "Nebraska",
  "32": "Nevada",
  "33": "New Hampshire",
  "34": "New Jersey",
  "35": "New Mexico",
  "36": "New York",
  "37": "North Carolina",
  "38": "North Dakota",
  "39": "Ohio",
  "40": "Oklahoma",
  "41": "Oregon",
  "42": "Pennsylvania",
  "44": "Rhode Island",
  "45": "South Carolina",
  "46": "South Dakota",
  "47": "Tennessee",
  "48": "Texas",
  "49": "Utah",
  "50": "Vermont",
  "51": "Virginia",
  "53": "Washington",
  "54": "West Virginia",
  "55": "Wisconsin",
  "56": "Wyoming",
  "72": "Puerto Rico",
  "78": "Virgin Islands",
};

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
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
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
  selectedTerritoryId,
  setSelectedTerritoryId,
  clearTooltip,
  setClearPopup,
  selectedTerritory,
  selectedLocation,
}) {
  const mapRef = useRef();
  const wrapperRef = useRef();

  const TERRITORY_COLORS = [
    "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7",
  ];

  const [popupInfo, setPopupInfo] = useState(null);

  // Forward setter
  useEffect(() => {
    if (setClearPopup) {
      setClearPopup(() => setPopupInfo);
    }
  }, [setClearPopup]);

  // Center on selected territory
  useEffect(() => {
    if (!selectedTerritory || !mapRef.current) return;

    const map = mapRef.current;
    const bounds = L.latLngBounds([]);

    selectedTerritory.counties.forEach((c) => {
      const fips = c.fips;
      const feature = countyBoundaries.features.find(
        (f) => f.properties.GEOID === fips
      );
      if (feature && feature.geometry) {
        const geoJsonLayer = L.geoJSON(feature);
        bounds.extend(geoJsonLayer.getBounds());
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
    }
  }, [selectedTerritory, countyBoundaries]);

  // Center on searched location
  useEffect(() => {
    if (!selectedLocation || !mapRef.current) return;

    const map = mapRef.current;

    console.log("[Search] Centering on:", selectedLocation);

    if (selectedLocation.bounds) {
      const [minLat, maxLat, minLon, maxLon] = selectedLocation.bounds;
      const bounds = L.latLngBounds(
        [minLat, minLon],
        [maxLat, maxLon]
      );
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
      return;
    }

    if (selectedLocation.lat && selectedLocation.lon) {
      map.flyTo([selectedLocation.lat, selectedLocation.lon], 12, { duration: 1.2 });
      return;
    }

    // Local fallback (state or county name)
    const query = (selectedLocation.display_name || selectedLocation).toLowerCase().trim();

    // State-only (no comma)
    if (!query.includes(", ")) {
      const stateFips = Object.keys(fipsToState).find(code => fipsToState[code].toLowerCase() === query);
      if (stateFips) {
        const stateBounds = L.latLngBounds([]);
        countyBoundaries.features.forEach(f => {
          if (f.properties.STATEFP === stateFips && f.geometry) {
            stateBounds.extend(L.geoJSON(f).getBounds());
          }
        });
        if (stateBounds.isValid()) {
          map.fitBounds(stateBounds, { padding: [80, 80], maxZoom: 8 });
          console.log("[Search] Zoomed to state:", fipsToState[stateFips]);
          return;
        }
      }
    }

    // County or county,state
    const parts = query.split(", ").map(p => p.trim());
    const countyQuery = parts[0];
    const stateQuery = parts[1] || "";

    let targetBounds = null;

    if (stateQuery) {
      const stateFips = Object.keys(fipsToState).find(code => fipsToState[code].toLowerCase() === stateQuery.toLowerCase());
      if (stateFips) {
        const countyFeature = countyBoundaries.features.find(f => {
          const name = (f.properties.NAME || f.properties.NAMELSAD || "").toLowerCase().trim();
          return name === countyQuery.toLowerCase() && f.properties.STATEFP === stateFips;
        });

        if (countyFeature && countyFeature.geometry) {
          targetBounds = L.geoJSON(countyFeature).getBounds();
        }
      }
    }

    if (!targetBounds) {
      const countyFeature = countyBoundaries.features.find(f => {
        const name = (f.properties.NAME || f.properties.NAMELSAD || "").toLowerCase().trim();
        return name === query.toLowerCase();
      });

      if (countyFeature && countyFeature.geometry) {
        targetBounds = L.geoJSON(countyFeature).getBounds();
      }
    }

    if (targetBounds && targetBounds.isValid()) {
      map.fitBounds(targetBounds, { padding: [80, 80], maxZoom: 12 });
    } else {
      console.log("[Search] No match found for:", query);
    }
  }, [selectedLocation, countyBoundaries]);

  console.log("MapContainer received props:", {
    territoriesLength: territories.length,
    activeTerritoryId,
    addModeTerritoryId,
    addCountyFunctionExists: !!addCountyToActiveTerritory,
    countyBoundariesFeatures: countyBoundaries?.features?.length || "missing",
    selectedTerritoryId,
    selectedLocation,
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

  const handleCountyClick = async (feature, layer, e) => {
    console.log("=== COUNTY CLICK DETECTED ===");
    console.log("Feature properties:", feature.properties);
    console.log("Active territory ID (prop):", activeTerritoryId);
    console.log("Add mode territory ID (prop):", addModeTerritoryId);
    console.log("addCountyToActiveTerritory prop exists?", !!addCountyToActiveTerritory);

    const props = feature.properties || {};
    let fips = props.GEOID || (props.STATEFP + props.COUNTYFP) || props.FIPS || props.statefp + props.countyfp || props.countyfp;

    let owningTerritory = null;
    for (const t of territories) {
      if (t.counties.some((c) => c.fips === fips)) {
        owningTerritory = t;
        break;
      }
    }

    if (owningTerritory && !addModeTerritoryId) {
      setSelectedTerritoryId(owningTerritory.id);
      setPopupInfo(null);
      return;
    }

    if (!fips || fips.length < 5) {
      const name = props.NAME || props.name || "Unknown County";
      setPopupInfo({ name, population: null, standAloneHouses: null });
      return;
    }

    const stateFips = fips.slice(0, 2);
    const countyFips = fips.slice(2);

    const name = await getCountyName(stateFips, countyFips) || props.NAME || "Unknown County";
    const population = await fetchCountyPopulation(stateFips, countyFips);
    const standAloneHouses = await fetchStandAloneHouses(stateFips, countyFips);

    if (addModeTerritoryId) {
      addCountyToActiveTerritory(fips, population, name);
    } else {
      setPopupInfo({
        lat: layer.getBounds().getCenter().lat,
        lng: layer.getBounds().getCenter().lng,
        name,
        population,
        standAloneHouses,
      });
    }
  };

  return (
    <div ref={wrapperRef} style={{ height: "100%", width: "100%" }}>
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

        {/* State borders */}
        <GeoJSON
          data={usStatesGeoJSON}
          style={{
            color: "#2c3e50",
            weight: 2.5,
            opacity: 0.9,
            fill: false,
          }}
        />

        {/* County boundaries */}
        {countyBoundaries?.features && (
          <GeoJSON
            key={`counties-${territories.length}-${addModeTerritoryId}`}
            data={countyBoundaries}
            style={(feature) => {
              let territoryColor = "#8a9bb1";
              let weight = 1.2;
              let fillOpacity = 0.4;
              let fillColor = "#e2e8f0";

              for (const territory of territories) {
                if (territory.counties.some((c) => c.fips === feature.properties.GEOID)) {
                  territoryColor = territory.color;
                  fillColor = territory.color;
                  fillOpacity = 0.5;
                  weight = 2;

                  if (territory.id === activeTerritoryId) {
                    weight = 4;
                    fillOpacity = 0.7;
                  }
                  break;
                }
              }

              return {
                color: territoryColor,
                weight,
                fillColor,
                fillOpacity,
                pointerEvents: "visiblePainted",
                interactive: true,
              };
            }}
            onEachFeature={(feature, layer) => {
              layer.bindTooltip(feature.properties.NAME || "County", { permanent: false, direction: "center", className: "county-tooltip" });
              layer.on({
                click: (e) => {
                  handleCountyClick(feature, layer, e);
                },
                mouseover: (e) => {
                  e.target.setStyle({ weight: 3, color: "#ff7800", fillOpacity: 0.6 });
                },
                mouseout: (e) => {
                  e.target.setStyle({ weight: 1.2, color: "#8a9bb1", fillOpacity: 0.4 });
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

        {/* Popup - safe null checks + loading */}
        {popupInfo && (
          <Popup position={[popupInfo.lat, popupInfo.lng]} onClose={() => setPopupInfo(null)}>
            <div className="min-w-[220px]">
              <h3 className="font-semibold text-base text-gray-900 mb-3">
                {popupInfo.name}
              </h3>

              {popupInfo.population !== null ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-600">Population (2023 est.)</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {popupInfo.population.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600">Stand-alone houses</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {popupInfo.standAloneHouses !== undefined && popupInfo.standAloneHouses !== null
                        ? popupInfo.standAloneHouses.toLocaleString()
                        : "Loading..."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-sm text-gray-500">Loading data...</span>
                </div>
              )}
            </div>
          </Popup>
        )}
      </LeafletMap>
    </div>
  );
}