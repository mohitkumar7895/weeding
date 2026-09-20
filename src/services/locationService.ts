export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationProvider {
  getCoordinates(city: string): Promise<Coordinates | null>;
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number; // in km
}

/**
 * Mock provider for development and testing.
 * In a real application, this would be replaced with a Google Maps or Mapbox provider.
 */
class GoogleMapsLocationProvider implements LocationProvider {
  constructor(private apiKey: string, private fallback: LocationProvider) {}

  async getCoordinates(city: string): Promise<Coordinates | null> {
    if (!city) return null;
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data.results?.[0]?.geometry?.location;
      if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
    } catch (err) {
      console.warn('[LocationService] Google geocode failed, using fallback', err);
    }
    return this.fallback.getCoordinates(city);
  }

  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    return this.fallback.calculateDistance(coord1, coord2);
  }
}

class MockLocationProvider implements LocationProvider {
  // Simple mock coordinates for popular Indian cities
  private cityCoordinates: Record<string, Coordinates> = {
    'delhi': { lat: 28.6139, lng: 77.2090 },
    'delhi ncr': { lat: 28.6139, lng: 77.2090 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'bengaluru': { lat: 12.9716, lng: 77.5946 },
    'bangalore': { lat: 12.9716, lng: 77.5946 },
    'jaipur': { lat: 26.9124, lng: 75.7873 },
    'lucknow': { lat: 26.8467, lng: 80.9462 },
    'udaipur': { lat: 24.5854, lng: 73.7125 },
    'goa': { lat: 15.2993, lng: 74.1240 },
    'chandigarh': { lat: 30.7333, lng: 76.7794 },
    'agra': { lat: 27.1767, lng: 78.0081 },
    'pune': { lat: 18.5204, lng: 73.8567 },
    'chennai': { lat: 13.0827, lng: 80.2707 },
    'hyderabad': { lat: 17.3850, lng: 78.4867 },
    'kolkata': { lat: 22.5726, lng: 88.3639 },
    'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  };

  async getCoordinates(city: string): Promise<Coordinates | null> {
    if (!city) return null;
    const normalized = city.toLowerCase().trim();
    return this.cityCoordinates[normalized] || null;
  }

  // Haversine formula
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(coord2.lat - coord1.lat);
    const dLon = this.deg2rad(coord2.lng - coord1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(coord1.lat)) * Math.cos(this.deg2rad(coord2.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

class LocationService {
  private provider: LocationProvider;

  constructor() {
    // Configurable provider based on environment variables
    // e.g., if (process.env.GOOGLE_MAPS_API_KEY) { this.provider = new GoogleMapsProvider(); }
    const mock = new MockLocationProvider();
    this.provider = process.env.GOOGLE_MAPS_API_KEY
      ? new GoogleMapsLocationProvider(process.env.GOOGLE_MAPS_API_KEY, mock)
      : mock;
  }

  async getDistanceBetweenCities(city1: string, city2: string): Promise<number | null> {
    try {
      const coord1 = await this.provider.getCoordinates(city1);
      const coord2 = await this.provider.getCoordinates(city2);

      if (!coord1 || !coord2) {
        return null; // Cannot calculate distance if coordinates are not found
      }

      return this.provider.calculateDistance(coord1, coord2);
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  }

  async isWithinRadius(customerCity: string, vendorCity: string, radiusKm: number = 50): Promise<boolean> {
    // Exact match is always within radius
    if (customerCity.toLowerCase().trim() === vendorCity.toLowerCase().trim()) {
      return true;
    }

    const distance = await this.getDistanceBetweenCities(customerCity, vendorCity);
    if (distance === null) {
      // If we can't calculate distance, fallback to strict matching for safety or true if we want to be permissive
      return false; 
    }

    return distance <= radiusKm;
  }
}

export const locationService = new LocationService();
