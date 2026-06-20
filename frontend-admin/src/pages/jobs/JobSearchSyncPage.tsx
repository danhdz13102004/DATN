import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import {
  adminJobSearchService,
  type JobSearchAction,
  type JobSearchOperationResult,
  type JobSearchScope,
} from '../../services/adminJobSearchService';

interface OutletCtx { onMenuToggle: () => void; }

const ACTIONS: { value: JobSearchAction; label: string; description: string }[] = [
  {
    value: 'clear-and-sync',
    label: 'Clear and sync',
    description: 'Remove old search data for the selected scope, then index fresh published jobs.',
  },
  {
    value: 'sync',
    label: 'Sync',
    description: 'Index fresh data. For all/company scope, stale search docs are also removed first.',
  },
  {
    value: 'clear',
    label: 'Clear only',
    description: 'Remove search data for the selected scope without indexing anything back.',
  },
];

const SCOPES: { value: JobSearchScope; label: string; hint: string }[] = [
  { value: 'ALL', label: 'All jobs', hint: 'No UUID needed.' },
  { value: 'COMPANY', label: 'Company jobs', hint: 'Use a company UUID.' },
  { value: 'JOB', label: 'Single job', hint: 'Use a job UUID.' },
];

export default function JobSearchSyncPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const [action, setAction] = useState<JobSearchAction>('clear-and-sync');
  const [scope, setScope] = useState<JobSearchScope>('ALL');
  const [targetId, setTargetId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<JobSearchOperationResult | null>(null);
  const [error, setError] = useState('');

  const selectedAction = useMemo(() => ACTIONS.find((item) => item.value === action), [action]);
  const selectedScope = useMemo(() => SCOPES.find((item) => item.value === scope), [scope]);
  const needsTargetId = scope !== 'ALL';

  const runOperation = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult(null);
    setError('');

    if (needsTargetId && !targetId.trim()) {
      setError('Please enter the UUID for the selected scope.');
      return;
    }

    setIsRunning(true);
    try {
      const data = await adminJobSearchService.run(
        action,
        scope,
        needsTargetId ? targetId.trim() : undefined
      );
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Search index operation failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Search Sync"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Search Sync' }]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-5">
        <form onSubmit={runOperation} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Elasticsearch jobs index</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose exactly what to clear or sync in the job search index.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Action</span>
              <select
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                value={action}
                onChange={(event) => setAction(event.target.value as JobSearchAction)}
                disabled={isRunning}
              >
                {ACTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <span className="block text-xs text-gray-400 mt-1">{selectedAction?.description}</span>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">Scope</span>
              <select
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as JobSearchScope);
                  setTargetId('');
                }}
                disabled={isRunning}
              >
                {SCOPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <span className="block text-xs text-gray-400 mt-1">{selectedScope?.hint}</span>
            </label>
          </div>

          {needsTargetId && (
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-2">
                {scope === 'COMPANY' ? 'Company UUID' : 'Job UUID'}
              </span>
              <input
                type="text"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                disabled={isRunning}
              />
            </label>
          )}

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <i className={`fas ${isRunning ? 'fa-spinner animate-spin' : 'fa-sync-alt'} text-xs`} />
            {isRunning ? 'Running...' : 'Run operation'}
          </button>
        </form>

        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <i className="fas fa-check" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Operation completed</h3>
                <div className="grid gap-2 sm:grid-cols-2 mt-3 text-sm text-gray-600">
                  <div><span className="text-gray-400">Action:</span> {result.action}</div>
                  <div><span className="text-gray-400">Scope:</span> {result.scope}</div>
                  {result.id && <div className="sm:col-span-2 break-all"><span className="text-gray-400">ID:</span> {result.id}</div>}
                  {typeof result.cleared === 'number' && <div><span className="text-gray-400">Cleared:</span> {result.cleared}</div>}
                  {typeof result.indexed === 'number' && <div><span className="text-gray-400">Indexed:</span> {result.indexed}</div>}
                  {result.clearedAll && <div className="sm:col-span-2 text-emerald-600">The full jobs index was recreated.</div>}
                  {!result.clearedAll && result.scope === 'ALL' && result.indexed === 0 && (
                    <div className="sm:col-span-2 text-amber-600">
                      Nothing was indexed. Check that Elasticsearch is enabled and that published jobs exist.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
