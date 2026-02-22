import { Controller, Post, Body, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { NotificationProvider } from '../../providers/notification.provider';
import { UserProvider } from '../../providers/user.provider';
import { EventProvider } from '../../providers/event.provider';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { Request } from 'express';
import * as webpush from 'web-push';

@Controller('notifications')
export class NotificationController {
    constructor(
        private readonly notificationProvider: NotificationProvider,
        private readonly userProvider: UserProvider,
        private readonly eventProvider: EventProvider,
    ) {
        // Configure VAPID keys
        const vapidPublic = process.env.VAPID_PUBLIC_KEY || '';
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
        if (vapidPublic && vapidPrivate) {
            webpush.setVapidDetails(
                'mailto:admin@venti.com',
                vapidPublic,
                vapidPrivate,
            );
        }
    }

    @Post('subscribe')
    @UseGuards(JwtAuthGuard)
    subscribe(
        @Req() req: Request,
        @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
    ) {
        const userId = (req.user as any).userId;
        this.notificationProvider.subscribe(userId, body.endpoint, body.keys);
        return { success: true, message: 'Suscripción guardada' };
    }

    @Post('send')
    @UseGuards(JwtAuthGuard)
    async sendNotifications(@Req() req: Request) {
        const user = (req.user as any);
        // Only admin can send notifications
        const fullUser = this.userProvider.findById(user.userId);
        if (!fullUser || fullUser.role !== 'admin') {
            throw new ForbiddenException('Solo el administrador puede enviar notificaciones');
        }

        const subscriptions = this.notificationProvider.getAll();
        const results: { userId: string; status: string; event?: string }[] = [];

        for (const sub of subscriptions) {
            try {
                // Get user preferences
                const targetUser = this.userProvider.findById(sub.userId);
                if (!targetUser || targetUser.role === 'admin') continue;

                // Find matching events
                const matchedEvents = this.eventProvider.matchEvents(
                    targetUser.preferences,
                    targetUser.location,
                );

                if (matchedEvents.length === 0) continue;

                const topEvent = matchedEvents[0];
                const payload = JSON.stringify({
                    title: `¡${targetUser.name}, tienes un evento cerca!`,
                    body: `${topEvent.title} — ${topEvent.date} a las ${topEvent.time} en ${topEvent.location.venue}`,
                    icon: '/venti_logo.png',
                    badge: '/venti_logo.png',
                    data: { url: '/chat', eventId: topEvent.id },
                });

                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    payload,
                );

                results.push({
                    userId: sub.userId,
                    status: 'sent',
                    event: topEvent.title,
                });
            } catch (err: any) {
                console.error(`[Venti] Push failed for ${sub.userId}:`, err.message);
                // If subscription expired, remove it
                if (err.statusCode === 410) {
                    this.notificationProvider.remove(sub.userId);
                }
                results.push({ userId: sub.userId, status: 'failed' });
            }
        }

        return {
            success: true,
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed').length,
            details: results,
        };
    }
}
