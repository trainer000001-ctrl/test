import { AuthGuard } from "@/hocs/AuthGuard";
import { RolesView } from "@/views/apps/roles";

export default function RolesAppPage() {
  return (
    <AuthGuard minRole="admin" enforceRedirect>
      <RolesView />
    </AuthGuard>
  );
}
