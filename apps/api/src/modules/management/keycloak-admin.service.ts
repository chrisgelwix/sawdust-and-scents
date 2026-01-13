import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface KeycloakUser {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
}

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private cachedAdminToken: string | null = null;
  private adminTokenExpiration: Date | null = null;

  constructor(private config: ConfigService) {}

  /**
   * Get Keycloak admin token
   *
   * Uses the master realm admin account to perform user management operations.
   * Token is cached to avoid excessive authentication requests.
   *
   * @returns {Promise<string>} Valid admin access token
   */
  async getAdminToken(): Promise<string> {
    // Check if we have a valid cached token
    if (
      this.cachedAdminToken &&
      this.adminTokenExpiration &&
      new Date() < this.adminTokenExpiration
    ) {
      this.logger.debug('Using cached Keycloak admin token');
      return this.cachedAdminToken as string;
    }

    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = 'master';
    const adminUser = this.config.get<string>('KEYCLOAK_ADMIN');
    const adminPassword = this.config.get<string>('KEYCLOAK_ADMIN_PASSWORD');

    if (!adminUser || !adminPassword) {
      throw new Error('Keycloak admin credentials not configured');
    }

    try {
      this.logger.log('Requesting Keycloak admin token');

      const response = await axios.post(
        `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUser,
          password: adminPassword,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.cachedAdminToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 300;
      this.adminTokenExpiration = new Date(
        Date.now() + (expiresIn - 60) * 1000
      );

      this.logger.log('Keycloak admin token obtained');
      return this.cachedAdminToken as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to obtain Keycloak admin token', error);
      throw new Error(`Keycloak admin authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Find a Keycloak user by email
   *
   * @param {string} email - User's email address
   * @returns {Promise<KeycloakUser | null>} User object or null if not found
   */
  async findUserByEmail(email: string): Promise<KeycloakUser | null> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    try {
      this.logger.debug(`Searching for user by email: ${email}`);
      const response = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        {
          params: { email, exact: true },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find user by email: ${email}`, error);
      throw new Error(`Failed to search for user: ${errorMessage}`);
    }
  }

  /**
   * Create a new Keycloak user
   *
   * @param {Partial<KeycloakUser>} userData - User data to create
   * @param {string} temporaryPassword - Initial password (user must change on first login)
   * @returns {Promise<string>} ID of the created user
   */
  async createUser(
    userData: Partial<KeycloakUser>,
    temporaryPassword: string
  ): Promise<string> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    const newUserData = {
      ...userData,
      credentials: [
        {
          type: 'password',
          value: temporaryPassword,
          temporary: true, // User must change on first login
        },
      ],
    };

    try {
      this.logger.log(`Creating Keycloak user: ${userData.email}`);
      const response = await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users`,
        newUserData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Extract user ID from Location header
      const locationHeader = response.headers.location;
      const userId = locationHeader?.split('/').pop();

      if (!userId) {
        throw new Error('Failed to extract user ID from response');
      }

      this.logger.log(
        `User created successfully: ${userData.email} (ID: ${userId})`
      );
      return userId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create user: ${userData.email}`, error);
      throw new Error(`Failed to create Keycloak user: ${errorMessage}`);
    }
  }

  /**
   * Update an existing Keycloak user
   *
   * @param {string} userId - Keycloak user ID
   * @param {Partial<KeycloakUser>} userData - Data to update
   * @returns {Promise<void>}
   */
  async updateUser(
    userId: string,
    userData: Partial<KeycloakUser>
  ): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    try {
      this.logger.debug(`Updating Keycloak user: ${userId}`);

      await axios.put(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`User updated successfully: ${userId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update user: ${userId}`, error);
      throw new Error(`Failed to update Keycloak user: ${errorMessage}`);
    }
  }

  /**
   * Assign a role to a user
   *
   * @param {string} userId - Keycloak user ID
   * @param {string} roleName - Name of the role to assign (e.g., 'worker', 'admin')
   * @returns {Promise<void>}
   */
  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');

    try {
      // Get the role definition
      const rolesResponse = await axios.get(
        `${keycloakUrl}/admin/realms/${realm}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const role = rolesResponse.data.find((r: any) => r.name === roleName);
      if (!role) {
        throw new Error(`Role '${roleName}' not found in realm`);
      }

      // Assign the role to the user
      await axios.post(
        `${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [role],
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Role '${roleName}' assigned to user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to assign role '${roleName}' to user ${userId}`,
        error
      );
      throw new Error(`Failed to assign role ${roleName} to user ${userId}`);
    }
  }

  /**
   * Generate a secure temporary password
   *
   * @param {number} length - Length of password (default: 16)
   * @returns {string} Random secure password
   */
  generateTemporaryPassword(length: number = 16): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
