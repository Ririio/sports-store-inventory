export type Product = {
  id: string;
  upc: string | null;
  imageName: string;
  category: string;
  department: string;
  audience: string;
  sport: string;
  size: string;
  color: string;
  brand: string;
  quantity: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemDetails = {
  upc: string | null;
  category: string;
  department: string;
  audience: string;
  sport: string;
  size: string;
  color: string;
  brand: string;
  quantity: number;
  notes: string;
};
