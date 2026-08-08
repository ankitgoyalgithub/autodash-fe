/**
 * UI primitives — Phase 0 of the enterprise design system.
 *
 * Single import surface for every reusable primitive. New surfaces should
 * compose these instead of authoring new chrome from scratch:
 *
 *   import { Button, Modal, Card, Field, Input, Tag, EmptyState, Skeleton } from '@/components/ui';
 *
 * Side-effect: pulls in ui.css. Tokens.css is imported separately from
 * src/App.tsx so the cascade order (tokens → app → ui) stays predictable.
 */

import './ui.css';

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Modal } from './Modal';

export { Card } from './Card';

export { Input, Label, Field } from './Input';

export { Tag } from './Tag';

export { EmptyState } from './EmptyState';

export { ErrorState, NetworkErrorState } from './ErrorState';

export { Skeleton, SkeletonText, SkeletonCard } from './Skeleton';

export { Spinner, PageLoader } from './Spinner';

export { DocumentChrome } from './DocumentChrome';

export { toast, Toaster } from './toast';
export type { ToastOptions } from './toast';
