import Paywall from '@/components/Paywall';

export default function UpgradePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Upgrade</h1>
        <p className="text-zinc-500 mt-1 text-sm">Unlock AI-powered trading insights</p>
      </div>
      <Paywall />
    </div>
  );
}
