import { z } from 'zod';
import { audioFileTypes, imageFileTypes, videoFileTypes } from '@/utils/zod/file-types';

// Email validation schema
const emailSchema = z.string().email({ message: 'Invalid email address' });

// URL validation schema
const urlSchema = z.string().url({ message: 'Invalid URL' });

// String validation schema
const stringSchema = z.string().min(1, { message: 'String cannot be empty' });

// Number validation schema
const numberSchema = z.number().min(0, { message: 'Number must be positive' });

// Integer validation schema
const integerSchema = z.number().int({ message: 'Value must be an integer' });

// Date validation schema
const dateSchema = z.date({ message: 'Invalid date' });

// Array validation schema (example: array of strings)
const stringArraySchema = z.array(z.string(), {
  message: 'Array must contain strings',
});

// Password validation schema
// Requirements:
// - Minimum 8 characters
// - Maximum 16 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
// - At least one special character

const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(16, { message: 'Password must be no more than 16 characters long' })
  .regex(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  .regex(/\d/, { message: 'Password must contain at least one number' })
  .regex(/[@$!%*?&]/, {
    message: 'Password must contain at least one special character (@, $, !, %, *, ?, &)',
  });

// Image file validation schema
const createImageFileSchema = (maxFileSize: number, allowedTypes: string[]) =>
  z.object({
    type: z.string().refine((type) => allowedTypes.includes(type), {
      message: `Invalid image type. Only ${allowedTypes.join(', ')} are allowed.`,
    }),
    size: z.number().refine((size) => size <= maxFileSize, {
      message: `File size should be less than ${maxFileSize / (1024 * 1024)} MB.`,
    }),
  });

// Video file validation schema
const createVideoFileSchema = (maxFileSize: number, allowedTypes: string[]) =>
  z.object({
    type: z.string().refine((type) => allowedTypes.includes(type), {
      message: `Invalid video type. Only ${allowedTypes.join(', ')} are allowed.`,
    }),
    size: z.number().refine((size) => size <= maxFileSize, {
      message: `File size should be less than ${maxFileSize / (1024 * 1024)} MB.`,
    }),
  });

// Audio file validation schema
const createAudioFileSchema = (maxFileSize: number, allowedTypes: string[]) =>
  z.object({
    type: z.string().refine((type) => allowedTypes.includes(type), {
      message: `Invalid audio type. Only ${allowedTypes.join(', ')} are allowed.`,
    }),
    size: z.number().refine((size) => size <= maxFileSize, {
      message: `File size should be less than ${maxFileSize / (1024 * 1024)} MB.`,
    }),
  });

// PDF file validation schema
const createPDFFileSchema = (maxFileSize: number, allowedTypes: string[]) =>
  z.object({
    type: z.string().refine((type) => allowedTypes.includes(type), {
      message: `Invalid PDF type. Only ${allowedTypes.join(', ')} are allowed.`,
    }),
    size: z.number().refine((size) => size <= maxFileSize, {
      message: `File size should be less than ${maxFileSize / (1024 * 1024)} MB.`,
    }),
  });

// Sign in validation schema
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Function to validate email
export function validateEmail(email: string): {
  valid: boolean;
  message: string;
} {
  try {
    emailSchema.parse(email);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate URL
export function validateURL(url: string): { valid: boolean; message: string } {
  try {
    urlSchema.parse(url);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate string
export function validateString(str: string): {
  valid: boolean;
  message: string;
} {
  try {
    stringSchema.parse(str);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate number
export function validateNumber(num: number): {
  valid: boolean;
  message: string;
} {
  try {
    numberSchema.parse(num);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate integer
export function validateInteger(num: number): {
  valid: boolean;
  message: string;
} {
  try {
    integerSchema.parse(num);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate date
export function validateDate(date: Date): { valid: boolean; message: string } {
  try {
    dateSchema.parse(date);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate array of strings
export function validateStringArray(arr: string[]): {
  valid: boolean;
  message: string;
} {
  try {
    stringArraySchema.parse(arr);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate password
export function validatePassword(password: string): {
  valid: boolean;
  message: string;
} {
  try {
    passwordSchema.parse(password);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate sign up credentials
export function validateSignUpCredentials(credentials: { email: string; password: string }): {
  valid: boolean;
  message: string;
} {
  try {
    signUpSchema.parse(credentials);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate image file
export function validateImageFile({
  imageFile,
  maxFileSize = 5 * 1024 * 1024,
  allowedTypes = imageFileTypes,
}: {
  imageFile: { type: string; size: number };
  maxFileSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; message: string } {
  try {
    createImageFileSchema(maxFileSize, allowedTypes).parse(imageFile);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate video file
export function validateVideoFile({
  videoFile,
  maxFileSize = 100 * 1024 * 1024,
  allowedTypes = videoFileTypes,
}: {
  videoFile: { type: string; size: number };
  maxFileSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; message: string } {
  try {
    createVideoFileSchema(maxFileSize, allowedTypes).parse(videoFile);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate PDF file
export function validatePDFFile({
  pdfFile,
  maxFileSize = 10 * 1024 * 1024,
  allowedTypes = ['application/pdf'],
}: {
  pdfFile: { type: string; size: number };
  maxFileSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; message: string } {
  try {
    createPDFFileSchema(maxFileSize, allowedTypes).parse(pdfFile);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}

// Function to validate audio file
export function validateAudioFile({
  audioFile,
  maxFileSize = 50 * 1024 * 1024,
  allowedTypes = audioFileTypes,
}: {
  audioFile: { type: string; size: number };
  maxFileSize?: number;
  allowedTypes?: string[];
}): { valid: boolean; message: string } {
  try {
    createAudioFileSchema(maxFileSize, allowedTypes).parse(audioFile);
    return { valid: true, message: '' };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { valid: false, message: e.issues[0]?.message ?? 'Invalid input' };
    }
    return { valid: false, message: 'An unknown error occurred' };
  }
}
