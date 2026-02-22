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
Responde siempre en lenguaje natural. NO incluyas JSON en tu texto.

REGLA #4 — MÁXIMO 3 SUGERENCIAS:
Siempre sugiere máximo 3 eventos. Usa maxResults: 3 al llamar suggest_events.

FLUJO IDEAL:
1. Saluda al usuario por su nombre. Menciona sus intereses ({userInterests}) y que está en {userCity}. Pregunta si quiere sugerencias basadas en eso o algo diferente.
2. Cuando confirme → llama suggest_events con intent basado en sus intereses.
3. Después de recibir resultados del tool, describe brevemente los eventos y pregunta qué le parece.
4. Si quiere modificar → llama suggest_events de nuevo.
5. Si quiere inscribirse → llama enroll_user.

INFORMACIÓN DEL USUARIO:
- Nombre: {userName}
- Ciudad: {userCity}, {userCountry}
- Intereses: {userInterests}
- Tags preferidos: {userTags}
- Horario preferido: {userSchedule}
`;

const FORMATTER_PROMPT = `Eres un formateador de respuestas. Recibirás el texto de un asistente de eventos y opcionalmente datos de eventos en JSON.

Tu trabajo es devolver ÚNICAMENTE un JSON válido con esta estructura exacta:
{"text": "...", "options": [...]}

REGLAS:
1. "text" debe contener SOLO el mensaje conversacional, sin listar eventos.
2. Si el texto original contiene listas numeradas de eventos (1. **Nombre**, 2. **Nombre**), ELIMÍNALAS del text.
3. "options" debe contener los eventos como array de objetos. Si recibiste datos del tool, usa esos. Si no hay datos del tool pero el texto menciona eventos inventados, deja options vacío [].
4. El text debe ser amigable y breve: saludo + invitación a ver las opciones. No repitas info que ya está en las cards.
5. Responde SOLO con el JSON, sin backticks ni explicaciones.`;

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
 * Extract OptionItem[] from ToolMessage results.
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
            } catch { /* skip */ }
        }
    }
    return options;
}

/**
 * Detects if the LLM hallucinated events without calling the tool.
 */
function looksLikeHallucinatedEvents(text: string): boolean {
    const patterns = [
        /\d+\.\s+\*\*[^*]+\*\*/,
        /\((?:Match|match):\s*\d+%\)/,
        /\(\d+%\s*match\)/i,
    ];
    return patterns.some((p) => p.test(text));
}

/**
 * Uses a lightweight LLM call to reformat the response into clean {text, options}.
 * Strips event listings from text and ensures no duplication with options.
 */
async function formatResponseWithLLM(
    rawText: string,
    options: OptionItem[],
    apiKey: string,
    modelName: string,
): Promise<{ text: string; options: OptionItem[] }> {
    try {
        const formatter = new ChatOpenAI({
            modelName,
            openAIApiKey: apiKey,
            configuration: { baseURL: 'https://openrouter.ai/api/v1' },
            temperature: 0,
        });

        const optionsContext = options.length > 0
            ? `\n\nDATOS DEL TOOL (estos van en options):\n${JSON.stringify(options)}`
            : '\n\nNo hay datos del tool.';

        const response = await formatter.invoke([
            new SystemMessage(FORMATTER_PROMPT),
            new HumanMessage(`TEXTO DEL ASISTENTE:\n${rawText}${optionsContext}`),
        ]);

        const content = typeof response.content === 'string' ? response.content : '';
        // Extract JSON from the response (handle potential markdown wrapping)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                text: parsed.text || rawText,
                options: parsed.options?.length > 0 ? parsed.options : options,
            };
        }
    } catch (err) {
        console.log('[Venti] Formatter LLM failed, using raw response:', err);
    }

    // Fallback: return as-is
    return { text: rawText, options };
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

    // Extract final AI text
    const lastMessage = result.messages[result.messages.length - 1];
    let rawText = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Extract options from tool results
    let options = extractOptionsFromMessages(result.messages);

    // FALLBACK: If LLM hallucinated events without calling the tool
    if (options.length === 0 && looksLikeHallucinatedEvents(rawText)) {
        console.log('[Venti] Detected hallucinated events — auto-calling EventProvider fallback');
        const fallbackResults = eventProvider.matchEvents(preferences, userLocation, message);
        options = fallbackResults.slice(0, 3).map((event) => ({
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

    // Limit to 3 options max
    options = options.slice(0, 3);

    // SMART FORMATTER: Use LLM to clean text and separate from options
    if (options.length > 0 || looksLikeHallucinatedEvents(rawText)) {
        const formatted = await formatResponseWithLLM(rawText, options, apiKey, modelName);
        return {
            text: formatted.text,
            options: formatted.options.slice(0, 3),
        };
    }

    return { text: rawText, options };
}
