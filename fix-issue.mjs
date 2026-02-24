import fs from 'fs';
import path from 'path';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ISSUE_TITLE = process.env.ISSUE_TITLE || 'Unknown Issue';
const ISSUE_BODY = process.env.ISSUE_BODY || 'No description provided';

function getAllFiles(dir, extensions) {
  extensions = extensions || ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md'];
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.next', '.github'].includes(file)) {
          results = results.concat(getAllFiles(filePath, extensions));
        }
      } else if (extensions.some(function(ext) { return file.endsWith(ext); })) {
        results.push(filePath);
      }
    }
  } catch (e) {}
  return results;
}

function readFileSafe(filePath, maxSize) {
  maxSize = maxSize || 6000;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.length > maxSize ? content.slice(0, maxSize) + '\n...(truncated)' : content;
  } catch (e) {
    return '';
  }
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function callOpenAI(prompt, maxRetries) {
  maxRetries = maxRetries || 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log('Attempt ' + attempt + '/' + maxRetries + '...');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + OPENAI_API_KEY
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that fixes GitHub issues. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 16384
        })
      });

      console.log('API status:', response.status);

      if (response.status === 429) {
        console.log('Rate limited. Waiting 30 seconds...');
        if (attempt < maxRetries) {
          await sleep(30000);
          continue;
        }
        throw new Error('Rate limited after all retries');
      }

      if (!response.ok) {
        const err = await response.text();
        console.log('Error:', err);
        if (attempt < maxRetries) {
          await sleep(5000);
          continue;
        }
        throw new Error('API error: ' + err);
      }

      const json = await response.json();
      if (json.error) {
        console.log('API error:', json.error.message);
        throw new Error(json.error.message);
      }

      const text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
      if (text) {
        console.log('Success with OpenAI GPT-4o-mini');
        return text;
      }
    } catch (e) {
      console.log('Error: ' + e.message);
      if (attempt === maxRetries) throw e;
    }
  }
  throw new Error('All attempts failed');
}

async function main() {
  console.log('=== Auto Fix Issue ===');
  console.log('Issue:', ISSUE_TITLE);
  console.log('API Key exists:', !!OPENAI_API_KEY);

  const files = getAllFiles('.');
  console.log('Found', files.length, 'files');

  let codeContext = '';
  const filesToProcess = files.slice(0, 20);
  for (const file of filesToProcess) {
    const content = readFileSafe(file);
    if (content) {
      codeContext += '\n### ' + file + '\n```\n' + content + '\n```\n';
    }
  }

  const prompt = 'Fix this GitHub issue by modifying files.\n\n' +
    'Issue: ' + ISSUE_TITLE + '\n' + ISSUE_BODY + '\n\n' +
    'Files:\n' + codeContext + '\n\n' +
    'Reply with ONLY valid JSON (no markdown):\n' +
    '{"path":"file.md","content":"full file content","summary":"what you fixed"}\n\n' +
    'Rules:\n' +
    '- One file only\n' +
    '- Full content, no diffs\n' +
    '- No markdown code blocks';

  console.log('Calling OpenAI...');
  const response = await callOpenAI(prompt);
  console.log('Response length:', response.length);
  console.log('Response preview:', response.substring(0, 300));

  var jsonStr = response.trim();
  if (jsonStr.startsWith('```')) {
    var jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];
  }

  console.log('Parsing JSON...');
  var fix = JSON.parse(jsonStr);
  console.log('Summary:', fix.summary);

  var changed = [];
  if (fix.path && fix.content) {
    var dir = path.dirname(fix.path);
    if (dir !== '.') fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fix.path, fix.content);
    changed.push(fix.path);
    console.log('Modified:', fix.path);
  }

  fs.writeFileSync('fix-result.json', JSON.stringify({
    success: changed.length > 0,
    summary: fix.summary,
    filesChanged: changed
  }));
}

main().catch(function(err) {
  console.error('Error:', err.message);
  fs.writeFileSync('fix-result.json', JSON.stringify({ success: false, reason: err.message }));
  process.exit(1);
});
