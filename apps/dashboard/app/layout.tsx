import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { ProfileSelector } from '@/components/profile-selector';
import { QueryProvider } from '@/components/query-provider';
import { db } from '@alb-analyzer/db/client';
import { awsProfiles } from '@alb-analyzer/db/schema';

export const metadata: Metadata = {
  title: 'ALB Log Analyzer Dashboard',
  description: 'Analyze and visualize AWS ALB logs',
};

export const dynamic = 'force-dynamic';

async function getProfiles() {
  return await db.select().from(awsProfiles).orderBy(awsProfiles.name);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profiles = await getProfiles();

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <div className="flex h-screen w-64 flex-col bg-gray-900">
              <div className="flex h-16 items-center px-6">
                <h1 className="text-xl font-bold text-white">ALB Log Analyzer</h1>
              </div>
              <ProfileSelector profiles={profiles} />
              <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
