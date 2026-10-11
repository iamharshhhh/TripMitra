import { ZodError } from "zod";
import { ValidationError } from "../utils/errors.js";
import { ZodSchema } from "zod";

interface ValidationSchemas {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}

export function validate(schemas: ValidationSchemas) {
    return (req, _res, next) => {
        try {
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            next();
        }
        catch (err) {
            if (err instanceof ZodError) {
                const details = err.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message
                }));
                next(new ValidationError("Request validation failed.", details));
            }
            else {
                next(err);
            }
        }
    };
}
