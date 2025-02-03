import type { AstroInstance } from 'astro';
import type { CamomillaPage } from './camomillaPage.ts';

export interface CamomillaHandler {
  response: Response | null;
  page: CamomillaPage | null;
  Template?: AstroInstance | null;
  error: object | null;
}