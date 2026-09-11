export type MaterialStatus = 'pending' | 'approved' | 'rejected';

export type Material = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  web_url: string;
  storage_path: string | null;
  file_name: string | null;
  review_status: MaterialStatus;
  uploaded_by: string;
  created_at: string;
  file_type?: string | null;
  file_size?: number | null;
};

export type MaterialWithCourse = Material & {
  courses?: { id: string; name: string } | null;
};

export type Course = {
  id: string;
  name: string;
  year: number;
  semester: number;
  created_at: string;
  materials_count?: number;
};

export const STATUS_LABELS: Record<MaterialStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export type AdminUser = {
  id: string;
  email: string;
  role: 'STUDENT' | 'ADMIN';
  created_at: string;
};

