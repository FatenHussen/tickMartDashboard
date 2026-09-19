import { useEffect } from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router';

import { isChunkLoadError, reloadOnChunkLoadError } from 'src/utils/lazy-with-retry';

import i18n from 'src/lib/i18n';

// ----------------------------------------------------------------------

export function ErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    if (isChunkLoadError(error)) {
      reloadOnChunkLoadError();
    }
  }, [error]);

  useEffect(() => {
    // Set CSS variables for error boundary styles
    document.documentElement.style.setProperty('--info-color', '#2dd9da');
    document.documentElement.style.setProperty('--warning-color', '#e2aa53');
    document.documentElement.style.setProperty('--error-color', '#ff5555');
    document.documentElement.style.setProperty('--error-background', '#2a1e1e');
    document.documentElement.style.setProperty('--details-background', '#111111');
    document.documentElement.style.setProperty('--root-background', '#2c2c2e');
    document.documentElement.style.setProperty('--container-background', '#1c1c1e');
    
    // Set body styles for error boundary
    document.body.style.margin = '0';
    document.body.style.color = 'white';
    document.body.style.backgroundColor = 'var(--root-background)';
    
    return () => {
      // Cleanup - restore body styles
      document.body.style.margin = '';
      document.body.style.color = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div className={errorBoundaryClasses.root}>
      <div className={errorBoundaryClasses.container}>{renderErrorMessage(error)}</div>
    </div>
  );
}

// ----------------------------------------------------------------------

function parseStackTrace(stack?: string) {
  if (!stack) return { filePath: null, functionName: null };

  const filePathMatch = stack.match(/\/src\/[^?]+/);
  const functionNameMatch = stack.match(/at (\S+)/);

  return {
    filePath: filePathMatch ? filePathMatch[0] : null,
    functionName: functionNameMatch ? functionNameMatch[1] : null,
  };
}

function renderErrorMessage(error: any) {
  if (isRouteErrorResponse(error)) {
    return (
      <>
        <h1 className={errorBoundaryClasses.title}>
          {error.status}: {error.statusText}
        </h1>
        <p className={errorBoundaryClasses.message}>{error.data}</p>
      </>
    );
  }

  if (error instanceof Error) {
    const { filePath, functionName } = parseStackTrace(error.stack);

    return (
      <>
        <h1 className={errorBoundaryClasses.title}>
          {i18n.t('errorUnexpectedTitle', {
            ns: 'common',
            defaultValue: 'Unexpected error',
          })}
        </h1>
        <p className={errorBoundaryClasses.message}>
          {error.name}: {error.message}
        </p>
        <pre className={errorBoundaryClasses.details}>{error.stack}</pre>
        {(filePath || functionName) && (
          <p className={errorBoundaryClasses.filePath}>
            {filePath} ({functionName})
          </p>
        )}
      </>
    );
  }

  return (
    <h1 className={errorBoundaryClasses.title}>
      {i18n.t('errorUnknownTitle', { ns: 'common', defaultValue: 'Unknown error' })}
    </h1>
  );
}

// ----------------------------------------------------------------------

const errorBoundaryClasses = {
  root: 'flex flex-1 flex-auto items-center pt-[10vh] px-4 flex-col text-white bg-[var(--root-background)] min-h-screen font-sans',
  container: 'gap-6 p-5 w-full max-w-[960px] flex rounded-lg flex-col bg-[var(--container-background)]',
  title: 'm-0 leading-tight text-xl font-bold',
  details: 'm-0 p-4 leading-normal overflow-auto rounded-inherit text-[var(--warning-color)] bg-[var(--details-background)] font-mono text-sm',
  message:
    'm-0 leading-normal py-3 px-4 whitespace-pre-wrap text-[var(--error-color)] bg-[var(--error-background)] border-s-2 border-[var(--error-color)] font-bold text-sm font-mono',
  filePath: 'mt-0 text-[var(--info-color)]',
};
