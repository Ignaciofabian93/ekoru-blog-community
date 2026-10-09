import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Notification types this subgraph emits (a subset of ekoru-users' enum). */
export type NotificationType =
  | 'EVENT_REGISTRATION_RECEIVED'
  | 'EVENT_REGISTRATION_CANCELLED'
  | 'EVENT_CANCELLED';

export interface NotifyInput {
  /** Who is being notified: the organising business. */
  sellerId: string;
  type: NotificationType;
  relatedId?: string | number | null;
  actionUrl?: string | null;
  /** Fills `{{placeholders}}` in the notification copy. */
  data?: Record<string, unknown>;
}

export interface EventRegistrationEmail {
  email: string;
  name: string;
  /** es | en | fr */
  language: string;
  eventTitle: string;
  startDate?: Date | null;
  endDate?: Date | null;
  place?: string | null;
  onlineUrl?: string | null;
  eventUrl: string;
}

/**
 * Reports community-event activity to ekoru-users, which owns notification
 * delivery and email. Called service-to-service (not through the gateway)
 * with the internal secret in the `x-internal-secret` header.
 *
 * Best-effort by design: a reservation that succeeded must stay reserved even
 * if nobody could be told, so nothing here throws.
 */
@Injectable()
export class UsersClient {
  private readonly logger = new Logger(UsersClient.name);

  constructor(private readonly config: ConfigService) {}

  /** Records an in-app (and push) notification for a seller. */
  async notify(input: NotifyInput): Promise<boolean> {
    const result = await this.call<{ emitNotification: number | null }>(
      input.type,
      /* GraphQL */ `
        mutation EmitNotification($input: EmitNotificationInput!) {
          emitNotification(input: $input)
        }
      `,
      {
        input: {
          sellerId: input.sellerId,
          type: input.type,
          relatedId: input.relatedId == null ? null : String(input.relatedId),
          actionUrl: input.actionUrl ?? null,
          data: input.data ?? {},
        },
      },
    );
    return result?.emitNotification != null;
  }

  /** Emails the attendee their reservation (guests included). */
  async sendEventRegistrationEmail(
    input: EventRegistrationEmail,
  ): Promise<boolean> {
    const result = await this.call<{ sendEventRegistrationEmail: boolean }>(
      'event registration email',
      /* GraphQL */ `
        mutation SendEventRegistrationEmail(
          $input: EventRegistrationEmailInput!
        ) {
          sendEventRegistrationEmail(input: $input)
        }
      `,
      {
        input: {
          ...input,
          startDate: input.startDate?.toISOString() ?? null,
          endDate: input.endDate?.toISOString() ?? null,
          place: input.place ?? null,
          onlineUrl: input.onlineUrl ?? null,
        },
      },
    );
    return result?.sendEventRegistrationEmail === true;
  }

  /** Emails every registrant that the event was cancelled. Returns how many went out. */
  async sendEventCancelledEmails(input: {
    language: string;
    eventTitle: string;
    startDate?: Date | null;
    reason?: string | null;
    communityUrl: string;
    recipients: Array<{ email: string; name: string }>;
  }): Promise<number> {
    if (!input.recipients.length) return 0;
    const result = await this.call<{ sendEventCancelledEmails: number }>(
      'event cancelled emails',
      /* GraphQL */ `
        mutation SendEventCancelledEmails($input: EventCancelledEmailInput!) {
          sendEventCancelledEmails(input: $input)
        }
      `,
      {
        input: {
          ...input,
          startDate: input.startDate?.toISOString() ?? null,
          reason: input.reason ?? null,
        },
      },
    );
    return result?.sendEventCancelledEmails ?? 0;
  }

  private async call<T>(
    label: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T | null> {
    const url = this.config.get<string>('subgraphs.users');
    const secret = this.config.get<string>('internalSecret');

    // Misconfiguration is otherwise silent: the message simply never goes out.
    if (!url) {
      this.logger.error(`USERS_URL not configured — ${label} not sent`);
      return null;
    }
    if (!secret) {
      this.logger.error(
        `INTERNAL_SERVICE_SECRET not configured — ${label} not sent`,
      );
      return null;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': secret,
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.error(
          `Users returned ${res.status} for ${label}: ${body || '(no body)'}`,
        );
        return null;
      }
      const body = (await res.json()) as {
        data?: T;
        errors?: Array<{ message: string }>;
      };
      if (body.errors?.length) {
        const messages = body.errors.map((e) => e.message).join(' | ');
        this.logger.error(`${label} rejected by users: ${messages}`);
        return null;
      }
      return body.data ?? null;
    } catch (err) {
      this.logger.error(
        `${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
