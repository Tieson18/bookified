import { Loader2 } from "lucide-react"

type LoadingOverlayProps = {
  title?: string
  message?: string
}

const LoadingOverlay = ({
  title = "Beginning synthesis",
  message = "Preparing your book for narration",
}: LoadingOverlayProps) => {
  return (
    <div className="loading-wrapper" role="status" aria-live="polite">
      <div className="loading-shadow-wrapper bg-white shadow-[var(--shadow-soft-lg)]">
        <div className="loading-shadow">
          <Loader2 className="loading-animation h-12 w-12 text-[#663820]" />
          <p className="loading-title">{title}</p>
          <div className="loading-progress">
            <p className="loading-progress-item text-[var(--text-secondary)]">
              <span className="loading-progress-status" />
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
