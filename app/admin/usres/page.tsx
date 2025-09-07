export default function UsersPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Users & Roles</h1>
      <p className="text-gray-600">
        Current auth is token-based:
        <br/>• <b>ADMIN_TOKEN</b> → superadmin
        <br/>• <b>COACH_TOKEN</b> → coach
        <br/>• <b>VIEWER_TOKEN</b> → viewer
      </p>
      <p className="mt-4">
        If you want email-based users next, we’ll add a Firestore <code>users</code> collection and switch login to email+token.
      </p>
    </div>
  );
}
