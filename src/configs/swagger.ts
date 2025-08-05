import { Application } from 'express';
import env from './env';

// Conditional imports - only load in development
let swaggerJSDoc: any;
let swaggerUi: any;
let redoc: any;

// Only import swagger packages in non-production environments
if (!env.isProduction()) {
  try {
    swaggerJSDoc = require('swagger-jsdoc');
    swaggerUi = require('swagger-ui-express');
    redoc = require('redoc-express');
  } catch (error) {
    console.warn('⚠️  Swagger packages not found. Install devDependencies for API documentation.');
  }
}

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'URL Shortener API',
        version: '1.0.0',
        description: 'A production-grade URL shortener service with comprehensive API documentation',
        contact: {
            name: 'API Support',
            url: 'https://github.com/nskumar278/url-shortener',
            email: 'support@urlshortener.com'
        },
        license: {
            name: 'ISC',
            url: 'https://opensource.org/licenses/ISC'
        }
    },
    servers: [
        {
            url: env.isProduction() ? 'https://api.urlshortener.com' : `http://localhost:${env.PORT}`,
            description: env.isProduction() ? 'Production server' : 'Development server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            },
            apiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key'
            }
        },
        schemas: {
            User: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                    id: {
                        type: 'string',
                        description: 'User unique identifier',
                        example: '507f1f77bcf86cd799439011'
                    },
                    name: {
                        type: 'string',
                        description: 'User full name',
                        minLength: 2,
                        maxLength: 100,
                        example: 'John Doe'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address',
                        example: 'john.doe@example.com'
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'User creation timestamp',
                        example: '2023-10-15T08:30:00Z'
                    },
                    updatedAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'User last update timestamp',
                        example: '2023-10-15T08:30:00Z'
                    }
                }
            },
            CreateUserRequest: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                    name: {
                        type: 'string',
                        description: 'User full name',
                        minLength: 2,
                        maxLength: 100,
                        example: 'John Doe'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address',
                        example: 'john.doe@example.com'
                    },
                    password: {
                        type: 'string',
                        description: 'User password',
                        minLength: 8,
                        maxLength: 128,
                        example: 'SecurePassword123!'
                    }
                }
            },
            UpdateUserRequest: {
                type: 'object',
                required: ['name', 'email'],
                properties: {
                    name: {
                        type: 'string',
                        description: 'User full name',
                        minLength: 2,
                        maxLength: 100,
                        example: 'John Doe Updated'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address',
                        example: 'john.updated@example.com'
                    }
                }
            },
            ApiResponse: {
                type: 'object',
                required: ['success', 'message', 'timestamp'],
                properties: {
                    success: {
                        type: 'boolean',
                        description: 'Indicates if the request was successful',
                        example: true
                    },
                    message: {
                        type: 'string',
                        description: 'Human-readable message about the operation',
                        example: 'Operation completed successfully'
                    },
                    data: {
                        description: 'Response data (varies by endpoint)',
                        nullable: true
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp when the response was generated',
                        example: '2023-10-15T08:30:00Z'
                    }
                }
            },
            ErrorResponse: {
                type: 'object',
                required: ['success', 'message', 'timestamp'],
                properties: {
                    success: {
                        type: 'boolean',
                        description: 'Always false for error responses',
                        example: false
                    },
                    message: {
                        type: 'string',
                        description: 'Error message describing what went wrong',
                        example: 'An error occurred'
                    },
                    error: {
                        type: 'object',
                        properties: {
                            code: {
                                type: 'string',
                                description: 'Error code for programmatic handling',
                                example: 'VALIDATION_ERROR'
                            },
                            details: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                },
                                description: 'Detailed error information',
                                example: ['Name is required', 'Email must be valid']
                            }
                        }
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp when the error occurred',
                        example: '2023-10-15T08:30:00Z'
                    }
                }
            },
            HealthStatus: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['healthy', 'unhealthy', 'degraded'],
                        example: 'healthy'
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        example: '2023-10-15T08:30:00Z'
                    },
                    uptime: {
                        type: 'number',
                        description: 'Uptime in seconds',
                        example: 3600
                    },
                    version: {
                        type: 'string',
                        example: '1.0.0'
                    },
                }
            }
        },
        responses: {
            BadRequest: {
                description: 'Bad request - Invalid input data',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse'
                        },
                        example: {
                            success: false,
                            message: 'Bad request',
                            error: {
                                code: 'BAD_REQUEST',
                                details: ['Invalid request parameters']
                            },
                            timestamp: '2023-10-15T08:30:00Z'
                        }
                    }
                }
            },
            NotFound: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse'
                        },
                        example: {
                            success: false,
                            message: 'Resource not found',
                            error: {
                                code: 'NOT_FOUND',
                                details: ['The requested resource does not exist']
                            },
                            timestamp: '2023-10-15T08:30:00Z'
                        }
                    }
                }
            },
            ValidationError: {
                description: 'Validation error',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse'
                        },
                        example: {
                            success: false,
                            message: 'Validation failed',
                            error: {
                                code: 'VALIDATION_ERROR',
                                details: ['Name is required', 'Email must be valid']
                            },
                            timestamp: '2023-10-15T08:30:00Z'
                        }
                    }
                }
            },
            InternalServerError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/ErrorResponse'
                        },
                        example: {
                            success: false,
                            message: 'Internal server error',
                            error: {
                                code: 'INTERNAL_ERROR',
                                details: ['An unexpected error occurred']
                            },
                            timestamp: '2023-10-15T08:30:00Z'
                        }
                    }
                }
            }
        }
    },
    tags: [
        {
            name: 'Health',
            description: 'System health and status endpoints'
        },
        {
            name: 'Documentation',
            description: 'API documentation endpoints'
        },
        {
            name: 'Users',
            description: 'User management operations'
        }
    ]
};

// Options for swagger-jsdoc
const swaggerOptions = {
    definition: swaggerDefinition,
    apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts']
};

// Generate OpenAPI specification (only in development)
let swaggerSpec: any = null;
if (!env.isProduction() && swaggerJSDoc) {
  swaggerSpec = swaggerJSDoc(swaggerOptions);
}

// Setup function to integrate Swagger with Express app
export const setupSwagger = (app: Application): void => {
  // 🔒 SECURITY: Production environment configuration
  if (env.isProduction()) {
    console.log('🔒 Production mode: Static ReDoc served, Swagger UI disabled for security');

    // 🎨 PRODUCTION DOCUMENTATION - Static ReDoc HTML (Pre-generated, fast loading)
    app.get('/docs', (_req, res) => {
      res.sendFile('api-docs.html', { root: 'docs' });
    });

    // Production handler for disabled Swagger UI endpoints
    const swaggerDisabledHandler = (_req: any, res: any) => {
      res.status(404).json({
        success: false,
        message: 'Swagger UI is not available in production',
        error: {
          code: 'SWAGGER_DISABLED',
          details: ['Interactive Swagger UI endpoints are disabled in production for security. Use ReDoc documentation instead.']
        },
        timestamp: new Date().toISOString()
      });
    };

    // Disable Swagger UI endpoints in production
    app.use('/docs/swagger', swaggerDisabledHandler);

    console.log('📚 Production API Documentation:');
    console.log('  🎨 /docs - Static ReDoc HTML (pre-generated, fast)');
    console.log('  🚫 /docs/swagger - Swagger UI (DISABLED for security)');

    return;
  }

  // Check if swagger packages are available
  if (!swaggerJSDoc || !swaggerUi || !redoc || !swaggerSpec) {
    console.log('⚠️  Swagger packages not available. API documentation disabled.');
    
    // Provide fallback endpoints
    const fallbackHandler = (_req: any, res: any) => {
      res.status(503).json({
        success: false,
        message: 'API documentation is not available',
        error: {
          code: 'DOCS_UNAVAILABLE',
          details: ['Swagger packages not installed. Run: npm install --save-dev swagger-jsdoc swagger-ui-express redoc-express']
        },
        timestamp: new Date().toISOString()
      });
    };

    app.get('/docs', fallbackHandler);
    app.get('/docs.json', fallbackHandler);
    app.use('/docs/swagger', fallbackHandler);
    
    return;
  }

  // 🎨 DEVELOPMENT DOCUMENTATION - Dynamic ReDoc (Live updates)
  app.get('/docs', redoc({
    title: 'URL Shortener API Documentation',
    specUrl: '/docs.json',
  }));

  // OpenAPI specification endpoint (required for development ReDoc)
  app.get('/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // 🔧 DEVELOPMENT DOCUMENTATION - Swagger UI (Interactive testing)
  app.use('/docs/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'URL Shortener API - Developer Tools'
  }));

  console.log('📚 Development API Documentation:');
  console.log('  🎨 /docs - Dynamic ReDoc documentation (live updates)');
  console.log('  🔧 /docs/swagger - Swagger UI (interactive testing)');
  console.log('  📄 /docs.json - OpenAPI specification');
};

export default swaggerSpec || {};
