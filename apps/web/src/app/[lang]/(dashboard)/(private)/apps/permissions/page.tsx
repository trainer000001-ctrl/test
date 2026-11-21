import { AuthGuard } from "@/hocs/AuthGuard";
import { PermissionsView } from "@/views/apps/permissions";

export default function PermissionsAppPage() {
  return (
    <AuthGuard minRole="admin" enforceRedirect>
      <PermissionsView />
    </AuthGuard>
  );
}
