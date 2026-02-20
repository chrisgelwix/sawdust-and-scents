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
