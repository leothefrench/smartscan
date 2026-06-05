/**
 * Type declarations for Scanner de Tickets
 */

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number; // total price for this line item
  unitPrice?: number;
  category: ReceiptCategory;
}

export type ReceiptCategory =
  | "Alimentation"
  | "Loisirs & Culture"
  | "Santé & Hygiène"
  | "Mode & Habillement"
  | "Électronique & Maison"
  | "Transport & Carburant"
  | "Services & Factures"
  | "Autre";

export interface Receipt {
  id: string;
  merchant: string;
  date: string; // Purchase date (YYYY-MM-DD or formatted)
  totalAmount: number;
  taxAmount: number;
  currency: string;
  items: ReceiptItem[];
  scannedAt: string; // ISO string when user scanned it
  imageUrl?: string; // local preview base64
  rawResponse?: string; // analytical notes or insights about the purchases
}

export interface ScanningStats {
  totalSpent: number;
  receiptCount: number;
  categoryDistribution: Record<ReceiptCategory, number>;
  monthlyTrend: { month: string; amount: number }[];
}
