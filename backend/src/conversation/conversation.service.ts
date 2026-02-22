import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { UserProvider } from '../providers/user.provider';
import { EventProvider } from '../providers/event.provider';
import { EnrollmentProvider } from '../providers/enrollment.provider';
import { runConversation } from './graph/agent.graph';
import { LLMResponse } from '../common/types';

interface ConversationSession {
    history: BaseMessage[];
}

@Injectable()
export class ConversationService {
    private sessions: Map<string, ConversationSession> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly userProvider: UserProvider,
        private readonly eventProvider: EventProvider,
        private readonly enrollmentProvider: EnrollmentProvider,
    ) { }

    private getOrCreateSession(userId: string): ConversationSession {
        if (!this.sessions.has(userId)) {
            this.sessions.set(userId, { history: [] });
        }
        return this.sessions.get(userId)!;
    }

    async chat(userId: string, message: string): Promise<LLMResponse> {
        const userInfo = this.userProvider.getUserPreferences(userId);
        if (!userInfo) {
            return { text: 'Usuario no encontrado.', options: [] };
        }

        const session = this.getOrCreateSession(userId);

        const apiKey = this.configService.get<string>('OPENROUTER_API_KEY')
            || process.env.OPENROUTER_API_KEY
            || '';
        const model = this.configService.get<string>('OPENROUTER_MODEL')
            || process.env.OPENROUTER_MODEL
            || 'google/gemini-2.0-flash-001';

        console.log(`[Venti] Using model: ${model}, API key loaded: ${apiKey ? 'YES (' + apiKey.substring(0, 10) + '...)' : 'NO ❌'}`);

        if (!apiKey) {
            return {
                text: '⚠️ Error: No se encontró la API key de OpenRouter. Configura OPENROUTER_API_KEY en backend/.env',
                options: [],
            };
        }

        const result = await runConversation(
            message,
            session.history,
            userInfo.name,
            userId,
            userInfo.preferences,
            userInfo.location,
            this.eventProvider,
            this.enrollmentProvider,
            apiKey,
            model,
        );

        // Update conversation history
        session.history.push(new HumanMessage(message));

        let historyText = result.text;
        if (result.options && result.options.length > 0) {
            historyText += '\n\n[System: Mostraste estas opciones al usuario: ' +
                result.options.map(o => `${o.title} (ID: ${o.id})`).join(', ') + ']';
        }

        session.history.push(
            new AIMessage(historyText),
        );

        // Keep history manageable (last 20 messages)
        if (session.history.length > 20) {
            session.history = session.history.slice(-20);
        }

        return result;
    }

    clearSession(userId: string): void {
        this.sessions.delete(userId);
    }
}
