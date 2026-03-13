import dynamic from 'next/dynamic';

const StudioWorkspace = dynamic(() => import('@/components/layout/StudioWorkspace'), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="font-display italic text-5xl text-gold mb-3 animate-pulse">lamp</div>
        <p className="text-sm text-[--tm]">Loading 3D studio…</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  return <StudioWorkspace />;
}
