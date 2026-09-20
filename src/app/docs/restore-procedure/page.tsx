export default function RestoreProcedurePage() {
  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', fontFamily: 'Georgia, serif', color: '#1a2e1a' }}>
      <h1>WedWithMe restore procedure</h1>
      <ol>
        <li>Take a MySQL dump from Hostinger / current production.</li>
        <li>Store the dump in your backup destination (local folder or S3).</li>
        <li>To restore: create the database, then import the dump.</li>
        <li>Confirm <code>users</code>, <code>vendors</code>, and <code>bookings</code> tables have data.</li>
        <li>Log the restore drill from Admin → Backup &amp; Reliability.</li>
      </ol>
      <p>This runbook is informational. Always test restores on a staging database first.</p>
    </main>
  );
}
