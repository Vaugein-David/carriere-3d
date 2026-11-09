import { ProcedurePage } from '../components/ProcedurePage';
import { App } from '../components/SiteShell';
import { plan2 } from '../data/plan-2';

export default function Plan2() {
  return (
    <App>
      <ProcedurePage data={plan2} />
    </App>
  );
}
