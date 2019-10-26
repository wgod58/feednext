import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/Service/users.service';
import { JwtService } from '@nestjs/jwt';
import { configService } from '../../shared/Config/config.service';
import { CreateUserDto } from '../../users/Dto/create-user.dto';
import { UserEntity } from '../../users/Entity/users.entity';
import { LoginDto } from '../Dto/login.dto';
import * as moment from 'moment';
import { RedisService } from '../../shared/Redis/redis.service';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UsersService,
                private readonly jwtService: JwtService,
                private readonly redisService: RedisService,
    ) {}

    async validateUser(dto: LoginDto): Promise<any> {
        const user = await this.userService.userValidation(dto.email, dto.username, dto.password);
        if (!user) {
            throw new UnauthorizedException('User does not exist.');
        }
        return user;
    }

    async createToken(userEntity: UserEntity): Promise<any> {
        return {
          expiresIn: configService.get('JWT_EXPIRATION_TIME'),
          accessToken: this.jwtService.sign({_id: userEntity._id}),
          user: userEntity,
        };
    }

    async killToken(token: string) {
        const decodedToken = await this.jwtService.decode(token);
        // tslint:disable-next-line:no-string-literal
        const expireDate =  await  moment(decodedToken['exp'] * 1000);
        const remainingRawTime = await moment.duration(expireDate.diff(moment()));
        const remainingSeconds = await Math.round(remainingRawTime.asSeconds());

        // tslint:disable-next-line:no-string-literal
        this.redisService.setData(decodedToken['_id'], token, remainingSeconds);
    }

    async register(dto: CreateUserDto): Promise<any> {
        return await this.userService.create(dto);
    }
}
