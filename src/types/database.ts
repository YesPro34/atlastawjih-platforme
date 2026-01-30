export type AppRole = 'admin' | 'adherent';

export type ApplicationStatus = 'en_attente' | 'en_cours' | 'validee' | 'preselectionne' | 'admis' | 'refuse';

export type BacOption = 'PC' | 'SVT' | 'SMA' | 'SMB' | 'ECO' | 'SGC' | 'STE' | 'STM' | 'LET' | 'SH'
export interface Profile {
  id: string;
  user_id: string;
  massar_code: string | null;
  // Added for Admin "statut" management.
  // This is not part of the original Lovable schema; we add it via a migration.
  is_active?: boolean;
  // Extra fields used by the admin creation/edit flow.
  email?: string | null;
  parent_phone?: string | null;
  birth_date?: string | null; // ISO date (YYYY-MM-DD)
  username?: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  city: string | null;
  lycee: string | null;
  bac_year: number | null;
  bac_option: BacOption | null;
  bac_grade: number | null;
  regional_grade: number | null;
  national_grade: number | null;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  is_active: boolean;
  allowed_bac_options: BacOption[];
  created_at: string;
  updated_at: string;
}

export interface FormConfig {
  id: string;
  school_id: string;
  config: Record<string, unknown>;
  max_choices: number | null;
  cities: string[];
  filieres: unknown[];
  rules: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  school_id: string;
  status: ApplicationStatus;
  form_data: Record<string, unknown>;
  note: string | null;
  admin_note: string | null;
  submitted_at: string;
  updated_at: string;
  school?: School;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  admin_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface SchoolRefusal {
  id: string;
  user_id: string;
  school_id: string;
  created_at: string;
}

export const BAC_OPTIONS: { value: BacOption; label: string }[] = [
  { value: 'PC', label: 'Sciences Physiques' },
  { value: 'SVT', label: 'Sciences de la Vie et de la Terre' },
  { value: 'SMA', label: 'Sciences Mathématiques A' },
  { value: 'SMB', label: 'Sciences Mathématiques B' },
  { value: 'ECO', label: 'Sciences Économiques' },
  { value: 'SGC', label: 'Sciences de Gestion Comptable' },
  { value: 'STE', label: 'Sciences Technologiques Electriques' },
  { value: 'STM', label: 'Sciences Technologiques Mécaniques' },
  { value: 'LET', label: 'Lettres' },
  { value: 'SH', label: 'Sciences Humaines' },
];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  validee: 'Validée',
  preselectionne: 'Présélectionné',
  admis: 'Admis',
  refuse: 'Refusé',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  en_attente: 'status-en_attente',
  en_cours: 'status-en_cours',
  validee: 'status-validee',
  preselectionne: 'status-preselectionne',
  admis: 'status-admis',
  refuse: 'status-refuse',
};
