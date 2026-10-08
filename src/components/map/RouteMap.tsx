"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "@/contexts/ThemeContext";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export interface LatLng {
  lat: number;
  lng: number;
}

export type RouteStage = "to_pickup" | "to_dropoff";

interface RouteMapProps {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  courierLocation?: LatLng | null;
  /** Which stop the courier is heading to. Defaults to the drop-off. */
  stage?: RouteStage;
  className?: string;
}

type Pt = [number, number];

const ORANGE = "#FF7A1A";
const ROUTE_SRC = "courier-route";
const FOLLOW_ZOOM = 16.5;
const FOLLOW_PITCH = 60;

function styleFor(theme: string): string {
  return theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12";
}

function distM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLng = rad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function angleDiff(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function buildMotorcycleEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:48px;height:48px;pointer-events:none;";
  el.innerHTML =
    '<svg viewBox="0 0 48 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="24" cy="24" r="22" fill="rgba(255,122,26,0.18)"/>' +
    '<rect x="22" y="4" width="4" height="12" rx="2" fill="#1a1a1a"/>' +
    '<rect x="21.5" y="30" width="5" height="14" rx="2.5" fill="#1a1a1a"/>' +
    '<ellipse cx="24" cy="23" rx="6.5" ry="12" fill="#FF7A1A" stroke="#ffffff" stroke-width="1.5"/>' +
    '<rect x="13" y="13" width="22" height="3" rx="1.5" fill="#ffffff"/>' +
    '<circle cx="24" cy="25" r="5" fill="#222222" stroke="#ffffff" stroke-width="1.5"/>' +
    '<circle cx="24" cy="7" r="1.8" fill="#ffd27a"/>' +
    "</svg>";
  return el;
}

function buildRingEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "width:44px;height:44px;position:relative;pointer-events:none;";
  el.innerHTML = '<span class="rm-ring"></span><span class="rm-ring" style="animation-delay:.9s"></span>';
  return el;
}

function setLine(map: mapboxgl.Map, coords: Pt[]) {
  try {
    const src = map.getSource(ROUTE_SRC) as mapboxgl.GeoJSONSource | undefined;
    src?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: coords.length > 1 ? coords : [] },
    } as any);
  } catch {
    // style not ready yet
  }
}

function ensureLayers(map: mapboxgl.Map, theme: string) {
  try {
    if (!map.getLayer("3d-buildings") && map.getSource("composite")) {
      const layers = map.getStyle().layers ?? [];
      const labelLayer = layers.find((l) => l.type === "symbol" && (l.layout as any)?.["text-field"]);
      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": theme === "dark" ? "#232a3a" : "#d7dbe2",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.85,
          },
        } as any,
        labelLayer?.id
      );
    }
    if (!map.getSource(ROUTE_SRC)) {
      map.addSource(ROUTE_SRC, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      } as any);
      map.addLayer({
        id: "courier-route-glow",
        type: "line",
        source: ROUTE_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ORANGE, "line-width": 12, "line-opacity": 0.25, "line-blur": 6 },
      } as any);
      map.addLayer({
        id: "courier-route-line",
        type: "line",
        source: ROUTE_SRC,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ORANGE, "line-width": 5, "line-opacity": 1 },
      } as any);
    }
  } catch {
    // layers are a visual extra, never break the map
  }
}

interface Anim {
  pos: LatLng | null;
  from: LatLng;
  to: LatLng;
  start: number;
  dur: number;
  heading: number;
  targetHeading: number;
  lastUpdateAt: number;
  raf: number;
  lastLineAt: number;
  camReadyAt: number;
}

export default function RouteMap({ pickup, dropoff, courierLocation, stage = "to_dropoff", className }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const courierMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const ringMarkerRef = useRef<mapboxgl.Marker | null>(null);
  // mapbox-gl throws if .remove() runs before the style has loaded (React Strict Mode
  // double mount in dev), so cleanup waits for 'load' when needed.
  const loadedRef = useRef(false);
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const target = stage === "to_pickup" ? pickup ?? null : dropoff ?? null;
  const targetRef = useRef<LatLng | null>(target);
  targetRef.current = target;
  const tLat = target?.lat;
  const tLng = target?.lng;

  const followRef = useRef(true);
  const hasCourierRef = useRef(false);
  const [showRecenter, setShowRecenter] = useState(false);

  const routeCoordsRef = useRef<Pt[] | null>(null);
  const routeKeyRef = useRef("");
  const routeIdxRef = useRef(0);
  const routeFetchAtRef = useRef(0);

  const animRef = useRef<Anim>({
    pos: null,
    from: { lat: 0, lng: 0 },
    to: { lat: 0, lng: 0 },
    start: 0,
    dur: 1,
    heading: 0,
    targetHeading: 0,
    lastUpdateAt: 0,
    raf: 0,
    lastLineAt: 0,
    camReadyAt: 0,
  });

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleFor(theme),
      center: [3.3792, 6.5244], // Lagos fallback
      zoom: 11,
    });

    loadedRef.current = false;
    map.once("load", () => {
      loadedRef.current = true;
    });
    // Runs on first load and again after every style swap (theme change),
    // because a new style wipes custom layers.
    map.on("style.load", () => ensureLayers(map, themeRef.current));

    // Any manual gesture pauses following until the customer taps "Follow courier".
    const pause = (e: any) => {
      if (e?.originalEvent && hasCourierRef.current && followRef.current) {
        followRef.current = false;
        setShowRecenter(true);
      }
    };
    map.on("dragstart", pause);
    map.on("rotatestart", pause);
    map.on("pitchstart", pause);
    map.on("zoomstart", pause);

    mapRef.current = map;

    return () => {
      const current = mapRef.current;
      cancelAnimationFrame(animRef.current.raf);
      animRef.current.raf = 0;
      animRef.current.pos = null;
      hasCourierRef.current = false;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      courierMarkerRef.current = null;
      ringMarkerRef.current = null;
      routeCoordsRef.current = null;
      routeKeyRef.current = "";

      if (!current) return;
      const safeRemove = () => {
        try {
          current.remove();
        } catch {
          // already torn down
        }
      };
      if (loadedRef.current) {
        safeRemove();
      } else {
        current.once("load", safeRemove);
        current.once("error", safeRemove);
      }
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap style when theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(styleFor(theme));
  }, [theme]);

  // Pickup marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!pickup) {
      pickupMarkerRef.current?.remove();
      pickupMarkerRef.current = null;
      return;
    }
    if (!pickupMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "h-4 w-4 rounded-full border-2 border-white bg-emerald-500 shadow";
      pickupMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([pickup.lng, pickup.lat])
        .addTo(mapRef.current);
    } else {
      pickupMarkerRef.current.setLngLat([pickup.lng, pickup.lat]);
    }
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng]);

  // Dropoff marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!dropoff) {
      dropoffMarkerRef.current?.remove();
      dropoffMarkerRef.current = null;
      return;
    }
    if (!dropoffMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "h-4 w-4 rounded-full border-2 border-white bg-brand-accent shadow";
      dropoffMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([dropoff.lng, dropoff.lat])
        .addTo(mapRef.current);
    } else {
      dropoffMarkerRef.current.setLngLat([dropoff.lng, dropoff.lat]);
    }
    fitToMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropoff?.lat, dropoff?.lng]);

  // Pulsing ring on the stop the courier is heading to
  const hasCourier = !!courierLocation;
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hasCourier || tLat == null || tLng == null) {
      ringMarkerRef.current?.remove();
      ringMarkerRef.current = null;
      return;
    }
    if (!ringMarkerRef.current) {
      ringMarkerRef.current = new mapboxgl.Marker({
        element: buildRingEl(),
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat([tLng, tLat])
        .addTo(map);
    } else {
      ringMarkerRef.current.setLngLat([tLng, tLat]);
    }
  }, [hasCourier, tLat, tLng]);

  // Courier: smooth movement, heading, and camera follow
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const a = animRef.current;

    if (!courierLocation) {
      if (courierMarkerRef.current) stopCourier(map);
      return;
    }

    const now = performance.now();
    if (!a.pos) {
      a.pos = courierLocation;
      a.from = courierLocation;
      a.to = courierLocation;
      a.start = now;
      a.dur = 1;
      a.heading = targetRef.current ? bearingDeg(courierLocation, targetRef.current) : 0;
      a.targetHeading = a.heading;
      a.lastUpdateAt = now;
      a.camReadyAt = now + 1400;
      hasCourierRef.current = true;
      followRef.current = true;
      setShowRecenter(false);

      courierMarkerRef.current = new mapboxgl.Marker({
        element: buildMotorcycleEl(),
        pitchAlignment: "map",
        rotationAlignment: "map",
      })
        .setLngLat([courierLocation.lng, courierLocation.lat])
        .setRotation(a.heading)
        .addTo(map);

      map.easeTo({
        center: [courierLocation.lng, courierLocation.lat],
        zoom: FOLLOW_ZOOM,
        pitch: FOLLOW_PITCH,
        bearing: a.heading,
        duration: 1200,
      });
      a.raf = requestAnimationFrame(tick);
    } else {
      if (distM(a.to, courierLocation) < 1) return;
      a.from = a.pos;
      a.to = courierLocation;
      const gap = now - a.lastUpdateAt;
      a.dur = Math.min(8000, Math.max(1500, gap));
      a.start = now;
      a.lastUpdateAt = now;
      if (distM(a.from, a.to) > 3) a.targetHeading = bearingDeg(a.from, a.to);
      if (!a.raf) a.raf = requestAnimationFrame(tick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierLocation?.lat, courierLocation?.lng]);

  // Route from the courier to the next stop
  useEffect(() => {
    if (!courierLocation || tLat == null || tLng == null) return;
    const key = `${stage}:${tLat.toFixed(5)},${tLng.toFixed(5)}`;
    const dest: LatLng = { lat: tLat, lng: tLng };
    const throttled = Date.now() - routeFetchAtRef.current > 8000;
    let need = false;

    if (routeKeyRef.current !== key) {
      routeKeyRef.current = key;
      routeCoordsRef.current = null;
      routeIdxRef.current = 0;
      need = true;
    } else if (!routeCoordsRef.current) {
      need = throttled;
    } else {
      // Redraw the route if the courier has left it
      let min = Infinity;
      for (const c of routeCoordsRef.current) {
        const d = distM(courierLocation, { lng: c[0], lat: c[1] });
        if (d < min) min = d;
      }
      if (min > 150) need = throttled;
    }

    if (need) void fetchRoute(courierLocation, dest, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courierLocation?.lat, courierLocation?.lng, tLat, tLng, stage]);

  async function fetchRoute(from: LatLng, to: LatLng, key: string) {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    routeFetchAtRef.current = Date.now();
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${token}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const coords = data?.routes?.[0]?.geometry?.coordinates as Pt[] | undefined;
      if (Array.isArray(coords) && coords.length > 1 && routeKeyRef.current === key) {
        routeCoordsRef.current = coords;
        routeIdxRef.current = 0;
      }
    } catch {
      // keep the straight line until the next try
    }
  }

  function updateLine(map: mapboxgl.Map, pos: LatLng) {
    const tgt = targetRef.current;
    if (!tgt) {
      setLine(map, []);
      return;
    }
    const coords = routeCoordsRef.current;
    if (coords && coords.length > 1) {
      let i = routeIdxRef.current;
      const d = (p: Pt) => distM(pos, { lng: p[0], lat: p[1] });
      while (i < coords.length - 1 && d(coords[i + 1]) <= d(coords[i])) i++;
      routeIdxRef.current = i;
      setLine(map, [[pos.lng, pos.lat], ...coords.slice(i + 1)]);
    } else {
      setLine(map, [
        [pos.lng, pos.lat],
        [tgt.lng, tgt.lat],
      ]);
    }
  }

  function tick() {
    const a = animRef.current;
    const map = mapRef.current;
    const marker = courierMarkerRef.current;
    if (!a.pos || !map || !marker) {
      a.raf = 0;
      return;
    }
    const now = performance.now();
    const t = Math.min(1, (now - a.start) / a.dur);
    const pos: LatLng = {
      lat: a.from.lat + (a.to.lat - a.from.lat) * t,
      lng: a.from.lng + (a.to.lng - a.from.lng) * t,
    };
    a.pos = pos;
    a.heading = (a.heading + angleDiff(a.heading, a.targetHeading) * 0.08 + 360) % 360;

    marker.setLngLat([pos.lng, pos.lat]);
    marker.setRotation(a.heading);

    if (followRef.current && now > a.camReadyAt) {
      map.jumpTo({ center: [pos.lng, pos.lat], bearing: a.heading });
    }
    if (now - a.lastLineAt > 100) {
      a.lastLineAt = now;
      updateLine(map, pos);
    }
    a.raf = requestAnimationFrame(tick);
  }

  function stopCourier(map: mapboxgl.Map) {
    const a = animRef.current;
    cancelAnimationFrame(a.raf);
    a.raf = 0;
    a.pos = null;
    hasCourierRef.current = false;
    courierMarkerRef.current?.remove();
    courierMarkerRef.current = null;
    ringMarkerRef.current?.remove();
    ringMarkerRef.current = null;
    routeCoordsRef.current = null;
    routeKeyRef.current = "";
    setLine(map, []);
    followRef.current = true;
    setShowRecenter(false);
    map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    fitToMarkers();
  }

  function recenter() {
    const map = mapRef.current;
    const a = animRef.current;
    if (!map || !a.pos) return;
    followRef.current = true;
    setShowRecenter(false);
    a.camReadyAt = performance.now() + 900;
    map.easeTo({
      center: [a.pos.lng, a.pos.lat],
      zoom: FOLLOW_ZOOM,
      pitch: FOLLOW_PITCH,
      bearing: a.heading,
      duration: 800,
    });
  }

  function fitToMarkers() {
    if (!mapRef.current) return;
    // While a courier is being followed, the camera belongs to the tracker.
    if (hasCourierRef.current) return;
    const points: [number, number][] = [];
    if (pickup) points.push([pickup.lng, pickup.lat]);
    if (dropoff) points.push([dropoff.lng, dropoff.lat]);
    if (points.length === 0) return;
    if (points.length === 1) {
      mapRef.current.flyTo({ center: points[0], zoom: 14 });
      return;
    }
    const bounds = points.reduce(
      (b, p) => b.extend(p),
      new mapboxgl.LngLatBounds(points[0], points[0])
    );
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
  }

  return (
    <div className={`relative overflow-hidden ${className ?? "h-64 w-full rounded-2xl"}`}>
      <div ref={containerRef} className="h-full w-full" />
      {showRecenter && (
        <button
          type="button"
          onClick={recenter}
          aria-label="Follow courier"
          className="absolute bottom-3 left-3 z-10 rounded-full bg-brand-accent px-3 py-1.5 text-xs font-bold text-white shadow-lg"
        >
          Follow courier
        </button>
      )}
      <style jsx global>{`
        .rm-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid #ff7a1a;
          opacity: 0;
          animation: rm-ring 1.8s ease-out infinite;
        }
        @keyframes rm-ring {
          0% {
            transform: scale(0.3);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}