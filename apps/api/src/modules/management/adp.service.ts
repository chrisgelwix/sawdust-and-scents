import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ADPEmployee {
  workerId: { idValue: string };
  person: {
    legalName: {
      givenName: string;
      familyName1: string;
    };
    communication: {
      emails: Array<{ emailUri: string }>;
    };
    workAssignment?: Array<{ jobTitle?: string }>;
  };
}

@Injectable()
export class ADPService {
  private readonly logger = new Logger(ADPService.name);
  private cachedToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(private config: ConfigService) {}

  async getAccessToken(): Promise<string> {
    // If we have a cached token that hasn't expired, use it
    if (
      this.cachedToken &&
      this.tokenExpiration &&
      new Date() < this.tokenExpiration
    ) {
      this.logger.debug('Using cached ADP access token');
      return this.cachedToken;
    }

    const clientId = this.config.get<string>('ADP_CLIENT_ID');
    const clientSecret = this.config.get<string>('ADP_CLIENT_SECRET');
    const adpTokenUrl =
      this.config.get<string>('ADP_TOKEN_URL') ||
      'htpps://accounts.asp.com/auth/oauth/v2/token';

    if (!clientId || !clientSecret) {
      throw new Error(
        'ADP credentials not configured. Set ADP_CLIENT_ID and ADP_CLIENT_SECRET in .evnv.local'
      );
    }

    try {
      this.logger.log('Requesting new access token from ADP');

      const response = await axios.post(
        adpTokenUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlendcoded',
          },
        }
      );

      this.cachedToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600; // Default to 1 hour

      // Calculate when the token will expire (with 5-minute buffer)
      this.tokenExpiration = new Date(Date.now() + (expiresIn - 300) * 1000);

      this.logger.log(
        `ADP access token obtained, expires at ${this.tokenExpiration.toISOString()}`
      );
      return this.cachedToken as string;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to obtain ADP access token', error);
      throw new Error(`ADP authentication failed: ${errorMessage}`);
    }
  }

  async getActiveEmployees(): Promise<ADPEmployee[]> {
    const token = await this.getAccessToken();
    const adpApiUrl =
      this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

    try {
      const response = await axios.get(`${adpApiUrl}/workers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          $filter:
            "workAssignment/assignmentStatus/statusCode/codeValue eq 'Active'",
          $select:
            'workerID,person/legalName,person/communication/emails,workAssignment',
        },
      });

      return response.data.workers || [];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch employees from ADP', error);
      throw new Error(`Failed to fetch ADP employees: ${errorMessage}`);
    }
  }

  /**
   * Get payroll data for a specific employee
   *
   * @param {string} employeeId - ADP employee ID
   * @returns {Promise<any>} Employee payroll data
   */
  async getEmployeePayroll(employeeId: string): Promise<any> {
    const token = await this.getAccessToken();
    const adpApiUrl =
      this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

    try {
      const response = await axios.get(
        `${adpApiUrl}/workers/${employeeId}/pay-statements`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch payroll for employee ${employeeId}`,
        error
      );
      throw new Error(`Failed to fetch employee payroll: ${errorMessage}`);
    }
  }

  /**
   * Get a summary of payroll status (for dashboard)
   *
   * @returns {Promise<any>} Payroll summary with processing runs
   */
  async getPayrollSummary(): Promise<any> {
    const token = await this.getAccessToken();
    const adpApiUrl =
      this.config.get<string>('ADP_API_URL') || 'https://api.adp.com/hr/v2';

    try {
      const response = await axios.get(`${adpApiUrl}/payroll/v1/pay-runs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          $filter: "payRunStatus/statusCode/codeValue eq 'Processing'",
          $top: 10,
        },
      });

      return {
        processingPayRuns: response.data.payRuns?.length || 0,
        lastPayRunDate: response.data.payRuns?.[0]?.payDate || null,
      };
    } catch (error) {
      this.logger.error('Failed to fetch payroll summary', error);
      return { processingPayRuns: 0, lastPayRunDate: null };
    }
  }
}
