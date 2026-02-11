
export interface TimeEntry {
  id: string;
  description: string;
  project: string;
  date: Date;
  startTime: string;
  endTime: string;
  billable?: boolean;
  invoiced?: boolean;
}

export interface License {
  id: string;
  name: string;
  price: number;
  project: string; // Project ID
  client: string;  // Client Name (denormalized for convenience)
  date: Date;
  invoiced: boolean;
  notes?: string;
}

export interface Server {
  id: string;
  name: string;
  price: number;
  project: string; // Project ID
  client: string;  // Client Name
  date: Date;
  invoiced: boolean;
  notes?: string;
}

export interface Domain {
  id: string;
  name: string;
  price: number;
  project: string; // Project ID
  client: string;  // Client Name
  date: Date;
  invoiced: boolean;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  client?: string;
  color: string;
  active?: boolean;
  rate?: number;
}

export interface Client {
  id: string;
  name: string;
  color?: string;
}

export interface AppSettings {
  currency: string;
  currencyLocale: string; // e.g. 'en-US', 'fr-FR'
}

export enum ModalType {
  NONE,
  EDIT_ENTRY
}

export type UserRole = 'admin' | 'user';

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface RefundRequest {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  createdAt: Date;
}