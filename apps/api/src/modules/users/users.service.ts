import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByKeycloakId(keycloakId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { keycloakId } });
  }

  async updateProfile(keycloakId: string, updateData: Partial<User>): Promise<User | null> {
    await this.userRepository.update({ keycloakId }, updateData);
    return this.findByKeycloakId(keycloakId);
  }
}
