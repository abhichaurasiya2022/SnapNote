
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}
