export type UserRole = 'student' | 'tutor' | 'admin';

export type SessionStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type VerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'approved'
  | 'rejected';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TutorProfile {
  id: string;
  user_id: string;
  subjects: string[];
  hourly_rate: number;
  rating: number;
  verified: boolean;
  verified_at?: string | null;
  bio?: string | null;
  education_background?: string | null;
  teaching_style?: string | null;
  total_sessions: number;
  completed_sessions: number;
  experience_years: number;
  languages: string[];
  // Verification fields
  verification_documents?: string[] | null;   // stored as storage paths (not public URLs)
  verification_status: VerificationStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;                // admin user_id
  reviewed_at?: string | null;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  preferred_subjects?: string[] | null;
  learning_goals?: string | null;
  grade_level?: string | null;
  created_at: string;
}

export interface TutorWithProfile {
  id: string;
  userId: string;
  subjects: string[];
  hourlyRate: number;
  rating: number;
  verified: boolean;
  bio?: string | null;
  totalSessions: number;
  profile: {
    fullName: string;
    avatarUrl?: string | null;
    email?: string;
  };
}

export interface Session {
  id: string;
  tutor_id: string;
  student_id: string;
  subject: string;
  title?: string | null;
  description?: string | null;
  scheduled_start_time: string;
  scheduled_end_time: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  duration_minutes?: number;
  status: SessionStatus;
  price: number;
  currency: string;
  session_notes?: string | null;
  student_notes?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  // Joined relations
  tutor?: {
    full_name: string;
    avatar_url?: string | null;
    tutor_profiles?: TutorProfile;
  };
  student?: {
    full_name: string;
    avatar_url?: string | null;
  };
  review?: Review | null;
}

export interface Review {
  id: string;
  session_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  reviewer?: {
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  session_id?: string | null;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  uploader_id: string;
  title: string;
  description?: string | null;
  file_url: string;
  file_type?: string | null;
  file_size_bytes?: number | null;
  subject?: string | null;
  tags?: string[] | null;
  is_public: boolean;
  download_count: number;
  created_at: string;
  uploader?: {
    full_name: string;
    avatar_url?: string | null;
    role: UserRole;
  };
}

export interface AdminStats {
  totalStudents: number;
  totalTutors: number;
  verifiedTutors: number;
  totalSessions: number;
  pendingVerifications: number;
}

// Used in the admin verification queue
export interface PendingTutor {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  submittedAt: string;
  verificationDocuments: string[]; // storage paths — fetch signed URLs when displaying
  bio?: string | null;
  subjects: string[];
  educationBackground?: string | null;
  experienceYears: number;
}