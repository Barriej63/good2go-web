import { getAdminRole } from '@/lib/adminAuth';

export default async function UsersPage() {
  const role = await getAdminRole(); // 'superadmin' | 'coach' | 'viewer' | null

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Users & Roles</h1>
          <p className="text-xs text-slate-500">
            Signed in as: <span className="font-medium">{role ?? 'unknown'}</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="font-medium mb-2">Current Access Model</h2>
          <ul className="list-disc pl-6 text-sm text-slate-700">
            <li><strong>superadmin</strong>: full access (can edit Config)</li>
            <li><strong>coach</strong>: read-only dashboard</li>
            <li><strong>viewer</strong>: read-only dashboard</li>
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            Roles are mapped from one-time tokens in environment variables:
            <code className="ml-1">ADMIN_TOKEN</code>, <code>COACH_TOKEN</code>, <code>VIEWER_TOKEN</code>.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="font-medium mb-2">Directory</h2>
          <p className="text-sm text-slate-600">
            (Coming soon) Manage named users here. For now, access is token-based. This page exists
            so the “Users” link no longer 404s.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-700">
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>
                    No users yet. Token-based roles are active.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {role !== 'superadmin' ? (
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm text-slate-600">
              You are signed in as <strong>{role ?? 'unknown'}</strong>. Only <strong>superadmin</strong> can modify Config.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 p-4 bg-emerald-50">
            <p className="text-sm text-emerald-800">
              You are signed in as <strong>superadmin</strong>. Future: add/invite named users here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
