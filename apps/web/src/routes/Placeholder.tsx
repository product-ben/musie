/**
 * Every route's page, this session.
 *
 * The brief asks for "an h1 with the route name and nothing else", for all
 * seven routes. Seven files that differ only in one string would be seven
 * files to delete later, so the placeholder is one parametrised component and
 * the router supplies the key.
 *
 * `useParams` feeds the interpolation, which only `route.session.title`
 * ("Session — {step}") currently uses. That is what makes the step visible
 * without the page knowing anything about steps.
 */
import { useParams } from 'react-router';
import { useT } from '../i18n/localeContext';
import type { MessageKey } from '../i18n';

export interface PlaceholderProps {
  titleKey: MessageKey;
}

export function Placeholder({ titleKey }: PlaceholderProps) {
  const params = useParams();
  const t = useT();

  return <h1 className="musie-placeholder">{t(titleKey, params)}</h1>;
}
