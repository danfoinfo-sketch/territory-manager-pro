import React, { useState } from "react";
import MapContainerComponent from "../components/map/MapContainer";
import countyBoundaries from "../data/us_counties.json";

console.log("County data loaded in MapPage:", countyBoundaries);
console.log("Type of data:", countyBoundaries?.type);
console.log("Number of counties:", countyBoundaries?.features?.length || "No features");

const TERRITORY_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#f43f5e", "#22c55e", "#3b82f6", "#a855f7",
];

function MapPage() {
  const [territories, setTerritories] = useState([]);
  const [territoryCounter, setTerritoryCounter] = useState(1);
  const [activeTerritoryId, setActiveTerritoryId] = useState(null);
  const [addModeTerritoryId, setAddModeTerritoryId] = useState(null);

  const createNewTerritory = () => {
    const name = `Territory ${territoryCounter}`;
    const newTerritory = {
      id: Date.now().toString(),
      name,
      color: TERRITORY_COLORS[territories.length % TERRITORY_COLORS.length],
      population: 0,
      counties: [],
    };
    setTerritories((prev) => [...prev, newTerritory]);
    setActiveTerritoryId(newTerritory.id);
    setAddModeTerritoryId(newTerritory.id); // auto-enable add mode
    setTerritoryCounter((prev) => prev + 1);
  };

  const deleteTerritory = (id) => {
    setTerritories((prev) => prev.filter((t) => t.id !== id));
    if (activeTerritoryId === id) setActiveTerritoryId(null);
    if (addModeTerritoryId === id) setAddModeTerritoryId(null);
  };

  const renameTerritory = (id, newName) => {
    setTerritories((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName.trim() || t.name } : t))
    );
  };

  const selectTerritory = (id) => {
    setActiveTerritoryId(id);
  };

  const toggleAddMode = (id) => {
    setAddModeTerritoryId((prev) => (prev === id ? null : id));
  };

  const addCountyToActiveTerritory = (fips, population, countyName) => {
    if (!addModeTerritoryId) return;

    setTerritories((prev) =>
      prev.map((territory) => {
        if (territory.id !== addModeTerritoryId) return territory;

        const existing = territory.counties.find((c) => c.fips === fips);
        if (existing) {
          // Remove
          const newCounties = territory.counties.filter((c) => c.fips !== fips);
          const newPop = territory.population - population;
          return { ...territory, counties: newCounties, population: newPop };
        } else {
          // Add
          const newCounties = [...territory.counties, { fips, pop: population, name: countyName }];
          const newPop = territory.population + population;
          return { ...territory, counties: newCounties, population: newPop };
        }
      })
    );
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      {/* Sidebar - Territory Manager */}
      <div
        style={{
          width: "320px",
          minWidth: "320px",
          background: "#f8fafc",
          padding: "20px",
          overflowY: "auto",
          borderRight: "1px solid #e5e7eb",
          flexShrink: 0,
        }}
      >
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
            No territories yet. Create one and enable add mode to start!
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {territories.map((territory) => (
              <li
                key={territory.id}
                onClick={() => selectTerritory(territory.id)}
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

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                  <span style={{ fontSize: "0.9rem", color: "#4b5563" }}>
                    Pop: {territory.population.toLocaleString()}
                  </span>

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
                    {addModeTerritoryId === territory.id ? "Save Territory" : "Add Counties"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapContainerComponent
          territories={territories}
          countyBoundaries={countyBoundaries}
          activeTerritoryId={activeTerritoryId}
          addModeTerritoryId={addModeTerritoryId}
          addCountyToActiveTerritory={addCountyToActiveTerritory}
        />
      </div>
    </div>
  );
}

export default MapPage;