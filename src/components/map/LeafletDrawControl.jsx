import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";

export default function LeafletDrawControl({ enabled, onDrawCreated }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !map) return;

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Rectangle-only mode
    const drawControl = new L.Control.Draw({
      position: "topleft",
      draw: {
        rectangle: {
          shapeOptions: {
            color: "#6366f1",
            weight: 2,
            fillOpacity: 0.25,
          },
          showArea: true,
        },
        polygon: false,
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);

    const handleCreated = (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const geojson = layer.toGeoJSON();
      console.log("Rectangle created - geojson:", geojson);
      onDrawCreated?.(geojson);
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.removeLayer(drawnItems);
    };
  }, [map, enabled, onDrawCreated]);

  return null;
}