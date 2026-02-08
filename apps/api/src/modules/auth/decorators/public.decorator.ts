import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'unprotected';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
