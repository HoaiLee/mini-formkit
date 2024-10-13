import {type Ref, ref, unref} from 'vue';
// import {type CountryCode, isValidPhoneNumber} from 'libphonenumber-js';
// import { isEmpty } from 'lodash-es';

export type FormValue = Date | string | number | boolean | string[] | null | undefined;

export type ValidatorType = 'required' | 'requiredIf'
  | 'email' | 'numeric' | 'maxLength' | 'minLength';

export type Validator = boolean | ((value?: FormValue) => boolean);

export type ValidationRules<T> = {
  [Key in keyof T]?: {
    [key in ValidatorType]?: Validator;
  }
};

export type FormLabels<T> = { [Key in keyof T]?: string };

export type FormValidation<T extends Record<string, FormValue>> = {
  form?: T | Ref<T>;
  labels?: Partial<FormLabels<T>> | Ref<FormLabels<T>>;
  rules?: ValidationRules<T> | Ref<ValidationRules<T>>;
};

// eslint-disable-next-line max-len
export const phone = (value: string | null | undefined, defaultCountry: CountryCode) => !!value && isValidPhoneNumber(value, defaultCountry);

// eslint-disable-next-line no-control-regex
const emailRegex = /^(?:[A-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]{2,}(?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

export const email: Validator = (value?: FormValue): boolean => (!!value
  && typeof value === 'string'
  && emailRegex.test(value));

export const required = (value: FormValue): boolean => {
  if (Array.isArray(value)) {
    return !!value.length;
  }

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'boolean') {
    return true;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value === 'object') {
    return !isEmpty(value);
  }

  return !!String(value).length;
};

const getFieldErrorMessage = (
  label: string | undefined,
  errorType: ValidatorType | Omit<string, keyof Validator>,
  param?: string | number,
): string => {
  switch (errorType) {
    case 'required':
      return `The ${label || 'field'} is required`;
    case 'email':
      return `The ${label || 'field'} must a valid email address.`;
    case 'numeric':
      return `The ${label || 'field'} must be a valid number.`;
    case 'maxLength':
      return `The ${label || 'field'} cannot have more than ${param} characters.`;
    case 'minLength':
      return `The ${label || 'field'} must have ${param} or more characters.`;
    default:
      return `The ${label || 'field'} is invalid`;
  }
};

const useForm = <Type extends Record<string, FormValue>>(
  {form, rules, labels}: FormValidation<Type> = {},
) => {
  const errorMessages = ref<Record<string, string | undefined>>({});
  const generalErrorMessage = ref('');

  const isFormValid = ref(false);

  const setErrorMessage = (errors: Record<string, string[]>) => {
    const errorResult: Record<string, string> = {};

    Object.keys(errors).forEach((error) => {
      errorResult[error] = errors[error]!.join(', ');
    });

    errorMessages.value = errorResult;
  };

  const setGenericError = (message = 'Error') => {
    generalErrorMessage.value = message;
  };

  const resetError = () => {
    errorMessages.value = {};
    generalErrorMessage.value = '';
  };

  const triggerFormValidationManual = () => {
    const formValue = unref(form);
    const rulesList = unref(rules);
    const labelsName = unref(labels);

    const validationMessages: { [key in keyof Type]?: string } = {};

    Object.entries(formValue || {}).forEach(([key, value]: [keyof Type, FormValue]) => {
      const fieldRules = (rulesList && rulesList[key] && key in rulesList)
        ? rulesList[key]
        : undefined;
      let validationMessage: string;

      if (!fieldRules) {
        return;
      }

      Object.entries(fieldRules)
        .forEach(([ruleKey, ruleValue]) => {
          let isFieldRequired = !!fieldRules.required;

          if (typeof fieldRules?.requiredIf === 'function') {
            isFieldRequired = fieldRules.requiredIf(value);
          }

          const label: string | undefined = (labelsName && key in labelsName && labelsName[key])
            ? labelsName[key]
            : undefined;

          const fieldErrorMessage = getFieldErrorMessage(label, ruleKey);

          // always show required error messages first
          if ((isFieldRequired && !value) || validationMessage) {
            validationMessage = fieldErrorMessage;
            validationMessages[key] = fieldErrorMessage;

            return;
          }

          if (['required', 'requiredIf'].includes(ruleKey)) {
            return;
          }

          if (typeof ruleValue === 'function') {
            const isFieldValid = ruleValue(value);

            if (!isFieldValid) {
              validationMessages[key] = validationMessage;
            }
          }
        });
    });

    // has any failure validation
    isFormValid.value = !Object.keys(validationMessages).length;

    if (!isFormValid.value) {
      errorMessages.value = validationMessages;
    }
  };

  return {
    errorMessages,
    generalErrorMessage,

    isFormValid,

    setErrorMessage,
    setGenericError,
    resetError,
    triggerFormValidationManual,
  };
};

export default useForm;
