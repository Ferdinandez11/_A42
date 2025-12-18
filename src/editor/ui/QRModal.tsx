import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Save, LogIn, Smartphone } from "lucide-react";
import { useAuthStore } from "@/core/stores/auth/useAuthStore";
import { useNavigate } from "react-router-dom";
import { useProjectStore } from "@/editor/stores/project/useProjectStore";

// 🎨 Types
interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IconBadgeProps {
  icon: React.ElementType;
  size?: number;
  variant: 'warning' | 'neutral';
}

interface ModalButtonProps {
  onClick: () => void;
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}

interface QRContentProps {
  shareUrl: string;
  projectId: string;
  hasUser: boolean;
}

interface EmptyStateProps {
  icon: React.ElementType;
  variant: 'warning' | 'neutral';
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  buttonVariant: 'primary' | 'secondary';
}

// 🎨 Constants
const QR_CONFIG = {
  size: 220,
  level: "M" as const,
} as const;

const CLASSES = {
  overlay: "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200",
  modal: "bg-neutral-900 border border-neutral-700 rounded-2xl p-8 shadow-2xl max-w-sm w-full relative flex flex-col items-center gap-6 text-center",
  closeButton: "absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors",
  header: {
    container: "space-y-1",
    badge: "flex items-center justify-center gap-2 text-blue-400 mb-2",
    badgeText: "text-xs font-bold uppercase tracking-wider",
    title: "text-2xl font-bold text-white",
    description: "text-sm text-neutral-400",
  },
  qr: {
    container: "bg-white p-4 rounded-xl shadow-inner",
    idContainer: "text-xs text-neutral-500 px-4 break-all",
    idValue: "font-mono text-neutral-400 ml-1",
  },
  warning: "text-xs text-yellow-500 bg-yellow-900/30 p-2 rounded",
  iconBadge: {
    base: "w-16 h-16 rounded-full flex items-center justify-center mb-2",
    warning: "bg-yellow-500/10 text-yellow-500",
    neutral: "bg-neutral-800 text-neutral-400",
  },
  emptyState: {
    title: "text-xl font-bold text-white",
    description: "text-sm text-neutral-400",
  },
  button: {
    base: "w-full py-3 rounded-lg font-bold transition-colors",
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    secondary: "bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white",
  },
} as const;

// 🎨 Sub-Components
const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className={CLASSES.closeButton}
    aria-label="Cerrar modal"
  >
    <X size={24} />
  </button>
);

const IconBadge: React.FC<IconBadgeProps> = ({ 
  icon: Icon, 
  size = 32, 
  variant 
}) => (
  <div className={`${CLASSES.iconBadge.base} ${CLASSES.iconBadge[variant]}`}>
    <Icon size={size} />
  </div>
);

const ModalButton: React.FC<ModalButtonProps> = ({ 
  onClick, 
  variant, 
  children 
}) => (
  <button
    onClick={onClick}
    className={`${CLASSES.button.base} ${CLASSES.button[variant]}`}
  >
    {children}
  </button>
);

const QRContent: React.FC<QRContentProps> = ({ 
  shareUrl, 
  projectId, 
  hasUser 
}) => (
  <>
    <div className={CLASSES.header.container}>
      <div className={CLASSES.header.badge}>
        <Smartphone size={20} />
        <span className={CLASSES.header.badgeText}>Mobile Ready</span>
      </div>
      <h2 className={CLASSES.header.title}>Escanear Proyecto</h2>
      <p className={CLASSES.header.description}>
        Abre la cámara de tu móvil para ver el diseño.
      </p>
    </div>

    <div className={CLASSES.qr.container}>
      <QRCodeSVG 
        value={shareUrl} 
        size={QR_CONFIG.size} 
        level={QR_CONFIG.level} 
      />
    </div>

    <div className={CLASSES.qr.idContainer}>
      ID:
      <span className={CLASSES.qr.idValue}>{projectId}</span>
    </div>

    {!hasUser && (
      <p className={CLASSES.warning}>
        ⚠️ Enlace en modo <strong>solo lectura</strong>.
      </p>
    )}
  </>
);

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  variant,
  title,
  description,
  buttonText,
  onButtonClick,
  buttonVariant,
}) => (
  <>
    <IconBadge icon={icon} variant={variant} />
    <h2 className={CLASSES.emptyState.title}>{title}</h2>
    <p className={CLASSES.emptyState.description}>{description}</p>
    <ModalButton onClick={onButtonClick} variant={buttonVariant}>
      {buttonText}
    </ModalButton>
  </>
);

// 🎨 Main Component
export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  // Store hooks
  const { user } = useAuthStore();
  const { currentProjectId, currentProjectShareToken } = useProjectStore();

  // Early return if modal is closed
  if (!isOpen) {
    return null;
  }

  // Computed values
  const shareUrl =
    currentProjectId && currentProjectShareToken
      ? `${window.location.origin}/?project_id=${currentProjectId}&mode=readonly&share=1&token=${encodeURIComponent(
          currentProjectShareToken
        )}`
      : "";
  const isProjectSaved = !!currentProjectId;
  const hasShareToken = !!currentProjectShareToken;

  // Handlers
  const handleNavigateToLogin = (): void => {
    navigate("/login");
  };

  // Render modal content based on state
  const renderContent = (): React.ReactNode => {
    // Case 1: Project is saved → Show QR
    if (isProjectSaved && hasShareToken) {
      return (
        <QRContent
          shareUrl={shareUrl}
          projectId={currentProjectId}
          hasUser={!!user}
        />
      );
    }

    // Case 2: Project not saved (or no share token yet) + User logged in → Ask to save
    if (user) {
      return (
        <EmptyState
          icon={Save}
          variant="warning"
          title="Proyecto no listo para compartir"
          description="Guarda el proyecto para generar un enlace único (QR)."
          buttonText="Volver y Guardar"
          onButtonClick={onClose}
          buttonVariant="secondary"
        />
      );
    }

    // Case 3: Project not saved + No user → Ask to login
    return (
      <EmptyState
        icon={LogIn}
        variant="neutral"
        title="Inicia Sesión"
        description="Para guardar y compartir tu diseño necesitas una cuenta."
        buttonText="Ir al Login"
        onButtonClick={handleNavigateToLogin}
        buttonVariant="primary"
      />
    );
  };

  return (
    <div className={CLASSES.overlay}>
      <div className={CLASSES.modal}>
        <CloseButton onClick={onClose} />
        {renderContent()}
      </div>
    </div>
  );
};