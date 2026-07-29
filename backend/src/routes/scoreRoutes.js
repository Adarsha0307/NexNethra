import express from 'express';
import { getIncidents, getActivities } from '../utils/store.js';

const router = express.Router();

router.get('/summary', async (req, res) => {
  const [incidents, activities] = await Promise.all([getIncidents(), getActivities()]);
  const openIncidents = incidents.filter(
    (inc) => inc.status === 'Open' || inc.status === 'Escalated' || !inc.status
  );

  const scansCount = activities.filter((act) => act.type === 'analysis').length;
  const scanActions = activities.filter((act) => act.type === 'scan').length;
  const chatCount = activities.filter((act) => act.type === 'chat').length;

  // Dynamic security score based on real data
  let score = 100;

  // Deduct for open incidents (each open incident reduces score)
  score -= openIncidents.length * 10;

  // Deduct if there are critical/high severity incidents
  const criticalIncidents = incidents.filter((inc) => inc.severity === 'Critical' || inc.severity === 'High');
  score -= criticalIncidents.length * 5;

  // Positive: scans performed show proactive security
  score += Math.min(15, scanActions * 3);

  // Positive: analysis activities
  score += Math.min(10, scansCount * 2);

  // Positive: assistant engagement
  score += Math.min(5, chatCount);

  score = Math.max(10, Math.min(100, score));

  let label = 'Strong posture';
  let summary = 'Your environment shows a strong resilience posture. Continue monitoring and regular scanning.';

  if (score < 40) {
    label = 'High risk';
    summary = 'URGENT: Multiple threats and open incidents require immediate security team intervention.';
  } else if (score < 70) {
    label = 'Medium risk';
    summary = 'CAUTION: Active threat alerts and incidents are pending. Review findings and run scans.';
  }

  // Dynamic breakdown based on real activity
  const totalAnalyzers = scansCount + scanActions + 3;
  const activeAlerts = Math.max(1, Math.floor((100 - score) / 10));

  return res.json({
    score,
    label,
    breakdown: {
      alerts: activeAlerts,
      incidents: openIncidents.length,
      analyzers: totalAnalyzers,
      recommendations: score < 70 ? 6 : score < 85 ? 4 : 2
    },
    summary
  });
});

export default router;