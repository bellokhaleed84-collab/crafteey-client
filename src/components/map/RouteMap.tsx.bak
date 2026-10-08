"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "@/contexts/ThemeContext";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export interface LatLng {
  lat: number;
  lng: number;
}

interface RouteMapProps {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  courierLocation?: LatLng | null;
  className?: string;
}

export default function RouteMap({ pickup, dropoff, courierLocation, className }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const courierMarkerRef = useRef<mapboxgl.Marker | null>(null);
  // Tracks whether the current mapRef.current has actually fired 'load'.
  // mapbox-gl-js throws internally (the applyProjectionUpdate crash) if
  // .remove() is called before the style has finished loading, which is
  // exactly what happens during React Strict Mode's dev-only double
  // mount/unmount/mount cycle. This flag lets cleanup defer removal
  // until it's actually safe.
  const loadedRef = useRef(false);
  const { theme } = useTheme();

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style:
        theme === "dark"
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/streets-v12",
      center: [3.3792, 6.5244], // Lagos fallback
      zoom: 11,
    });

    loadedRef.current = false;
    map.once("load", () => {
      loadedRef.current = true;
    });

    mapRef.current = map;

    return () => {
      const current = mapRef.current;
      if (!current) return;

      const safeRemove = () => {
        try {
          current.remove();
        } catch {
          // Already torn down or mid-teardown from a prior cycle — ignore.
        }
      };

      if (loadedRef.current) {
        safeRemove();
      } else {
        // Style hasn't finished loading yet (common during Strict Mode's
        // dev-only double-invoke). Defer removal until it has, instead of
        // tearing down mid-init.
        current.once("load", safeRemove);
        // Belt-and-braces: if 'load' never fires (e.g. network failure),
        // don't leak the listener/instance forever.
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
    mapRef.current.setStyle(
      theme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"
    );
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

  // Live courier marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (!courierLocation) {
      courierMarkerRef.current?.remove();
      courierMarkerRef.current = null;
      return;
    }
    if (!courierMarkerRef.current) {
      const el = document.createElement("div");
      el.className =
        "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-base shadow-lg";
      el.textContent = "🏍️";
      courierMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([courierLocation.lng, courierLocation.lat])
        .addTo(mapRef.current);
    } else {
      courierMarkerRef.current.setLngLat([courierLocation.lng, courierLocation.lat]);
    }
  }, [courierLocation?.lat, courierLocation?.lng]);

  function fitToMarkers() {
    if (!mapRef.current) return;
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

  return <div ref={containerRef} className={className ?? "h-64 w-full rounded-2xl"} />;
}