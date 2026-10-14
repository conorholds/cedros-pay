import { assert } from './validation-helpers.mjs';

const supportedFields = new Set([
  'id', 'jobId', 'label', 'cron', 'timezone', 'catchUp', 'enabled',
  'timeoutSeconds', 'maxRetries', 'channelIds', 'autoCreateOnEnable',
]);

export function assertSupportedJobScheduleFields(schedule, source) {
  for (const field of Object.keys(schedule)) {
    assert(
      supportedFields.has(field),
      `${source} ${schedule.jobId} uses unsupported jobSchedule field ${field}`,
    );
  }
}
