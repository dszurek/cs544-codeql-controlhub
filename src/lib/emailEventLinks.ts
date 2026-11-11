import { prisma } from './db';

export async function linkEmailToEvent(emailId: string, eventId: string) {
  return prisma.emailEventLink.upsert({
    where: { emailId_eventId: { emailId, eventId } },
    create: { emailId, eventId },
    update: {},
  });
}

export async function unlinkEmailFromEvent(emailId: string, eventId: string) {
  await prisma.emailEventLink
    .delete({ where: { emailId_eventId: { emailId, eventId } } })
    .catch(() => undefined);
}

export async function getEventsForEmail(emailId: string) {
  const links = await prisma.emailEventLink.findMany({ where: { emailId } });
  const eventIds = links.map((l) => l.eventId);
  if (eventIds.length === 0) return [];
  return prisma.calendarEvent.findMany({ where: { id: { in: eventIds } } });
}

export async function getEmailsForEvent(eventId: string) {
  const links = await prisma.emailEventLink.findMany({ where: { eventId } });
  const emailIds = links.map((l) => l.emailId);
  if (emailIds.length === 0) return [];
  return prisma.email.findMany({ where: { id: { in: emailIds } } });
}

/** Create an in-app calendar event from an email and link them. */
export async function createEventFromEmail(
  emailId: string,
  data: { title: string; startAt: Date; endAt: Date; allDay?: boolean; location?: string },
) {
  const sourceId = `email-${emailId}-${Date.now()}`;
  const event = await prisma.calendarEvent.create({
    data: {
      title: data.title,
      startAt: data.startAt,
      endAt: data.endAt,
      allDay: data.allDay ?? false,
      location: data.location,
      source: 'manual',
      sourceId,
      calendarName: 'Linked from email',
    },
  });
  await linkEmailToEvent(emailId, event.id);
  return event;
}
