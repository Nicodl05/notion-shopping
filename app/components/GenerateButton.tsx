"use client";

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function GenerateButton({
  onClick,
  isLoading,
  disabled,
}: GenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Analyse en cours...</span>
        </>
      ) : (
        <span>🛒 Générer ma liste de courses</span>
      )}
    </button>
  );
}
