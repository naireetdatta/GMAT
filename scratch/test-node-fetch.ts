import * as dotenv from 'dotenv';
import * as path from 'path';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testFetch() {
  const apiKey = process.env.AI_NVIDIA_API_KEY;
  console.log('Testing Node.js native fetch with key:', apiKey?.substring(0, 10) + '...');
  
  const startTime = Date.now();
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.2-11b-vision-instruct',
        messages: [
          { role: 'system', content: 'You are an expert official GMAT question author. Return strict JSON only.' },
          { role: 'user', content: 'Output 1 math question in JSON format.' }
        ],
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(10000),
    });

    console.log(`Fetch returned status: ${res.status} in ${Date.now() - startTime}ms`);
    const data = await res.json();
    console.log('Response content:', data.choices?.[0]?.message?.content);
  } catch (err: any) {
    console.error(`Fetch failed in ${Date.now() - startTime}ms:`, err.message || err);
  }
}

testFetch();
