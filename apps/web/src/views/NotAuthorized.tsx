"use client";

import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CutoutArtwork,
  SkinOrnament,
} from "@moonwitness/ui";
import { useTranslation } from "@/hocs/TranslationWrapper";
import { getLocalizedUrl } from "@/utils/i18n";

export function NotAuthorizedView({ requiredRole }: { requiredRole?: string }) {
  const { locale, dictionary } = useTranslation();
  const homeUrl = getLocalizedUrl("/mission-control", locale);
  const loginUrl = getLocalizedUrl("/shadow", locale);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <Card className="relative max-w-lg overflow-hidden">
        <SkinOrnament slot="corner" className="end-2 top-2" />
        <CardHeader className="flex flex-col items-center text-center">
          <CutoutArtwork id="cipher-wheel" decorative className="mb-3 h-24 w-24 opacity-80" />
          <Badge variant="destructive">HTTP 401 / RBAC DENIED</Badge>
          <CardTitle className="mt-2 font-brush text-2xl">
            {dictionary.auth.notAuthorizedTitle}
          </CardTitle>
          <CardDescription>
            {dictionary.auth.notAuthorizedDesc}
            {requiredRole ? ` (Required role: ${requiredRole.toUpperCase()})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="default">
            <Link href={homeUrl}>{dictionary.auth.backToHome}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={loginUrl}>{dictionary.auth.signInWithDifferentAccount}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
export default NotAuthorizedView;
