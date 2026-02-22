import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserProvider } from '../providers/user.provider';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly userProvider: UserProvider,
        private readonly jwtService: JwtService,
    ) { }

    @Post('login')
    async login(@Body() body: { email: string; password: string }) {
        const user = this.userProvider.validatePassword(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            },
        };
    }
}
