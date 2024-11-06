export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "INTERNAL_ERROR",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown): AppError {
  console.error(error);
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError("An unknown error occurred");
}
