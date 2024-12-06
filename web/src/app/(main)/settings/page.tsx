import { Suspense } from "react";
import { SettingsForm } from "@/app/(main)/settings/settings-form";
import { CardSkeleton } from "@/app/(main)/settings/settings-skeleton";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Suspense fallback={<CardSkeleton />}>
        <SettingsForm />
      </Suspense>
    </div>
  );
}
