import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function apiResponse<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
