export interface FurnitureItem {
  id?: string;
  _id?: string;
  type: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  fw: number;
  fh: number;
  color: string;
  opacity: number;
  rotation: number;
}

export interface Design {
  _id: string;
  name: string;
  client: string;
  roomType: string;
  shape: 'Rectangle' | 'L-Shape' | 'T-Shape';
  roomWidth: number;
  roomLength: number;
  wallColor: string;
  status: 'active' | 'draft' | 'archived';
  designerName: string;
  furniture: FurnitureItem[];
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'designer' | 'admin';
  isActive: boolean;
  designCount: number;
  lastLogin?: string;
  createdAt: string;
}
