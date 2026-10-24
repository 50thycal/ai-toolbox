// Shared by the viewer and isolated worker. Generated content is data, never executable HTML.
export const REVIEW_PASSES = ['Accuracy', 'Story', 'Interaction', 'Phone layout', 'Comprehension'];
export const validRepo = value => typeof value === 'string' && value.length < 160 && /^[\w.-]+\/[\w.-]+$/.test(value) && !value.split('/').some(p => p === '.' || p === '..');
const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function validateLesson(value, sources) {
  if (!value || !text(value.title, 120) || !text(value.summary, 350)) throw Error('Lesson title or summary is invalid');
  if (!Array.isArray(value.objectives) || value.objectives.length < 1 || value.objectives.length > 4 || !value.objectives.every(v => text(v, 200))) throw Error('Learning goals are invalid');
  if (!Array.isArray(value.sections) || value.sections.length < 3 || value.sections.length > 7) throw Error('Use three to seven chapters');
  const known = new Set(sources.map(s => s.id)), sections = new Set();
  for (const s of value.sections) {
    if (!text(s.id, 60) || sections.has(s.id) || !text(s.title, 120) || !text(s.caption, 350) || !['flow','timeline','compare','states'].includes(s.kind) || !['code','documentation','illustrative'].includes(s.evidence)) throw Error('Chapter metadata is invalid');
    sections.add(s.id);
    if (!Array.isArray(s.nodes) || s.nodes.length < 2 || s.nodes.length > 6) throw Error('Each visual needs two to six steps');
    const ids = new Set();
    for (const n of s.nodes) {
      if (!text(n.id, 60) || ids.has(n.id) || !text(n.label, 70) || !text(n.detail, 600) || !Array.isArray(n.sourceIds) || n.sourceIds.length > 5 || n.sourceIds.some(id => !known.has(id))) throw Error('Visual step or source reference is invalid');
      if (s.evidence !== 'illustrative' && !n.sourceIds.length) throw Error('Repository claims need source references');
      if (s.evidence === 'code' && !n.sourceIds.some(id => sources.find(src => src.id === id)?.kind === 'code' || sources.find(src => src.id === id)?.kind === 'patch')) throw Error('Code claims need code evidence');
      ids.add(n.id);
    }
    if (s.kind === 'compare' && (!text(s.before, 300) || !text(s.after, 300))) throw Error('Comparisons need before and after captions');
    if (s.scenario != null) {
      if (!text(s.scenario.label, 120) || !Array.isArray(s.scenario.options) || s.scenario.options.length < 2 || s.scenario.options.length > 4) throw Error('Scenario choices are invalid');
      for (const o of s.scenario.options) if (!text(o.label, 70) || !text(o.result, 400) || !Array.isArray(o.path) || !o.path.length || o.path.length > 6 || new Set(o.path).size !== o.path.length || o.path.some(id => !ids.has(id))) throw Error('Scenario must use existing visual steps');
    }
  }
  return value;
}
export function validateEnvelope(value, sources) {
  validateLesson(value?.lesson, sources);
  if (!Array.isArray(value.changes) || value.changes.length > 8 || !value.changes.every(v => text(v, 300)) || !Array.isArray(value.openIssues) || value.openIssues.length > 8 || !value.openIssues.every(v => text(v, 300))) throw Error('Review report is invalid');
  return value;
}
