import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { UserPreferences, UserLocation, OptionItem } from '../../common/types';
import { EventProvider } from '../../providers/event.provider';
import { EnrollmentProvider } from '../../providers/enrollment.provider';
import { createSuggestEventsTool } from './tools/suggest-events.tool';
import { createEnrollUserTool } from './tools/enroll-user.tool';

const SYSTEM_PROMPT = `Eres Venti, un asistente inteligente de descubrimiento de eventos.

REGLA #1 — OBLIGATORIA:
SIEMPRE que el usuario pida eventos, sugerencias, recomendaciones, o diga "sorpréndeme", DEBES llamar a la herramienta suggest_events. NUNCA inventes ni listes eventos por tu cuenta. Si no llamas a suggest_events, el usuario no verá ningún evento.

REGLA #2 — INSCRIPCIÓN:
Cuando el usuario quiera inscribirse, DEBES llamar a la herramienta enroll_user con los IDs.

REGLA #3 — RESPUESTA NATURAL:
Responde siempre en lenguaje natural. NO incluyas JSON en tu texto. Las herramientas generan los datos estructurados automáticamente.

FLUJO IDEAL:
1. Saluda al usuario por su nombre. Menciona que conoces sus intereses ({userInterests}) y que está en {userCity}. Pregunta si quiere sugerencias basadas en eso o algo diferente.
2. Cuando confirme → llama suggest_events con intent basado en sus intereses.
3. Después de recibir resultados del tool, describe brevemente los eventos por nombre y pregunta qué le parece.
4. Si quiere modificar → llama suggest_events de nuevo con nuevo intent.
5. Si quiere inscribirse → llama enroll_user.

INFORMACIÓN DEL USUARIO:
- Nombre: {userName}
- Ciudad: {userCity}, {userCountry}
- Intereses: {userInterests}
- Tags preferidos: {userTags}
- Horario preferido: {userSchedule}
`;

function buildSystemPrompt(
    userName: string,
    preferences: UserPreferences,
    location: UserLocation,
): string {
    return SYSTEM_PROMPT
        .replace('{userName}', userName)
        .replace(/\{userCity\}/g, location.city)
        .replace('{userCountry}', location.country)
        .replace(/\{userInterests\}/g, preferences.interests.join(', '))
        .replace('{userTags}', preferences.tags.join(', '))
        .replace('{userSchedule}', preferences.preferredSchedule);
}

/**
 * Extract OptionItem[] from ToolMessage results in the graph execution.
 */
function extractOptionsFromMessages(messages: BaseMessage[]): OptionItem[] {
    const options: OptionItem[] = [];

    for (const msg of messages) {
        if (msg instanceof ToolMessage) {
            try {
                const parsed = JSON.parse(
                    typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                );
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].title) {
                    options.push(...parsed);
                }
            } catch {
                // skip
            }
        }
    }

    return options;
}

/**
 * Detects if the LLM hallucinated events without calling the tool.
 * Looks for patterns like "1. **Event Name**" or numbered lists with match %.
 */
function looksLikeHallucinatedEvents(text: string): boolean {
    const patterns = [
        /\d+\.\s+\*\*[^*]+\*\*/,          // 1. **Event Name**
        /\((?:Match|match):\s*\d+%\)/,     // (Match: 70%)
        /\(\d+%\s*match\)/i,               // (70% match)
    ];
    return patterns.some((p) => p.test(text));
}

export async function runConversation(
    message: string,
    conversationHistory: BaseMessage[],
    userName: string,
    userId: string,
    preferences: UserPreferences,
    userLocation: UserLocation,
    eventProvider: EventProvider,
    enrollmentProvider: EnrollmentProvider,
    apiKey: string,
    modelName: string,
) {
    const model = new ChatOpenAI({
        modelName,
        openAIApiKey: apiKey,
        configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
        },
        temperature: 0.7,
    });

    const suggestEventsTool = createSuggestEventsTool(
        eventProvider,
        preferences,
        userLocation,
    );

    const enrollUserTool = createEnrollUserTool(
        enrollmentProvider,
        eventProvider,
        userId,
    );

    const tools = [suggestEventsTool, enrollUserTool];
    const toolNode = new ToolNode(tools);
    const modelWithTools = model.bindTools(tools);

    const systemMessage = new SystemMessage(
        buildSystemPrompt(userName, preferences, userLocation),
    );

    async function callModel(state: typeof MessagesAnnotation.State) {
        const messages = [systemMessage, ...state.messages];
        const response = await modelWithTools.invoke(messages);
        return { messages: [response] };
    }

    function shouldContinue(state: typeof MessagesAnnotation.State) {
        const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            return 'tools';
        }
        return END;
    }

    const graph = new StateGraph(MessagesAnnotation)
        .addNode('agent', callModel)
        .addNode('tools', toolNode)
        .addEdge(START, 'agent')
        .addConditionalEdges('agent', shouldContinue)
        .addEdge('tools', 'agent')
        .compile();

    const initialMessages = [
        ...conversationHistory,
        new HumanMessage(message),
    ];

    const result = await graph.invoke({
        messages: initialMessages,
    });

    // Extract the final AI text from the last message
    const lastMessage = result.messages[result.messages.length - 1];
    const text = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Extract options from tool message results
    let options = extractOptionsFromMessages(result.messages);

    // FALLBACK: If LLM hallucinated events without calling the tool,
    // auto-call suggest_events with the user's message as intent
    if (options.length === 0 && looksLikeHallucinatedEvents(text)) {
        console.log('[Venti] Detected hallucinated events — auto-calling suggest_events fallback');
        const fallbackResults = eventProvider.matchEvents(
            preferences,
            userLocation,
            message,
        );
        options = fallbackResults.slice(0, 6).map((event) => ({
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
    }

    return {
        text,
        options,
    };
}
