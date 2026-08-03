export interface SafeCategory {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  order: number;
  active: boolean;
  children: SafeCategory[];
}
