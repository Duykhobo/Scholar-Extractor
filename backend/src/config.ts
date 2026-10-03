import dotenv from 'dotenv';
import path from 'path';

// Load .env tu thu muc goc backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  serpApiKey: process.env.SERPAPI_KEY || '',
  serpApiBaseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com/search.json',
  workspaceDir: process.env.WORKSPACE_DIR || path.resolve(__dirname, '../../'),
  isKeyConfigured(): boolean {
    return Boolean(this.serpApiKey && this.serpApiKey.trim().length > 0);
  }
};
