/**
 * Musy design system — Layer 2 components.
 *
 * Built on base-ui (@base-ui/react ^1.7). Per base-ui's setup guidance the app
 * root needs `isolation: isolate` on its wrapper element so portaled popups
 * (Tooltip here; Dialog and Drawer in Pass 3) always land above page content,
 * and `body { position: relative }` for iOS 26+ Safari backdrops.
 *
 * Wrap the app in <MusyTooltipProvider> once, so moving between neighbouring
 * icon buttons does not re-run the open delay. Lightbox portals its popup, so
 * `isolation: isolate` on the root is what keeps it above page content.
 *
 * Import the stylesheets once, in this order, at the app root:
 *   import 'tokens/musy-foundations.css';
 *   import 'tokens/musy-foundations-amendments.css';   // token gaps G1, G2
 *   import 'components/musy-components.css';
 */
export { Icon } from './Icon';
export type { IconProps, IconSize, IconTone } from './Icon';

export { IconButton, MusyTooltipProvider } from './IconButton';
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './IconButton';

export { CtaButton } from './CtaButton';
export type { CtaButtonProps, CtaVariant, CtaSize } from './CtaButton';

export { Switch } from './Switch';
export type { SwitchProps, SwitchAccent } from './Switch';

export { RadioGroupText } from './RadioGroupText';
export type { RadioGroupTextProps, RadioOption, RadioAccent } from './RadioGroupText';

export { RadioGroupImage } from './RadioGroupImage';
export type { RadioGroupImageProps, RadioCardOption } from './RadioGroupImage';

export { RadioCards } from './RadioCards';
export type { RadioCardsProps, RadioCardOptionRich } from './RadioCards';

export { ProcessVisualisation } from './ProcessVisualisation';
export type { ProcessVisualisationProps, ProcessStep } from './ProcessVisualisation';

export { Hint } from './Hint';
export type { HintProps } from './Hint';

export { ButtonGroup } from './ButtonGroup';
export type { ButtonGroupProps } from './ButtonGroup';

export { ContentBox } from './ContentBox';
export type { ContentBoxProps, TypeStep, BoxOutline, HeadingLevel } from './ContentBox';

export { Badge, BadgeRow } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { Message } from './Message';
export type { MessageProps, MessageVariant, MessageLive } from './Message';

export { ContentList } from './ContentList';
export type { ContentListProps, ContentListItem } from './ContentList';

export { DraggableList, itemTypeStep } from './DraggableList';
export type {
  DraggableListProps, DraggableItem, DropMode, CombineOrder,
} from './DraggableList';

/* L5's pointer split, as a hook rather than a media query: the size has to
   reach React, because it also sizes §7.24's float spacer. */
export { useCoarsePointer, useToolSize } from './useCoarsePointer';
export type { ToolSize } from './useCoarsePointer';

export { Toast } from './Toast';
export type { ToastProps, ToastAction, ToastLive } from './Toast';

export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';

export { Lightbox } from './Lightbox';
export type { LightboxProps } from './Lightbox';

export { Logo } from './Logo';
export type { LogoProps, LogoSize } from './Logo';

export { Field, FieldItem, FieldGroup } from './Field';
export type { FieldProps, FieldItemProps, FieldGroupProps, FieldType } from './Field';

export { InteractiveWizard, WizardPanel } from './InteractiveWizard';
export type {
  InteractiveWizardProps, WizardPanelProps, WizardStep, WizardStepState, WizardStateWords, WizardAccent } from './InteractiveWizard';

export { PhotoUpload } from './PhotoUpload';
export type { PhotoUploadProps, UploadedPhoto } from './PhotoUpload';

export { VoiceNote } from './VoiceNote';
export type { VoiceNoteProps, VoiceNoteState } from './VoiceNote';

export { TrackButton, MusicPlayer, trackClock } from './MusicPlayer';

export type { TrackButtonProps, MusicPlayerProps, MusicTransport } from './MusicPlayer';

export { RecordButton, recordClock } from './RecordButton';
export type { RecordButtonProps, RecordButtonState } from './RecordButton';
