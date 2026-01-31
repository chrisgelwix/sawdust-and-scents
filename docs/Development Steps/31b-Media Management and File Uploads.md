# Step 31b: Media Management and File Uploads (AWS S3)

## 1. The "Why" Behind This Step: The Gallery

Every e-commerce site needs photos. While you can use external URLs for development, a professional store needs to host its own images securely. **AWS S3** is the industry standard for storing millions of files reliably and cheaply.

**The Strategy**: We use the **AWS SDK** and **Multer** to handle uploads.
- **The Analogy**: S3 is a giant, infinite digital storage unit. Instead of keeping photos on your app's hard drive (which is small and expensive), you put them in the "S3 Warehouse" and just keep the "Ticket Number" (The URL) in your database.

---

## 2. Core Concepts & Definitions

### 2.1 S3 (Simple Storage Service)
- **Definition**: Amazon's service for storing files ("Objects").
- **Bucket**: A folder in S3 where your files live.

### 2.2 Multer
- **Definition**: Middleware for NestJS that handles "Multipart/form-data" (the technical format of a file upload).

---

## 3. Step-by-Step Implementation

### Step 3.1: Install AWS SDK

```bash
npm install @aws-sdk/client-s3 multer-s3 multer
```

### Step 3.2: Create the Media Service

**File**: `apps/api/src/modules/media/media.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

@Injectable()
export class MediaService {
  private s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  });

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const key = `products/${uuid()}-${file.originalname}`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
}
```

---

## 4. Checklist for Success
- [ ] **Bucket Policy**: Is your S3 bucket set to "Public Read" so customers can see the photos?
- [ ] **Optimization**: Are you compressing images before upload to save bandwidth?

---

**Moving Forward**: Our store looks great and handles photos. Now we need to make sure customers can find it on Google. Next is **SEO and Metadata (Step 31c)**.
