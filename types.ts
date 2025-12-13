export interface WeekStatus {
  paid: boolean;
}

export interface Participant {
  id: string;
  name: string;
  whatsapp: string;
  weeks: [boolean, boolean, boolean, boolean, boolean]; // Fixed 5 weeks for simplicity
}

export interface Stats {
  totalParticipants: number;
  totalPaid: number;
  totalPending: number;
  revenuePotential: number; // Assuming a standard value, or just %
}

export type SortField = 'name' | 'whatsapp' | 'status';
export type SortOrder = 'asc' | 'desc';