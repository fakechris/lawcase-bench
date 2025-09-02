import { Readable } from 'stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { ServiceConfigManager } from '../config/service-config.js';
import {
  FileStorageServiceInterface,
  FileUpload,
  UploadOptions,
  DownloadOptions,
  GetUrlOptions,
  FileUploadResponse,
  FileInfo,
  FileFilter,
  FolderOptions,
  FolderInfo,
  ListFolderOptions,
  FolderContents,
  PresignedUrl,
  SearchOptions,
  StorageStats,
} from '../types/file-storage.js';
import { ServiceConfig, ServiceResponse } from '../types/services.js';

import { BaseService } from './base.service.js';

export class AWSS3StorageService extends BaseService implements FileStorageServiceInterface {
  private client: S3Client;
  private configManager: ServiceConfigManager;
  private bucketName: string;

  constructor(config?: ServiceConfig) {
    const serviceConfig = config || ServiceConfigManager.getInstance().getConfig('fileStorage');
    super(serviceConfig);
    this.configManager = ServiceConfigManager.getInstance();
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'lawcase-bench';

    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: this.config.apiKey!,
        secretAccessKey: this.config.apiSecret!,
      },
    });
  }

  async testConnection(): Promise<ServiceResponse<boolean>> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: 'connection-test',
        })
      );

      return true;
    }, 'testConnection');
  }

  async uploadFile(file: FileUpload, options?: UploadOptions): Promise<FileUploadResponse> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const key = options?.path ? `${options.path}/${file.name}` : file.name;
      const content = typeof file.content === 'string' ? Buffer.from(file.content) : file.content;

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: options?.contentType || file.contentType || 'application/octet-stream',
        Metadata: {
          ...file.metadata,
          ...options?.metadata,
          'original-name': file.name,
        },
        Tagging: options?.tags ? options.tags.map((tag) => `${tag}=true`).join('&') : undefined,
        ServerSideEncryption: options?.serverSideEncryption ? 'AES256' : undefined,
        StorageClass: options?.storageClass || 'STANDARD',
        ACL: options?.publicAccess ? 'public-read' : 'private',
      });

      const result = await this.client.send(uploadCommand);

      return {
        fileId: result.ETag?.replace(/"/g, '') || key,
        name: file.name,
        path: key,
        size: file.size || content.length,
        contentType: options?.contentType || file.contentType || 'application/octet-stream',
        etag: result.ETag,
        uploadedAt: new Date(),
        metadata: {
          ...file.metadata,
          ...options?.metadata,
        },
        tags: options?.tags,
        storageClass: options?.storageClass || 'STANDARD',
        url: options?.publicAccess
          ? `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
          : undefined,
      };
    }, 'uploadFile');
  }

  async uploadFileFromUrl(
    url: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`);
      }

      const content = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const fileName = destinationPath.split('/').pop() || 'file';

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: destinationPath,
        Body: content,
        ContentType: options?.contentType || contentType,
        Metadata: {
          ...options?.metadata,
          'source-url': url,
          'original-name': fileName,
        },
        Tagging: options?.tags ? options.tags.map((tag) => `${tag}=true`).join('&') : undefined,
        ServerSideEncryption: options?.serverSideEncryption ? 'AES256' : undefined,
        StorageClass: options?.storageClass || 'STANDARD',
        ACL: options?.publicAccess ? 'public-read' : 'private',
      });

      const result = await this.client.send(uploadCommand);

      return {
        fileId: result.ETag?.replace(/"/g, '') || destinationPath,
        name: fileName,
        path: destinationPath,
        size: content.length,
        contentType: options?.contentType || contentType,
        etag: result.ETag,
        uploadedAt: new Date(),
        metadata: {
          ...options?.metadata,
          'source-url': url,
        },
        tags: options?.tags,
        storageClass: options?.storageClass || 'STANDARD',
        url: options?.publicAccess
          ? `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationPath}`
          : undefined,
      };
    }, 'uploadFileFromUrl');
  }

  async downloadFile(fileId: string, options?: DownloadOptions): Promise<Buffer> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
        VersionId: options?.version,
        Range: options?.range ? `bytes=${options.range.start}-${options.range.end}` : undefined,
      });

      const result = await this.client.send(getObjectCommand);

      if (!result.Body) {
        throw new Error('File not found');
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of result.Body as Readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    }, 'downloadFile');
  }

  async getFileUrl(fileId: string, options?: GetUrlOptions): Promise<string> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
        VersionId: options?.version,
        ResponseCacheControl: options?.responseHeaders?.['Cache-Control'],
        ResponseContentDisposition: options?.responseHeaders?.['Content-Disposition'],
        ResponseContentEncoding: options?.responseHeaders?.['Content-Encoding'],
        ResponseContentLanguage: options?.responseHeaders?.['Content-Language'],
        ResponseContentType: options?.responseHeaders?.['Content-Type'],
        ResponseExpires: options?.responseHeaders?.['Expires'],
      });

      const expiresIn = options?.expiresIn || 3600; // Default 1 hour
      const url = await getSignedUrl(this.client, getObjectCommand, { expiresIn });

      return url;
    }, 'getFileUrl');
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      });

      const result = await this.client.send(headObjectCommand);

      return {
        id: fileId,
        name: fileId.split('/').pop() || 'file',
        path: fileId,
        size: result.ContentLength || 0,
        contentType: result.ContentType || 'application/octet-stream',
        etag: result.ETag?.replace(/"/g, ''),
        isPublic: false,
        isFolder: false,
        createdAt: result.LastModified || new Date(),
        updatedAt: result.LastModified || new Date(),
        lastModified: result.LastModified,
        metadata: result.Metadata,
        storageClass: result.StorageClass,
      };
    }, 'getFileInfo');
  }

  async listFiles(filter?: FileFilter): Promise<FileInfo[]> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const params: any = {
        Bucket: this.bucketName,
        MaxKeys: filter?.limit || 1000,
      };

      if (filter?.prefix) {
        params.Prefix = filter.prefix;
      }

      if (filter?.path) {
        params.Prefix = filter.path;
      }

      const result = await this.client.send(new ListObjectsV2Command(params));

      const files: FileInfo[] = [];

      if (result.Contents) {
        for (const obj of result.Contents) {
          if (!obj.Key) continue;

          // Skip folders (objects ending with /)
          if (obj.Key.endsWith('/')) continue;

          const file: FileInfo = {
            id: obj.Key,
            name: obj.Key.split('/').pop() || 'file',
            path: obj.Key,
            size: obj.Size || 0,
            contentType: 'application/octet-stream',
            etag: obj.ETag?.replace(/"/g, ''),
            isPublic: false,
            isFolder: false,
            createdAt: obj.LastModified || new Date(),
            updatedAt: obj.LastModified || new Date(),
            lastModified: obj.LastModified,
            storageClass: obj.StorageClass,
          };

          // Apply filters
          if (filter?.contentType && file.contentType !== filter.contentType) continue;
          if (filter?.minSize && file.size < filter.minSize) continue;
          if (filter?.maxSize && file.size > filter.maxSize) continue;
          if (filter?.createdAfter && file.createdAt < filter.createdAfter) continue;
          if (filter?.createdBefore && file.createdAt > filter.createdBefore) continue;
          if (
            filter?.modifiedAfter &&
            file.lastModified &&
            file.lastModified < filter.modifiedAfter
          )
            continue;
          if (
            filter?.modifiedBefore &&
            file.lastModified &&
            file.lastModified > filter.modifiedBefore
          )
            continue;
          if (filter?.storageClass && file.storageClass !== filter.storageClass) continue;

          files.push(file);
        }
      }

      // Sort results
      if (filter?.sortBy) {
        files.sort((a, b) => {
          const aValue = a[filter.sortBy!];
          const bValue = b[filter.sortBy!];
          const sortOrder = filter.sortOrder === 'desc' ? -1 : 1;

          if (aValue < bValue) return -1 * sortOrder;
          if (aValue > bValue) return 1 * sortOrder;
          return 0;
        });
      }

      return files;
    }, 'listFiles');
  }

  async deleteFile(fileId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      });

      await this.client.send(deleteObjectCommand);
    }, 'deleteFile');
  }

  async copyFile(sourceFileId: string, destinationPath: string): Promise<FileUploadResponse> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const copyObjectCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceFileId}`,
        Key: destinationPath,
      });

      const result = await this.client.send(copyObjectCommand);

      return {
        fileId: result.CopyObjectResult?.ETag?.replace(/"/g, '') || destinationPath,
        name: destinationPath.split('/').pop() || 'file',
        path: destinationPath,
        size: 0,
        contentType: 'application/octet-stream',
        etag: result.CopyObjectResult?.ETag?.replace(/"/g, ''),
        uploadedAt: new Date(),
      };
    }, 'copyFile');
  }

  async moveFile(fileId: string, destinationPath: string): Promise<FileUploadResponse> {
    return this.executeWithRetry(async () => {
      // Copy the file to the new location
      const copyResult = await this.copyFile(fileId, destinationPath);

      // Delete the original file
      await this.deleteFile(fileId);

      return copyResult;
    }, 'moveFile');
  }

  async createFolder(path: string, options?: FolderOptions): Promise<FolderInfo> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      // Create a folder by creating an empty object with a trailing slash
      const folderPath = path.endsWith('/') ? path : `${path}/`;

      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: folderPath,
        Body: '',
        ContentType: 'application/x-directory',
        Metadata: options?.metadata,
        Tagging: options?.tags ? options.tags.map((tag) => `${tag}=true`).join('&') : undefined,
        ACL: options?.publicAccess ? 'public-read' : 'private',
      });

      await this.client.send(putObjectCommand);

      return {
        id: folderPath,
        name: path.split('/').pop() || 'folder',
        path: folderPath,
        isPublic: options?.publicAccess || false,
        createdAt: new Date(),
        updatedAt: new Date(),
        itemCount: 0,
        totalSize: 0,
        metadata: options?.metadata,
        tags: options?.tags,
      };
    }, 'createFolder');
  }

  async listFolder(path: string, options?: ListFolderOptions): Promise<FolderContents> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const prefix = path.endsWith('/') ? path : `${path}/`;
      const delimiter = options?.delimiter || '/';

      const params: any = {
        Bucket: this.bucketName,
        Prefix: prefix,
        Delimiter: delimiter,
        MaxKeys: options?.maxKeys || 1000,
      };

      if (options?.marker) {
        params.ContinuationToken = options.marker;
      }

      const result = await this.client.send(new ListObjectsV2Command(params));

      const files: FileInfo[] = [];
      const folders: FolderInfo[] = [];

      // Process files
      if (result.Contents) {
        for (const obj of result.Contents) {
          if (!obj.Key) continue;
          if (obj.Key === prefix) continue; // Skip the folder itself

          // Skip folders (objects ending with /)
          if (obj.Key.endsWith('/')) continue;

          files.push({
            id: obj.Key,
            name: obj.Key.split('/').pop() || 'file',
            path: obj.Key,
            size: obj.Size || 0,
            contentType: 'application/octet-stream',
            etag: obj.ETag?.replace(/"/g, ''),
            isPublic: false,
            isFolder: false,
            createdAt: obj.LastModified || new Date(),
            updatedAt: obj.LastModified || new Date(),
            lastModified: obj.LastModified,
            storageClass: obj.StorageClass,
          });
        }
      }

      // Process folders
      if (result.CommonPrefixes) {
        for (const prefix of result.CommonPrefixes) {
          if (!prefix.Prefix) continue;

          const folderPath = prefix.Prefix;
          const folderName = folderPath.replace(/\/$/, '').split('/').pop() || 'folder';

          folders.push({
            id: folderPath,
            name: folderName,
            path: folderPath,
            isPublic: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            itemCount: 0,
            totalSize: 0,
          });
        }
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        path,
        files,
        folders,
        isTruncated: result.IsTruncated || false,
        nextMarker: result.NextContinuationToken,
        totalCount: files.length + folders.length,
        totalSize,
      };
    }, 'listFolder');
  }

  async deleteFolder(path: string, recursive?: boolean): Promise<void> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const folderPath = path.endsWith('/') ? path : `${path}/`;

      if (recursive) {
        // List all objects in the folder
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: folderPath,
        });

        const result = await this.client.send(listCommand);

        if (result.Contents) {
          // Delete all objects in the folder
          for (const obj of result.Contents) {
            if (obj.Key) {
              await this.deleteFile(obj.Key);
            }
          }
        }
      }

      // Delete the folder itself
      await this.deleteFile(folderPath);
    }, 'deleteFolder');
  }

  async generatePresignedUrl(
    operation: 'upload' | 'download',
    fileId: string,
    expiresIn?: number
  ): Promise<PresignedUrl> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const actualExpiresIn = expiresIn || 3600; // Default 1 hour

      if (operation === 'download') {
        const getObjectCommand = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        });

        const url = await getSignedUrl(this.client, getObjectCommand, {
          expiresIn: actualExpiresIn,
        });

        return {
          url,
          method: 'GET',
          expiresAt: new Date(Date.now() + actualExpiresIn * 1000),
        };
      } else {
        const putObjectCommand = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        });

        const url = await getSignedUrl(this.client, putObjectCommand, {
          expiresIn: actualExpiresIn,
        });

        return {
          url,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          expiresAt: new Date(Date.now() + actualExpiresIn * 1000),
        };
      }
    }, 'generatePresignedUrl');
  }

  async setFileMetadata(fileId: string, metadata: Record<string, any>): Promise<void> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      // To update metadata, we need to copy the object to itself with new metadata
      const copyObjectCommand = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${fileId}`,
        Key: fileId,
        Metadata: metadata,
        MetadataDirective: 'REPLACE',
      });

      await this.client.send(copyObjectCommand);
    }, 'setFileMetadata');
  }

  async getFileMetadata(fileId: string): Promise<Record<string, any>> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileId,
      });

      const result = await this.client.send(headObjectCommand);

      return result.Metadata || {};
    }, 'getFileMetadata');
  }

  async searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const prefix = options?.path || '';
      const files = await this.listFiles({
        prefix,
        limit: options?.limit || 100,
      });

      // Simple search by filename
      const searchResults = files.filter((file) =>
        file.name.toLowerCase().includes(query.toLowerCase())
      );

      return searchResults;
    }, 'searchFiles');
  }

  async getStorageStats(): Promise<StorageStats> {
    return this.executeWithRetry(async () => {
      this.validateConfig();

      const files = await this.listFiles();

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      // Group by content type
      const filesByType = new Map<string, { count: number; size: number }>();
      const filesByStorageClass = new Map<string, { count: number; size: number }>();

      for (const file of files) {
        const type = file.contentType || 'unknown';
        const storageClass = file.storageClass || 'STANDARD';

        const typeStats = filesByType.get(type) || { count: 0, size: 0 };
        typeStats.count++;
        typeStats.size += file.size;
        filesByType.set(type, typeStats);

        const classStats = filesByStorageClass.get(storageClass) || { count: 0, size: 0 };
        classStats.count++;
        classStats.size += file.size;
        filesByStorageClass.set(storageClass, classStats);
      }

      return {
        totalFiles,
        totalFolders: 0, // Would need to count folders separately
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        filesByType: Array.from(filesByType.entries()).map(([type, stats]) => ({
          type,
          count: stats.count,
          size: stats.size,
        })),
        filesByStorageClass: Array.from(filesByStorageClass.entries()).map(
          ([classType, stats]) => ({
            class: classType,
            count: stats.count,
            size: stats.size,
          })
        ),
        storageUsage: [
          {
            date: new Date().toISOString().split('T')[0],
            size: totalSize,
          },
        ],
      };
    }, 'getStorageStats');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private validateConfig(): void {
    super.validateConfig();

    if (!this.config.apiKey) {
      throw new Error('AWS Access Key ID is required');
    }

    if (!this.config.apiSecret) {
      throw new Error('AWS Secret Access Key is required');
    }

    if (!this.bucketName) {
      throw new Error('AWS S3 bucket name is required');
    }
  }
}
