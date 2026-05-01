import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { 
  getHumanReadableDiff, 
  timeUnits, 
  getDateComponents, 
  getDateContext, 
  formatDateInfo, 
  parseDateWithTimezone,
  addDuration,
  calculateDifference
} from './utils.js';

export function createDateMcpServer(timezone: string): McpServer {
  const server = new McpServer({
    name: 'Date MCP Server',
    version: '1.0.0'
  });

  const s: any = server;

  // -----------------------------
  // get_current_time
  // -----------------------------
  s.tool(
    'get_current_time',
    'Get current date and time.',
    {
      timezone: z.string().optional(),
      locale: z.string().default('ja-JP').optional()
    },
    async (args: any) => {
      const { timezone: requestTimezone, locale = 'ja-JP' } = args;
      const effectiveTimezone = requestTimezone || timezone;
      
      try {
        const now = DateTime.now().setZone(effectiveTimezone);
        if (!now.isValid) throw new Error(`Invalid timezone: ${effectiveTimezone}`);
        
        const timeInfo = {
          current: formatDateInfo(now, locale),
          components: getDateComponents(now),
          context: getDateContext(now)
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(timeInfo, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // -----------------------------
  // calculate_date
  // -----------------------------
  s.tool(
    'calculate_date',
    'Calculate a date/time by adding or subtracting a duration.',
    {
      amount: z.number(),
      unit: z.enum(['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years']),
      base_date: z.string().optional(),
      base_timezone: z.string().optional(),
      target_timezone: z.string().optional(),
      locale: z.string().default('ja-JP').optional()
    },
    async (args: any) => {
      const { amount, unit, base_date, base_timezone, target_timezone: requestTimezone, locale = 'ja-JP' } = args;
      const effectiveTimezone = requestTimezone || timezone;
      
      try {
        let baseDateTime: DateTime;

        if (base_date) {
          const parsed = parseDateWithTimezone(base_date, base_timezone || timezone);
          if (!parsed || !parsed.isValid) throw new Error('Invalid date format');
          baseDateTime = parsed;
        } else {
          baseDateTime = DateTime.now().setZone(timezone);
        }

        const resultDateTime = addDuration(baseDateTime, amount, unit);
        const resultInTargetZone = resultDateTime.setZone(effectiveTimezone);

        const direction = amount > 0 ? 'later' : 'ago';
        const absAmount = Math.abs(amount);
        const unitName = timeUnits[unit as keyof typeof timeUnits];

        const result = {
          calculation: {
            base_date: baseDateTime.toISO() || '',
            amount,
            unit,
            description: `${absAmount} ${unitName}${absAmount !== 1 ? 's' : ''} ${direction}`
          },
          result: formatDateInfo(resultInTargetZone, locale),
          components: getDateComponents(resultInTargetZone),
          context: {
            ...getDateContext(resultInTargetZone),
            fromNow: getHumanReadableDiff(resultInTargetZone, DateTime.now().setZone(effectiveTimezone))
          }
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // -----------------------------
  // get_time_difference
  // -----------------------------
  s.tool(
    'get_time_difference',
    'Calculate the difference between a date and now or a custom start date.',
    {
      reference_date: z.string(),
      reference_timezone: z.string().optional(),
      start_date: z.string().optional(),
      start_timezone: z.string().optional(),
      unit: z.enum(['seconds', 'minutes', 'hours', 'days', 'all']).default('all'),
      target_timezone: z.string().optional(),
      locale: z.string().default('ja-JP').optional()
    },
    async (args: any) => {
      const { 
        reference_date,
        reference_timezone,
        start_date,
        start_timezone,
        unit = 'all',
        target_timezone: requestTimezone,
        locale = 'ja-JP'
      } = args;

      const effectiveTimezone = requestTimezone || timezone;

      try {
        // target date
        const parsedTarget = parseDateWithTimezone(reference_date, reference_timezone || timezone);
        if (!parsedTarget || !parsedTarget.isValid) throw new Error('Invalid reference date format');
        const target = parsedTarget.setZone(effectiveTimezone);
  
        // start date (optional)
        let start: DateTime;
        if (start_date) {
          const parsedStart = parseDateWithTimezone(start_date, start_timezone || timezone);
          if (!parsedStart || !parsedStart.isValid) throw new Error('Invalid start date format');
          start = parsedStart.setZone(effectiveTimezone);
        } else {
          start = DateTime.now().setZone(effectiveTimezone);
        }

        const diff = calculateDifference(start, target);
        const isPast = start > target;

        const result = {
          reference_date: formatDateInfo(target, locale),
          start_date: formatDateInfo(start, locale),
          is_past: isPast,
          relative: isPast ? 'past' : 'future',
          difference: unit === 'all' ? diff : { [unit]: diff[unit as keyof typeof diff] },
          human_readable: getHumanReadableDiff(target, start)
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // -----------------------------
  // convert_timezone
  // -----------------------------
  s.tool(
    'convert_timezone',
    'Convert a date/time to a different timezone.',
    {
      source_date: z.string(),
      source_timezone: z.string().optional(),
      target_timezone: z.string(),
      locale: z.string().default('ja-JP').optional()
    },
    async (args: any) => {
      const { source_date, source_timezone, target_timezone, locale = 'ja-JP' } = args;
      
      try {
        const parsed = parseDateWithTimezone(source_date, source_timezone || timezone);
        if (!parsed || !parsed.isValid) throw new Error('Invalid date format');

        const targetDateTime = parsed.setZone(target_timezone);
        if (!targetDateTime.isValid) throw new Error(`Invalid target timezone: ${target_timezone}`);

        const result = {
          input: {
            iso: parsed.toISO() || '',
            unix: Math.floor(parsed.toSeconds()),
            milliseconds: parsed.toMillis()
          },
          output: {
            timezone: target_timezone,
            formatted: formatDateInfo(targetDateTime, locale),
            components: getDateComponents(targetDateTime),
            context: getDateContext(targetDateTime)
          }
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  return server;
}
