import React, { useState, useMemo, useEffect, useRef } from "react";
import MapContainerComponent from "../components/map/MapContainer";
import countyBoundaries from "../data/us_counties.json";
import TerritoryTooltip from "../components/TerritoryTooltip";
import { Search } from "lucide-react";
import { fetchStandAloneHouses } from "../components/map/censusApi"; // Fixed import

console.log("County data loaded:", countyBoundaries?.features?.length || 0, "counties");

const TERRITORY_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7",
];

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

function MapPage() {
  const [territories, setTerritories] = useState([]);
  const [territoryCounter, setTerritoryCounter] = useState(1);
  const [activeTerritoryId, setActiveTerritoryId] = useState(null);
  const [addModeTerritoryId, setAddModeTerritoryId] = useState(null);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [clearPopup, setClearPopup] = useState(null);
  const suggestionsRef = useRef(null);

  const [boundaryMode, setBoundaryMode] = useState("counties");

  useEffect(() => {
    console.log("[MapPage STATE] addModeTerritoryId changed to:", addModeTerritoryId);
  }, [addModeTerritoryId]);

  const localPlaces = useMemo(() => {
    const placeSet = new Set();
    (countyBoundaries?.features || []).forEach(feature => {
      const props = feature.properties || {};
      const county = (props.NAME || props.NAMELSAD || "").trim();
      const stateFips = props.STATEFP || "";
      const state = fipsToState[stateFips] || "";

      if (county && state) placeSet.add(`${county}, ${state}`);
      if (state) placeSet.add(state);
    });
    return Array.from(placeSet).sort();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      return;
    }

    const query = searchQuery.trim();

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}&country=us&limit=6&types=place,locality,postcode,region,neighborhood&language=en`
        );
        const data = await response.json();

        const mapboxResults = data.features.map(f => ({
          display_name: f.place_name,
          lat: f.center[1],
          lon: f.center[0],
          isLocal: false,
          isState: f.place_type.includes("region"),
          isZip: f.place_type.includes("postcode"),
          isCity: f.place_type.includes("place") || f.place_type.includes("locality")
        }));

        setSuggestions(mapboxResults);
        setSelectedSuggestionIndex(-1);
        console.log("[Mapbox] Results count:", mapboxResults.length);
      } catch (error) {
        console.log("[Search Error]", error);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : prev);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();

        const queryLower = searchQuery.trim().toLowerCase();

        const exactState = localPlaces.find(p => p.toLowerCase() === queryLower);
        if (exactState) {
          handleSelectPlace({ display_name: exactState, lat: null, lon: null, isLocal: true, isState: true });
          return;
        }

        if (suggestions.length > 0) {
          const preferred = suggestions.find(s => s.isCity || s.isZip) || suggestions[0];
          handleSelectPlace(preferred);
          return;
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, searchQuery, localPlaces]);

  useEffect(() => {
    if (selectedSuggestionIndex >= 0 && suggestionsRef.current) {
      const item = suggestionsRef.current.children[selectedSuggestionIndex];
      if (item) item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedSuggestionIndex]);

  const handleSelectPlace = (place) => {
    console.log("[Search] Selected:", place.display_name);
    setSelectedLocation(place);
    setSearchQuery(place.display_name);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
  };

  const createNewTerritory = () => {
    const name = `Territory ${territoryCounter}`;
    const newTerritory = {
      id: Date.now().toString(),
      name,
      color: TERRITORY_COLORS[territories.length % TERRITORY_COLORS.length],
      counties: [],
      zips: [],
    };
    setTerritories(prev => [...prev, newTerritory]);
    setActiveTerritoryId(newTerritory.id);
    setAddModeTerritoryId(newTerritory.id);
    setTerritoryCounter(prev => prev + 1);
  };

  const deleteTerritory = (id) => {
    setTerritories(prev => prev.filter(t => t.id !== id));
    if (activeTerritoryId === id) setActiveTerritoryId(null);
    if (addModeTerritoryId === id) setAddModeTerritoryId(null);
    if (selectedTerritoryId === id) setSelectedTerritoryId(null);
  };

  const renameTerritory = (id, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setTerritories(prev =>
      prev.map(t => (t.id === id ? { ...t, name: trimmed } : t))
    );
  };

  const toggleAddMode = (id) => {
    setAddModeTerritoryId(prev => {
      const newMode = prev === id ? null : id;
      if (newMode) {
        setActiveTerritoryId(id);
      }
      return newMode;
    });
  };

  const addCountyToActiveTerritory = async (fips, population, countyName) => {
    if (!addModeTerritoryId) return;

    const stateFips = fips.slice(0, 2);
    const countyFips = fips.slice(2);

    let standAloneHouses = 0;
    try {
      standAloneHouses = await fetchStandAloneHouses(stateFips, countyFips);
    } catch (err) {
      console.error("Failed to fetch stand-alone houses for county", fips, err);
      standAloneHouses = 0;
    }

    setTerritories(prev => {
      const newTerritories = [...prev];
      const index = newTerritories.findIndex(t => t.id === addModeTerritoryId);
      if (index === -1) return prev;

      const territory = { ...newTerritories[index] };
      const existingIndex = territory.counties.findIndex(c => c.fips === fips);
      if (existingIndex !== -1) {
        territory.counties = territory.counties.filter((_, i) => i !== existingIndex);
      } else {
        territory.counties = [...territory.counties, { fips, pop: Number(population), name: countyName, standAloneHouses: Number(standAloneHouses) }];
      }
      newTerritories[index] = territory;
      return newTerritories;
    });
  };

  const addZipToActiveTerritory = (zip, population, standAloneHouses) => {
    if (!addModeTerritoryId) return;

    setTerritories(prev => {
      const newTerritories = [...prev];
      const index = newTerritories.findIndex(t => t.id === addModeTerritoryId);
      if (index === -1) return prev;

      const territory = { ...newTerritories[index] };
      const existingIndex = territory.zips?.findIndex(z => String(z.zip) === String(zip)) ?? -1;

      if (existingIndex !== -1) {
        territory.zips = territory.zips.filter((_, i) => i !== existingIndex);
      } else {
        territory.zips = [...(territory.zips || []), { zip, pop: Number(population), standAloneHouses: Number(standAloneHouses) }];
      }
      newTerritories[index] = territory;
      return newTerritories;
    });
  };

  const handleSidebarTerritoryClick = (territory, e) => {
    if (addModeTerritoryId) return;

    setActiveTerritoryId(territory.id);
    setSelectedTerritoryId(territory.id);

    if (clearPopup) {
      clearPopup(null);
    }
  };

  const clearTooltip = () => {
    setSelectedTerritoryId(null);
  };

  const selectedTerritory = territories.find(t => t.id === selectedTerritoryId);

  const getTerritoryStats = (territory) => {
    const countyPop = territory.counties.reduce((sum, c) => sum + (Number(c.pop) || 0), 0);
    const countyHouses = territory.counties.reduce((sum, c) => sum + (Number(c.standAloneHouses) || 0), 0);
    const zipPop = (territory.zips || []).reduce((sum, z) => sum + (Number(z.pop) || 0), 0);
    const zipHouses = (territory.zips || []).reduce((sum, z) => sum + (Number(z.standAloneHouses) || 0), 0);

    return {
      population: countyPop + zipPop,
      standAloneHouses: countyHouses + zipHouses,
      zipCount: territory.zips?.length || 0,
      countyCount: territory.counties.length,
    };
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <div style={{
        width: "320px",
        background: "#f8fafc",
        padding: "20px",
        overflowY: "auto",
        borderRight: "1px solid #e5e7eb",
        flexShrink: 0,
        zIndex: 1000,
      }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
          Territory Manager
        </h2>

        <button
          onClick={createNewTerritory}
          style={{
            width: "100%",
            padding: "12px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            marginBottom: "1.5rem",
            cursor: "pointer",
          }}
        >
          Create New Territory
        </button>

        <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem" }}>
          Territories ({territories.length})
        </h3>

        {territories.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            No territories yet. Create one and click "Add Areas" to start!
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {territories.map((territory) => {
              const stats = getTerritoryStats(territory);

              return (
                <li
                  key={territory.id}
                  onClick={(e) => handleSidebarTerritoryClick(territory, e)}
                  style={{
                    padding: "10px",
                    background: activeTerritoryId === territory.id ? "#dbeafe" : "#f1f5f9",
                    borderRadius: "6px",
                    marginBottom: "8px",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    border: activeTerritoryId === territory.id ? "2px solid #3b82f6" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: territory.color, fontSize: "1.2rem" }}>●</span>
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => renameTerritory(territory.id, e.target.innerText.trim() || territory.name)}
                        style={{
                          cursor: "pointer",
                          minWidth: "100px",
                          outline: "none",
                          fontWeight: activeTerritoryId === territory.id ? "bold" : "normal",
                        }}
                      >
                        {territory.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTerritory(territory.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#4b5563" }}>
                    <div>Pop: {stats.population.toLocaleString()}</div>
                    <div>Houses: {stats.standAloneHouses.toLocaleString()}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "4px" }}>
                      Zipcodes: {stats.zipCount} | Counties: {stats.countyCount}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAddMode(territory.id);
                      }}
                      style={{
                        padding: "4px 8px",
                        background: addModeTerritoryId === territory.id ? "#10b981" : "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      {addModeTerritoryId === territory.id ? "Save Territory" : "Add Areas"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Boundary Display
          </h3>
          <select
            value={boundaryMode}
            onChange={(e) => setBoundaryMode(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "white",
              fontSize: "0.95rem",
            }}
          >
            <option value="counties">County lines only</option>
            <option value="zips">Zipcode lines only</option>
            <option value="both">Both</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>

      <div style={{ height: "100%", width: "100%", position: "relative", flex: 1 }}>
        <div style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "420px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
          overflow: "hidden",
          border: "1px solid #dadce0",
        }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 16px" }}>
            <Search size={20} color="#5f6368" style={{ marginRight: "12px" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, state, or ZIP"
              style={{
                flex: 1,
                padding: "14px 0",
                border: "none",
                fontSize: "1rem",
                outline: "none",
                background: "transparent",
              }}
            />
          </div>

          {suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              style={{
                listStyle: "none",
                margin: 0,
                padding: "8px 0",
                maxHeight: "280px",
                overflowY: "auto",
                background: "white",
                borderTop: "1px solid #dadce0",
                borderBottomLeftRadius: "12px",
                borderBottomRightRadius: "12px",
              }}
            >
              {suggestions.map((p, i) => (
                <li
                  key={i}
                  onClick={() => handleSelectPlace(p)}
                  style={{
                    padding: "12px 20px",
                    cursor: "pointer",
                    background: i === selectedSuggestionIndex ? "#e8f0fe" : (searchQuery === p.display_name ? "#e8f0fe" : "transparent"),
                    transition: "background 0.15s ease",
                    borderBottom: i < suggestions.length - 1 ? "1px solid #f0f0f0" : "none",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    color: "#202124",
                  }}
                  onMouseEnter={() => setSelectedSuggestionIndex(i)}
                  onMouseLeave={() => setSelectedSuggestionIndex(-1)}
                >
                  {p.display_name}
                  {p.isLocal && p.isState && (
                    <span style={{ fontSize: "0.8rem", color: "#5f6368", marginLeft: "8px" }}>(State)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <MapContainerComponent
          territories={territories}
          activeTerritoryId={activeTerritoryId}
          addModeTerritoryId={addModeTerritoryId}
          addCountyToActiveTerritory={addCountyToActiveTerritory}
          addZipToActiveTerritory={addZipToActiveTerritory}
          selectedTerritoryId={selectedTerritoryId}
          setSelectedTerritoryId={setSelectedTerritoryId}
          clearTooltip={clearTooltip}
          setClearPopup={setClearPopup}
          selectedLocation={selectedLocation}
          selectedTerritory={selectedTerritory}
          boundaryMode={boundaryMode}
          countyBoundaries={countyBoundaries}
        />

        {selectedTerritory && (
          <TerritoryTooltip
            territory={selectedTerritory}
            onClose={clearTooltip}
          />
        )}
      </div>
    </div>
  );
}

export default MapPage;