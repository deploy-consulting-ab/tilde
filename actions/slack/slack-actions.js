'use server';

import { requireAuth } from '@/lib/require-auth';

import { getSlackService, getSlackWebApiService } from './slack-service.js';

/**
 * Post a timereport event to the shared Slack channel via Incoming Webhook.
 * Used when a user checkmarks or removes a checkmark on their timereport.
 *
 * Message format:
 *   "<employeeName> (<employeeNumber>) <message> <weekStartDate> - <weekEndDate>"
 *
 * @param {string} employeeName
 * @param {string} employeeNumber
 * @param {string} weekStartDate  Formatted date string, e.g. "2026-03-23"
 * @param {string} weekEndDate    Formatted date string, e.g. "2026-03-29"
 * @param {string} message        Action description, e.g. "has checkmarked the hours for the week"
 */
export async function sendSlackTimereport(
    employeeName,
    employeeNumber,
    weekStartDate,
    weekEndDate,
    message
) {
    await requireAuth();
    try {
        const body = {
            text: `${employeeName} (${employeeNumber}) ${message} ${weekStartDate} - ${weekEndDate}`,
        };

        const slackService = await getSlackService();
        await slackService.sendSlackTimereport(body);
    } catch (error) {
        console.error('Error posting Slack timereport:', error);
        throw error;
    }
}

export async function sendSlackAbsence(message) {
    await requireAuth();
    try {
        const body = {
            text: message,
        };

        const slackService = await getSlackService();
        await slackService.sendSlackAbsence(body);
    } catch (error) {
        console.error('Error posting Slack absence:', error);
        throw error;
    }
}

/**
 * Send a direct message reminder to a user who has not yet submitted their
 * timereport for a given week. Uses the Slack Web API (Bot Token).
 *
 * Does not call requireAuth(): this is invoked by the slack-timereport-reminder
 * cron (/api/cron/slack-timereport-reminder), which has no user session. That
 * route authenticates with CRON_SECRET instead.
 *
 * Flow:
 *   1. Resolve the user's Slack ID from their email via users.lookupByEmail
 *   2. Open (or reuse) their DM channel via conversations.open
 *   3. Post the message via chat.postMessage
 *
 * @param {string} email          The user's email address (must match their Slack account)
 * @param {string} weekStartDate  Formatted date string, e.g. "2026-03-23"
 * @param {string} weekEndDate    Formatted date string, e.g. "2026-03-29"
 * @throws {Error} If the user is not found in Slack or any API call fails
 */
export async function sendSlackTimereportReminder(email, weekStartDate, weekEndDate) {
    try {
        const service = await getSlackWebApiService();
        const slackUserId = await service.lookupUserByEmail(email);
        const channelId = await service.openDirectMessage(slackUserId);
        await service.postMessage(
            channelId,
            `Reminder: You have not reported your hours for the week ${weekStartDate} - ${weekEndDate}.`
        );
    } catch (error) {
        console.error(`Error sending Slack DM reminder to ${email}:`, error);
        throw error;
    }
}
