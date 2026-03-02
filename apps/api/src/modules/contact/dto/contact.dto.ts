import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength
} from 'class-validator';

export class ContactDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    orderNumber?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    subject!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    @MaxLength(1000)
    message!: string;
}