import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationService } from './conversation.service';

@Controller('conversation')
export class ConversationController {
    constructor(private readonly conversationService: ConversationService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    async chat(
        @Request() req: { user: { userId: string } },
        @Body() body: { message: string },
    ) {
        const result = await this.conversationService.chat(
            req.user.userId,
            body.message,
        );
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Delete('session')
    async clearSession(@Request() req: { user: { userId: string } }) {
        this.conversationService.clearSession(req.user.userId);
        return { message: 'Sesión limpiada exitosamente' };
    }
}
