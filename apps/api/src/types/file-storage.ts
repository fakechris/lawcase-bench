import { ServiceResponse, ServiceMetrics } from './services.js';

export interface FileStorageServiceInterface {
  uploadFile(file: FileUpload, options?: UploadOptions): Promise<FileUploadResponse>;
  uploadFileFromUrl(
    url: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<FileUploadResponse>;
  downloadFile(fileId: string, options?: DownloadOptions): Promise<Buffer>;
  getFileUrl(fileId: string, options?: GetUrlOptions): Promise<string>;
  getFileInfo(fileId: string): Promise<FileInfo>;
  listFiles(filter?: FileFilter): Promise<FileInfo[]>;
  deleteFile(fileId: string): Promise<void>;
  copyFile(sourceFileId: string, destinationPath: string): Promise<FileUploadResponse>;
  moveFile(fileId: string, destinationPath: string): Promise<FileUploadResponse>;
  createFolder(path: string, options?: FolderOptions): Promise<FolderInfo>;
  listFolder(path: string, options?: ListFolderOptions): Promise<FolderContents>;
  deleteFolder(path: string, recursive?: boolean): Promise<void>;
  generatePresignedUrl(
    operation: 'upload' | 'download',
    fileId: string,
    expiresIn?: number
  ): Promise<PresignedUrl>;
  setFileMetadata(fileId: string, metadata: Record<string, any>): Promise<void>;
  getFileMetadata(fileId: string): Promise<Record<string, any>>;
  searchFiles(query: string, options?: SearchOptions): Promise<FileInfo[]>;
  getStorageStats(): Promise<StorageStats>;
  testConnection(): Promise<ServiceResponse<boolean>>;
  isAvailable(): boolean;
  getMetrics(): ServiceMetrics;
  resetMetrics(): void;
}

export interface FileUpload {
  name: string;
  content: Buffer | string;
  contentType?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface UploadOptions {
  path?: string;
  publicAccess?: boolean;
  contentType?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  encryption?: {
    algorithm: string;
    keyId?: string;
  };
  storageClass?: string;
  serverSideEncryption?: boolean;
  checksum?: string;
}

export interface DownloadOptions {
  version?: string;
  range?: {
    start: number;
    end: number;
  };
  includeMetadata?: boolean;
}

export interface GetUrlOptions {
  expiresIn?: number;
  version?: string;
  responseHeaders?: Record<string, string>;
}

export interface FileUploadResponse {
  fileId: string;
  name: string;
  path: string;
  size: number;
  contentType: string;
  etag?: string;
  versionId?: string;
  url?: string;
  publicUrl?: string;
  checksum?: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
  tags?: string[];
  storageClass?: string;
  cost?: number;
}

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  contentType: string;
  etag?: string;
  versionId?: string;
  isPublic: boolean;
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastModified?: Date;
  metadata?: Record<string, any>;
  tags?: string[];
  storageClass?: string;
  url?: string;
  publicUrl?: string;
  checksum?: string;
  owner?: string;
  permissions?: FilePermissions;
}

export interface FilePermissions {
  read: string[];
  write: string[];
  delete: string[];
}

export interface FileFilter {
  path?: string;
  prefix?: string;
  contentType?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  minSize?: number;
  maxSize?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  isPublic?: boolean;
  isFolder?: boolean;
  storageClass?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface FolderOptions {
  publicAccess?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface FolderInfo {
  id: string;
  name: string;
  path: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  totalSize: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface ListFolderOptions {
  recursive?: boolean;
  includeMetadata?: boolean;
  includeFolders?: boolean;
  includeFiles?: boolean;
  maxKeys?: number;
  marker?: string;
  delimiter?: string;
}

export interface FolderContents {
  path: string;
  files: FileInfo[];
  folders: FolderInfo[];
  isTruncated: boolean;
  nextMarker?: string;
  totalCount: number;
  totalSize: number;
}

export interface PresignedUrl {
  url: string;
  method: 'GET' | 'PUT' | 'POST' | 'DELETE';
  headers?: Record<string, string>;
  expiresAt: Date;
}

export interface SearchOptions {
  path?: string;
  recursive?: boolean;
  fileType?: 'file' | 'folder';
  contentType?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'name' | 'size' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  totalSizeFormatted: string;
  filesByType: Array<{
    type: string;
    count: number;
    size: number;
  }>;
  filesByStorageClass: Array<{
    class: string;
    count: number;
    size: number;
  }>;
  storageUsage: Array<{
    date: string;
    size: number;
  }>;
  cost?: number;
  currency?: string;
}
