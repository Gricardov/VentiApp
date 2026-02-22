import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { UserPreferences, UserLocation, OptionItem } from '../../common/types';
import { EventProvider } from '../../providers/event.provider';
import { EnrollmentProvider } from '../../providers/enrollment.provider';
import { createSuggestEventsTool } from './tools/suggest-events.tool';
import { createEnrollUserTool } from './tools/enroll-user.tool';

const SYSTEM_PROMPT = `Eres Venti, un asistente inteligente de descubrimiento de eventos. Tu personalidad es amigable, entusiasta y conocedora de la escena de eventos en Latinoamérica.

COMPORTAMIENTO:
1. Al inicio de la conversación, saluda al usuario por su nombre y menciona sus intereses y ubicación. Pregúntale si quiere sugerencias basadas en esos intereses o si quiere explorar algo diferente.
2. Cuando el usuario pida sugerencias de eventos, diga "sorpréndeme", o confirme sus intereses, usa la herramienta suggest_events.
3. Cuando el usuario quiera modificar el itinerario (eliminar, agregar, cambiar eventos), usa suggest_events para buscar nuevos eventos y ajusta las opciones según lo que pida.
4. Cuando el usuario confirme que quiere inscribirse, usa la herramienta enroll_user con los IDs de los eventos.
5. Para conversación general, responde normalmente sin usar herramientas.

IMPORTANTE:
- NO incluyas JSON en tus respuestas de texto. Solo responde en lenguaje natural.
- Las herramientas se encargan de devolver los datos estructurados.
- Cuando uses suggest_events, en tu texto describe brevemente los eventos sugeridos y pregunta al usuario qué le parece.
- Siempre menciona los nombres de los eventos en tu respuesta para que el usuario sepa qué se le sugirió.

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

/**
 * Extracts OptionItem[] from tool messages in the conversation.
 * This is the key fix: we parse options from the tool results directly,
 * not from the LLM's text output.
 */
function extractOptionsFromMessages(messages: BaseMessage[]): OptionItem[] {
    const options: OptionItem[] = [];

    for (const msg of messages) {
        if (msg instanceof ToolMessage) {
            try {
                const parsed = JSON.parse(
                    typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                );
                // Check if it's an array of OptionItems (from suggest_events)
                if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].title) {
                    options.push(...parsed);
                }
            } catch {
                // Not JSON or not options — skip
            }
        }
    }

    return options;
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

    // Extract options from ALL tool messages in the result
    const options = extractOptionsFromMessages(result.messages);

    return {
        text,
        options,
    };
}
