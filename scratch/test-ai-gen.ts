import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { AiOrchestratorService } from '../apps/api/src/modules/ai/ai-orchestrator.service';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function test() {
  console.log('Testing AiOrchestratorService direct call...');
  const config = new ConfigService(process.env);
  const orchestrator = new AiOrchestratorService(config);

  try {
    const prompt = 'Generate 1 original GMAT Focus Quantitative question in JSON format with keys: stem, options (array of {id, label, text}), correctAnswer, explanation.';
    const response = await orchestrator.chat(
      'questionGeneration',
      [
        { role: 'system', content: 'You are an expert official GMAT question author. Return strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, maxTokens: 1000 }
    );
    console.log('SUCCESS! Model used:', response.model);
    console.log('CONTENT:\n', response.content);
  } catch (err: any) {
    console.error('ERROR during AI generation:', err.message || err);
    if (err.response) {
      console.error('Response data:', err.response.data);
    }
  }
}

test();
