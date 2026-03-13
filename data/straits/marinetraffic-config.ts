export interface MarineTrafficConfig {
  straitId: string
  embedUrl: string
  backgroundImage: string
  latitude: number
  longitude: number
  zoom: number
}

/** Build a parameterized embed URL from lat/lng/zoom/title */
function embedUrl(lat: number, lng: number, zoom: number, title: string): string {
  return `/embeds/mt-embed.html?lat=${lat}&lng=${lng}&zoom=${zoom}&title=${encodeURIComponent(title)}`
}

export const marineTrafficConfigs: Record<string, MarineTrafficConfig> = {
  malacca:         { straitId: 'malacca',        embedUrl: embedUrl(2.5,   101.0, 7, 'Strait of Malacca'),  backgroundImage: '/assets/images/straits/malacca.jpg',       latitude: 2.5,   longitude: 101.0, zoom: 7 },
  taiwan:          { straitId: 'taiwan',         embedUrl: embedUrl(24.0,  119.0, 7, 'Taiwan Strait'),      backgroundImage: '/assets/images/straits/taiwan.jpg',        latitude: 24.0,  longitude: 119.0, zoom: 7 },
  hormuz:          { straitId: 'hormuz',         embedUrl: embedUrl(26.3,  56.3,  8, 'Strait of Hormuz'),   backgroundImage: '/assets/images/straits/hormuz.jpg',        latitude: 26.3,  longitude: 56.3,  zoom: 8 },
  luzon:           { straitId: 'luzon',          embedUrl: embedUrl(20.0,  121.0, 7, 'Luzon Strait'),       backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 20.0,  longitude: 121.0, zoom: 7 },
  lombok:          { straitId: 'lombok',         embedUrl: embedUrl(-8.5,  115.7, 9, 'Lombok Strait'),      backgroundImage: '/assets/images/straits/lombok.jpg',        latitude: -8.5,  longitude: 115.7, zoom: 9 },
  'bab-el-mandeb': { straitId: 'bab-el-mandeb',  embedUrl: embedUrl(12.6,  43.3,  8, 'Bab el-Mandeb'),     backgroundImage: '/assets/images/straits/bab-el-mandeb.jpg', latitude: 12.6,  longitude: 43.3,  zoom: 8 },
}
