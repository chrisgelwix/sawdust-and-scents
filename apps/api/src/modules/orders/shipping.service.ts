import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Shippo } from 'shippo';

@Injectable()
export class ShippingService {
  private shippoClient: any;
  private warehouseAddress: any;

  constructor(private config: ConfigService) {
    // Correctly initialize the Shippo client for version 2.x
    this.shippoClient = new Shippo({
      apiKeyHeader: this.config.get('SHIPPO_API_KEY') as string,
    });

    this.warehouseAddress = {
      name: this.config.get('WAREHOUSE_NAME'),
      street1: this.config.get('WAREHOUSE_STREET'),
      city: this.config.get('WAREHOUSE_CITY'),
      state: this.config.get('WAREHOUSE_STATE'),
      zip: this.config.get('WAREHOUSE_ZIP'),
      country: this.config.get('WAREHOUSE_COUNTRY'),
      phone: this.config.get('WAREHOUSE_PHONE'),
    };
  }

  async createShipment(orderData: any) {
    // 1. Build the shipping address from the order
    const addressTo = {
      name: orderData.shippingName || 'Customer',
      street1: orderData.shippingStreet1 || '123 Main St',
      city: orderData.shippingCity || 'Anytown',
      state: orderData.shippingState || 'CA',
      zip: orderData.shippingZip || '90210',
      country: orderData.shippingCountry || 'US',
      phone: orderData.shippingPhone || '555-0000',
    };

    // 2. Send order details to Shippo
    const shipment = await this.shippoClient.shipments.create({
      addressFrom: this.warehouseAddress,
      addressTo,
      parcels: [
        {
          length: '10',
          width: '10',
          height: '10',
          distanceUnit: 'in',
          weight: '2',
          massUnit: 'lb',
        },
      ],
    });

    // 3. Return the rates found for this shipment
    return shipment.rates;
  }

  async purchaseLabel(rateId: string) {
    // 3. Buy the shipping label for the chosen rate
    return this.shippoClient.transactions.create({
      rate: rateId,
      labelFileType: 'PDF',
      async: false,
    });
  }

  async getTrackingStatus(carrier: string, trackingNumber: string) {
    // 4. Ask Shippo for the current location of the package
    return this.shippoClient.trackingStatus.get(trackingNumber, carrier);
  }
}
