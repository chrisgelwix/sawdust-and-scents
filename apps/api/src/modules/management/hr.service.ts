import { Injectable, Logger } from '@nestjs/common';
import { ADPService, ADPEmployee } from './adp.service';
import { KeycloakAdminService } from './keycloak-admin.service';

export interface SyncStats {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class HRService {
  private readonly logger = new Logger(HRService.name);

  constructor(
    private adpService: ADPService,
    private keycloakAdminService: KeycloakAdminService
  ) {}

  /**
   * Sync Employees from ADP to Keycloak
   *
   * The Synchronization Flow:
   * 1. Fetch all active employees from ADP (via ADPService)
   * 2. For each employee:
   *    a. Check if they exist in Keycloak (via KeycloakAdminService)
   *    b. If not, create a new Keycloak user with 'worker' role
   *    c. If yes, update their information if needed
   * 3. Return statistics about the sync operation
   *
   * @returns {Promise<SyncStats>} Statistics about created, updated, and skipped users
   */
  async syncEmployees(): Promise<SyncStats> {
    this.logger.log('Starting employee sync from ADP to Keycloak');

    const stats: SyncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Step 1: Get all active workers from ADP
      const workers = await this.adpService.getActiveEmployees();
      this.logger.log(`Found ${workers.length} active workers in ADP`);

      // Step 2: Process each worker
      for (const worker of workers) {
        // Extract identifiers (outside try block for error handling)
        const adpId = worker.workerId?.idValue;
        const email = worker.person?.communication?.emails?.[0]?.emailUri;

        try {
          // Extract worker information
          const firstName = worker.person?.legalName?.givenName;
          const lastName = worker.person?.legalName?.familyName1;
          const jobTitle = worker.person?.workAssignment?.[0]?.jobTitle;

          // Validate required fields
          if (!adpId || !email) {
            this.logger.warn(`Skipping worker without ADP ID or email`);
            stats.skipped++;
            stats.errors.push(`Missing data for worker: ${adpId || 'unknown'}`);
            continue;
          }

          // Check if user already exists in Keycloak
          const existingUser =
            await this.keycloakAdminService.findUserByEmail(email);

          if (existingUser) {
            // User exists - update their information
            this.logger.debug(
              `User ${email} already exists in Keycloak, updating...`
            );

            await this.keycloakAdminService.updateUser(existingUser.id!, {
              firstName,
              lastName,
              email,
              attributes: {
                adpId: [adpId],
                jobTitle: [jobTitle || ''],
                syncedAt: [new Date().toISOString()],
              },
            });

            stats.updated++;
          } else {
            // User doesn't exist - create new user
            this.logger.log(`Creating new Keycloak user for ${email}`);

            const temporaryPassword =
              this.keycloakAdminService.generateTemporaryPassword();

            const userId = await this.keycloakAdminService.createUser(
              {
                username: email.split('@')[0] + '_worker',
                email,
                firstName,
                lastName,
                enabled: true,
                emailVerified: true,
                attributes: {
                  adpId: [adpId],
                  jobTitle: [jobTitle || ''],
                  syncedAt: [new Date().toISOString()],
                },
              },
              temporaryPassword
            );

            // Assign 'worker' role to the new user
            await this.keycloakAdminService.assignRole(userId, 'worker');

            stats.created++;
          }
        } catch (workerError) {
          const errorMessage =
            workerError instanceof Error
              ? workerError.message
              : 'Unknown error';
          this.logger.error(
            `Failed to sync worker: ${errorMessage}`,
            workerError
          );
          stats.skipped++;
          stats.errors.push(`${email || 'unknown'}: ${errorMessage}`);
        }
      }

      this.logger.log(`Employee sync complete: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Employee sync failed', error);
      throw new Error(`Failed to sync employees from ADP: ${errorMessage}`);
    }
  }

  /**
   * Get payroll data for an employee (delegates to ADPService)
   *
   * @param {string} employeeId - ADP employee ID
   * @returns {Promise<any>} Employee payroll data
   */
  async getEmployeePayroll(employeeId: string): Promise<any> {
    return this.adpService.getEmployeePayroll(employeeId);
  }

  /**
   * Get payroll summary for dashboard (delegates to ADPService)
   *
   * @returns {Promise<any>} Payroll summary
   */
  async getPayrollSummary(): Promise<any> {
    return this.adpService.getPayrollSummary();
  }
}
