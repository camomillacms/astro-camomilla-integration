export type CamomillaMediaRenditionFormat = 'webp' | 'avif' | 'jpeg' | 'png' | 'original' | string

export interface CamomillaMediaRendition {
  url: string
  width: number
  height: number
  format: CamomillaMediaRenditionFormat
  size: number
}

export interface CamomillaMediaImageProps {
  width?: number
  height?: number
  format?: string
  mode?: string
}

export interface CamomillaMedia {
  id: number
  alt_text: string | null
  title: string | null
  description: string | null
  file: string
  thumbnail: string | null
  created?: string
  size?: number
  mime_type: string | null
  image_props?: CamomillaMediaImageProps
  renditions?: Record<string, CamomillaMediaRendition>
  srcset?: Record<string, string>
  folder?: number | null
}
