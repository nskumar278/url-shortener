import { Joi } from 'celebrate';

// Common validation schemas that can be reused across different entities
export const commonValidations = {

    // Number id validation
    numberId: Joi.number().integer().min(1),

    // MongoDB ObjectId validation
    objectId: Joi.string().hex().length(24),

    // URL validation
    url: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048),

    // Pagination
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),

    // Common string validations
    shortString: Joi.string().trim().min(1).max(255),
    mediumString: Joi.string().trim().min(1).max(1000),
    longString: Joi.string().trim().min(1).max(5000),

    // Date validations
    dateISO: Joi.date().iso(),
    futureDateISO: Joi.date().iso().greater('now'),

    // Common query parameters
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),

    // Boolean with string conversion
    booleanString: Joi.alternatives().try(
        Joi.boolean(),
        Joi.string().valid('true', 'false').custom((value) => value === 'true')
    ),
};
