export interface CompanyInfo {
  id: string;
  name: string;
  faction: string | null;
  world: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponseDto {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    companies: CompanyInfo[];
  };
}
