import React, { useEffect, useRef, useState } from "react";
import { MapContainer as LeafletMap, TileLayer, GeoJSON, Popup, useMap, useMapEvents } from "react-leaflet";
import { Loader2 } from "lucide-react";
import L from "leaflet";
import * as turf from "@turf/turf";
import usStatesGeoJSON from "../../data/us_states.json";
import { fetchCountyPopulation, getCountyName, fetchStandAloneHouses, fetchZipPopulationAndHouses } from "./censusApi";

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

const stateNameToAbbr = {
  "alabama": "al",
  "alaska": "ak",
  "arizona": "az",
  "arkansas": "ar",
  "california": "ca",
  "colorado": "co",
  "connecticut": "ct",
  "delaware": "de",
  "district of columbia": "dc",
  "florida": "fl",
  "georgia": "ga",
  "hawaii": "hi",
  "idaho": "id",
  "illinois": "il",
  "indiana": "in",
  "iowa": "ia",
  "kansas": "ks",
  "kentucky": "ky",
  "louisiana": "la",
  "maine": "me",
  "maryland": "md",
  "massachusetts": "ma",
  "michigan": "mi",
  "minnesota": "mn",
  "mississippi": "ms",
  "missouri": "mo",
  "montana": "mt",
  "nebraska": "ne",
  "nevada": "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  "ohio": "oh",
  "oklahoma": "ok",
  "oregon": "or",
  "pennsylvania": "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  "tennessee": "tn",
  "texas": "tx",
  "utah": "ut",
  "vermont": "vt",
  "virginia": "va",
  "washington": "wa",
  "west virginia": "wv",
  "wisconsin": "wi",
  "wyoming": "wy",
};

const ZIP_STATE_FILES = [
  { abbr: "ak", name: "alaska" },
  { abbr: "al", name: "alabama" },
  { abbr: "ar", name: "arkansas" },
  { abbr: "az", name: "arizona" },
  { abbr: "ca", name: "california" },
  { abbr: "co", name: "colorado" },
  { abbr: "ct", name: "connecticut" },
  { abbr: "dc", name: "district of columbia" },
  { abbr: "de", name: "delaware" },
  { abbr: "fl", name: "florida" },
  { abbr: "ga", name: "georgia" },
  { abbr: "hi", name: "hawaii" },
  { abbr: "ia", name: "iowa" },
  { abbr: "id", name: "idaho" },
  { abbr: "il", name: "illinois" },
  { abbr: "in", name: "indiana" },
  { abbr: "ks", name: "kansas" },
  { abbr: "ky", name: "kentucky" },
  { abbr: "la", name: "louisiana" },
  { abbr: "ma", name: "massachusetts" },
  { abbr: "md", name: "maryland" },
  { abbr: "me", name: "maine" },
  { abbr: "mi", name: "michigan" },
  { abbr: "mn", name: "minnesota" },
  { abbr: "mo", name: "missouri" },
  { abbr: "ms", name: "mississippi" },
  { abbr: "mt", name: "montana" },
  { abbr: "nc", name: "north carolina" },
  { abbr: "nd", name: "north dakota" },
  { abbr: "ne", name: "nebraska" },
  { abbr: "nh", name: "new hampshire" },
  { abbr: "nj", name: "new jersey" },
  { abbr: "nm", name: "new mexico" },
  { abbr: "nv", name: "nevada" },
  { abbr: "ny", name: "new york" },
  { abbr: "oh", name: "ohio" },
  { abbr: "ok", name: "oklahoma" },
  { abbr: "or", name: "oregon" },
  { abbr: "pa", name: "pennsylvania" },
  { abbr: "ri", name: "rhode island" },
  { abbr: "sc", name: "south carolina" },
  { abbr: "sd", name: "south dakota" },
  { abbr: "tn", name: "tennessee" },
  { abbr: "tx", name: "texas" },
  { abbr: "ut", name: "utah" },
  { abbr: "va", name: "virginia" },
  { abbr: "vt", name: "vermont" },
  { abbr: "wa", name: "washington" },
  { abbr: "wi", name: "wisconsin" },
  { abbr: "wv", name: "west virginia" },
  { abbr: "wy", name: "wyoming" },
];

function MapEventHandler({ onMapClick, drawingMode }) {
  useMapEvents({
    click: (e) => {
      if (drawingMode) onMapClick?.(e.latlng);
    },
  });
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
  addZipToActiveTerritory,
  selectedTerritoryId,
  setSelectedTerritoryId,
  clearTooltip,
  setClearPopup,
  selectedTerritory,
  selectedLocation,
  boundaryMode = "counties",
  countyBoundaries,
}) {
  const mapRef = useRef(null);
  const wrapperRef = useRef(null);
  const zipLayerGroupRef = useRef(L.layerGroup());
  const loadedZipLayers = useRef({});
  const addModeRef = useRef(addModeTerritoryId);
  const territoriesRef = useRef(territories);
  const activeTerritoryIdRef = useRef(activeTerritoryId);
  const zipDataCache = useRef({});
  const [loadingZips, setLoadingZips] = useState(false);
  const [popupInfo, setPopupInfo] = useState(null);

  // Sync refs with latest props
  useEffect(() => {
    addModeRef.current = addModeTerritoryId;
    territoriesRef.current = territories;
    activeTerritoryIdRef.current = activeTerritoryId;
  }, [addModeTerritoryId, territories, activeTerritoryId]);

  // Re-style all loaded ZIP layers when territories or active territory changes
  useEffect(() => {
    Object.values(loadedZipLayers.current).forEach(layer => {
      layer.eachLayer(subLayer => {
        if (subLayer.feature) {
          subLayer.setStyle(getZipStyle(subLayer.feature));
          if (subLayer._preHoverStyle) {
            subLayer._preHoverStyle = { ...getZipStyle(subLayer.feature) };
          }
        }
      });
    });
  }, [territories, activeTerritoryId]);

  // Reload ZIP layers when addMode changes (to refresh click handlers with current addMode)
  useEffect(() => {
    const showZips = boundaryMode === "zips" || boundaryMode === "both";
    if (!showZips || !mapRef.current) return;

    zipLayerGroupRef.current.clearLayers();
    loadedZipLayers.current = {};

    loadVisibleZips();
  }, [addModeTerritoryId, boundaryMode]);

  const mapCreated = (map) => {
    mapRef.current = map;
    window._debugMapRef = map;
    setTimeout(() => {
      map.invalidateSize(false);
    }, 300);
  };

  useEffect(() => {
    if (setClearPopup) {
      setClearPopup(() => setPopupInfo);
    }
  }, [setClearPopup]);

  useEffect(() => {
    if (!selectedTerritory || !mapRef.current) return;

    const map = mapRef.current;
    const bounds = L.latLngBounds([]);

    if (selectedTerritory.counties.length === 0 && selectedTerritory.zips?.length === 0) {
      return;
    }

    if (selectedTerritory.counties.length > 0) {
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
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
    }
  }, [selectedTerritory, countyBoundaries]);

  useEffect(() => {
    if (!selectedLocation || !mapRef.current) return;

    const map = mapRef.current;

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

    const query = (selectedLocation.display_name || selectedLocation).toLowerCase().trim();

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
          return;
        }
      }
    }

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
    }
  }, [selectedLocation, countyBoundaries]);

  const loadVisibleZips = () => {
    if (!mapRef.current) return;

    const center = mapRef.current.getCenter();
    const centerPt = turf.point([center.lng, center.lat]);

    console.log("[ZIP DEBUG] Map center:", center.lat.toFixed(6), center.lng.toFixed(6));

    let selectedAbbr = null;
    let minDist = Infinity;
    let closestStateName = "None";

    // Find closest state by centroid distance
    for (const feature of usStatesGeoJSON.features) {
      if (feature.geometry) {
        const centroid = turf.centroid(feature);
        const dist = turf.distance(centerPt, centroid, { units: "kilometers" });

        // Robust abbr extraction with fallback
        let abbr = (
          feature.properties.STUSPS ||
          feature.properties.STUSPS?.toLowerCase() ||
          feature.properties.statefp ||
          feature.properties.STATEFP ||
          feature.properties.postal ||
          feature.properties.POSTAL ||
          feature.properties.STATE ||
          feature.properties.state ||
          stateNameToAbbr[(feature.properties.NAME || feature.properties.name || "").toLowerCase().trim()]
        );

        if (abbr) {
          abbr = abbr.toLowerCase();
          console.log("[ZIP DEBUG] State:", feature.properties.NAME || feature.properties.name || "Unnamed", "abbr:", abbr.toUpperCase(), "distance:", dist.toFixed(2), "km");
          if (dist < minDist) {
            minDist = dist;
            selectedAbbr = abbr;
            closestStateName = feature.properties.NAME || feature.properties.name || abbr.toUpperCase();
          }
        } else {
          console.log("[ZIP DEBUG] No abbr found for state:", feature.properties.NAME || feature.properties.name || "Unnamed");
        }
      }
    }

    if (selectedAbbr) {
      console.log("[ZIP LOAD] Selected closest state:", selectedAbbr.toUpperCase(), "name:", closestStateName, "distance:", minDist.toFixed(2), "km");
      if (!loadedZipLayers.current[selectedAbbr]) {
        setLoadingZips(true);
        loadZipForStates([selectedAbbr]);
      } else {
        console.log("[ZIP LOAD] Already loaded:", selectedAbbr.toUpperCase());
        setLoadingZips(false);
      }
    } else {
      console.warn("[ZIP LOAD] No valid state abbr found - falling back to Kansas");
      setLoadingZips(true);
      loadZipForStates(["ks"]);
    }
  };

  // Initial load and visibility toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const showZips = boundaryMode === "zips" || boundaryMode === "both";

    if (!showZips) {
      map.removeLayer(zipLayerGroupRef.current);
      setLoadingZips(false);
      return;
    }

    if (!map.hasLayer(zipLayerGroupRef.current)) {
      map.addLayer(zipLayerGroupRef.current);
    }

    loadVisibleZips();
  }, [boundaryMode]);

  const getZipPopupContent = (zip, population, standAloneHouses) => {
    return `
      <div class="min-w-[220px]">
        <h3 class="font-semibold text-base text-gray-900 mb-3">ZIP ${zip}</h3>
        <div class="space-y-3">
          <div>
            <p class="text-xs text-gray-600">Population (2023 est.)</p>
            <p class="text-xl font-bold text-indigo-700">${population.toLocaleString()}</p>
          </div>
          <div>
            <p class="text-xs text-gray-600">Stand-alone houses</p>
            <p class="text-xl font-bold text-indigo-700">${standAloneHouses.toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;
  };

  const loadZipForStates = async (abbrs) => {
    const baseUrl = "https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/";

    for (const abbr of abbrs) {
      if (loadedZipLayers.current[abbr]) continue;

      const stateObj = ZIP_STATE_FILES.find(s => s.abbr === abbr);
      if (!stateObj) {
        console.error("[ZIP LOAD] No state file mapping for abbr:", abbr);
        continue;
      }

      const fileName = `${abbr}_${stateObj.name.replace(/ /g, "_")}_zip_codes_geo.min.json`;
      const url = `${baseUrl}${fileName}`;

      console.log("[ZIP FETCH] Trying to load:", url);

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.error("[ZIP FETCH] HTTP error:", res.status, "for", url);
          throw new Error(`HTTP ${res.status}`);
        }

        let geo = await res.json();
        geo = turf.simplify(geo, { tolerance: 0.001, highQuality: true });

        const layer = L.geoJSON(geo, {
          style: getZipStyle,
          onEachFeature: (feature, layer) => {
            const zip = String(feature.properties.ZCTA5CE10 || feature.properties.ZIP || feature.properties.ZIPCODE || "");
            if (!zip) return;

            layer.bindTooltip(`ZIP: ${zip}`, { permanent: false, direction: "center" });

            layer.on({
              click: async (e) => {
                L.DomEvent.stopPropagation(e);
                const clickedLayer = e.target;

                if (addModeRef.current) {
                  const currentTerrs = territoriesRef.current;
                  const addTerrId = addModeRef.current;
                  const addTerritory = currentTerrs.find(t => t.id === addTerrId);
                  if (!addTerritory) return;

                  const currentlyAdded = !!addTerritory.zips?.find(z => String(z.zip) === zip);
                  const willAdd = !currentlyAdded;

                  const optimisticStyle = willAdd
                    ? {
                        color: addTerritory.color,
                        weight: addTerritory.id === activeTerritoryIdRef.current ? 4 : 2,
                        opacity: 1,
                        fillColor: addTerritory.color,
                        fillOpacity: addTerritory.id === activeTerritoryIdRef.current ? 0.6 : 0.4,
                      }
                    : {
                        color: "#4b5563",
                        weight: 0.8,
                        opacity: 0.5,
                        fillColor: "#e2e8f0",
                        fillOpacity: 0.15,
                      };

                  clickedLayer.setStyle(optimisticStyle);
                  clickedLayer._preHoverStyle = optimisticStyle;

                  let population = 0;
                  let standAloneHouses = 0;

                  if (zipDataCache.current[zip]) {
                    const cached = zipDataCache.current[zip];
                    population = cached.population || 0;
                    standAloneHouses = cached.standAloneHouses || 0;
                  } else {
                    try {
                      const data = await fetchZipPopulationAndHouses(zip);
                      population = data.population || 0;
                      standAloneHouses = data.standAloneHouses || 0;
                      zipDataCache.current[zip] = { population, standAloneHouses };
                    } catch (err) {
                      console.error("[ZIP CLICK] Census fetch failed for ZIP", zip, ":", err);
                      population = 0;
                      standAloneHouses = 0;
                      zipDataCache.current[zip] = { population, standAloneHouses };
                    }
                  }

                  addZipToActiveTerritory(zip, population, standAloneHouses);
                } else {
                  const cached = zipDataCache.current[zip];
                  if (cached) {
                    clickedLayer.bindPopup(getZipPopupContent(zip, cached.population, cached.standAloneHouses)).openPopup();
                  } else {
                    clickedLayer.bindPopup("Loading data...").openPopup();
                    try {
                      const data = await fetchZipPopulationAndHouses(zip);
                      zipDataCache.current[zip] = data;
                      clickedLayer.setPopupContent(getZipPopupContent(zip, data.population || 0, data.standAloneHouses || 0));
                    } catch (err) {
                      clickedLayer.setPopupContent("Data not available");
                    }
                  }
                }
              },
              mouseover: (e) => {
                const layer = e.target;
                layer._preHoverStyle = {
                  weight: layer.options.weight,
                  color: layer.options.color,
                  opacity: layer.options.opacity,
                  fillColor: layer.options.fillColor,
                  fillOpacity: layer.options.fillOpacity,
                };

                layer.setStyle({
                  weight: 5,
                  color: "#ff7800",
                  opacity: 1,
                  fillOpacity: 0.7,
                });
                layer.bringToFront();
              },
              mouseout: (e) => {
                const layer = e.target;
                if (layer._preHoverStyle) {
                  layer.setStyle(layer._preHoverStyle);
                }
              },
            });
          },
        });

        zipLayerGroupRef.current.addLayer(layer);
        loadedZipLayers.current[abbr] = layer;
        console.log("[ZIP LOAD] Successfully loaded:", abbr.toUpperCase());
      } catch (err) {
        console.error(`[ZIP] Load error for ${abbr}:`, err);
      }
    }

    setLoadingZips(false);
  };

  const getZipStyle = (feature) => {
    const zip = String(feature.properties.ZCTA5CE10 || feature.properties.ZIP || feature.properties.ZIPCODE || "");
    let color = "#4b5563";
    let weight = 0.8;
    let opacity = 0.5;
    let fillColor = "#e2e8f0";
    let fillOpacity = 0.15;

    for (const territory of territoriesRef.current) {
      if (territory.zips?.some(z => String(z.zip) === zip)) {
        color = territory.color;
        fillColor = territory.color;
        fillOpacity = territory.id === activeTerritoryIdRef.current ? 0.6 : 0.4;
        weight = territory.id === activeTerritoryIdRef.current ? 4 : 2;
        opacity = 1;
        break;
      }
    }

    return { color, weight, opacity, fillColor, fillOpacity };
  };

  const getCountyStyle = (feature) => {
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

    const showCounties = boundaryMode === "counties" || boundaryMode === "both";
    if (!showCounties) {
      fillOpacity = 0;
      weight = 0;
    }

    return {
      color: territoryColor,
      weight,
      fillColor,
      fillOpacity,
      pointerEvents: showCounties ? "visiblePainted" : "none",
      interactive: showCounties,
    };
  };

  const handleCountyClick = async (feature, layer, e) => {
    console.log("=== COUNTY CLICK DETECTED ===");
    console.log("Feature properties:", feature.properties);
    console.log("Active territory ID:", activeTerritoryId);
    console.log("Add mode territory ID:", addModeTerritoryId);

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
    <div ref={wrapperRef} style={{ height: "100%", width: "100%", position: "relative" }}>
      <LeafletMap
        ref={mapRef}
        center={US_CENTER}
        zoom={US_ZOOM}
        style={{ height: "100%", width: "100%" }}
        minZoom={3}
        maxZoom={19}
        zoomControl={true}
        scrollWheelZoom={true}
        preferCanvas={boundaryMode !== "zips" && boundaryMode !== "both"}
        whenCreated={mapCreated}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <MapInvalidator />
        <DataChangeInvalidator savedZones={territories} />
        <MapEventHandler onMapClick={null} drawingMode={false} />

        <GeoJSON
          data={usStatesGeoJSON}
          style={{
            color: "#2c3e50",
            weight: 2.5,
            opacity: 0.9,
            fill: false,
          }}
        />

        {countyBoundaries?.features && (
          <GeoJSON
            key={`counties-${territories.length}-${addModeTerritoryId}-${boundaryMode}`}
            data={countyBoundaries}
            style={getCountyStyle}
            onEachFeature={(feature, layer) => {
              layer.bindTooltip(feature.properties.NAME || "County", { permanent: false, direction: "center", className: "county-tooltip" });
              layer.on({
                click: (e) => handleCountyClick(feature, layer, e),
                mouseover: (e) => {
                  if (boundaryMode === "counties" || boundaryMode === "both") {
                    e.target.setStyle({ weight: 3, color: "#ff7800", fillOpacity: 0.6 });
                  }
                },
                mouseout: (e) => {
                  e.target.setStyle(getCountyStyle(feature));
                }
              });
            }}
          />
        )}

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

        {loadingZips && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(255,255,255,0.9)",
              padding: "16px 24px",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span>Loading ZIP boundaries...</span>
          </div>
        )}
      </LeafletMap>
    </div>
  );
}