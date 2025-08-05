import { celebrate, Joi, Segments } from 'celebrate';
import { commonValidations } from './common.validation';

// User specific validation schemas
const userSpecificValidations = {
  // Email validation with additional rules
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Allow all TLDs
    .lowercase()
    .max(254), // RFC 5321 limit
  
  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    
  // Username validation
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .lowercase(),
    
  // Full name validation
  fullName: Joi.string()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .min(2)
    .max(100)
    .trim(),
};

// User management validations
export const userValidations = {
  // Register user
  registerUser: celebrate({
    [Segments.BODY]: Joi.object({
      email: userSpecificValidations.email.required(),
      password: userSpecificValidations.password.required(),
      confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({ 'any.only': 'Passwords do not match' }),
      fullName: userSpecificValidations.fullName.required(),
      username: userSpecificValidations.username.optional(),
    }),
  }),

  // Get user by ID
  identifyUserById: celebrate({
    [Segments.PARAMS]: Joi.object({
      id: commonValidations.numberId.required(), // Keeping id as number for dummy purposes
    }),
  }),

  // List users (admin only)
  listUsers: celebrate({
    [Segments.QUERY]: Joi.object({
      page: commonValidations.page,
      limit: commonValidations.limit,
      sortBy: Joi.string().valid('createdAt', 'updatedAt', 'email', 'fullName').default('createdAt'),
      sortOrder: commonValidations.sortOrder,
      search: Joi.string().trim().min(1).max(255).optional(),
      role: Joi.string().valid('user', 'admin', 'all').default('all'),
    }),
  }),
};
