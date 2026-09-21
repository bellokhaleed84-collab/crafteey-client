import type { HubCategory, HubOrderStatus } from "./config";

export interface HubVendorDTO {
  _id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  emoji?: string;
  tagline?: string;
  filterTags?: string[];
  rating?: number;
  reviewCount?: number;
  etaMin?: number;
  etaMax?: number;
  isOpen: boolean;
  categories: HubCategory[];
}

export interface HubProduct {
  _id: string;
  category: HubCategory;
  name: string;
  description?: string;
  imageUrl?: string;
  emoji?: string;
  priceKobo: number;
  unit?: string;
  isAvailable: boolean;
  stock?: number | null;
  vendor: { _id: string; name: string; logoUrl?: string; isOpen: boolean };
}

export interface HubOrderDTO {
  _id: string;
  vendorId: string;
  vendorName: string;
  items: { productId: string; name: string; imageUrl?: string; unitPriceKobo: number; quantity: number }[];
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  status: HubOrderStatus;
  payment: { reference?: string; status: "pending" | "success" | "failed"; paidAt?: string; channel?: string };
  delivery: { address: string; phone?: string; note?: string };
  createdAt: string;
}
