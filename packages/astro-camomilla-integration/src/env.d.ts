/// <reference types="astro/client" />

export interface CamomillaUser extends import('./types/camomillaUser').CamomillaUser {}
export interface CamomillaPage extends import('./types/camomillaPage').CamomillaPage {}

declare global {
  namespace App {
    interface Locals extends Record<string, any> {
      camomilla: import('./types/camomillaHandler').CamomillaHandler;
    }
  }
}
