// Simple test script to verify report generation endpoint
const http = require('http');

const postData = JSON.stringify({
    topic: 'The Future of AI',
    template: '# Introduction\\n\\n## Main Content\\n\\n## Conclusion',
    provider: 'openai',
    model: 'gpt-4o-mini'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/research/generate-report',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing report generation endpoint...');
console.log('Request:', postData);

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
        process.stdout.write('.');
    });

    res.on('end', () => {
        console.log('\n\nResponse received:');
        console.log(data.substring(0, 500));
        if (data.length > 500) {
            console.log(`... (${data.length} total bytes)`);
        }
    });
});

req.on('error', (e) => {
    console.error(`Error: ${e.message}`);
});

req.write(postData);
req.end();

console.log('Request sent, waiting for response...');
