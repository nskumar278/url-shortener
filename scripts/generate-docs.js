#!/usr/bin/env node

/**
 * API Documentation Generation Script
 * 
 * This script generates various formats of API documentation:
 * 1. OpenAPI 3.0 JSON specification
 * 2. Static HTML documentation
 * 3. Postman collection
 * 4. README with API overview
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure TypeScript compilation is up to date
console.log('🔨 Compiling TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Import the compiled Swagger spec
const swaggerSpec = require('../dist/configs/swagger.js').default;

// Create docs directory
const docsDir = path.join(__dirname, '../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Generate OpenAPI JSON spec
console.log('📄 Generating OpenAPI specification...');
fs.writeFileSync(
  path.join(docsDir, 'openapi.json'),
  JSON.stringify(swaggerSpec, null, 2)
);

// Generate OpenAPI YAML spec
console.log('📄 Generating OpenAPI YAML specification...');
const yaml = require('js-yaml');
fs.writeFileSync(
  path.join(docsDir, 'openapi.yaml'),
  yaml.dump(swaggerSpec)
);

// Generate Postman collection
console.log('📦 Generating Postman collection...');
const postmanCollection = {
  info: {
    name: swaggerSpec.info.title,
    version: swaggerSpec.info.version,
    description: swaggerSpec.info.description,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  variable: [
    {
      key: 'baseUrl',
      value: swaggerSpec.servers[0].url,
      type: 'string'
    }
  ],
  item: []
};

// Convert Swagger paths to Postman requests
Object.entries(swaggerSpec.paths || {}).forEach(([path, methods]) => {
  Object.entries(methods).forEach(([method, operation]) => {
    if (method === 'parameters') return;
    
    const request = {
      name: operation.summary || `${method.toUpperCase()} ${path}`,
      request: {
        method: method.toUpperCase(),
        header: [
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ],
        url: {
          raw: `{{baseUrl}}${path}`,
          host: ['{{baseUrl}}'],
          path: path.split('/').filter(p => p)
        }
      }
    };

    // Add request body for POST/PUT requests
    if (operation.requestBody && operation.requestBody.content['application/json']) {
      const schema = operation.requestBody.content['application/json'].schema;
      if (schema.example) {
        request.request.body = {
          mode: 'raw',
          raw: JSON.stringify(schema.example, null, 2)
        };
      }
    }

    postmanCollection.item.push(request);
  });
});

fs.writeFileSync(
  path.join(docsDir, 'postman-collection.json'),
  JSON.stringify(postmanCollection, null, 2)
);


console.log('✅ Documentation generation completed!');
console.log('\n📁 Generated files:');
console.log('  📄 docs/openapi.json - OpenAPI 3.0 JSON specification');
console.log('  📄 docs/openapi.yaml - OpenAPI 3.0 YAML specification');
console.log('  📦 docs/postman-collection.json - Postman collection');
