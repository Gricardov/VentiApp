import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { EventItem, UserPreferences, UserLocation } from '../common/types';

@Injectable()
export class EventProvider {
    private events: EventItem[];

    constructor() {
        const filePath = path.join(process.cwd(), 'data', 'events.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.events = JSON.parse(raw);
    }

    findAll(): EventItem[] {
        return this.events;
    }

    findById(id: string): EventItem | undefined {
        return this.events.find((e) => e.id === id);
    }

    findByIds(ids: string[]): EventItem[] {
        return this.events.filter((e) => ids.includes(e.id));
    }

    findByTags(tags: string[]): EventItem[] {
        const lowerTags = tags.map((t) => t.toLowerCase());
        return this.events.filter((e) =>
            e.tags.some((tag) => lowerTags.includes(tag.toLowerCase())),
        );
    }

    findByLocation(city: string): EventItem[] {
        return this.events.filter(
            (e) => e.location.city.toLowerCase() === city.toLowerCase(),
        );
    }

    /**
     * Matches events to user preferences and intent.
     * Returns events sorted by match score with the score included.
     */
    matchEvents(
        preferences: UserPreferences,
        userLocation: UserLocation,
        intent?: string,
    ): Array<EventItem & { matchScore: number }> {
        const results = this.events.map((event) => {
            let score = 0;

            // Tag overlap scoring (0-50 points)
            const tagOverlap = event.tags.filter((tag) =>
                preferences.tags.some(
                    (pTag) => pTag.toLowerCase() === tag.toLowerCase(),
                ),
            );
            score += Math.min(tagOverlap.length * 10, 50);

            // Interest/category match (0-20 points)
            if (
                preferences.interests.some(
                    (interest) =>
                        interest.toLowerCase() === event.category.toLowerCase(),
                )
            ) {
                score += 20;
            }

            // Location match (0-20 points)
            if (
                event.location.city.toLowerCase() === userLocation.city.toLowerCase()
            ) {
                score += 20;
            }

            // Intent keyword matching (0-10 points)
            if (intent) {
                const intentLower = intent.toLowerCase();
                if (
                    event.title.toLowerCase().includes(intentLower) ||
                    event.description.toLowerCase().includes(intentLower) ||
                    event.category.toLowerCase().includes(intentLower) ||
                    event.tags.some((t) => intentLower.includes(t.toLowerCase()))
                ) {
                    score += 10;
                }
            }

            return { ...event, matchScore: Math.min(score, 100) };
        });

        return results
            .filter((e) => e.matchScore > 0)
            .sort((a, b) => b.matchScore - a.matchScore);
    }
}
