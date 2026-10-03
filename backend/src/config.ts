import dotenv from 'dotenv';
import path from 'path';

// Load .env tu thu muc goc backend
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  serpApiKey: process.env.SERPAPI_KEY || '',
  serpApiBaseUrl: 'https://serpapi.com/search.json',
  isKeyConfigured(): boolean {
    return Boolean(this.serpApiKey && this.serpApiKey.trim().length > 0);
  }
};
