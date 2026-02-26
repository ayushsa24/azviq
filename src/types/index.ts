export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  workspace_id?: string;
  is_favourite?: boolean;
  createdAt: Date;
}

export interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
}
