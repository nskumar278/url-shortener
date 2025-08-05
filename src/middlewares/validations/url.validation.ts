import { celebrate, Joi, Segments } from 'celebrate';
import { commonValidations } from './common.validation';

const urlSpecificValidations = {
    shortUrlId: Joi.string().alphanum().length(6)
};

export const urlValidations = {
    createShortUrl: celebrate({
        [Segments.BODY]: Joi.object().keys({
            originalUrl: commonValidations.url.required()
        })
    }),
    getUrlStats: celebrate({
        [Segments.PARAMS]: Joi.object().keys({
            shortUrlId: urlSpecificValidations.shortUrlId.required()
        })
    }),
    redirectToOriginalUrl: celebrate({
        [Segments.PARAMS]: Joi.object().keys({
            shortUrlId: urlSpecificValidations.shortUrlId.required()
        })
    })

};
