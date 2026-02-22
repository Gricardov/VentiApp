import { Controller, Get, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { EnrollmentProvider } from '../../providers/enrollment.provider';
import { EventProvider } from '../../providers/event.provider';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
    constructor(
        private readonly enrollmentProvider: EnrollmentProvider,
        private readonly eventProvider: EventProvider,
    ) { }

    @Get()
    getUserEnrollments(@Req() req: Request) {
        const userId = (req.user as any).userId;
        const enrollments = this.enrollmentProvider.getEnrollments(userId);

        // Populate event details
        const enrolledEventIds = new Set(enrollments.flatMap(e => e.eventIds));

        // Also fetch saved/favorite events later, but for now just enrollments
        const events = this.eventProvider.findAll()
            .filter((e: any) => enrolledEventIds.has(e.id))
            .map((e: any) => ({
                ...e,
                enrolled: true,
                saved: false // Could be pulled from a saved.json if we had one
            }));

        return {
            events,
            count: events.length
        };
    }

    @Delete(':eventId')
    removeEnrollment(@Req() req: Request, @Param('eventId') eventId: string) {
        const userId = (req.user as any).userId;
        const success = this.enrollmentProvider.removeEnrollment(userId, eventId);

        return {
            success,
            message: success ? 'Inscripción cancelada' : 'No se encontró la inscripción'
        };
    }
}
