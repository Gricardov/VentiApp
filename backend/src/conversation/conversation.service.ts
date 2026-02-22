import { Injectable } from '@nestjs/common';
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

        const result = await runConversation(
            message,
            session.history,
            userInfo.name,
            userId,
            userInfo.preferences,
            userInfo.location,
            this.eventProvider,
            this.enrollmentProvider,
        );

        // Update conversation history
        session.history.push(new HumanMessage(message));
        session.history.push(
            new AIMessage(JSON.stringify(result)),
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
