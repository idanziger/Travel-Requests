export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: 'employee' | 'manager' | 'coordinator' | 'admin';
};

export type OptionItem = {
  id: number;
  category: string;
  label: string;
  value: string;
  position: number;
  metadata?: Record<string, unknown>;
};

export type EventItem = {
  id: number;
  name: string;
  location: string;
  event_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type RequestDay = {
  id?: number;
  day_index: number;
  day_date: string;
  morning_role: string;
  evening_role: string;
};

export type TravelRequest = {
  id: number;
  traveler_name: string;
  traveler_email?: string | null;
  event_name: string;
  event_location?: string | null;
  department?: string | null;
  cost_center?: string | null;
  budget?: string | null;
  data_status?: string | null;
  notes?: string | null;
  approver_notes?: string | null;
  request_date: string;
  submitted_at?: string;
  start_date: string;
  end_date: string;
  total_days?: number | null;
  status: string;
  requester_name?: string;
  requester_email?: string;
  days: RequestDay[];
};
