import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../common/types';

@Injectable()
export class UserProvider {
    private users: User[];

    constructor() {
        const filePath = path.join(process.cwd(), 'data', 'users.json');
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.users = JSON.parse(raw);
    }

    findAll(): User[] {
        return this.users;
    }

    findById(id: string): User | undefined {
        return this.users.find((u) => u.id === id);
    }

    findByEmail(email: string): User | undefined {
        return this.users.find((u) => u.email === email);
    }

    getUserPreferences(userId: string) {
        const user = this.findById(userId);
        if (!user) return null;
        return {
            name: user.name,
            location: user.location,
            preferences: user.preferences,
        };
    }

    validatePassword(email: string, password: string): User | null {
        const user = this.findByEmail(email);
        if (!user) return null;
        // Simple plain-text comparison for demo purposes
        return user.password === password ? user : null;
    }
}
