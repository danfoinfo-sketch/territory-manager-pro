import React, { useState, useRef, useEffect } from "react";

export default function TerritoryTooltip({ territory, onClose }) {
  const [position, setPosition] = useState({ x: 20, y: 100 }); // initial position
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Use the territory's color for the header (fallback to pink if missing)
  const headerColor = territory?.color || "#ec4899"; // default pink

  const handleMouseDown = (e) => {
    if (e.target.closest(".drag-handle")) {
      setIsDragging(true);
      startPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      e.preventDefault(); // prevent text selection
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - startPos.current.x;
      const newY = e.clientY - startPos.current.y;

      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 400;

      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 1001,
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        width: "320px",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Draggable header with territory color */}
      <div
        className="drag-handle"
        onMouseDown={handleMouseDown}
        style={{
          background: headerColor, // ← uses territory.color
          color: "white",
          padding: "12px 16px",
          fontWeight: "600",
          fontSize: "1.1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "move",
        }}
      >
        <span>{territory.name || "Territory"}</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 12px", fontWeight: "600" }}>
          Total Population: {territory.population.toLocaleString()}
        </p>
        <p style={{ margin: "0 0 8px", fontWeight: "500" }}>
          Counties ({territory.counties.length}):
        </p>
        <ul style={{ margin: 0, paddingLeft: "20px", listStyleType: "disc" }}>
          {territory.counties.map((c, idx) => (
            <li key={idx} style={{ marginBottom: "4px" }}>
              {c.name || `County ${c.fips}`} — {c.pop.toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}