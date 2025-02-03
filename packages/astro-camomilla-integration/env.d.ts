/// <reference types="astro/client" />

import { CamomillaHandler } from "./src/types/camomillaHandler";

declare namespace App {
  interface Locals {
    camomilla: CamomillaHandler;
  }
}
