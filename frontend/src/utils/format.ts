import axios from 'axios';
import { format, parseISO } from 'date-fns';

export const formatDateTime = (value: string) => {
  try {
    return format(parseISO(value), 'dd MMM yyyy, HH:mm');
  } catch {
    return value;
  }
};

export const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Request failed'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
};
