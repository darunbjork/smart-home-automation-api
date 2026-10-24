import { RequestHandler } from "express";
import { z } from "zod";
import { CustomError } from "./error.middleware";

export const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map(
      (issue) =>
        `${issue.path.length > 0 ? issue.path.join(".") : "body"}: ${issue.message}`,
    )
    .join("; ");

// Parses req.body with the schema and REPLACES it with the parsed value,
// so unknown/extra keys never reach services.
export const validateBody = <T extends z.ZodTypeAny>(
  schema: T,
): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new CustomError(formatZodError(result.error), 422, "VALIDATION"));
      return;
    }
    req.body = result.data;
    next();
  };
};
