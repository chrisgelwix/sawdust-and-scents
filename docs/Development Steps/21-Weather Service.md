# Step 21: Weather Service — Local Conditions & 5-Day Forecast

## 1. The "Why" Behind This Step: Context-Aware Shopping

Weather affects what people buy. A rainy, cold week? Customers are more likely to cozy up with a candle. A hot summer day? Maybe a lighter, citrus scent. By integrating a weather service into the app, we:

- **Enhance the user experience** — the app feels personal and alive
- **Enable future features** — weather-based product recommendations ("It's going to be chilly this week — warm up with our Sandalwood collection")
- **Learn a real-world API integration pattern** — calling a third-party REST API, caching results, and handling failures gracefully

What we'll build:
- A **backend weather service** that proxies requests to OpenWeatherMap (keeps our API key safe on the server)
- **Geolocation support** — auto-detect user location via browser, or let them type a city
- **Current conditions** — temperature, description, icon
- **5-day forecast** — daily highs/lows and conditions
- **Caching** — weather doesn't change every second; we cache for 15 minutes to stay within free-tier API limits

---

## 2. OpenWeatherMap Setup

### 2.1 Get a Free API Key

1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to **API Keys** in your profile
4. Copy your API key

The free tier gives you:
- 60 calls/minute
- Current weather + 5-day/3-hour forecast
- That's more than enough for our app with caching

### 2.2 Add to Environment Variables
File: `.env.local`

```
# Weather Service (OpenWeatherMap)
OPENWEATHER_API_KEY=your_api_key_here
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
```

---

## 3. Shared Types

### 3.1 Add Weather Types
File: `libs/shared/types/src/lib/models.ts`

**Tutorial Action**: Add interfaces that both the backend and frontend will use.

```typescript
// ─── Weather Types ───

export interface WeatherCondition {
  id: number;
  main: string;          // "Clouds", "Rain", "Clear"
  description: string;   // "overcast clouds", "light rain"
  icon: string;          // "04d" — use with openweathermap icon URL
}

export interface CurrentWeather {
  location: string;           // "Fuquay-Varina, NC"
  temperature: number;        // Current temp in °F
  feelsLike: number;          // "Feels like" temp in °F
  humidity: number;           // Percentage
  windSpeed: number;          // mph
  condition: WeatherCondition;
  sunrise: string;            // ISO timestamp
  sunset: string;             // ISO timestamp
  updatedAt: string;          // When this data was fetched
}

export interface ForecastDay {
  date: string;               // "2026-02-15"
  dayOfWeek: string;          // "Sunday"
  high: number;               // Daily high °F
  low: number;                // Daily low °F
  condition: WeatherCondition;
  precipitation: number;      // Probability of precipitation (0-100)
}

export interface FiveDayForecast {
  location: string;
  forecast: ForecastDay[];
  updatedAt: string;
}
```

---

## 4. Weather Service (Backend)

### 4.1 Create the Weather Service
File: `apps/api/src/modules/weather/weather.service.ts`

**Tutorial Action**: This service is the heart of the feature. It calls OpenWeatherMap, transforms the response into our clean types, and caches the results.

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorHandlerService } from '../common/errors/error-handler.service';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes in ms

  // In-memory cache keyed by "lat,lon" or "city"
  private currentWeatherCache = new Map<string, CacheEntry<any>>();
  private forecastCache = new Map<string, CacheEntry<any>>();

  constructor(
    private configService: ConfigService,
    private errorService: ErrorHandlerService
  ) {
    this.apiKey = this.configService.get<string>('OPENWEATHER_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('OPENWEATHER_BASE_URL') ||
      'https://api.openweathermap.org/data/2.5';

    if (!this.apiKey) {
      this.logger.warn(
        'OPENWEATHER_API_KEY is not set — weather endpoints will return mock data'
      );
    }
  }

  /**
   * Get current weather by coordinates (latitude/longitude).
   * This is the primary method — the browser sends geolocation coords.
   */
  async getCurrentByCoords(
    lat: number,
    lon: number
  ): Promise<any> {
    const cacheKey = `current:${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.getFromCache(this.currentWeatherCache, cacheKey);
    if (cached) return cached;

    if (!this.apiKey) return this.getMockCurrentWeather('Your Location');

    try {
      const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const result = this.transformCurrentWeather(data);

      this.setCache(this.currentWeatherCache, cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch current weather by coords', error);
      return this.getMockCurrentWeather('Your Location');
    }
  }

  /**
   * Get current weather by city name.
   * Used when the user manually types a location.
   */
  async getCurrentByCity(city: string): Promise<any> {
    const cacheKey = `current:city:${city.toLowerCase().trim()}`;
    const cached = this.getFromCache(this.currentWeatherCache, cacheKey);
    if (cached) return cached;

    if (!this.apiKey) return this.getMockCurrentWeather(city);

    try {
      const url = `${this.baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=imperial`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return { error: `City "${city}" not found. Try a different search.` };
        }
        throw new Error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const result = this.transformCurrentWeather(data);

      this.setCache(this.currentWeatherCache, cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch weather for city: ${city}`, error);
      return this.getMockCurrentWeather(city);
    }
  }

  /**
   * Get 5-day forecast by coordinates.
   */
  async getForecastByCoords(
    lat: number,
    lon: number
  ): Promise<any> {
    const cacheKey = `forecast:${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.getFromCache(this.forecastCache, cacheKey);
    if (cached) return cached;

    if (!this.apiKey) return this.getMockForecast('Your Location');

    try {
      const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const result = this.transformForecast(data);

      this.setCache(this.forecastCache, cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch forecast by coords', error);
      return this.getMockForecast('Your Location');
    }
  }

  /**
   * Get 5-day forecast by city name.
   */
  async getForecastByCity(city: string): Promise<any> {
    const cacheKey = `forecast:city:${city.toLowerCase().trim()}`;
    const cached = this.getFromCache(this.forecastCache, cacheKey);
    if (cached) return cached;

    if (!this.apiKey) return this.getMockForecast(city);

    try {
      const url = `${this.baseUrl}/forecast?q=${encodeURIComponent(city)}&appid=${this.apiKey}&units=imperial`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return { error: `City "${city}" not found. Try a different search.` };
        }
        throw new Error(
          `OpenWeatherMap API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const result = this.transformForecast(data);

      this.setCache(this.forecastCache, cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch forecast for city: ${city}`, error);
      return this.getMockForecast(city);
    }
  }

  // ═══════════════════════════════════════
  //  DATA TRANSFORMATION
  // ═══════════════════════════════════════

  /**
   * Transform OpenWeatherMap "current weather" response into our clean type.
   */
  private transformCurrentWeather(data: any): any {
    const condition = data.weather?.[0] || {};
    return {
      location: `${data.name}${data.sys?.country ? ', ' + data.sys.country : ''}`,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      condition: {
        id: condition.id,
        main: condition.main,
        description: condition.description,
        icon: condition.icon,
      },
      sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
      sunset: new Date(data.sys.sunset * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Transform OpenWeatherMap "5 day / 3 hour" forecast into daily summaries.
   *
   * The API returns 40 data points (every 3 hours for 5 days).
   * We group them by date and extract daily high/low/condition.
   */
  private transformForecast(data: any): any {
    const location = `${data.city.name}${data.city.country ? ', ' + data.city.country : ''}`;

    // Group the 3-hour intervals by date
    const dayMap = new Map<
      string,
      { temps: number[]; conditions: any[]; pops: number[] }
    >();

    for (const entry of data.list) {
      const date = entry.dt_txt.split(' ')[0]; // "2026-02-15"
      if (!dayMap.has(date)) {
        dayMap.set(date, { temps: [], conditions: [], pops: [] });
      }
      const day = dayMap.get(date)!;
      day.temps.push(entry.main.temp);
      day.conditions.push(entry.weather[0]);
      day.pops.push((entry.pop || 0) * 100); // Convert 0-1 to 0-100
    }

    const daysOfWeek = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday',
      'Thursday', 'Friday', 'Saturday',
    ];

    const forecast = Array.from(dayMap.entries())
      .slice(0, 5) // Only 5 days
      .map(([date, dayData]) => {
        // Pick the most common weather condition for the day
        const conditionCounts = new Map<string, { count: number; condition: any }>();
        for (const c of dayData.conditions) {
          const key = c.main;
          if (!conditionCounts.has(key)) {
            conditionCounts.set(key, { count: 0, condition: c });
          }
          conditionCounts.get(key)!.count++;
        }
        const dominantCondition = Array.from(conditionCounts.values()).sort(
          (a, b) => b.count - a.count
        )[0].condition;

        const dateObj = new Date(date + 'T12:00:00');

        return {
          date,
          dayOfWeek: daysOfWeek[dateObj.getDay()],
          high: Math.round(Math.max(...dayData.temps)),
          low: Math.round(Math.min(...dayData.temps)),
          condition: {
            id: dominantCondition.id,
            main: dominantCondition.main,
            description: dominantCondition.description,
            icon: dominantCondition.icon,
          },
          precipitation: Math.round(
            dayData.pops.reduce((a, b) => a + b, 0) / dayData.pops.length
          ),
        };
      });

    return {
      location,
      forecast,
      updatedAt: new Date().toISOString(),
    };
  }

  // ═══════════════════════════════════════
  //  CACHING
  // ═══════════════════════════════════════

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit: ${key}`);
      return entry.data;
    }
    if (entry) {
      cache.delete(key); // Expired — clean up
    }
    return null;
  }

  private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  // ═══════════════════════════════════════
  //  MOCK DATA (when API key is not set)
  // ═══════════════════════════════════════

  private getMockCurrentWeather(location: string): any {
    return {
      location,
      temperature: 62,
      feelsLike: 59,
      humidity: 55,
      windSpeed: 8,
      condition: {
        id: 802,
        main: 'Clouds',
        description: 'scattered clouds',
        icon: '03d',
      },
      sunrise: new Date().toISOString(),
      sunset: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _mock: true,
    };
  }

  private getMockForecast(location: string): any {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const conditions = [
      { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
      { id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' },
      { id: 500, main: 'Rain', description: 'light rain', icon: '10d' },
      { id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' },
      { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
    ];

    const today = new Date();
    const forecast = days.map((day, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      return {
        date: date.toISOString().split('T')[0],
        dayOfWeek: day,
        high: 65 + Math.floor(Math.random() * 15),
        low: 45 + Math.floor(Math.random() * 10),
        condition: conditions[i],
        precipitation: Math.floor(Math.random() * 60),
      };
    });

    return {
      location,
      forecast,
      updatedAt: new Date().toISOString(),
      _mock: true,
    };
  }
}
```

**Key Design Decisions**:
- **Server-side proxy**: The API key never leaves the backend. The frontend calls *our* API, which calls OpenWeatherMap.
- **In-memory cache**: Simple and effective. For a multi-instance deployment, you'd use Redis instead.
- **Graceful fallback**: If the API key isn't set or the call fails, mock data is returned so the app never crashes.
- **Imperial units**: We're passing `units=imperial` to get Fahrenheit and mph. The frontend can offer a toggle later.

---

## 5. Weather Controller

### 5.1 Create the Controller
File: `apps/api/src/modules/weather/weather.controller.ts`

**Tutorial Action**: All weather endpoints are public — no login required. Users need to see weather before deciding to shop.

```typescript
import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  /**
   * Get current weather by geographic coordinates.
   * The frontend sends the user's browser geolocation.
   *
   * Example: GET /api/weather/current?lat=35.5846&lon=-78.8006
   */
  @Public()
  @Get('current')
  @ApiOperation({ summary: 'Get current weather by coordinates or city' })
  @ApiResponse({ status: 200, description: 'Current weather data' })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: false, type: Number, description: 'Longitude' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'City name (alternative to lat/lon)' })
  async getCurrent(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string
  ) {
    // Option 1: By coordinates
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new BadRequestException('lat and lon must be valid numbers');
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new BadRequestException(
          'lat must be between -90 and 90, lon must be between -180 and 180'
        );
      }

      return this.weatherService.getCurrentByCoords(latitude, longitude);
    }

    // Option 2: By city name
    if (city) {
      return this.weatherService.getCurrentByCity(city);
    }

    // No parameters
    throw new BadRequestException(
      'Provide either lat/lon coordinates or a city name'
    );
  }

  /**
   * Get 5-day forecast by geographic coordinates or city.
   *
   * Example: GET /api/weather/forecast?lat=35.5846&lon=-78.8006
   * Example: GET /api/weather/forecast?city=Fuquay-Varina
   */
  @Public()
  @Get('forecast')
  @ApiOperation({ summary: 'Get 5-day weather forecast by coordinates or city' })
  @ApiResponse({ status: 200, description: '5-day forecast data' })
  @ApiQuery({ name: 'lat', required: false, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: false, type: Number, description: 'Longitude' })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'City name (alternative to lat/lon)' })
  async getForecast(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string
  ) {
    // Option 1: By coordinates
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new BadRequestException('lat and lon must be valid numbers');
      }

      return this.weatherService.getForecastByCoords(latitude, longitude);
    }

    // Option 2: By city name
    if (city) {
      return this.weatherService.getForecastByCity(city);
    }

    throw new BadRequestException(
      'Provide either lat/lon coordinates or a city name'
    );
  }
}
```

---

## 6. Weather Module

### 6.1 Create the Module
File: `apps/api/src/modules/weather/weather.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

@Module({
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
```

### 6.2 Register in AppModule
File: `apps/api/src/app/app.module.ts`

**Tutorial Action**: Add `WeatherModule` to the imports.

```typescript
import { WeatherModule } from '../modules/weather/weather.module';

@Module({
  imports: [
    // ... existing modules ...
    WeatherModule,
  ],
})
export class AppModule {}
```

---

## 7. Frontend Integration Guide

This section describes how the weather page will work when we build the React frontend. **Do not implement this yet** — this is the specification for the frontend step.

### 7.1 User Flow

```
1. User navigates to /weather (or it shows in a sidebar/header widget)

2. Browser asks for geolocation permission
   ├─ GRANTED → Send lat/lon to GET /api/weather/current?lat=X&lon=Y
   │             Display: "62°F — Scattered clouds in Fuquay-Varina, NC"
   └─ DENIED  → Show a search bar: "Enter your city"
                 User types "Raleigh, NC" → GET /api/weather/current?city=Raleigh

3. Current conditions card shows:
   - City name
   - Temperature (large)
   - "Feels like" temperature
   - Weather icon (from OpenWeatherMap)
   - Humidity, wind speed
   - Sunrise / Sunset times

4. Below the current weather card:
   - "Change Location" button → opens a text input
   - User types new city → re-fetches current weather

5. "View 5-Day Forecast" button (or the current weather card is clickable)
   ├─ Click → GET /api/weather/forecast?lat=X&lon=Y (or ?city=CityName)
   └─ Display 5 cards in a row:
      | Mon      | Tue      | Wed      | Thu      | Fri      |
      | ☀️ Clear | ☁️ Clouds| 🌧️ Rain | ☀️ Clear | ☁️ Clouds|
      | H: 72°  | H: 65°  | H: 58°  | H: 70°  | H: 68°  |
      | L: 52°  | L: 48°  | L: 45°  | L: 50°  | L: 49°  |
      | 10% 💧  | 30% 💧  | 80% 💧  | 5% 💧   | 25% 💧  |
```

### 7.2 Browser Geolocation API

```typescript
// This is how the frontend will request location
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // Call: GET /api/weather/current?lat=${latitude}&lon=${longitude}
  },
  (error) => {
    // Geolocation denied or failed — show city search input
    console.log('Geolocation unavailable:', error.message);
  }
);
```

### 7.3 Weather Icon URLs

OpenWeatherMap provides icon codes (e.g., `"04d"`). Use them with:
```
https://openweathermap.org/img/wn/{icon}@2x.png
```

Example: `https://openweathermap.org/img/wn/04d@2x.png`

---

## 8. Playwright API Tests

### 8.1 Weather API Tests
File: `apps/e2e/src/tests/API/weather.api.spec.ts`

**Tutorial Action**: Create API tests for the weather endpoints. These are all public endpoints.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Weather API', () => {
  // Fuquay-Varina, NC coordinates (warehouse location)
  const defaultLat = 35.5846;
  const defaultLon = -78.8006;

  test('should get current weather by coordinates', async ({ request }) => {
    const response = await request.get(
      `weather/current?lat=${defaultLat}&lon=${defaultLon}`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('location');
    expect(data).toHaveProperty('temperature');
    expect(data).toHaveProperty('feelsLike');
    expect(data).toHaveProperty('humidity');
    expect(data).toHaveProperty('condition');
    expect(data.condition).toHaveProperty('main');
    expect(data.condition).toHaveProperty('description');
    expect(typeof data.temperature).toBe('number');
  });

  test('should get current weather by city name', async ({ request }) => {
    const response = await request.get(
      `weather/current?city=Fuquay-Varina`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('location');
    expect(data).toHaveProperty('temperature');
  });

  test('should get 5-day forecast by coordinates', async ({ request }) => {
    const response = await request.get(
      `weather/forecast?lat=${defaultLat}&lon=${defaultLon}`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('location');
    expect(data).toHaveProperty('forecast');
    expect(Array.isArray(data.forecast)).toBeTruthy();
    expect(data.forecast.length).toBeLessThanOrEqual(5);

    if (data.forecast.length > 0) {
      const day = data.forecast[0];
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('dayOfWeek');
      expect(day).toHaveProperty('high');
      expect(day).toHaveProperty('low');
      expect(day).toHaveProperty('condition');
      expect(day).toHaveProperty('precipitation');
    }
  });

  test('should get 5-day forecast by city name', async ({ request }) => {
    const response = await request.get(
      `weather/forecast?city=Raleigh`
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('forecast');
  });

  test('should return 400 when no location params provided (current)', async ({ request }) => {
    const response = await request.get('weather/current');
    expect(response.status()).toBe(400);
  });

  test('should return 400 when no location params provided (forecast)', async ({ request }) => {
    const response = await request.get('weather/forecast');
    expect(response.status()).toBe(400);
  });

  test('should return 400 for invalid coordinates', async ({ request }) => {
    const response = await request.get(
      'weather/current?lat=999&lon=999'
    );
    expect(response.status()).toBe(400);
  });

  test('should handle non-existent city gracefully', async ({ request }) => {
    const response = await request.get(
      'weather/current?city=Zzzznotarealcity12345'
    );

    expect(response.status()).toBe(200); // Returns mock or error object
    const data = await response.json();
    // Either valid mock data or an error message
    expect(
      data.temperature !== undefined || data.error !== undefined
    ).toBeTruthy();
  });

  test('should not require authentication', async ({ request }) => {
    // Weather endpoints are public — no Bearer token needed
    const response = await request.get(
      `weather/current?city=Durham`
    );
    // Should not be 401
    expect(response.status()).not.toBe(401);
  });
});
```

---

## 9. Implementation Checklist

- [ ] **Environment**: Sign up for OpenWeatherMap, get API key, add to `.env.local`
- [ ] **Shared Types**: Add `WeatherCondition`, `CurrentWeather`, `ForecastDay`, `FiveDayForecast`
- [ ] **Service**: Create `WeatherService` with coords/city lookup, caching, mock fallback
- [ ] **Controller**: Create `WeatherController` with `GET /current` and `GET /forecast`
- [ ] **Module**: Create `WeatherModule`
- [ ] **Module**: Register `WeatherModule` in `AppModule`
- [ ] **Tests**: Create Playwright API tests for weather endpoints
- [ ] **Frontend** (later): Weather page with geolocation, current conditions, 5-day forecast cards

---

## 10. Future Enhancements (Nice-to-Have)

These are ideas for later — don't implement them now:

1. **Weather-based recommendations**: "It's going to be 30°F this week — warm up with our Fireside collection!" in the chatbot or homepage
2. **Temperature unit toggle**: Let users switch between °F and °C (frontend-only conversion, or pass `units=metric` to the API)
3. **Redis cache**: Replace in-memory cache with Redis for multi-instance deployments
4. **Severe weather alerts**: OpenWeatherMap's One Call API includes weather alerts (requires a paid plan)
5. **Weather widget in header**: A small persistent widget showing current temp + icon on every page
