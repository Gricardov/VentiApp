import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { EnrollmentProvider } from '../../../providers/enrollment.provider';
import { EventProvider } from '../../../providers/event.provider';

export function createEnrollUserTool(
    enrollmentProvider: EnrollmentProvider,
    eventProvider: EventProvider,
    userId: string,
) {
    return tool(
        async ({ eventIds }) => {
            // Validate events exist
            const validEvents = eventProvider.findByIds(eventIds);
            if (validEvents.length === 0) {
                return JSON.stringify({
                    success: false,
                    message: 'No se encontraron eventos válidos para inscribir.',
                });
            }

            const validIds = validEvents.map((e) => e.id);
            const enrollment = enrollmentProvider.enrollUser(userId, validIds);

            const enrolledNames = validEvents.map((e) => e.title).join(', ');

            return JSON.stringify({
                success: true,
                message: `¡Inscripción confirmada! Te has inscrito en: ${enrolledNames}`,
                enrollmentId: enrollment.id,
                eventNames: validEvents.map((e) => e.title),
            });
        },
        {
            name: 'enroll_user',
            description:
                'OBLIGATORIO llamar cuando: (1) El usuario dice que quiere inscribirse, registrarse o apuntarse a eventos, (2) El usuario confirma una inscripción, (3) El usuario dice "inscríbeme a todos" o menciona eventos específicos para inscripción. Requiere los IDs de los eventos (formato evt-XXX). Devuelve confirmación de la inscripción.',
            schema: z.object({
                eventIds: z
                    .array(z.string())
                    .describe(
                        'Lista de IDs de eventos para inscribir al usuario. Los IDs tienen formato "evt-XXX" y provienen de los resultados de suggest_events. Ejemplo: ["evt-001", "evt-003"]',
                    ),
            }),
        },
    );
}
