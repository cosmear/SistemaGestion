let reloadScheduled = false;

function getErrorText(error) {
  if (!error) {
    return '';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return [error.message, error.cause?.message].filter(Boolean).join(' ');
  }

  if (typeof error === 'object') {
    return [error.message, error.digest, error.cause?.message].filter(Boolean).join(' ');
  }

  return String(error);
}

function isVersionSkewError(error) {
  const text = getErrorText(error);

  return (
    text.includes('Failed to find Server Action') ||
    text.includes('older or newer deployment') ||
    text.includes('older or newer build')
  );
}

export async function runServerAction(action, ...args) {
  try {
    return await action(...args);
  } catch (error) {
    if (!isVersionSkewError(error) || typeof window === 'undefined') {
      throw error;
    }

    if (!reloadScheduled) {
      reloadScheduled = true;
      window.location.reload();
    }

    return new Promise(() => {});
  }
}
