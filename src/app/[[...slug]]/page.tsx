import { IdApp } from '@/components/IdApp';
import { ALL_PATHS } from '@/lib/paths';

/* One page for every address (/, /signin/, /security/ ...). The static build writes each one out as its own file. */
export const dynamicParams = false;
export function generateStaticParams() {
  return ALL_PATHS.map((slug) => ({ slug }));
}
export default function Page() {
  return <IdApp />;
}
