import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { ComposeTripResponse } from "@route-composer/contracts";

type Visit = Extract<ComposeTripResponse["dayPlans"][number]["items"][number], { type: "VISIT" }>;

const defaultMapStyle = "https://tiles.openfreemap.org/styles/liberty";
const mapStyleUrl = import.meta.env.VITE_MAP_STYLE_URL ?? defaultMapStyle;

function externalMapUrl(visit: Visit): string {
  const { latitude, longitude } = visit.coordinates;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

export function RouteMap({ visits }: { visits: readonly Visit[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (
      container === null ||
      visits.length === 0 ||
      typeof window.WebGLRenderingContext === "undefined"
    ) {
      setStatus("error");
      return;
    }

    const coordinates = visits.map(
      ({ coordinates: point }) => [point.longitude, point.latitude] as [number, number],
    );
    const firstCoordinate = coordinates[0];
    if (firstCoordinate === undefined) {
      setStatus("error");
      return;
    }
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container,
        style: mapStyleUrl,
        center: firstCoordinate,
        zoom: 12,
      });
    } catch {
      setStatus("error");
      return;
    }
    const fallbackTimer = window.setTimeout(() => setStatus("error"), 4000);

    const handleError = () => setStatus("error");
    const handleLoad = () => {
      window.clearTimeout(fallbackTimer);
      const bounds = coordinates.reduce(
        (current, coordinate) => current.extend(coordinate),
        new maplibregl.LngLatBounds(firstCoordinate, firstCoordinate),
      );

      map.addSource("visit-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
      });
      map.addLayer({
        id: "visit-route-line",
        type: "line",
        source: "visit-route",
        paint: { "line-color": "#b94b32", "line-width": 4, "line-opacity": 0.8 },
      });

      visits.forEach((visit, index) => {
        new maplibregl.Marker({ color: index === 0 ? "#287b73" : "#b94b32" })
          .setLngLat([visit.coordinates.longitude, visit.coordinates.latitude])
          .setPopup(
            new maplibregl.Popup({ offset: 18 }).setText(`${index + 1}. ${visit.displayName}`),
          )
          .addTo(map);
      });

      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
      setStatus("ready");
    };

    map.on("error", handleError);
    map.once("load", handleLoad);

    return () => {
      window.clearTimeout(fallbackTimer);
      map.off("error", handleError);
      map.off("load", handleLoad);
      map.remove();
    };
  }, [visits]);

  return (
    <div className="map-frame">
      <div
        ref={containerRef}
        className={`map-canvas${status === "error" ? " map-canvas-hidden" : ""}`}
        aria-label="방문 장소 순서 지도"
      />
      {status === "loading" && (
        <p className="map-status" role="status">
          지도를 불러오는 중입니다.
        </p>
      )}
      {status === "error" && (
        <div className="map-fallback" role="status">
          <strong>지도를 불러오지 못해 텍스트 일정으로 표시합니다.</strong>
          <span>장소 순서와 외부 지도 링크는 계속 사용할 수 있습니다.</span>
        </div>
      )}
      <p className="map-attribution">
        지도 데이터: ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
        </a>{" "}
        (ODbL)
      </p>
      <ol className="map-place-list" aria-label="방문 장소 순서">
        {visits.map((visit) => (
          <li key={visit.visitId}>
            <span>{visit.displayName}</span>
            <a href={externalMapUrl(visit)} target="_blank" rel="noopener noreferrer">
              지도에서 장소 확인
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
