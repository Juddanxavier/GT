declare module 'react-flagkit' {
  import type { JSX } from 'react';
  interface FlagProps {
    country: string;
    size?: number;
    alt?: string;
    className?: string;
  }
  export default function Flag(props: FlagProps): JSX.Element;
}
