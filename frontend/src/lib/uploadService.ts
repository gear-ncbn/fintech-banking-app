import { apiClient } from '@/lib/api/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface UploadedFile {
  filename: string;
  file_type: string;
  file_size: number;
  url: string;
  uploaded_at: string;
}

export const uploadService = {
  async uploadMessageAttachment(file: File): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/uploads/message-attachment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiClient.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload file');
    }

    return response.json();
  },

  async uploadMultiple(files: File[]): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => this.uploadMessageAttachment(file));
    return Promise.all(uploadPromises);
  },

  getFileUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    return `${API_BASE_URL}${path}`;
  }
};