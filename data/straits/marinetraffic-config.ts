export interface MarineTrafficConfig {
  straitId: string
  embedUrl: string
  backgroundImage: string
  latitude: number
  longitude: number
  zoom: number
}

export const marineTrafficConfigs: Record<string, MarineTrafficConfig> = {
  malacca:         { straitId: 'malacca',        embedUrl: '/embeds/mt-malacca.html',        backgroundImage: '/assets/images/straits/malacca.jpg',       latitude: 2.5,   longitude: 101.0, zoom: 7 },
  taiwan:          { straitId: 'taiwan',         embedUrl: '/embeds/mt-taiwan.html',         backgroundImage: '/assets/images/straits/taiwan.jpg',        latitude: 24.0,  longitude: 119.0, zoom: 7 },
  hormuz:          { straitId: 'hormuz',         embedUrl: '/embeds/mt-hormuz.html',         backgroundImage: '/assets/images/straits/hormuz.jpg',        latitude: 26.3,  longitude: 56.3,  zoom: 8 },
  luzon:           { straitId: 'luzon',          embedUrl: '/embeds/mt-luzon.html',          backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 20.0,  longitude: 121.0, zoom: 7 },
  lombok:          { straitId: 'lombok',         embedUrl: '/embeds/mt-lombok.html',         backgroundImage: '/assets/images/straits/lombok.jpg',        latitude: -8.5,  longitude: 115.7, zoom: 9 },
  'bab-el-mandeb': { straitId: 'bab-el-mandeb',  embedUrl: '/embeds/mt-bab-el-mandeb.html',  backgroundImage: '/assets/images/straits/bab-el-mandeb.jpg', latitude: 12.6,  longitude: 43.3,  zoom: 8 },
}
