import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PushSubscriptionRecord } from '../common/types';

@Injectable()
export class NotificationProvider {
    private filePath: string;

    constructor() {
        this.filePath = path.join(process.cwd(), 'data', 'subscriptions.json');
    }

    private readSubscriptions(): PushSubscriptionRecord[] {
        try {
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    private writeSubscriptions(subs: PushSubscriptionRecord[]): void {
        fs.writeFileSync(this.filePath, JSON.stringify(subs, null, 2));
    }

    subscribe(userId: string, endpoint: string, keys: { p256dh: string; auth: string }): void {
        const subs = this.readSubscriptions();
        // Remove existing subscription for this user (re-subscribe)
        const filtered = subs.filter(s => s.userId !== userId);
        filtered.push({ userId, endpoint, keys });
        this.writeSubscriptions(filtered);
        console.log(`[Venti] Push subscription saved for user ${userId}`);
    }

    getAll(): PushSubscriptionRecord[] {
        return this.readSubscriptions();
    }

    getByUserId(userId: string): PushSubscriptionRecord | undefined {
        return this.readSubscriptions().find(s => s.userId === userId);
    }

    remove(userId: string): boolean {
        const subs = this.readSubscriptions();
        const filtered = subs.filter(s => s.userId !== userId);
        if (filtered.length < subs.length) {
            this.writeSubscriptions(filtered);
            return true;
        }
        return false;
    }
}
