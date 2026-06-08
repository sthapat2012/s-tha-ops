export interface Project {
  id: number;
  name: string;
  description: string | null;
  cover_image: string | null;
  status: "active" | "completed";
  progress: number;
  lat: number | null;
  lng: number | null;
  geofence_radius: number;
  due_date: string | null;
  delivered_date: string | null;
  created_at: string;
}

export interface Phase {
  id: number;
  project_id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: "done" | "in_progress" | "pending";
  progress: number;
  order_index: number;
}

export interface UpdateItem {
  id: number;
  project_id: number;
  user_id: number;
  text: string | null;
  image_path: string | null;
  created_at: string;
  author?: string;
}

export interface DocumentItem {
  id: number;
  project_id: number;
  name: string;
  file_path: string;
  kind: string | null;
  uploaded_by: number | null;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  project_id: number | null;
  kind: "in" | "out";
  lat: number;
  lng: number;
  accuracy: number | null;
  place_name: string | null;
  photo_path: string | null;
  within_geofence: number | null;
  distance_m: number | null;
  created_at: string;
  project_name?: string;
  user_name?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  image_path: string | null;
  created_at: string;
}
