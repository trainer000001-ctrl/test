import { AuthGuard } from "@/hocs/AuthGuard";
import { UserListView } from "@/views/apps/user/list";

export default function UserListAppPage() {
  return (
    <AuthGuard minRole="admin" enforceRedirect>
      <UserListView />
    </AuthGuard>
  );
}
