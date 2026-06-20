import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MockWeatherService } from './mock-weather.service';
import { OpenWeatherService } from './open-weather.service';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { WEATHER_SERVICE } from './weather.tokens';

/**
 * WeatherModule — endpoints #2/#3. Binds WEATHER_SERVICE to the caching
 * facade (OpenWeather primary + mock fallback) and registers the in-memory
 * cache used for the §0/§4 TTLs.
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [WeatherController],
  providers: [
    OpenWeatherService,
    MockWeatherService,
    { provide: WEATHER_SERVICE, useClass: WeatherService },
  ],
})
export class WeatherModule {}
