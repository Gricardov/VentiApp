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
                'Inscribe al usuario en uno o más eventos específicos. Usa esta herramienta cuando el usuario confirme que quiere inscribirse a eventos del itinerario. Requiere los IDs de los eventos.',
            schema: z.object({
                eventIds: z
                    .array(z.string())
                    .describe(
                        'Lista de IDs de eventos en los que inscribir al usuario. Ejemplo: ["evt-001", "evt-003"]',
                    ),
            }),
        },
    );
}
