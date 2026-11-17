import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  subdomain!: string;
}

export class RegisterDto {
  @IsString()
  dealership_name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsString()
  admin_first_name!: string;

  @IsString()
  admin_last_name!: string;

  @IsEmail()
  admin_email!: string;

  @IsString()
  @MinLength(8)
  admin_password!: string;

  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @IsString()
  plan!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  new_password!: string;
}
