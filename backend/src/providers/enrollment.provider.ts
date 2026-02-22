import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Enrollment } from '../common/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EnrollmentProvider {
    private filePath: string;

    constructor() {
        this.filePath = path.join(process.cwd(), 'data', 'enrollments.json');
    }

    private readEnrollments(): Enrollment[] {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
    }

    private writeEnrollments(enrollments: Enrollment[]): void {
        fs.writeFileSync(this.filePath, JSON.stringify(enrollments, null, 2));
    }

    getEnrollments(userId: string): Enrollment[] {
        const all = this.readEnrollments();
        return all.filter((e) => e.userId === userId);
    }

    enrollUser(userId: string, eventIds: string[]): Enrollment {
        const enrollments = this.readEnrollments();
        const newEnrollment: Enrollment = {
            id: uuidv4(),
            userId,
            eventIds,
            createdAt: new Date().toISOString(),
        };
        enrollments.push(newEnrollment);
        this.writeEnrollments(enrollments);
        return newEnrollment;
    }

    isEnrolled(userId: string, eventId: string): boolean {
        const enrollments = this.readEnrollments();
        return enrollments.some(
            (e) => e.userId === userId && e.eventIds.includes(eventId),
        );
    }

    removeEnrollment(userId: string, eventId: string): boolean {
        const enrollments = this.readEnrollments();
        let modified = false;

        const newEnrollments = enrollments.map(e => {
            if (e.userId === userId && e.eventIds.includes(eventId)) {
                modified = true;
                return {
                    ...e,
                    eventIds: e.eventIds.filter(id => id !== eventId)
                };
            }
            return e;
        }).filter(e => e.eventIds.length > 0); // Remove empty enrollments completely

        if (modified) {
            this.writeEnrollments(newEnrollments);
        }

        return modified;
    }
}
