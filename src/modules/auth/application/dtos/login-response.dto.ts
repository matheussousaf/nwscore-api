import { ApiProperty } from '@nestjs/swagger';

export class CompanyInfo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  faction: string | null;

  @ApiProperty({ nullable: true })
  world: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class LoginResponseDto {
  @ApiProperty()
  session_token: string;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    companies: CompanyInfo[];
  };
}
