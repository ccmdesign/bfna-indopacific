export interface MarineTrafficConfig {
  straitId: string
  embedUrl: string
  backgroundImage: string
  latitude: number
  longitude: number
  zoom: number
}

/** Build a direct MarineTraffic embed URL — no intermediate HTML needed.
 *  Free embed ignores maptype and vtypes — dark mode faked via CSS filter.
 */
function embedUrl(lat: number, lng: number, zoom: number): string {
  return `https://www.marinetraffic.com/en/ais/embed/zoom:${zoom}/centerx:${lng}/centery:${lat}/w:100%25/h:100%25/border:0/shownames:false/trackvessel:0/fleet:/`
}

export const marineTrafficConfigs: Record<string, MarineTrafficConfig> = {
  malacca:         { straitId: 'malacca',        embedUrl: embedUrl(2.3,   102.2, 5),  backgroundImage: '/assets/images/straits/malacca.jpg',       latitude: 2.3,   longitude: 102.2, zoom: 5 },
  taiwan:          { straitId: 'taiwan',         embedUrl: embedUrl(23.3,  121.8, 5),  backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 23.3,  longitude: 121.8, zoom: 5 },
  hormuz:          { straitId: 'hormuz',         embedUrl: embedUrl(25.7,  56.5,  5),  backgroundImage: '/assets/images/straits/hormuz.jpg',        latitude: 25.7,  longitude: 56.5,  zoom: 5 },
  luzon:           { straitId: 'luzon',          embedUrl: embedUrl(19.7,  122.0, 5),  backgroundImage: '/assets/images/straits/luzon.jpg',         latitude: 19.7,  longitude: 122.0, zoom: 5 },
  lombok:          { straitId: 'lombok',         embedUrl: embedUrl(-9.2,  116.2, 5),  backgroundImage: '/assets/images/straits/lombok.jpg',        latitude: -9.2,  longitude: 116.2, zoom: 5 },
  'bab-el-mandeb': { straitId: 'bab-el-mandeb',  embedUrl: embedUrl(14.3,  44.7,  3), backgroundImage: '/assets/images/straits/bab-el-mandeb.jpg', latitude: 14.3,  longitude: 44.7,  zoom: 4 },
}
