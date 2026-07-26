export interface User {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  role: "USER" | "ADMIN";
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
}
