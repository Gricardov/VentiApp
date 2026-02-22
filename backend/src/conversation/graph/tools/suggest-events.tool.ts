import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { EventProvider } from '../../../providers/event.provider';
import { UserPreferences, UserLocation, OptionItem } from '../../../common/types';


export function createSuggestEventsTool(
    eventProvider: EventProvider,
    userPreferences: UserPreferences,
    userLocation: UserLocation,
) {
    return tool(
        async ({ intent, maxResults }) => {
            const matchedEvents = eventProvider.matchEvents(
                userPreferences,
                userLocation,
                intent,
            );

            const topEvents = matchedEvents.slice(0, maxResults || 6);

            const options: OptionItem[] = topEvents.map((event) => ({
                id: event.id,
                title: event.title,
                description: event.description,
                imageUrl: event.imageUrl,
                matchPercentage: event.matchScore,
                tags: event.tags,
                date: event.date,
                time: event.time,
                location: `${event.location.venue}, ${event.location.city}`,
                price: event.price,
                category: event.category,
                enrolled: false,
                saved: false,
            }));

            return JSON.stringify(options);
        },
        {
            name: 'suggest_events',
            description:
                'Sugiere eventos personalizados basados en los intereses y ubicación del usuario. Usa esta herramienta cuando el usuario quiera descubrir eventos, recibir sugerencias, crear un itinerario o cuando diga "sorpréndeme". Devuelve una lista de eventos con porcentaje de match.',
            schema: z.object({
                intent: z
                    .string()
                    .describe(
                        'La intención o interés específico del usuario para filtrar eventos. Ejemplo: "tecnología", "música en vivo", "gastronomía"',
                    ),
                maxResults: z
                    .number()
                    .optional()
                    .default(6)
                    .describe('Número máximo de eventos a sugerir'),
            }),
        },
    );
}
