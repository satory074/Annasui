interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              再生エラー
            </h3>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              <p>{message}</p>
            </div>
            
            <div className="mt-4">
              <button
                onClick={onDismiss}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}