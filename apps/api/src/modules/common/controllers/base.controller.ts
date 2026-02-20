import { UsersService } from '../../users/users.service';

export abstract class BaseController {
  constructor(protected readonly usersService: UsersService) {}

  /**
   * Resolves a Keycloak subject ID (from JWT) to the internal database User ID.
   * This ensures that all service operations use the consistent internal ID.
   */
  protected async resolveUserId(keycloakSub: string): Promise<string> {
    const user = await this.usersService.findOrCreateByKeycloakId(keycloakSub);
    return user.id;
  }
}
