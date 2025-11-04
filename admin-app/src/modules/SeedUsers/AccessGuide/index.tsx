const AccessGuide = () => (
  <article className="space-y-4 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-6 text-sm text-brand-600">
    <h2 className="text-lg font-semibold text-brand-700">Access Control Guide</h2>
    <ul className="space-y-2 text-sm leading-relaxed text-brand-600/90">
      <li>• Create dedicated roles for each team (ops, analytics, product) and assign member emails.</li>
      <li>• Permissions operate per table. Editing or deleting automatically grants view access.</li>
      <li>• Remove staff by deleting their email from a role or revoking the role entirely.</li>
      <li>• All updates take effect instantly; users need to re-authenticate for new privileges.</li>
    </ul>
  </article>
)

export default AccessGuide
