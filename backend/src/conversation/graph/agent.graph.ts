import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { UserPreferences, UserLocation } from '../../common/types';
import { EventProvider } from '../../providers/event.provider';
import { EnrollmentProvider } from '../../providers/enrollment.provider';
import { createSuggestEventsTool } from './tools/suggest-events.tool';
import { createEnrollUserTool } from './tools/enroll-user.tool';

const SYSTEM_PROMPT = `Eres Venti, un asistente inteligente de descubrimiento de eventos. Tu personalidad es amigable, entusiasta y conocedora de la escena de eventos en Latinoamérica.

INSTRUCCIONES CRÍTICAS DE FORMATO DE RESPUESTA:
- SIEMPRE responde en formato JSON válido con esta estructura exacta:
  {"text": "tu mensaje aquí", "options": []} 
- El campo "text" es tu mensaje conversacional al usuario.
- El campo "options" es un array que SOLO debe contener eventos/opciones cuando uses la herramienta suggest_events.
- Cuando la herramienta suggest_events devuelva resultados, DEBES incluir esos resultados parseados en el campo "options".
- Cada opción en "options" debe tener: id, title, description, imageUrl, matchPercentage, tags, date, time, location, price, category, enrolled, saved.

COMPORTAMIENTO:
1. Cuando el usuario pida sugerencias de eventos o diga "sorpréndeme", usa la herramienta suggest_events.
2. Cuando el usuario quiera modificar el itinerario (eliminar, agregar, cambiar eventos), usa suggest_events para buscar nuevos eventos y ajusta las opciones.
3. Cuando el usuario confirme que quiere inscribirse, usa la herramienta enroll_user con los IDs de los eventos.
4. Para conversación general, responde con text y options vacío.

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
        .replace('{userCity}', location.city)
        .replace('{userCountry}', location.country)
        .replace('{userInterests}', preferences.interests.join(', '))
        .replace('{userTags}', preferences.tags.join(', '))
        .replace('{userSchedule}', preferences.preferredSchedule);
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
) {
    const model = new ChatOpenAI({
        modelName: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
        openAIApiKey: process.env.OPENROUTER_API_KEY,
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

    const lastMessage = result.messages[result.messages.length - 1];
    const content = typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Try to parse as JSON response schema
    try {
        const parsed = JSON.parse(content);
        if (parsed.text !== undefined || parsed.options !== undefined) {
            return {
                text: parsed.text || '',
                options: parsed.options || [],
            };
        }
    } catch {
        // If not valid JSON, wrap in text field
    }

    return {
        text: content,
        options: [],
    };
}
