export interface StraitConfig {
  straitId: string
  backgroundImage: string
  latitude: number
  longitude: number
  zoom: number
}

export const straitConfigs: Record<string, StraitConfig> = {
  malacca:         { straitId: 'malacca',        backgroundImage: '/assets/images/straits/malacca.jpg',       latitude: 2.3,   longitude: 102.2, zoom: 5 },
  taiwan:          { straitId: 'taiwan',         backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 23.3,  longitude: 121.8, zoom: 5 },
  hormuz:          { straitId: 'hormuz',         backgroundImage: '/assets/images/straits/hormuz.jpg',        latitude: 25.7,  longitude: 56.5,  zoom: 5 },
  luzon:           { straitId: 'luzon',          backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 19.7,  longitude: 122.0, zoom: 5 },
  lombok:          { straitId: 'lombok',         backgroundImage: '/assets/images/straits/lombok.jpg',        latitude: -9.2,  longitude: 116.2, zoom: 5 },
  'bab-el-mandeb': { straitId: 'bab-el-mandeb',  backgroundImage: '/assets/images/straits/bab-el-mandeb.jpg', latitude: 14.3,  longitude: 44.7,  zoom: 4 },
}
