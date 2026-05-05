import { ConfigModule, ConfigService } from '@nestjs/config';
import { stdTimeFunctions } from 'pino';

export default {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const options = {
      pinoHttp: {
        level: config.get('rabbit_logLevel') || 'debug',
        timestamp: stdTimeFunctions.isoTime,
        autoLogging: {
          ignore: (req) => {
            if (req.url.includes('healthcheck')) {
              return true;
            }
            return false;
          },
        },
      },
    };

    if (config.get('rabbit_prettyLogs') === 'true') {
      options['pinoHttp']['transport'] = {
        target: 'pino-pretty',
      };
    }

    return options;
  },
};
