import { Injectable, ConflictException } from '@nestjs/common';
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

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Finds an existing user by keycloakId, or creates a new PostgreSQL
   * record from the Keycloak token data on first access.
   * This ensures every authenticated Keycloak user has a corresponding
   * row in the users table.
   */
  async findOrCreateByKeycloakId(
    keycloakId: string,
    email?: string
  ): Promise<User> {
    const existing = await this.findByKeycloakId(keycloakId);
    if (existing) return existing;

    const user = this.userRepository.create({
      keycloakId,
      email: email || `${keycloakId}@unset.local`,
    });
    return this.userRepository.save(user);
  }

  async updateProfile(
    keycloakId: string,
    updateData: Partial<User>
  ): Promise<User> {
    // Ensure the user exists before updating
    await this.findOrCreateByKeycloakId(keycloakId);
    await this.userRepository.update({ keycloakId }, updateData);
    return (await this.findByKeycloakId(keycloakId)) ?? new User();
  }

  async createGuest(data: {
    email: string;
    phoneNumber?: string;
  }): Promise<User> {
    // Check if email already belongs to an existing user
    const existingByEmail = await this.findByEmail(data.email);
    if (existingByEmail) {
      throw new ConflictException(
        'A user with this email already exists. Please sign in instead.'
      );
    }

    // Check if phone number is already taken
    if (data.phoneNumber) {
      const existingByPhone = await this.userRepository.findOne({
        where: { phoneNumber: data.phoneNumber },
      });
      if (existingByPhone) {
        throw new ConflictException(
          'A user with this phone number already exists.'
        );
      }
    }

    const guest = this.userRepository.create({
      email: data.email,
      phoneNumber: data.phoneNumber || undefined,
      // keycloakId is left null → marks this user as a guest
    });

    return this.userRepository.save(guest);
  }
}
