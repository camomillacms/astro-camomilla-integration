import type { AstroInstance } from 'astro';
import type { CamomillaPage } from './camomillaPage.ts';
import type { CamomillaUser } from './camomillaUser.ts';

export interface CamomillaHandler {
  response: Response | null;
  page: CamomillaPage | null;
  Template: AstroInstance["default"] | null;
  user: CamomillaUser | null;
  error: object | null;
}