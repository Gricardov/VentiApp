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
                'OBLIGATORIO llamar en estas situaciones: (1) El usuario pide sugerencias o recomendaciones de eventos, (2) El usuario dice "sorpréndeme" o "qué hay para mí", (3) El usuario confirma que quiere ver eventos basados en sus intereses, (4) El usuario pide modificar el itinerario (agregar, cambiar o buscar otros eventos), (5) El usuario menciona cualquier categoría como tecnología, música, arte, gastronomía, etc. NUNCA listes eventos sin llamar esta herramienta primero. Devuelve eventos reales de la base de datos con porcentaje de match.',
            schema: z.object({
                intent: z
                    .string()
                    .describe(
                        'La intención o tema de búsqueda extraído del mensaje del usuario. Usa palabras clave relevantes. Ejemplos: "tecnología e innovación", "música en vivo y jazz", "gastronomía peruana", "arte y diseño". Si el usuario dice "sorpréndeme", usa sus intereses del perfil.',
                    ),
                maxResults: z
                    .number()
                    .optional()
                    .default(6)
                    .describe('Número máximo de eventos a sugerir. Usa 6 por defecto, o menos si el usuario pide pocos.'),
            }),
        },
    );
}
