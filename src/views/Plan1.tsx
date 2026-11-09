import { PlanPage } from '../components/PlanPage';
import { App } from '../components/SiteShell';
import { plan1 } from '../data/plan-1';

export default function Plan1() {
  return (
    <App>
      <PlanPage data={plan1} />
    </App>
  );
}
